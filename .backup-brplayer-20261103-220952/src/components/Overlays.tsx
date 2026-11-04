import { useEffect } from 'react';
import { closeSheet, set, useStore } from '../store/useStore';
import { Icon } from './Icon';
import { downloadTrack } from '../lib/download';
import { S } from '../store/useStore';

/** aviso breve arriba (se oculta solo a los 3 s) */
export function Toast() {
  const t = useStore((s) => s.toastMsg);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => set({ toastMsg: null }), 3000);
    return () => clearTimeout(id);
  }, [t]);
  if (!t) return <div id="toast" />;
  return <div id="toast" style={{ display: 'block' }}>{t.text}</div>;
}

/** hoja inferior con acciones */
export function Sheet() {
  const sheet = useStore((s) => s.sheet);
  if (!sheet) return null;
  return (
    <div id="sheet" className="ovl" onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}>
      <div className="card">
        <b id="sht" className="block truncate">{sheet.title}</b>
        <div>
          {sheet.items.map(([label, icon, run], k) => (
            <button key={k} className="sb" onClick={() => { closeSheet(); run(); }}><Icon name={icon} size={20} />{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** ficha de información de la canción */
export function InfoModal() {
  const info = useStore((s) => s.info);
  if (!info) return null;
  const close = () => set({ info: null });
  return (
    <div id="inf" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="card">
        <div className="mh"><b>Información de la canción</b><button className="ib" onClick={close} aria-label="Cerrar"><Icon name="close" /></button></div>
        <dl id="ib">
          {info.rows.map(([k, v]) => (<div key={k + v}><dt>{k}</dt><dd>{v}</dd></div>))}
        </dl>
        {info.canDownload && (
          <button className="sb" onClick={() => { close(); void downloadTrack(S().tracks[S().cur]); }}><Icon name="dlf" size={20} />Descargar al dispositivo</button>
        )}
      </div>
    </div>
  );
}
