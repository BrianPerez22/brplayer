# brplayer

Un reproductor de música **de código abierto**, hecho para **Safari**, que se destaca por sus animaciones, su diseño cuidado y las pequeñas sorpresas que aparecen cuando menos lo esperas.

Escucha música que tengas **descargada en tu celular** o conéctalo a **tu propio servidor** con tu carpeta de música.

> **Versión 2.0** · sin backend: sigue siendo una app estática que puede entregarse como un solo `.html`. Reescrita por completo en **React + TypeScript + Tailwind CSS**, con **Vite** y **Zustand**. Misma app, mismas funciones, mismos datos guardados; ahora con tipos, componentes y un proyecto que se puede mantener.

<p align="center">
  <a href="https://brianperez22.github.io/brplayer/">
    <img alt="Abrir brplayer" src="public/assets/abrir-brplayer.svg" width="380">
  </a>
</p>

<p align="center"><sub><a href="https://brianperez22.github.io/brplayer/">brianperez22.github.io/brplayer</a></sub></p>

---

## Inicio rápido

### Usarla
Abre la dirección de arriba en Safari, toca **☰ → Añadir canciones** y elige tus archivos de audio. Para tenerla como una app, en iPhone/iPad usa **Compartir → Añadir a pantalla de inicio**: se abre a pantalla completa, con la barra de estado translúcida.

### Un solo archivo, como la v1
Si solo quieres abrirla y escuchar, no necesitas servidor: genera **un único `brplayer.html`** con todo dentro y ábrelo con doble clic en Safari.

```bash
npm install
npm run build:single   # genera dist-single/brplayer.html
```

(Con `file://` el service worker no se activa, igual que en la v1: la app funciona, solo que no se guarda para abrirse sin conexión. Para eso, aloja el archivo con HTTPS.)

