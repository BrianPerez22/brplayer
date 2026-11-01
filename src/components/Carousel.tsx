import type { ReactNode } from 'react';

export const Bar2 = ({ children }: { children: ReactNode }) => (
  <div className="bar2 flex items-center gap-2.5 py-2.5">{children}</div>
);
export const Spacer = () => <span className="flex-1" />;

export function Carousel({ children }: { children: ReactNode }) {
  return <div className="car">{children}</div>;
}
