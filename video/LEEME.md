# Video de lanzamiento de DentiCode

Vertical 1080 × 1920, 30 fps, unos 47 segundos. El resultado es `denticode-lanzamiento.mp4`.

## Archivos

| Archivo | Qué es |
|---|---|
| `guion.json` | El texto que se narra y el subtítulo de cada escena. Cambia aquí las frases. |
| `voz.js` | Genera la narración y la línea de tiempo (`voz/tiempos.json`). La voz manda el ritmo de las escenas. |
| `escenas.html`, `escenas.css`, `escenas.js` | Las siete escenas animadas. La escena del panel usa el panel real de `../sitio/`. |
| `render.js` | Pinta el video fotograma a fotograma con Chrome y lo une a la narración con ffmpeg. |

## Cambiar a la voz de ElevenLabs

1. En elevenlabs.io elige una voz femenina con acento colombiano en la Voice Library y añádela a tu cuenta. Copia su **Voice ID**.
2. En la terminal, dentro de esta carpeta (la clave queda solo en esa terminal, no en ningún archivo):

```bash
export ELEVENLABS_API_KEY="tu-clave"
export ELEVENLABS_VOICE_ID="id-de-la-voz"
npm run voz:eleven
npm run video
```

`voz:eleven` usa el modelo multilingüe de ElevenLabs y gasta créditos de tu cuenta: unos 600 caracteres por pasada.

## Otros comandos

```bash
npm run voz          # voz provisional del Mac (Paulina)
npm run fotos        # capturas sueltas para revisar sin renderizar todo
npm run video        # render completo (2 a 4 minutos)
```

Si cambias el guion, vuelve a correr `npm run voz` (o `voz:eleven`) antes de `npm run video`: las escenas se reacomodan a la duración nueva de cada frase.
