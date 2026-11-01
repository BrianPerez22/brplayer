/** Aviso para que las barras de progreso se vuelvan a sincronizar con el audio (tras un salto fallido, por ejemplo). */
const subs = new Set<() => void>();
export const onSync = (fn: () => void): (() => void) => { subs.add(fn); return () => { subs.delete(fn); }; };
export const emitSync = (): void => subs.forEach((f) => f());
