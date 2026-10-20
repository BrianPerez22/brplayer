# brplayer

Un reproductor de música **de código abierto**, hecho para **Safari**, que se destaca por sus animaciones, su diseño cuidado y las pequeñas sorpresas que aparecen cuando menos lo esperas.

No hay que instalar nada, ni cuentas, ni dependencias: **la "instalación" es simplemente abrir el HTML**. Cualquiera puede usarlo, modificarlo y llevárselo para lo que necesite.

Escucha música que tengas **descargada en tu celular** o conéctalo a **tu propio servidor** con tu carpeta de música.

<p align="center">
  <a href="https://brianperez22.github.io/brplayer/">
    <img alt="Abrir brplayer" src="assets/abrir-brplayer.svg" width="380">
  </a>
</p>

<p align="center"><sub><a href="https://brianperez22.github.io/brplayer/">brianperez22.github.io/brplayer</a></sub></p>

---

## Inicio rápido

1. Descarga **`brplayer-v1.html`** (la release v1: un solo archivo, sin nada más que instalar).
2. Ábrelo en Safari.
3. Toca **☰ → Añadir canciones** y elige tus archivos de audio.

Eso es todo. Para tenerlo como una app, en iPhone/iPad usa **Compartir → Añadir a pantalla de inicio**: se abre a pantalla completa, con la barra de estado translúcida.

> En Mac puedes abrir el archivo con doble clic. En iPhone/iPad lo más cómodo es alojarlo en cualquier hosting estático (tu servidor, GitHub Pages, etc.) y abrirlo desde Safari.

---

## Qué incluye

### Escuchar
- **Biblioteca, Cola, Playlists y Favoritos**, con búsqueda y varias formas de ordenar.
- **Recientes, más escuchadas y recomendaciones** en la pantalla de inicio de la biblioteca.
- Vistas por **artista y álbum**, con carátulas.
- Fila **Random** al inicio de la biblioteca para dejarte sorprender.
- Modos aleatorio y repetir (lista o canción).
- Lee **etiquetas y carátulas** (ID3 y FLAC) directamente de los archivos.
- Formatos: MP3, FLAC, M4A, AAC, WAV, OGG, Opus, AIFF, ALAC y CAF.
- Ficha de información de cada canción: título, artista, álbum, archivo, formato, tamaño, duración y bitrate.
- **Compartir** canciones y playlists mediante un enlace.
- **Descargar al dispositivo** las canciones de tu servidor (menú de tres puntos de la canción, ficha de información o menú ☰): guarda el archivo original en Descargas / Archivos. No afecta a *Añadir canciones*.
- Controles en la **pantalla de bloqueo y los auriculares** (Media Session).
- **Selección múltiple**: mantén pulsada una canción (o ☰ → *Seleccionar canciones*, o ⋯ → *Seleccionar varias*) y toca las demás. Con la selección puedes reproducirla, ponerla en la cola o a continuación, **guardarla en favoritas**, **agregarla a una playlist**, quitarla de la playlist actual, **descargarla** (varias canciones se entregan en un único ZIP) o eliminar las importadas. En el ordenador, clic derecho también entra en el modo; **Esc** sale.
- **Velocidad de reproducción** (con el tono intacto) y **temporizador de apagado** (minutos o al terminar la canción), en ☰.
- **Cola reordenable**: arrastra el asa de una canción de la cola.
- **Actualizar biblioteca** desde ☰ (también se actualiza sola al volver a la app tras un rato).
- La búsqueda **ignora mayúsculas y acentos** ("cancion" encuentra "Canción").
- **Precarga automática**: la canción siguiente y la actual se guardan en caché (máx. 40 canciones) para que el cambio y el salto sean inmediatos. No hay modo manual de "sin conexión".
- La app (HTML, CSS y JS) se abre **sin conexión** gracias a un service worker (solo con HTTPS o localhost); la música del servidor solo suena sin conexión si ya estaba precargada.
- Gestos: desliza una fila hacia la derecha para enviarla a la cola, o hacia los lados para cambiar de pestaña.

### Sonido
- **Ecualizador de 10 bandas** con presets: Plano, Graves+, Agudos+, Vocal, Rock, Pop, Electrónica, Clásica y Jazz.
- **Sonido 3D**: Envolvente, Sala y 8D giratorio.

### Lo visual (lo que lo hace especial)
- **Visualizador** que analiza el audio real, con 14 modos: Carátula, Barras y ondas, Ambiente, Batería, Alquimia, Sol, Osciloscopio, Túnel, Espectrograma, Montañas, Estrellas, Fuegos, Plasma y Bola.
- **Barra de progreso viva**: agua, electricidad o fuego, elegido al azar para cada canción.
- **Botones squishy** que se aplastan y rebotan al tocarlos.
- **Bolita de color**: toca para cambiar el color de acento; mantén la barra espaciadora para activar el modo RGB.
- **Ícono distinto en cada carga**: la bolita del favicon cambia de color cada vez que abres la app.
- **Sorpresas en inactividad**: si dejas las listas de canciones quietas más de 2 minutos, la interfaz se derrite, se pixela, se vuelve psicodélica o se pone RGB, hasta que vuelvas a tocarla.
- Tema **claro y oscuro** automático.

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

Por defecto, la app consulta `/api/canciones` en el mismo dominio donde está alojada. Esa dirección debe responder con una lista JSON:

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

## Versiones

| Versión | Qué es | Para quién |
|---|---|---|
| **`brplayer-v1.html`** | Release v1: toda la app en **un solo archivo**. | Quien solo quiere abrirlo y escuchar, sin instalar nada. |
| **`brplayer/`** | La misma app dividida en `index.html`, `css/` y `js/`. | Quien quiera modificarla o contribuir. Hay que mantener la carpeta completa. |

Estructura de la versión modular:

```
brplayer/
├── index.html
├── css/   base · visualizer · effects · equalizer · library
├── sw.js  service worker (solo guarda la app, nunca la música)
└── js/    core · tags · list · playback · playlists · favorites · download · select · library
           extras · accent · equalizer · visualizer · input · progress-fx · idle-fx · main
```

Los scripts son archivos normales (no módulos ES) y se cargan con `defer` en el orden indicado arriba, así que también funcionan abriendo `index.html` sin servidor.

---

## Contribuir

Es código abierto: úsalo, cámbialo, rómpelo y compártelo. Cada archivo de `js/` y `css/` corresponde a una función concreta, lo que facilita encontrar dónde tocar.
