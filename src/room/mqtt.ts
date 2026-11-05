/**
 * Cliente MQTT 3.1.1 mínimo sobre WebSocket (solo QoS 0): lo justo para suscribirse a UN tema y publicar en él.
 * Sirve de "buzón" para las salas de escuchar juntos: no hay servidor propio ni base de datos, solo un broker público.
 * Sin dependencias, así el proyecto sigue siendo una app estática.
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

const u16 = (n: number): number[] => [(n >> 8) & 255, n & 255];
const str = (s: string): number[] => { const b = enc.encode(s); return [...u16(b.length), ...b]; };

function varLen(n: number): number[] {
  const o: number[] = [];
  do {
    let d = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) d |= 128;
    o.push(d);
  } while (n > 0);
  return o;
}

function packet(first: number, body: ArrayLike<number>): Uint8Array {
  const h = [first, ...varLen(body.length)];
  const out = new Uint8Array(h.length + body.length);
  out.set(h);
  out.set(body, h.length);
  return out;
}

export class Mqtt {
  /** llega el texto de cada mensaje publicado en el tema */
  onMessage: (text: string) => void = () => {};
  /** la conexión se cayó estando lista */
  onClose: () => void = () => {};

  private ws: WebSocket | null = null;
  private buf = new Uint8Array(0);
  private stage: 'connack' | 'suback' | 'ready' = 'connack';
  private pingTm = 0;
  private onReady: (() => void) | null = null;
  private onFail: ((e: Error) => void) | null = null;

  constructor(private clientId: string, private topic: string) {}

  get isReady(): boolean { return this.stage === 'ready' && !!this.ws && this.ws.readyState === 1; }

  /** abre la conexión, se suscribe al tema y resuelve cuando el broker confirma */
  connect(url: string, timeout = 7000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let ws: WebSocket;
      try { ws = new WebSocket(url, 'mqtt'); } catch (e) { reject(e as Error); return; }
      ws.binaryType = 'arraybuffer';
      this.ws = ws;
      this.buf = new Uint8Array(0);
      this.stage = 'connack';
      let settled = false;
      const to = window.setTimeout(() => fail(new Error('tiempo agotado')), timeout);
      const fail = (e: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(to);
        this.teardown(ws);
        reject(e);
      };
      this.onFail = fail;
      this.onReady = () => {
        if (settled) return;
        settled = true;
        clearTimeout(to);
        this.onFail = null;
        this.onReady = null;
        resolve();
      };
      ws.onopen = () => {
        ws.send(packet(0x10, [...str('MQTT'), 4, 0x02, ...u16(30), ...str(this.clientId)]));
      };
      ws.onmessage = (ev: MessageEvent) => {
        if (ws !== this.ws || !(ev.data instanceof ArrayBuffer)) return;
        this.feed(new Uint8Array(ev.data));
      };
      ws.onerror = () => { /* después llega onclose */ };
      ws.onclose = () => {
        if (ws !== this.ws) return;
        const wasReady = this.stage === 'ready';
        this.teardown(ws);
        if (wasReady) this.onClose(); else if (this.onFail) this.onFail(new Error('conexión cerrada'));
      };
    });
  }

  publish(text: string): void {
    if (!this.isReady || !this.ws) return;
    const t = str(this.topic), p = enc.encode(text);
    const body = new Uint8Array(t.length + p.length);
    body.set(t);
    body.set(p, t.length);
    try { this.ws.send(packet(0x30, body)); } catch { /* se cerrará solo */ }
  }

  close(): void {
    const ws = this.ws;
    if (!ws) return;
    try { if (ws.readyState === 1) ws.send(Uint8Array.of(0xe0, 0)); } catch { /* ya cerrado */ }
    this.teardown(ws);
  }

  /* ---------- interno ---------- */
  private teardown(ws: WebSocket): void {
    clearInterval(this.pingTm);
    this.pingTm = 0;
    if (this.ws === ws) this.ws = null;
    this.stage = 'connack';
    ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
    try { ws.close(); } catch { /* ya cerrado */ }
  }

  private feed(chunk: Uint8Array): void {
    const b = new Uint8Array(this.buf.length + chunk.length);
    b.set(this.buf);
    b.set(chunk, this.buf.length);
    let i = 0;
    while (b.length - i >= 2) {
      let j = i + 1, len = 0, mul = 1, complete = false;
      while (j < b.length) {
        const d = b[j++];
        len += (d & 127) * mul;
        if (!(d & 128)) { complete = true; break; }
        mul *= 128;
        if (mul > 128 * 128 * 128) { this.close(); return; } /* longitud inválida */
      }
      if (!complete || j + len > b.length) break;
      const first = b[i];
      const body = b.subarray(j, j + len);
      i = j + len;
      this.handle(first >> 4, first & 15, body);
      if (!this.ws) return;
    }
    this.buf = b.slice(i);
  }

  private handle(type: number, flags: number, body: Uint8Array): void {
    const ws = this.ws;
    if (!ws) return;
    if (type === 2) { /* CONNACK: [flags, código] */
      if (body[1] !== 0) { this.onFail?.(new Error('el broker rechazó la conexión')); return; }
      this.stage = 'suback';
      ws.send(packet(0x82, [...u16(1), ...str(this.topic), 0]));
    } else if (type === 9) { /* SUBACK: [id, id, código] */
      if (body[2] === 0x80) { this.onFail?.(new Error('suscripción rechazada')); return; }
      this.stage = 'ready';
      this.pingTm = window.setInterval(() => { try { if (ws.readyState === 1) ws.send(Uint8Array.of(0xc0, 0)); } catch { /* ignorar */ } }, 15000);
      this.onReady?.();
    } else if (type === 3) { /* PUBLISH */
      const qos = (flags >> 1) & 3;
      const tl = (body[0] << 8) | body[1];
      if (dec.decode(body.subarray(2, 2 + tl)) !== this.topic) return;
      const start = 2 + tl + (qos > 0 ? 2 : 0);
      this.onMessage(dec.decode(body.subarray(start)));
    }
    /* PINGRESP (13) y el resto se ignoran */
  }
}
