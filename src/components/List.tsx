import { useEffect, useMemo, useRef } from 'react';
import type { Playlist, Track } from '../types';
import { useStore, set, S, type State } from '../store/useStore';
import { ctxFor, favTracks, grpOrdered, isGrp, isOff, listFor, plTracks } from '../store/selectors';
import { GIF, key, matches, nCan, nk, shuffled } from '../lib/util';
import { Icon } from './Icon';
import { TrackRow, rowProps } from './TrackRow';
import { Bar2, Carousel, Spacer } from './Carousel';
import { Hero } from './Hero';
import { ensureThumb, wantBig } from '../lib/thumbs';
import { playFromQueue, playList, playPl, playSingle, setQueue } from '../audio/player';
import { addToPlaylist, groupBack, newPlaylist, playFavs, playGroup, playlistMenu, rowMenu, toggleFav } from '../lib/actions';
import { sharePlaylist } from '../lib/links';
import { refreshLib, setOnlyOff } from '../lib/library';
import { useListGestures } from '../hooks/useListGestures';

/** props comunes de una fila */
function useRow() {
  const cur = useStore((s) => s.cur);
  const sel = useStore((s) => s.sel);
  const tracks = useStore((s) => s.tracks);
  const favs = useStore((s) => s.favs);
  const stats = useStore((s) => s.stats);
  const off = useStore((s) => isOff(s));
  useStore((s) => s.rev); // repintar al cambiar etiquetas y carátulas
  const favSet = useMemo(() => new Set(favs), [favs]);
  return (t: Track, extra: { k?: number; count?: number; add?: boolean } = {}) => {
    const i = tracks.indexOf(t), kk = key(t);
    return <TrackRow key={`${extra.k ?? ''}:${kk}`} {...rowProps(t, { i, current: i === cur, selected: sel.has(t), unavailable: t.remote && off, faved: favSet.has(kk), plays: stats[kk]?.n })} {...extra} />;
  };
}

/** lista de filas dentro de una tarjeta redondeada */
const Rows = ({ children }: { children: React.ReactNode }) => <div className="tl">{children}</div>;

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div id="empty"><i className="eic"><Icon name="note" size={26} /></i><div>{children}</div></div>
);

/** recomendaciones de una playlist: 5 canciones al azar que no están en ella; al agregar una se conservan las demás */
function useRecs(plId: string | null, items: string[] | undefined, tracks: Track[], nonce: number): Track[] {
  const kept = useRef<{ id: string | null; list: Track[]; nonce: number }>({ id: null, list: [], nonce: 0 });
  return useMemo(() => {
    if (!plId || !items) return [];
    const inP = new Set(items);
    const k = kept.current;
    if (k.id !== plId || k.nonce !== nonce) { k.id = plId; k.nonce = nonce; k.list = []; }
    let recs = k.list.filter((t) => tracks.includes(t) && !inP.has(key(t)));
    if (recs.length < 5) {
      const pool = shuffled(tracks.filter((t) => !inP.has(key(t)) && !recs.includes(t)));
      recs = recs.concat(pool.slice(0, 5 - recs.length));
    }
    k.list = recs;
    return recs;
  }, [plId, items, tracks, nonce]);
}

