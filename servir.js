// Sirve la carpeta sitio/ en local: node servir.js  →  http://localhost:4180
// POST /respaldo guarda la foto fija de la muela en sitio/img/muela.webp (solo para desarrollo).
const http = require('http'), fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, 'sitio');
const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.json': 'application/json' };
const puerto = process.env.PORT || 4180;
http.createServer((req, res) => {
  const destinos = { '/respaldo': 'muela.webp' };
  if (req.method === 'POST' && destinos[req.url]) {
    let cuerpo = '';
    req.on('data', t => { cuerpo += t; if (cuerpo.length > 8e6) req.destroy(); });
    req.on('end', () => {
      const datos = cuerpo.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFile(path.join(raiz, 'img', destinos[req.url]), Buffer.from(datos, 'base64'), e => { res.writeHead(e ? 500 : 200); res.end(e ? 'error' : 'ok'); });
    });
    return;
  }
  let ruta = decodeURIComponent(req.url.split('?')[0]).replace(/\.\./g, '');
  // /roadmap/ sirve la carpeta del plan, que vive fuera del sitio público
  const base = ruta.startsWith('/roadmap') || ruta.startsWith('/diagnostico') || ruta.startsWith('/video') ? __dirname : raiz;
  if (ruta.startsWith('/sitio/')) ruta = ruta.slice(6);   // el roadmap enlaza ../sitio/ como en disco
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.join(base, ruta);
  fs.readFile(archivo, (error, datos) => {
    if (error) { res.writeHead(404); return res.end('No está'); }
    res.writeHead(200, { 'content-type': tipos[path.extname(archivo)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(datos);
  });
}).listen(puerto, () => console.log('DentiCode en http://localhost:' + puerto));