### Alojarla tú mismo
La 2.0 también se compila a archivos estáticos (HTML, CSS y JS). Necesitas [Node.js](https://nodejs.org) 18 o superior:

```bash
npm install
npm run build        # genera la carpeta dist/
```

Sube el contenido de `dist/` a cualquier hosting estático (tu servidor, GitHub Pages, Netlify…). La compilación usa rutas relativas, así que funciona en cualquier subcarpeta.

### Desarrollar

```bash
npm install
npm run dev          # servidor de desarrollo con recarga en caliente
npm run typecheck    # comprobar tipos
npm run preview      # probar la compilación de producción
```

Para probar contra tu biblioteca real durante el desarrollo, apunta `/api` a tu servidor:

```bash
BRPLAYER_SERVER=https://tu-servidor.com npm run dev
```

Si tu lista de canciones no vive en `/api/canciones`, cámbiala al compilar con la variable `VITE_API_URL`:

```bash
VITE_API_URL=https://tu-servidor.com/musica.json npm run build
```

> **Publicar con GitHub Pages:** el workflow `.github/workflows/deploy.yml` compila y despliega en cada push a `main` (o manualmente desde *Actions*). En *Settings → Pages* elige **Source: GitHub Actions**. El desarrollo local no cambia: usa `npm run dev` como siempre.

---

## Qué incluye

### Escuchar
- **Biblioteca, Cola, Playlists y Favoritos**, con búsqueda y varias formas de ordenar.
- **Recientes, más escuchadas y recomendaciones** en la pantalla de inicio de la biblioteca.
- Vistas por **artista y álbum**, con carátulas.
- Fila **Random** al inicio de la biblioteca para dejarte sorprender.
- Modos aleatorio y repetir (lista o canción). Al terminar una playlist sigue música aleatoria fuera de ella.
- Lee **etiquetas y carátulas** (ID3 y FLAC) directamente de los archivos.
- Formatos: MP3, FLAC, M4A, AAC, WAV, OGG, Opus, AIFF, ALAC y CAF.
- Ficha de información de cada canción: título, artista, álbum, archivo, formato, tamaño, duración y bitrate.
- **Compartir** canciones (con el segundo exacto) y playlists mediante un enlace.
- **Descargar al dispositivo** las canciones de tu servidor (menú de tres puntos, ficha de información o menú ☰): guarda el archivo original en Descargas / Archivos. Varias canciones se entregan en un único ZIP.
- Controles en la **pantalla de bloqueo y los auriculares** (Media Session).
- **Selección múltiple**: mantén pulsada una canción (o ☰ → *Seleccionar canciones*, o ⋯ → *Seleccionar varias*) y toca las demás. Con la selección puedes reproducirla, ponerla en la cola o a continuación, guardarla en favoritas, agregarla a una playlist, quitarla de la playlist actual, descargarla o eliminar las importadas. En el ordenador, clic derecho también entra en el modo; **Esc** sale.
- **Velocidad de reproducción** (con el tono intacto) y **temporizador de apagado** (minutos o al terminar la canción), en ☰.
- **Cola reordenable**: arrastra el asa de una canción de la cola.
- **Actualizar biblioteca** desde ☰ (también se actualiza sola al volver a la app tras un rato).
- La búsqueda **ignora mayúsculas y acentos** (“cancion” encuentra “Canción”).
- **Precarga automática**: la canción siguiente y la actual se guardan en caché (máx. 40 canciones) para que el cambio y el salto sean inmediatos.
- **Modo sin conexión automático** (☰): sin internet solo suenan las canciones que están en el dispositivo; al volver la conexión, vuelve todo. Se puede desactivar.
- La app (HTML, CSS y JS) se abre **sin conexión** gracias a un service worker (solo con HTTPS o localhost); la música del servidor solo suena sin conexión si ya estaba precargada.
- Gestos: desliza una fila hacia la derecha para enviarla a la cola, o hacia los lados para cambiar de pestaña.

### Sonido
- **Ecualizador de 10 bandas** con presets: Plano, Graves+, Agudos+, Vocal, Rock, Pop, Electrónica, Clásica y Jazz.
- **Sonido 3D**: Envolvente, Sala y 8D giratorio.
- **Volumen maestro** propio (funciona también en iOS, donde `audio.volume` no hace nada).

### Lo visual (lo que lo hace especial)
- **Visualizador** que analiza el audio real, con 14 modos: Carátula, Barras y ondas, Ambiente, Batería, Alquimia, Sol, Osciloscopio, Túnel, Espectrograma, Montañas, Estrellas, Fuegos, Plasma y Bola. Con modo inmersivo a pantalla completa.
- **Barra de progreso viva**: agua, electricidad, fuego, burbujas, glitch o píxeles, elegido al azar para cada canción. Toca la bolita de la barra para cambiar de animación.
- **Botones squishy** que se aplastan y rebotan al tocarlos.
- **Bolita de color**: toca para cambiar el color de acento; mantenla pulsada (o mantén la barra espaciadora) para activar el modo RGB.
- **Ícono distinto en cada carga**: la bolita del favicon cambia de color cada vez que abres la app.
- **Sorpresas en inactividad**: si dejas las listas quietas más de 2 minutos, la interfaz se derrite, se pixela, se vuelve psicodélica o se pone RGB, hasta que vuelvas a tocarla.
- Tema **claro y oscuro** automático y respeto por *reducir movimiento*.

### Atajos de teclado
| Tecla | Acción |
|---|---|
| Espacio | Pausa / reproducir |
| Mantener espacio | Modo RGB de la bolita |
| ← / → | Cambiar de modo del visualizador |
| F | Visualizador inmersivo |
| V | Menú del visualizador |
| Esc | Salir de la selección múltiple / del visualizador |

---

## Hecho para Safari

brplayer está pensado para Safari en iPhone, iPad y Mac: respeta las áreas seguras de pantalla (notch y barra inferior), usa los metadatos de app web de Apple (pantalla completa y barra de estado translúcida) y se integra con los controles de reproducción del sistema.

---

## Dos formas de usarlo

### 1. Con música en tu dispositivo
Usa **Añadir canciones** y elige los archivos. Se guardan en el propio navegador (IndexedDB) y siguen ahí la próxima vez que abras la app. Para quitarlas, **Borrar importadas**.

### 2. Con música en tu servidor
Si alojas brplayer en el mismo dominio que tu servidor de música, la biblioteca se carga sola al abrir la app.

Por defecto, la app consulta `/api/canciones` en el mismo dominio donde está alojada (cámbialo con `VITE_API_URL`). Esa dirección debe responder con una lista JSON:

```json
[
  { "nombre": "Artista - Título.mp3", "url": "/ruta/al/archivo.mp3", "fecha": "2026-01-31", "size": 7340032 }
]
```

- `nombre` y `url` son obligatorios; `fecha` y `size` son opcionales.
- `id` (opcional): identificador estable de la canción. Si lo envías, **renombrar el archivo no pierde favoritos, playlists ni estadísticas**. Sin `id`, la app intenta reconectar los archivos renombrados por su tamaño exacto (si es único).
- `titulo`, `artista`, `album`, `pista` y `caratula` (opcionales): evitan que la app lea los primeros 2 MB de cada archivo para obtener las etiquetas.
- La `url` puede llevar espacios, tildes, `#` o `?` en el nombre: la app codifica la ruta sin duplicar lo ya codificado. Una consulta real (`?clave=valor`) se respeta.
- Si el nombre sigue el formato `Artista - Título.ext`, el artista y el título se separan automáticamente (si el archivo trae etiquetas, tienen prioridad).
- El servidor de audio debe aceptar **peticiones Range** de HTTP para poder saltar a cualquier punto de la canción. Si no las admite, al saltar la app descarga esa canción completa para poder hacerlo.
- La descarga al dispositivo usa la misma `url` y funciona en el mismo dominio (o con CORS habilitado); si la canción ya está precargada, no vuelve a gastar datos.

La lista del servidor se guarda en el dispositivo, así que la biblioteca sigue apareciendo aunque pierdas la conexión un momento.

---

## Actualizar desde la v1

Tus datos no se pierden: la 2.0 usa **las mismas claves** de `localStorage` y la misma base IndexedDB (`player`) que la v1. Favoritos, playlists, estadísticas, canciones importadas, color de acento, orden y ecualizador siguen donde estaban, siempre que abras la 2.0 en la misma dirección que usabas antes.

La v1 (vanilla JS, toda la app en un solo archivo `brplayer-v1.html`) sigue disponible en la release v1.

---

## Arquitectura

```
brplayer/
├── index.html
├── vite.config.ts · tailwind.config.ts · tsconfig.json
├── public/
│   ├── sw.js                    service worker (solo guarda la app, nunca la música)
│   └── assets/
└── src/
    ├── main.tsx · App.tsx · index.css
    ├── types.ts                 Track, Playlist, ServerSong…
    ├── store/                   estado global (Zustand)
    │   ├── useStore.ts          estado, persistencia, avisos y hojas
    │   └── selectors.ts         vistas derivadas: playlists, grupos, contexto de reproducción
    ├── audio/                   todo lo que toca el <audio>
    │   ├── element.ts           el único elemento <audio>
    │   ├── player.ts            cargar, siguiente/anterior, cola, saltos, velocidad, temporizador, Media Session
    │   ├── engine.ts            Web Audio: volumen, ecualizador de 10 bandas, 3D, analizador
    │   └── nowPlaying.ts · sync.ts
    ├── lib/                     lógica sin interfaz
    │   ├── library.ts           orden, escaneo de etiquetas, actualización, importación, sin conexión, arranque
    │   ├── server.ts            /api/canciones y lectura remota de etiquetas
    │   ├── actions.ts           favoritos, playlists, selección múltiple, menús
    │   ├── links.ts             enlaces para compartir
    │   ├── download.ts · zip.ts descargas y ZIP sin dependencias
    │   ├── tags.ts · art.ts     ID3/FLAC y carátulas
    │   └── storage.ts · util.ts · queue.ts · thumbs.ts · audioCache.ts · constants.ts
    ├── visualizer/vz.ts         los 14 modos
    ├── fx/                      accent (bolita y RGB) · progressFx (barra viva) · idle (sorpresas)
    ├── hooks/                   useListGestures · useExternal
    └── components/              Header · List · TrackRow · PlayerBar · FullScreen · Equalizer · ProgressBar…
```

Decisiones de diseño:

- **El estado visible vive en Zustand; el audio, fuera de React.** `audio/` y `lib/` son módulos TypeScript normales que leen y escriben el store; los componentes solo pintan.
- **Los motores gráficos siguen siendo imperativos** (visualizador, barra viva, efectos de inactividad): dibujan en `<canvas>` a 60 fps y React solo los conecta y lee su estado de interfaz.
- **Tailwind para la interfaz, CSS para lo que Tailwind no expresa bien:** variables de tema (`--acc`, `--bg`…) que cambian en vivo con la bolita, sliders nativos, keyframes encadenados y los efectos de inactividad (`src/index.css`).

---

## Contribuir

Es código abierto: úsalo, cámbialo, rómpelo y compártelo. Antes de abrir un PR, comprueba que `npm run build` pasa (incluye la comprobación de tipos).