/* ---------- Biblioteca, cola y playlist ---------- */
function PlainView({ s, row }: { s: State; row: ReturnType<typeof useRow> }) {
  const { view, tracks, loading, srvErr, onlyOff, query } = s;
  const plId = view.startsWith('pl:') ? view.slice(3) : null;
  const pl = plId ? (s.pls.find((p) => p.id === plId) as Playlist | undefined) : undefined;
  const recs = useRecs(plId, pl?.items, tracks, s.recNonce);
  useEffect(() => { if (plId && !pl) set({ view: 'pls' }); }, [plId, pl]);
  if (plId && !pl) return null;

  const entries = listFor(s);
  let msg: React.ReactNode;
  if (view === 'queue') msg = <>La cola está vacía.<br />Usa el botón de tres puntos de una canción para agregarla.</>;
  else if (plId) msg = <>Esta playlist está vacía.<br />Agrega canciones desde el botón de tres puntos.</>;
  else if (!tracks.length) {
    msg = loading ? 'Cargando biblioteca…' : srvErr
      ? <>No se pudo cargar la biblioteca del servidor.<br /><small>{srvErr}</small><br /><br /><button className="pill pri" onClick={() => void refreshLib(false)}>Reintentar</button><br /><br />También puedes usar el menú → <b>Añadir canciones</b> para usar archivos del dispositivo.</>
      : <>No hay canciones.<br />Abre el menú y elige <b>Añadir canciones</b> para importar archivos.</>;
  } else msg = onlyOff && !tracks.some((t) => !t.remote)
    ? <>No hay canciones offline.<br />Usa el menú → <b>Añadir canciones</b> para guardar archivos en este dispositivo.</>
    : 'Sin resultados.';

  return (
    <>
      {view === 'lib' && !query && <Hero />}
      {view === 'lib' && (
        <Bar2>
          <b>{query ? 'Resultados' : 'Biblioteca'}</b>{tracks.length > 0 && <span className="cnt">{query ? entries.length : tracks.length}</span>}
          <Spacer />
          {onlyOff && <button className="pill" onClick={() => setOnlyOff(false)}>Solo offline · Ver todas</button>}
        </Bar2>
      )}
      {view === 'queue' && (
        <Bar2><b>Cola de reproducción</b>{s.queue.length > 0 && <span className="cnt">{s.queue.length}</span>}<Spacer />{s.queue.length > 0 && <button className="pill" onClick={() => setQueue([])}>Vaciar</button>}</Bar2>
      )}
      {pl && (
        <Bar2>
          <button className="rb" onClick={() => set({ view: 'pls' })} aria-label="Volver"><Icon name="back" size={20} /></button>
          <b>{pl.name}</b><span className="cnt">{pl.items.length}</span><Spacer />
          <button className="pill pri" onClick={() => playPl(pl.id)}><Icon name="play" size={16} />Reproducir</button>
          <button className="rb" onClick={() => void sharePlaylist(pl.id)} aria-label="Compartir playlist"><Icon name="share" size={19} /></button>
        </Bar2>
      )}
      {entries.length ? <Rows>{entries.map(({ t, k }) => row(t, { k }))}</Rows> : <Empty>{msg}</Empty>}
      {pl && recs.length > 0 && (
        <>
          <Bar2><b>Recomendaciones</b><Spacer />
            <button className="rb" onClick={() => set((st) => ({ recNonce: st.recNonce + 1 }))} aria-label="Otras recomendaciones"><Icon name="dice" size={20} /></button>
          </Bar2>
          <Rows>{recs.map((t) => row(t, { add: true }))}</Rows>
        </>
      )}
    </>
  );
}

/* ---------- Recientes y más escuchadas ---------- */
function RecentView({ s, row }: { s: State; row: ReturnType<typeof useRow> }) {
  const { tracks, stats, sel, query } = s;
  const m = new Map(tracks.map((t) => [key(t), t]));
  const ent = Object.entries(stats).map(([k, st]) => ({ tr: m.get(k), n: st.n, ts: st.ts })).filter((e): e is { tr: Track; n: number; ts: number } => !!e.tr && e.n > 0 && matches(e.tr, query));
  const rec = [...ent].sort((a, b) => b.ts - a.ts).slice(0, 5);
  const top = [...ent].sort((a, b) => b.n - a.n || b.ts - a.ts).slice(0, 10);
  useEffect(() => { top.forEach((e) => { ensureThumb(e.tr); wantBig(e.tr); }); });
  if (!ent.length) {
    return (
      <>
        <Bar2><b>Reproducidas recientemente</b></Bar2>
        <Empty>{query ? 'Sin resultados.' : <>Aún no has reproducido canciones.<br />Aquí verás las últimas y las más escuchadas.</>}</Empty>
      </>
    );
  }
  return (
    <>
      <Bar2><b>Reproducidas recientemente</b><Spacer />
        <button className="pill" onClick={() => { if (confirm('¿Borrar el historial de reproducciones?')) set({ stats: {} }); }}>Limpiar</button>
      </Bar2>
      <Rows>{rec.map((e) => row(e.tr, { count: e.n }))}</Rows>
      <Bar2><b>Más escuchadas</b></Bar2>
      <Carousel>
        {top.map((e, r) => (
          <div key={key(e.tr)} className={`ci ${sel.has(e.tr) ? 'sel' : ''}`} data-i={tracks.indexOf(e.tr)}>
            <div className="cw"><img className="cv" src={e.tr.thumbL || e.tr.thumb || GIF} alt="" /><span className="rk">{r + 1}</span></div>
            <b>{e.tr.title}</b><small>{e.n}× reproducida{e.n === 1 ? '' : 's'}</small>
          </div>
        ))}
      </Carousel>
    </>
  );
}

