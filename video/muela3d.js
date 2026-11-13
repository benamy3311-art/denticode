/* La muela de cristal del héroe de la web, para el video: misma forma (campo de distancias),
   mismo material, pero el giro lo manda el fotograma, no el reloj. */
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
  let d = cajaRedonda(x, y - 0.3, z, 0.44, 0.2, 0.37, 0.2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) d = smin(d, len(x - sx * 0.2, y - 0.47, z - sz * 0.16) - 0.2, 0.12);
  d = smax(d, -(len(x, y - 0.74, z) - 0.15), 0.1);
  d = smin(d, cajaRedonda(x, y - 0.06, z, 0.34, 0.12, 0.29, 0.12), 0.14);
  for (const s of [-1, 1]) {
    const a = raiz(x, y, z, s * 0.2, 0.08, 0, s * 0.29, -0.36, 0.02, 0.19, 0.13);
    const b = raiz(x, y, z, s * 0.29, -0.36, 0.02, s * 0.22, -0.82, 0.05, 0.13, 0.055);
    d = smin(d, smin(a, b, 0.1), 0.16);
  }
  return d;
}

// Fondo del mismo mundo: el degradado azul con tiras acanaladas y grano de la web
function fondo(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const d = g.createLinearGradient(0, 0, w * 0.6, h);
  d.addColorStop(0, '#8CCFFA'); d.addColorStop(0.3, '#1DA1F2'); d.addColorStop(0.62, '#0F68A8'); d.addColorStop(1, '#052238');
  g.fillStyle = d; g.fillRect(0, 0, w, h);
  const r = g.createRadialGradient(w * 0.5, h * 0.36, 0, w * 0.5, h * 0.36, w * 0.8);
  r.addColorStop(0, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
  const paso = Math.round(w / 18);
  for (let x = 0; x < w; x += paso) {
    const t = g.createLinearGradient(x, 0, x + paso, 0);
    t.addColorStop(0, 'rgba(4,24,44,.22)'); t.addColorStop(0.35, 'rgba(4,24,44,0)'); t.addColorStop(0.8, 'rgba(255,255,255,.1)'); t.addColorStop(1, 'rgba(255,255,255,.24)');
    g.fillStyle = t; g.fillRect(x, 0, paso, h);
  }
  const img = g.getImageData(0, 0, w, h), p = img.data;
  for (let i = 0; i < p.length; i += 4) { const n = (Math.random() - 0.5) * 20; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
  g.putImageData(img, 0, 0);
  return c;
}

export function crear(canvas) {
  const W = canvas.width, H = canvas.height;
  const render = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  render.setPixelRatio(1);
  render.setSize(W, H, false);
  render.outputColorSpace = THREE.SRGBColorSpace;
  render.toneMapping = THREE.NeutralToneMapping;
  render.toneMappingExposure = 1.05;
  const escena = new THREE.Scene();
  const tex = new THREE.CanvasTexture(fondo(W / 2, H / 2)); tex.colorSpace = THREE.SRGBColorSpace;
  escena.background = tex;
  const pmrem = new THREE.PMREMGenerator(render);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environmentIntensity = 1.15;
  const luz = new THREE.DirectionalLight(0xffffff, 1.6); luz.position.set(2.5, 4, 3); escena.add(luz);
  const contra = new THREE.DirectionalLight(0xbfe6ff, 1.3); contra.position.set(-3, 1, -2.5); escena.add(contra);
  const camara = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);
  camara.position.set(0, 0.45, 9.2); camara.lookAt(0, 0.1, 0);

  const vidrio = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 1, thickness: 0.9, ior: 1.45, dispersion: 3,
    attenuationColor: new THREE.Color('#9FD8FB'), attenuationDistance: 2.4, clearcoat: 1, clearcoatRoughness: 0.04,
    specularIntensity: 1, iridescence: 0.2, iridescenceIOR: 1.3,
  });
  const N = 100, mc = new MarchingCubes(N, vidrio, false, false, 160000);
  mc.isolation = 0;
  const m = N / 2;
  for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++)
    mc.field[i + j * N + k * N * N] = -muela((i - m) / m, (j - m) / m, (k - m) / m) * 40;
  mc.update();
  mc.scale.setScalar(1.25);
  const pieza = new THREE.Group(); pieza.add(mc); escena.add(pieza);

  // dibujar(t, { giro, escala, subir }): el fotograma decide la pose
  return function dibujar({ giro = 0, escala = 1, subir = 0, inclina = 0 }) {
    pieza.rotation.set(0.18 + inclina, -0.5 + giro, 0);
    pieza.scale.setScalar(escala);
    pieza.position.y = subir;
    render.render(escena, camara);
  };
}
