// Renderiza el video cuadro a cuadro con el Chrome instalado y lo une a la narración.
//   node render.js                → denticode-lanzamiento.mp4 (1080×1920, 30 fps)
//   node render.js fotos 1,9,16   → capturas sueltas en esos segundos (para revisar sin renderizar todo)
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const RAIZ = path.join(__dirname, '..');   // carpeta DentiCode: así el video ve ../sitio/ como en disco
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FPS = 30;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };

function servidor() {
  return new Promise(ok => {
    const s = http.createServer((req, res) => {
      const ruta = decodeURIComponent(req.url.split('?')[0]).replace(/\.\./g, '');
      const archivo = path.join(RAIZ, ruta.endsWith('/') ? ruta + 'index.html' : ruta);
      fs.readFile(archivo, (e, datos) => {
        if (e) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'content-type': TIPOS[path.extname(archivo)] || 'application/octet-stream' });
        res.end(datos);
      });
    }).listen(0, () => ok(s));
  });
}

(async () => {
  const s = await servidor();
  const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--use-angle=metal', '--enable-gpu'] });
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  pagina.on('pageerror', e => console.error('Error en la página:', e.message));
  await pagina.goto(`http://localhost:${s.address().port}/video/escenas.html`, { waitUntil: 'networkidle0' });
  await pagina.waitForFunction(() => window.listo, { timeout: 60000 });
  const total = await pagina.evaluate(() => window.listo);

  if (process.argv[2] === 'fotos') {
    const seg = (process.argv[3] || '1,9,16,24,33,40,45').split(',').map(Number);
    fs.mkdirSync(path.join(__dirname, 'fotos'), { recursive: true });
    for (const t of seg) {
      await pagina.evaluate(t => window.pintar(t), t);
      await pagina.screenshot({ path: path.join(__dirname, 'fotos', `t-${String(t).padStart(4, '0')}.png`) });
    }
    console.log(`Capturas en video/fotos/ (${seg.join(', ')} s)`);
  } else {
    const cuadros = Math.ceil(total * FPS);
    const salida = path.join(__dirname, 'denticode-lanzamiento.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-i', path.join(__dirname, 'voz', 'narracion.wav'),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', salida], { stdio: ['pipe', 'inherit', 'inherit'] });
    const inicio = Date.now();
    for (let i = 0; i < cuadros; i++) {
      await pagina.evaluate(t => window.pintar(t), i / FPS);
      const jpg = await pagina.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) process.stdout.write(`\r${i} / ${cuadros} cuadros · ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log(`\nVideo listo: ${salida}`);
  }
  await navegador.close();
  s.close();
})().catch(e => { console.error(e); process.exit(1); });