/* ---------- Favoritos y playlists ---------- */
function FavView({ s, row }: { s: State; row: ReturnType<typeof useRow> }) {
  const { pls, favs, query } = s;
  const fa = favTracks(s).filter((t) => matches(t, query));
  const covers = pls.map((p) => plTracks(p.id, s)[0]);
  useEffect(() => { covers.forEach((f) => { if (f) { ensureThumb(f); wantBig(f); } }); });
  return (
    <>
      <Bar2><b>Playlists</b>{pls.length > 0 && <span className="cnt">{pls.length}</span>}</Bar2>
      <Carousel>
        {pls.map((p, n) => {
          const f = covers[n];
          return (
            <div key={p.id} className="ci" onClick={() => set({ view: 'pl:' + p.id, recFor: '' })}>
              <div className="cw">
                <img className="cv" src={f ? f.thumbL || f.thumb || GIF : GIF} alt="" />
                <button className="pm" onClick={(e) => { e.stopPropagation(); playlistMenu(p.id); }} aria-label="Opciones"><Icon name="more" size={18} /></button>
              </div>
              <b>{p.name}</b><small>{nCan(p.items.length)}</small>
            </div>
          );
        })}
        <div className="ci" onClick={() => newPlaylist()}>
          <div className="cw nw"><Icon name="plus" size={30} /></div><b>Nueva</b><small>Crear playlist</small>
        </div>
      </Carousel>
      <Bar2>
        <b>Mis favoritas</b>{favs.length > 0 && <span className="cnt">{favs.length}</span>}<Spacer />
        {fa.length > 0 && (
          <>
            <button className="pill pri" onClick={() => playFavs(false)}><Icon name="play" size={16} />Reproducir</button>
            <button className="rb" onClick={() => playFavs(true)} aria-label="Aleatorio"><Icon name="shuf" size={20} /></button>
          </>
        )}
      </Bar2>
      {fa.length
        ? <Rows>{fa.map((t) => row(t))}</Rows>
        : <Empty>{query ? 'Sin resultados.' : <>Aún no tienes canciones favoritas.<br />Toca el corazón del reproductor o de una canción.</>}</Empty>}
    </>
  );
}

