/* DentiCode — la muela de cristal. Nivel medio-alto (TRES-D.md): three.js en tiempo real,
   geometría hecha por código con un campo de distancias, luz de estudio, transmisión y sombra de contacto.
   Se pinta solo cuando está en pantalla; con movimiento reducido queda quieta en su mejor pose. */

const arte = document.getElementById('arte');
const hueco = document.getElementById('lienzo3d');
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── El fondo: degradado azul con tiras acanaladas y grano. Lo mismo para el CSS y para la escena ──
function pintarFondo(ancho, alto) {
  const c = document.createElement('canvas');
  c.width = ancho; c.height = alto;
  const g = c.getContext('2d');
  const d = g.createLinearGradient(0, 0, ancho * 0.75, alto);
  d.addColorStop(0, '#08324F');
  d.addColorStop(0.3, '#1270B0');
  d.addColorStop(0.55, '#1DA1F2');
  d.addColorStop(0.8, '#8CCFFA');
  d.addColorStop(1, '#E4F4FE');
  g.fillStyle = d;
  g.fillRect(0, 0, ancho, alto);
  // un resplandor suave donde va a estar la muela
  const r = g.createRadialGradient(ancho * 0.55, alto * 0.38, 0, ancho * 0.55, alto * 0.38, ancho * 0.7);
  r.addColorStop(0, 'rgba(255,255,255,.28)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, ancho, alto);
  // tiras de vidrio acanalado: borde oscuro, centro limpio, borde con luz
  const paso = Math.round(ancho / 34);
  for (let x = 0; x < ancho; x += paso) {
    const t = g.createLinearGradient(x, 0, x + paso, 0);
    t.addColorStop(0, 'rgba(4,24,44,.20)');
    t.addColorStop(0.35, 'rgba(4,24,44,0)');
    t.addColorStop(0.8, 'rgba(255,255,255,.10)');
    t.addColorStop(1, 'rgba(255,255,255,.22)');
    g.fillStyle = t;
    g.fillRect(x, 0, paso, alto);
  }
  // grano del 8 %
  const img = g.getImageData(0, 0, ancho, alto), p = img.data;
  for (let i = 0; i < p.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    p[i] += n; p[i + 1] += n; p[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

const caja = arte.getBoundingClientRect();
const proporcion = caja.width && caja.height ? caja.width / caja.height : 0.85;
const fondo = pintarFondo(Math.round(900 * Math.min(1.4, Math.max(0.5, proporcion))), 900);
arte.style.background = `url(${fondo.toDataURL('image/jpeg', 0.86)}) center / cover`;

// ── La forma: una muela con cuatro cúspides y dos raíces, como campo de distancias ──
const len = (x, y, z) => Math.hypot(x, y, z);
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
function cajaRedonda(x, y, z, bx, by, bz, r) {
  const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
  return len(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
function raiz(x, y, z, ax, ay, az, bx, by, bz, ra, rb) {
  const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az;
  const h = Math.min(1, Math.max(0, (px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz)));
  return len(px - dx * h, py - dy * h, pz - dz * h) - (ra + (rb - ra) * h);
}
function muela(x, y, z) {
  // corona: caja redondeada algo más ancha que profunda, con una cintura hacia el cuello
  let d = cajaRedonda(x, y - 0.3, z, 0.44, 0.2, 0.37, 0.2);
  // cuatro cúspides
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) d = smin(d, len(x - sx * 0.2, y - 0.47, z - sz * 0.16) - 0.2, 0.12);
  // surco central entre las cúspides
  d = smax(d, -(len(x, y - 0.74, z) - 0.15), 0.1);
  // cuello: se estrecha un poco
  d = smin(d, cajaRedonda(x, y - 0.06, z, 0.34, 0.12, 0.29, 0.12), 0.14);
  // dos raíces que se abren y vuelven a cerrarse hacia la punta
  for (const s of [-1, 1]) {
    const a = raiz(x, y, z, s * 0.2, 0.08, 0, s * 0.29, -0.36, 0.02, 0.19, 0.13);
    const b = raiz(x, y, z, s * 0.29, -0.36, 0.02, s * 0.22, -0.82, 0.05, 0.13, 0.055);
    d = smin(d, smin(a, b, 0.1), 0.16);
  }
  return d;
}

// ── Escena ──
const THREE = await import('three');
const { MarchingCubes } = await import('three/addons/objects/MarchingCubes.js');
const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');

const render = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
const pequeno = innerWidth < 900;
render.setPixelRatio(Math.min(devicePixelRatio, pequeno ? 1.5 : 2));
render.outputColorSpace = THREE.SRGBColorSpace;
render.toneMapping = THREE.NeutralToneMapping;
render.toneMappingExposure = 1.05;
hueco.append(render.domElement);

const escena = new THREE.Scene();
const texFondo = new THREE.CanvasTexture(fondo);
texFondo.colorSpace = THREE.SRGBColorSpace;
escena.background = texFondo;

const pmrem = new THREE.PMREMGenerator(render);
escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
escena.environmentIntensity = 1.1;

const luz = new THREE.DirectionalLight(0xffffff, 1.6);
luz.position.set(2.5, 4, 3);
escena.add(luz);
const contra = new THREE.DirectionalLight(0xbfe6ff, 1.2);
contra.position.set(-3, 1, -2.5);
escena.add(contra);

const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camara.position.set(0, 0.55, 6.2);
camara.lookAt(0, -0.05, 0);

const vidrio = new THREE.MeshPhysicalMaterial({
  color: 0xFFFFFF,
  metalness: 0,
  roughness: 0.05,
  transmission: 1,
  thickness: 0.9,
  ior: 1.45,
  dispersion: 3,
  attenuationColor: new THREE.Color('#9FD8FB'),
  attenuationDistance: 2.4,
  clearcoat: 1,
  clearcoatRoughness: 0.04,
  specularIntensity: 1,
  iridescence: 0.18,
  iridescenceIOR: 1.3,
});

const N = pequeno ? 72 : 96;
const mc = new MarchingCubes(N, vidrio, false, false, 140000);
mc.isolation = 0;
const mitad = N / 2;
for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  // el campo es positivo dentro de la muela; MarchingCubes une la superficie donde vale 0
  mc.field[i + j * N + k * N * N] = -muela((i - mitad) / mitad, (j - mitad) / mitad, (k - mitad) / mitad) * 40;
}
mc.update();
mc.scale.setScalar(1.18);

const pieza = new THREE.Group();
pieza.add(mc);
escena.add(pieza);

// sombra de contacto: suave, corta, debajo de las raíces
function texturaSombra() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(4,28,50,.55)');
  r.addColorStop(0.45, 'rgba(4,28,50,.22)');
  r.addColorStop(1, 'rgba(4,28,50,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const sombra = new THREE.Mesh(
  new THREE.PlaneGeometry(1.9, 1.9),
  new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false })
);
sombra.rotation.x = -Math.PI / 2;
sombra.position.y = -1.22;
escena.add(sombra);

// ── Encuadre: en móvil la muela sube para dejar sitio al mensaje de abajo ──
function encuadrar() {
  const r = arte.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  render.setSize(w, h, false);
  camara.aspect = w / h;
  const movil = w < 600;
  camara.fov = movil ? 31 : 30;
  // desplaza el encuadre: en escritorio la muela queda arriba a la derecha, lejos del mensaje
  camara.setViewOffset(w, h, movil ? 0 : -w * 0.06, movil ? h * 0.13 : h * 0.06, w, h);
  camara.updateProjectionMatrix();
  pintar();
}

// ── Movimiento: vaivén en reposo, inclinación hacia el cursor y media vuelta al desplazar ──
const pose = { y: -0.55, x: 0.22 };
let ox = 0, oy = 0, vx = 0, vy = 0, metaX = 0, metaY = 0, giro = 0;
const conCursor = matchMedia('(hover: hover) and (pointer: fine)').matches;
if (conCursor && !reducido) {
  arte.addEventListener('pointermove', e => {
    const r = arte.getBoundingClientRect();
    metaY = ((e.clientX - r.left) / r.width - 0.5) * 0.3;   // hasta ±8,6°
    metaX = ((e.clientY - r.top) / r.height - 0.5) * 0.22;
  });
  arte.addEventListener('pointerleave', () => { metaX = 0; metaY = 0; });
}
function desplazamiento() {
  const r = arte.getBoundingClientRect();
  return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
}

function pintar() { render.render(escena, camara); }

let enPantalla = true, previo = 0;
function cuadro(t) {
  const dt = Math.min(0.033, (t - (previo || t)) / 1000);
  previo = t;
  // muelle críticamente amortiguado: llega sin rebote y se puede redirigir a mitad
  const k = 60, c = 2 * Math.sqrt(k) * 0.9;
  vx += (-(ox - metaX) * k - vx * c) * dt; ox += vx * dt;
  vy += (-(oy - metaY) * k - vy * c) * dt; oy += vy * dt;
  giro += (desplazamiento() * Math.PI - giro) * Math.min(1, dt * 10);
  const s = t / 1000;
  pieza.rotation.y = pose.y + Math.sin(s * (2 * Math.PI / 7)) * 0.055 + oy + giro;
  pieza.rotation.x = pose.x + Math.sin(s * (2 * Math.PI / 9)) * 0.02 + ox;
  pieza.position.y = Math.sin(s * (2 * Math.PI / 7)) * 0.025;
  sombra.scale.setScalar(1 - pieza.position.y * 0.6);
  pintar();
}

function arrancar() {
  if (reducido) { pieza.rotation.set(pose.x, pose.y, 0); pintar(); return; }
  render.setAnimationLoop(enPantalla && !document.hidden ? cuadro : null);
}
new IntersectionObserver(([e]) => { enPantalla = e.isIntersecting; previo = 0; arrancar(); }).observe(arte);
document.addEventListener('visibilitychange', () => { previo = 0; arrancar(); });
new ResizeObserver(encuadrar).observe(arte);

encuadrar();
pieza.rotation.set(pose.x, pose.y, 0);
pintar();
requestAnimationFrame(() => { hueco.dataset.lista = ''; arrancar(); });

// Para fabricar la imagen de respaldo desde la consola: await window.__fotoMuela()
window.__fotoMuela = () => { pieza.rotation.set(pose.x, pose.y, 0); pieza.position.y = 0; pintar(); return render.domElement.toDataURL('image/webp', 0.9); };
