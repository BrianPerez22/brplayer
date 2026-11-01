/** Cola de tareas de fondo (carátulas y etiquetas): como mucho 3 a la vez, las urgentes pasan delante. */
const Q: Array<() => Promise<void>> = [];
let busy = 0;

export function qadd(fn: () => Promise<void>, front = false): void {
  if (front) Q.unshift(fn); else Q.push(fn);
  pump();
}

function pump(): void {
  while (busy < 3 && Q.length) {
    busy++;
    (Q.shift() as () => Promise<void>)()
      .catch(() => {})
      .finally(() => { busy--; pump(); });
  }
}