/* ---------- Página de artista / álbum ---------- */
function GroupView({ s, row }: { s: State; row: ReturnType<typeof useRow> }) {
  const { view, query, scanning } = s;
  const isA = view.startsWith('ar:'), name = view.slice(3);
  const all = grpOrdered(view, s.tracks);
  const a = all.filter((t) => matches(t, query));
  useEffect(() => { all.slice(0, 4).forEach((t) => ensureThumb(t)); });

  const cover = (ts: Track[]) => {
    const f = ts.find((t) => t.thumbL || t.thumb) || ts[0];
    if (f) { ensureThumb(f); wantBig(f); }
    return f ? f.thumbL || f.thumb || GIF : GIF;
  };

  let meta: React.ReactNode;
  let extra: React.ReactNode = null;
  if (isA) {
    const m = new Map<string, { n: string; ts: Track[] }>();
    all.forEach((t) => { if (t.album) { const k = nk(t.album); if (!m.has(k)) m.set(k, { n: t.album, ts: [] }); m.get(k)!.ts.push(t); } });
    meta = nCan(all.length) + (m.size ? ` · ${m.size} álbum${m.size > 1 ? 'es' : ''}` : '');
    if (m.size > 1) {
      extra = (
        <>
          <Bar2><b>Álbumes</b></Bar2>
          <Carousel>
            {[...m.values()].map((g) => (
              <div key={g.n} className="ci" data-al={g.n}>
                <div className="cw"><img className="cv" src={cover(g.ts)} alt="" /></div><b>{g.n}</b><small>{nCan(g.ts.length)}</small>
              </div>
            ))}
          </Carousel>
        </>
      );
    }
  } else {
    const ar = [...new Set(all.map((t) => t.artist).filter(Boolean))];
    meta = <>{ar.length === 1 ? <><span className="lk" data-ar={ar[0]}>{ar[0]}</span> · </> : ar.length > 1 ? 'Varios artistas · ' : ''}{nCan(all.length)}</>;
  }

  return (
    <>
      <Bar2>
        <button className="rb" onClick={groupBack} aria-label="Volver"><Icon name="back" size={20} /></button>
        <span className="text-mut">{isA ? 'Artista' : 'Álbum'}</span>
      </Bar2>
      <div className="gh">
        <img className="cv" src={cover(all)} alt="" />
        <div className="tx">
          <b>{name}</b>
          <small>{meta}</small>
          {all.length > 0 && (
            <div className="gb">
              <button className="btn pri" onClick={() => playGroup(false)}><Icon name="play" size={18} />Reproducir</button>
              <button className="btn" onClick={() => playGroup(true)}><Icon name="shuf" size={18} />Aleatorio</button>
            </div>
          )}
        </div>
      </div>
      {extra}
      <Bar2><b>Canciones</b><span className="cnt">{a.length}</span></Bar2>
      {a.length ? <Rows>{a.map((t) => row(t))}</Rows> : <Empty>{scanning ? 'Leyendo datos de las canciones…' : 'No hay canciones.'}</Empty>}
    </>
  );
}

/* ---------- Contenedor ---------- */
export function List() {
  const ref = useRef<HTMLDivElement>(null);
  const s = useStore();
  const row = useRow();
  useListGestures(ref);

  const onClick = (e: React.MouseEvent) => {
    const g = (sel: string) => (e.target as HTMLElement).closest<HTMLElement>(sel);
    if (g('[data-ar],[data-al]')) return; /* artista / álbum: lo gestiona el listener global */
    let x: HTMLElement | null;
    const st = S();
    if ((x = g('[data-ap]'))) {
      const t = st.tracks[+(x.dataset.ap as string)], p = st.pls.find((q) => q.id === st.view.slice(3));
      if (t && p) addToPlaylist(p, t);
      return;
    }
    if ((x = g('[data-fv]'))) { const t = st.tracks[+(x.dataset.fv as string)]; if (t) toggleFav(t); return; }
    if ((x = g('[data-m]'))) { void rowMenu(+(x.dataset.m as string)); return; }
    if ((x = g('[data-qr]'))) { setQueue(st.queue.filter((_, k) => k !== +(x!.dataset.qr as string))); return; }
    const r = g('[data-i]');
    if (!r) return;
    const t = st.tracks[+(r.dataset.i as string)];
    if (!t) return;
    const cx = ctxFor(st), arr = cx ? cx.arr : [], k = arr.indexOf(t);
    if (cx && k >= 0) playList(arr, k, cx.id);
    else if (st.view === 'queue') playFromQueue(+(r.dataset.qi as string), +(r.dataset.i as string));
    else playSingle(+(r.dataset.i as string));
  };

  let body: React.ReactNode;
  if (s.view === 'pls') body = <FavView s={s} row={row} />;
  else if (isGrp(s.view)) body = <GroupView s={s} row={row} />;
  else if (s.view === 'recent') body = <RecentView s={s} row={row} />;
  else body = <PlainView s={s} row={row} />;

  return (
    <div id="list" ref={ref} onClick={onClick} className="wrap [touch-action:pan-y]">
      {body}
    </div>
  );
}
