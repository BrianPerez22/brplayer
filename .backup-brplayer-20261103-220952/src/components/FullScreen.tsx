import { useEffect, useRef } from 'react';
import { set, useStore } from '../store/useStore';
import { Icon } from './Icon';
import { Controls } from './Controls';
import { ProgressBar } from './ProgressBar';
import { Orb } from './Orb';
import { VolumeWidget } from './VolumeWidget';
import { FavButton, InfoButton, NowTitle, ShareButton } from './NowInfo';
import { GIF } from '../lib/util';
import { vz } from '../visualizer/vz';
import { useVz } from '../hooks/useExternal';
import { toggle } from '../audio/player';
import * as AE from '../audio/engine';
import { cycleViz } from '../lib/vizActions';

/** Pantalla completa: carátula o visualizador (14 modos), con modo inmersivo y HUD */
export function FullScreen() {
  const open = useStore((s) => s.fsOpen);
  const cover = useStore((s) => s.coverSrc);
  const t = useStore((s) => s.tracks[s.cur]);
  const playing = useStore((s) => s.playing);
  const ui = useVz();
  const fs = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => vz.attach(canvas.current as HTMLCanvasElement, stage.current as HTMLElement, fs.current as HTMLElement), []);
  useEffect(() => { if (open) vz.open(); else vz.close(); }, [open]);
  /* al cambiar de canción en modo inmersivo, el HUD se muestra un momento */
  useEffect(() => { vz.peekHud(); }, [t?.title, cover]);

  const close = () => set({ fsOpen: false });

  return (
    <div id="fs" ref={fs} hidden={!open} className={`${ui.imm ? 'imm' : ''} ${ui.hud ? 'hud' : ''}`}>
      <div className="top flex w-full justify-between">
        <button className="ib" onClick={close} aria-label="Cerrar"><Icon name="down" size={28} /></button>
        <span className="flex items-center">
          <button className="ib" onClick={() => { AE.init(); set({ eqOpen: true }); }} aria-label="Ecualizador"><Icon name="eq" size={24} /></button>
          <button className="ib" onClick={vz.menu} aria-label="Visualizaciones"><Icon name="viz" size={24} /></button>
          <button className="ib" onClick={() => vz.imm()} aria-label="Visualización a pantalla completa"><Icon name="full" size={24} /></button>
          <VolumeWidget className="fsv" />
          <FavButton size={24} />
          <ShareButton size={24} />
          <InfoButton size={24} />
        </span>
      </div>

      <div
        id="stage" ref={stage} className={ui.viz ? 'v' : ''} data-crt={ui.crt ? '' : undefined}
        onPointerDown={(e) => vz.pointer.down(e.nativeEvent)}
        onPointerUp={(e) => vz.pointer.up(e.nativeEvent)}
        onPointerCancel={() => vz.pointer.cancel()}
        onPointerMove={(e) => vz.pointer.move(e.nativeEvent)}
      >
        <img id="fcv" className="cv" src={cover || GIF} alt="" />
        <canvas id="vz" ref={canvas} />
        <div id="vlab" className={ui.showLabel ? 'show' : ''}>{ui.label}</div>
        <div id="vmini">
          <img className="cv" src={cover || GIF} alt="" />
          <div className="tx"><b>{t?.title}</b><small>{t ? [t.artist, t.album].filter(Boolean).join(' · ') || t.name : ''}</small></div>
        </div>
        <div id="vhud">
          <Orb onTap={cycleViz} />
          <div className="tx"><b>{ui.name}</b></div>
          <button className="ib b-pp" onClick={toggle} aria-label="Play/Pausa"><Icon name={playing ? 'pause' : 'play'} size={28} /></button>
          <button className="ib" onClick={() => vz.imm(false)} aria-label="Salir de pantalla completa"><Icon name="close" size={22} /></button>
        </div>
      </div>

      <div className="meta w-full text-center">
        <NowTitle idPrefix="f" />
      </div>
      <div className="bt w-full max-w-[420px]">
        <ProgressBar />
        <Controls big />
        <Orb onTap={cycleViz} className="!mt-1.5" />
      </div>
    </div>
  );
}
