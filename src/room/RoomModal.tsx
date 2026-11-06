import { useState } from 'react';
import { Icon } from '../components/Icon';
import { cancelRoom, closeRoomUi, copyRoomCode, copyRoomLink, createRoom, fmtCode, joinRoom, leaveRoom, myId, setRoomName, setSyncLook, shareRoom, useRoom } from './room';

const field = 'w-full rounded-2xl bg-tint px-4 py-3 text-[16px] outline-none ring-1 ring-line focus:ring-2 focus:ring-acc';

/** ventana de "Escuchar juntos": crear sala, unirse con código o enlace, y ver quién está dentro */
export function RoomModal() {
  const open = useRoom((s) => s.open);
  const role = useRoom((s) => s.role);
  const code = useRoom((s) => s.code);
  const status = useRoom((s) => s.status);
  const members = useRoom((s) => s.members);
  const invite = useRoom((s) => s.invite);
  const name = useRoom((s) => s.name);
  const lag = useRoom((s) => s.lag);
  const syncLook = useRoom((s) => s.syncLook);
  const [typed, setTyped] = useState('');
  if (!open) return null;

  const nameInput = (
    <label className="mt-4 block">
      <span className="mb-1.5 block text-[13px] text-mut">Tu nombre en la sala</span>
      <input className={field} value={name} maxLength={24} placeholder="Invitado" autoComplete="off" onChange={(e) => setRoomName(e.target.value)} />
    </label>
  );

  let body;
  if (status === 'connecting') {
    body = (
      <>
        <p className="mt-4 text-[15px] text-mut">{role === 'none' ? 'Conectando…' : 'Buscando la sala…'}</p>
        <div className="mt-5 flex gap-2.5"><button className="btn flex-1" onClick={cancelRoom}>{role === 'none' ? 'Cancelar' : 'Salir de la sala'}</button></div>
      </>
    );
  } else if (role !== 'none') {
    body = (
      <>
        <div className="mt-4 rounded-2xl bg-tint p-4 text-center">
          <small className="text-mut">Código de la sala</small>
          <div className="mt-1 select-all font-mono text-[28px] font-bold tracking-[.18em]">{fmtCode(code)}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <button className="btn pri flex-1" onClick={() => void copyRoomLink()}>Copiar enlace</button>
          <button className="btn flex-1" onClick={() => void copyRoomCode()}>Copiar código</button>
          {typeof navigator.share === 'function' && <button className="btn flex-1" onClick={() => void shareRoom()}>Compartir…</button>}
        </div>
        <p className="mt-2 text-[13px] text-mut">Quien abra el enlace entra solo, sin escribir nada. El código sirve para pegarlo en “Unirme”.</p>
        <b className="mt-5 block text-[15px]">En la sala · {members.length}</b>
        <ul className="mt-2 space-y-1.5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-tint px-3.5 py-2.5">
              <span className="dot" />
              <span className="min-w-0 flex-1 truncate font-semibold">{m.name}{m.id === myId() ? ' (tú)' : ''}</span>
              {m.host && <small className="rounded-full bg-tint2 px-2.5 py-0.5 text-ink">anfitrión</small>}
            </li>
          ))}
        </ul>
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl bg-tint px-3.5 py-2.5">
          <input type="checkbox" className="h-4 w-4 shrink-0" style={{ accentColor: 'var(--acc)' }} checked={syncLook} onChange={(e) => setSyncLook(e.target.checked)} />
          <span className="min-w-0 flex-1 text-[14px] font-semibold">Colores compartidos<small className="block font-normal text-mut">Si alguien cambia el color o el tema, cambia para todos. Al salir vuelve el tuyo.</small></span>
        </label>
        <p className="mt-4 text-[13px] text-mut">
          Todos escuchan lo mismo a la vez. La música no pasa por el anfitrión: cada uno la recibe directo del servidor y la sala solo los mantiene sincronizados. Por eso aquí solo suena música del servidor.
          Cualquiera puede pausar, saltar canciones y agregar música a la cola (menú ⋯ de una canción).
          {role === 'host' ? ' Si sales tú, la sala se cierra.' : ' Si el anfitrión sale, la sala se cierra.'}
        </p>
        {role === 'guest' && lag > 0 && <p className="mt-2 text-[12px] text-mut">Latencia con la sala: {lag} ms</p>}
        <button className="btn mt-4 w-full" onClick={() => leaveRoom(role === 'host' ? 'Sala cerrada' : 'Saliste de la sala')}>{role === 'host' ? 'Cerrar sala' : 'Salir de la sala'}</button>
      </>
    );
  } else if (invite) {
    body = (
      <>
        <p className="mt-4 text-[15px]">Te invitaron a escuchar juntos. Entrarás a la sala <b className="font-mono tracking-widest">{fmtCode(invite)}</b> y sonará lo mismo que a los demás.</p>
        {nameInput}
        <div className="mt-5 flex gap-2.5">
          <button className="btn" onClick={closeRoomUi}>Ahora no</button>
          <button className="btn pri flex-1" onClick={() => void joinRoom(invite)}>Entrar a la sala</button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p className="mt-4 text-[15px] text-mut">Crea una sala y escuchen las mismas canciones al mismo tiempo. Todos pueden agregar música a la cola.</p>
        {nameInput}
        <button className="btn pri mt-4 w-full" onClick={() => void createRoom()}>Crear sala</button>
        <div className="my-5 flex items-center gap-3 text-[13px] text-mut"><i className="h-px flex-1 bg-line" />o únete con un código<i className="h-px flex-1 bg-line" /></div>
        <div className="flex gap-2.5">
          <input
            className={field} value={typed} placeholder="Pega el código o el enlace" autoComplete="off" autoCapitalize="characters" spellCheck={false}
            onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void joinRoom(typed); }}
          />
          <button className="btn pri" onClick={() => void joinRoom(typed)}>Unirme</button>
        </div>
      </>
    );
  }

  return (
    <div id="room" className="ovl" onClick={(e) => { if (e.target === e.currentTarget) closeRoomUi(); }}>
      <div className="card" role="dialog" aria-label="Escuchar juntos">
        <i className="handle" />
        <div className="mh flex items-center gap-3">
          <i className="mi"><Icon name="users" size={19} /></i>
          <b className="flex-1 text-[18px]">Escuchar juntos</b>
          <button className="rb" onClick={closeRoomUi} aria-label="Cerrar"><Icon name="close" size={20} /></button>
        </div>
        {body}
      </div>
    </div>
  );
}
