import type { Track } from '../types';

/** Lo que un invitado le pide al anfitrión de la sala. */
export type RoomCmd =
  | { a: 'play'; t: Track }
  | { a: 'seek'; p: number }
  | { a: 'resume' | 'pause' | 'next' | 'prev' };

/**
 * Puente entre el reproductor y la sala. El reproductor solo conoce este objeto (así no hay dependencias circulares):
 * la sala (room.ts) rellena `cmd` y `loaded` al arrancar y mantiene `role`, `code` y `playing`.
 *
 *  - role: 'none' (solo), 'host' (creó la sala: su reproductor manda) o 'guest' (sigue al anfitrión y le pide los cambios).
 *  - applying: true mientras la sala aplica un estado recibido (esa carga no se reenvía como petición).
 *  - playing: si la sala está sonando según el último estado del anfitrión.
 */
export const rm = {
  role: 'none' as 'none' | 'host' | 'guest',
  code: '',
  applying: false,
  playing: false,
  cmd: (_c: RoomCmd): void => {},
  loaded: (_t: Track, _play: boolean, _pos: number): void => {},
};
