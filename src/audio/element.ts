/** El único elemento <audio> de la app. Todo (ecualizador, visualizador, barra de progreso) cuelga de él. */
export const au: HTMLAudioElement = document.createElement('audio');
au.preload = 'auto';
au.setAttribute('playsinline', '');
au.hidden = true;
document.body.appendChild(au);
