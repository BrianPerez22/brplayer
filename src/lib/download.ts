import type { Track } from '../types';
import { MIME, extOf, standalone } from './util';
import { cachedBlob } from './audioCache';
import { makeZip } from './zip';
import { openSheet, toast } from '../store/useStore';

/** Descargar canciones del servidor al dispositivo: guarda el archivo original en Descargas / app Archivos. */
const dling = new Set<Track>();
let dlBusy = false;

const dlExt = (name: string): string => { const e = extOf(/\.[A-Za-z0-9]{2,5}$/.test(name) ? name : ''); return MIME[e] ? e : ''; };

/** nombre de archivo seguro; si el servidor no incluye extensión se deduce del tipo MIME */
function dlName(t: Track): string {
  // eslint-disable-next-line no-control-regex
  let n = String(t.name || t.title || 'cancion').split(/[\\/]/).pop()!.replace(/[\u0000-\u001f<>:"|?*]/g, '_').trim() || 'cancion';
  if (!dlExt(n)) {
    const mt = String(t.mime || '').split(';')[0].trim();
    const e = Object.keys(MIME).find((k) => MIME[k].split(';')[0] === mt);
    n += '.' + (e || 'mp3');
  }
  return n;
}

/** Usa la copia de la precarga si existe (no gasta datos); si no, descarga el archivo mostrando el progreso */
async function dlFetch(t: Track, on?: (got: number, total: number) => void): Promise<Blob> {
  const cb = await cachedBlob(t.url as string);
  if (cb && cb.size) { on?.(1, 1); return cb; }
  const r = await fetch(t.url as string);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const total = +(r.headers.get('content-length') || 0) || t.size || 0;
  const type = r.headers.get('content-type') || '';
  if (!r.body || !r.body.getReader) return r.blob();
  const rd = r.body.getReader(), parts: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await rd.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    on?.(got, total);
  }
  return new Blob(parts as BlobPart[], { type });
}

function saveBlob(blob: Blob, name: string): void {
  const u = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = u; a.download = name; a.hidden = true;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 120000);
}

/** En la app instalada (iOS) los enlaces de descarga no funcionan: se usa la hoja de compartir ("Guardar en Archivos") */
async function saveFile(blob: Blob, name: string, title: string): Promise<'ok' | 'cancel' | 'ask'> {
  if (standalone() && navigator.canShare && navigator.share) {
    let f: File | null = null;
    try { f = new File([blob], name, { type: blob.type }); } catch { /* sin File */ }
    if (f && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title }); return 'ok'; }
      catch (e) { return (e as Error)?.name === 'AbortError' ? 'cancel' : 'ask'; } /* sin gesto reciente: se pide un toque */
    }
  }
  saveBlob(blob, name);
  return 'ok';
}

/** Safari exige un toque nuevo para abrir la hoja de compartir: se ofrece un botón */
function askSave(blob: Blob, name: string, title: string): void {
  openSheet('Descarga lista', [[`Guardar «${title}»`, 'dlf', async () => {
    try {
      const f = new File([blob], name, { type: blob.type });
      await navigator.share({ files: [f], title });
      toast('Guardada: ' + name);
    } catch (e) {
      if (!e || (e as Error).name !== 'AbortError') { saveBlob(blob, name); toast('Descargada: ' + name); }
    }
  }]]);
}

export async function downloadTrack(t: Track | undefined): Promise<void> {
  if (!t) { toast('No hay canción seleccionada'); return; }
  if (!t.remote) { toast('Esta canción ya está en este dispositivo'); return; }
  if (dling.has(t)) { toast('Ya se está descargando: ' + t.title); return; }
  dling.add(t);
  let last = 0;
  const name = dlName(t);
  try {
    toast('Descargando: ' + t.title + '…');
    const raw = await dlFetch(t, (g, tot) => {
      const n = Date.now();
      if (n - last < 350) return;
      last = n;
      toast((tot ? 'Descargando ' + Math.min(100, Math.round((g / tot) * 100)) + '%' : 'Descargando ' + (g / 1048576).toFixed(1) + ' MB') + ' · ' + t.title);
    });
    if (!raw.size) throw new Error('Archivo vacío');
    const blob = new Blob([raw], { type: MIME[dlExt(t.name)] || raw.type || 'audio/mpeg' });
    const r = await saveFile(blob, name, t.title);
    if (r === 'ask') askSave(blob, name, t.title);
    else if (r === 'ok') toast('Descargada: ' + name);
  } catch {
    toast(navigator.onLine === false ? 'Sin conexión: no se puede descargar' : 'No se pudo descargar: ' + t.title);
  } finally { dling.delete(t); }
}

/** Varias canciones: un único ZIP */
export async function downloadMany(list: Track[]): Promise<void> {
  const srv = [...new Set((list || []).filter((t) => t && t.remote))];
  if (!srv.length) { toast('Las canciones elegidas ya están en este dispositivo'); return; }
  if (srv.length === 1) return downloadTrack(srv[0]);
  if (dlBusy) { toast('Ya hay una descarga múltiple en curso'); return; }
  const est = srv.reduce((a, t) => a + (t.size || 0), 0);
  if (est > 400 * 1048576 && !confirm(`La selección pesa unos ${Math.round(est / 1048576)} MB y se prepara en la memoria del dispositivo. ¿Continuar?`)) return;
  dlBusy = true;
  const files: Array<{ name: string; blob: Blob }> = [];
  const used = new Set<string>();
  let fails = 0;
  try {
    for (let i = 0; i < srv.length; i++) {
      const t = srv[i];
      let last = 0;
      try {
        toast(`Descargando ${i + 1}/${srv.length} · ${t.title}`);
        const raw = await dlFetch(t, (g, tot) => {
          const n = Date.now();
          if (n - last < 400) return;
          last = n;
          toast(`Descargando ${i + 1}/${srv.length}${tot ? ' · ' + Math.min(100, Math.round((g / tot) * 100)) + '%' : ''} · ${t.title}`);
        });
        if (!raw.size) throw new Error('vacío');
        const base = dlName(t), m = /^(.*?)(\.[^.]+)?$/.exec(base) as RegExpExecArray;
        let n = base, k = 1;
        while (used.has(n.toLowerCase())) n = `${m[1]} (${++k})${m[2] || ''}`;
        used.add(n.toLowerCase());
        files.push({ name: n, blob: raw });
      } catch { fails++; }
    }
    if (!files.length) { toast(navigator.onLine === false ? 'Sin conexión: no se puede descargar' : 'No se pudo descargar ninguna canción'); return; }
    toast('Preparando el ZIP…');
    const z = await makeZip(files);
    const name = `canciones-${new Date().toLocaleDateString('en-CA')} (${files.length}).zip`;
    const r = await saveFile(z, name, 'Canciones');
    if (r === 'ask') askSave(z, name, files.length + ' canciones');
    else if (r === 'ok') toast(`ZIP listo: ${files.length}${files.length === 1 ? ' canción' : ' canciones'}${fails ? ' · ' + fails + ' fallaron' : ''}`);
  } catch { toast('No se pudo preparar la descarga'); } finally { dlBusy = false; }
}
