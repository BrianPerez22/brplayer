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
 *  - look: true mientras los colores de la sala mandan sobre los propios (no se guardan en este dispositivo).
 *  - defer: el reproductor del anfitrión la llama al cargar una canción; si devuelve true, la sala se encarga de darle
 *    al play en un instante acordado con todos (así nadie arranca antes que los demás).
 *  - cancel: el anfitrión pausó mientras había un arranque pendiente.
 */
export const rm = {
  role: 'none' as 'none' | 'host' | 'guest',
  code: '',
  applying: false,
  playing: false,
  look: false,
  defer: (_t: Track, _pos: number): boolean => false,
  cancel: (): void => {},
  cmd: (_c: RoomCmd): void => {},
  loaded: (_t: Track, _play: boolean, _pos: number): void => {},
};
