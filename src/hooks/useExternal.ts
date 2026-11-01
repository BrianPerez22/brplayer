import { useSyncExternalStore } from 'react';
import * as AE from '../audio/engine';
import { vz, type VzUi } from '../visualizer/vz';
import { au } from '../audio/element';
import { useEffect, useState } from 'react';
import { onSync } from '../audio/sync';

/** estado del ecualizador (se repinta al cambiar cualquier ajuste) */
export function useEq(): AE.EqState {
  useSyncExternalStore(AE.eqSubscribe, AE.eqVersion);
  return AE.S;
}

/** estado de interfaz del visualizador */
export function useVz(): VzUi {
  return useSyncExternalStore(vz.subscribe, vz.snapshot);
}

/** posición y duración del audio (≈4 veces por segundo) */
export function useAudioTime(): { time: number; duration: number } {
  const [v, setV] = useState({ time: au.currentTime || 0, duration: au.duration || 0 });
  useEffect(() => {
    const f = () => setV((p) => (p.time === au.currentTime && p.duration === au.duration ? p : { time: au.currentTime || 0, duration: au.duration || 0 }));
    const evs = ['timeupdate', 'loadedmetadata', 'durationchange', 'seeked', 'emptied'];
    evs.forEach((e) => au.addEventListener(e, f));
    const off = onSync(f);
    f();
    return () => { evs.forEach((e) => au.removeEventListener(e, f)); off(); };
  }, []);
  return v;
}
