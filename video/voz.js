// Genera la narración escena por escena y calcula la línea de tiempo del video.
//   node voz.js            → voz provisional con la voz Paulina del Mac (say)
//   node voz.js eleven     → voz de ElevenLabs. Lee la clave de la variable ELEVENLABS_API_KEY
//                            y la voz de ELEVENLABS_VOICE_ID. La clave nunca se escribe en archivos.
// Resultado: voz/narracion.wav y voz/tiempos.json (inicio y fin de cada escena, en segundos).
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const guion = JSON.parse(fs.readFileSync(path.join(__dirname, 'guion.json'), 'utf8'));
const dir = path.join(__dirname, 'voz');
fs.mkdirSync(dir, { recursive: true });
const modo = process.argv[2] === 'eleven' ? 'eleven' : 'mac';

const AIRE_ANTES = 0.45;   // silencio antes de cada frase: deja respirar el cambio de escena
const AIRE_DESPUES = 0.75; // y después, para que la animación termine antes de la siguiente

function duracion(archivo) {
  return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo]).toString());
}

async function frase(texto, salida) {
  if (modo === 'mac') {
    const aiff = salida.replace(/\.wav$/, '.aiff');
    execFileSync('say', ['-v', 'Paulina', '-r', '172', '-o', aiff, texto]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-ar', '44100', '-ac', '1', salida]);
    fs.unlinkSync(aiff);
    return;
  }
  const clave = process.env.ELEVENLABS_API_KEY, voz = process.env.ELEVENLABS_VOICE_ID;
  if (!clave || !voz) throw new Error('Faltan ELEVENLABS_API_KEY o ELEVENLABS_VOICE_ID en la terminal.');
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': clave, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text: texto, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.25 } }),
  });
  if (!r.ok) throw new Error(`ElevenLabs respondió ${r.status}: ${await r.text()}`);
  const mp3 = salida.replace(/\.wav$/, '.mp3');
  fs.writeFileSync(mp3, Buffer.from(await r.arrayBuffer()));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3, '-ar', '44100', '-ac', '1', salida]);
  fs.unlinkSync(mp3);
}

(async () => {
  const tiempos = [];
  let t = 0;
  for (const [i, e] of guion.escenas.entries()) {
    const wav = path.join(dir, `${String(i + 1).padStart(2, '0')}-${e.id}.wav`);
    await frase(e.voz, wav);
    const d = duracion(wav);
    const inicio = t, hablaDesde = t + AIRE_ANTES;
    t = hablaDesde + d + AIRE_DESPUES;
    tiempos.push({ id: e.id, inicio: +inicio.toFixed(3), hablaDesde: +hablaDesde.toFixed(3), hablaHasta: +(hablaDesde + d).toFixed(3), fin: +t.toFixed(3), subtitulo: e.subtitulo, wav: path.basename(wav) });
  }
  // si sobra tiempo para llegar al mínimo, se lo lleva el cierre
  const minimo = guion.formato.duracionMinima;
  if (t < minimo) { tiempos[tiempos.length - 1].fin = minimo; t = minimo; }
  fs.writeFileSync(path.join(dir, 'tiempos.json'), JSON.stringify({ total: +t.toFixed(3), escenas: tiempos }, null, 2));

  // mezcla: cada frase en su momento, sobre silencio de la duración total
  const entradas = tiempos.flatMap(x => ['-i', path.join(dir, x.wav)]);
  const retrasos = tiempos.map((x, i) => `[${i}:a]adelay=${Math.round(x.hablaDesde * 1000)}|${Math.round(x.hablaDesde * 1000)}[a${i}]`).join(';');
  const mezcla = `${retrasos};${tiempos.map((_, i) => `[a${i}]`).join('')}amix=inputs=${tiempos.length}:normalize=0,apad=whole_dur=${t},atrim=0:${t},loudnorm=I=-16:TP=-1.5:LRA=11[out]`;   // volumen de redes: toda voz suena igual de fuerte
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...entradas, '-filter_complex', mezcla, '-map', '[out]', '-ar', '44100', path.join(dir, 'narracion.wav')]);
  console.log(`Narración ${modo === 'mac' ? 'provisional' : 'ElevenLabs'} lista: ${t.toFixed(1)} s`);
  tiempos.forEach(x => console.log(`  ${x.id.padEnd(10)} ${x.inicio.toFixed(2)} → ${x.fin.toFixed(2)} s`));
})().catch(e => { console.error(e.message); process.exit(1); });
