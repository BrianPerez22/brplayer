import { useEffect } from 'react';
import { closeSheet, set, useStore } from '../store/useStore';
import { Icon } from './Icon';
import { downloadTrack } from '../lib/download';
import { S } from '../store/useStore';

/** aviso breve (se oculta solo a los 3 s): arriba en móvil, arriba a la derecha en escritorio */
export function Toast() {
  const t = useStore((s) => s.toastMsg);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => set({ toastMsg: null }), 3000);
    return () => clearTimeout(id);
  }, [t]);
  if (!t) return <div id="toast" />;
  return (
    <div id="toast" key={t.n} role="status" style={{ display: 'flex' }}>
      <Icon name="sparkle" size={17} /><span>{t.text}</span>
    </div>
  );
}

/** hoja de acciones: desde abajo en móvil, diálogo centrado en pantallas anchas */
export function Sheet() {
  const sheet = useStore((s) => s.sheet);
  if (!sheet) return null;
  return (
    <div id="sheet" className="ovl" onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}>
      <div className="card" role="dialog" aria-label={sheet.title}>
        <i className="handle" />
        <b id="sht">{sheet.title}</b>
        <div className="sbl">
          {sheet.items.map(([label, icon, run], k) => (
            <button key={k} className="sb" onClick={() => { closeSheet(); run(); }}><i className="mi"><Icon name={icon} size={19} /></i><span>{label}</span></button>
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
    <div id="inf" className="ovl" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="card" role="dialog" aria-label="Información de la canción">
        <i className="handle" />
        <div className="mh"><b>Información de la canción</b><button className="rb" onClick={close} aria-label="Cerrar"><Icon name="close" size={20} /></button></div>
        <dl id="ib">
          {info.rows.map(([k, v]) => (<div key={k + v}><dt>{k}</dt><dd>{v}</dd></div>))}
        </dl>
        {info.canDownload && (
          <button className="sb" onClick={() => { close(); void downloadTrack(S().tracks[S().cur]); }}><i className="mi"><Icon name="dlf" size={19} /></i><span>Descargar al dispositivo</span></button>
        )}
      </div>
    </div>
  );
}
