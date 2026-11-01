# brplayer 2.0 — reescrita en React + TypeScript + Tailwind

La app completa, reconstruida desde cero sobre un stack moderno. **Mismas funciones, mismos datos guardados, mismo aspecto**, pero ahora con tipos, componentes y un proyecto que se puede mantener y ampliar.

## Qué cambia
- **React 18 + TypeScript (strict)**: de 16 scripts sueltos a módulos tipados y componentes.
- **Tailwind CSS** para la interfaz; el CSS propio queda solo para lo que Tailwind no expresa bien (variables de tema, sliders nativos, keyframes y efectos de inactividad).
- **Zustand** como estado global: el estado visible vive en el store y el audio, el servidor y los motores gráficos son módulos independientes de React.
- **Un solo archivo**: `npm run build:single` genera `brplayer.html`, autocontenido, que se abre con doble clic igual que la v1.
- **Vite**: servidor de desarrollo con recarga en caliente y compilación de producción con rutas relativas (funciona en cualquier subcarpeta).
- **GitHub Actions**: despliegue automático a GitHub Pages en cada push a `main`.
- **Configurable**: `VITE_API_URL` cambia la dirección de la lista de canciones; `BRPLAYER_SERVER` apunta `/api` a tu servidor en desarrollo.

## Qué se conserva
- Biblioteca, cola, playlists, favoritos, recientes, artista/álbum, selección múltiple, descargas (ZIP), compartir por enlace.
- Ecualizador de 10 bandas, sonido 3D (envolvente, sala, 8D) y volumen maestro.
- Visualizador con 14 modos, modo inmersivo, barra de progreso viva (6 efectos), bolita de color y modo RGB, efectos de inactividad.
- Modo sin conexión automático, precarga de audio y service worker.
- **Tus datos**: se usan las mismas claves de `localStorage` y la misma base IndexedDB que la v1; al abrir la 2.0 en la misma dirección no se pierde nada.

## Estructura
`src/store` (estado) · `src/audio` (reproductor y Web Audio) · `src/lib` (biblioteca, servidor, acciones, descargas) · `src/visualizer` · `src/fx` · `src/hooks` · `src/components`.

## Notas
- La v1 (vanilla JS, un solo archivo) sigue disponible en su release.
- Verificado con `tsc` en modo estricto, compilación de producción y una prueba de humo (montaje, carga de lista, navegación por todas las vistas, pantalla completa y ecualizador). Falta probarla a mano en Safari (iPhone/iPad/Mac), especialmente audio en segundo plano, Media Session, descargas desde la app instalada y el pixelado de inactividad.
