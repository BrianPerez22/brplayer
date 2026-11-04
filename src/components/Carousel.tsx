import type { ReactNode } from 'react';

/** encabezado de sección: título, contador y acciones a la derecha */
export const Bar2 = ({ children }: { children: ReactNode }) => (
  <div className="bar2">{children}</div>
);
export const Spacer = () => <span className="flex-1" />;

/** fila de tarjetas: se desliza en móvil y es una cuadrícula en pantallas anchas */
export function Carousel({ children }: { children: ReactNode }) {
  return <div className="car">{children}</div>;
}
