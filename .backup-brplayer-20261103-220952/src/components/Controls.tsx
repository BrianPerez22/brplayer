import { useStore } from '../store/useStore';
import { Icon } from './Icon';
import { cycleRepeat, next, prev, toggle, toggleShuffle } from '../audio/player';

/** barra de controles (aleatorio, anterior, play/pausa, siguiente, repetir); la usan la barra inferior y la pantalla completa */
export function Controls({ big = false }: { big?: boolean }) {
  const shuffle = useStore((s) => s.shuffle);
  const repeat = useStore((s) => s.repeat);
  const playing = useStore((s) => s.playing);
  const sm = big ? 26 : 24, md = big ? 30 : 26;
  return (
    <div className="ct">
      <button className={`b-shuf ${shuffle ? 'on' : ''}`} onClick={toggleShuffle} aria-label="Aleatorio"><Icon name="shuf" size={sm} /></button>
      <button onClick={prev} aria-label="Anterior"><Icon name="prev" size={md} /></button>
      <button className="b-pp" onClick={toggle} aria-label="Play/Pausa"><Icon name={playing ? 'pause' : 'play'} size={28} /></button>
      <button onClick={() => next(false)} aria-label="Siguiente"><Icon name="next" size={md} /></button>
      <button className={`b-rep ${repeat > 0 ? 'on' : ''}`} onClick={cycleRepeat} aria-label="Repetir"><Icon name={repeat === 2 ? 'rep1' : 'rep'} size={sm} /></button>
    </div>
  );
}
