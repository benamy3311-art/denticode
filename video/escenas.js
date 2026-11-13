/* Línea de tiempo del video (registro expresivo). pintar(t) deja el cuadro exactamente como debe
   verse en el segundo t: nada depende del reloj, así cada fotograma sale igual en cada render.
   La voz manda el ritmo: los tiempos de cada escena vienen de voz/tiempos.json. */
import { crear as crearMuela } from './muela3d.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const P = (esc, n) => $(`[data-escena="${esc}"] [data-p="${n}"]`);

// ── Curvas ──
const lim = x => Math.min(1, Math.max(0, x));
const salida = x => 1 - Math.pow(1 - lim(x), 4);
const vaiven = x => { x = lim(x); return x < .5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2; };
const rebote = x => { x = lim(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const mezcla = (a, b, p) => a + (b - a) * p;

// ── Preparación de la letra: cada palabra o letra va dentro de una máscara para subir desde abajo ──
function enmascarar(el, porLetra) {
  const texto = el.textContent;
  const trozos = porLetra ? [...texto] : texto.split(/(\s+)/);
  el.textContent = '';
  for (const tr of trozos) {
    if (/^\s+$/.test(tr)) { el.append(tr); continue; }
    const m = document.createElement('span'); m.className = 'm';
    const w = document.createElement('span'); w.className = 'w'; w.textContent = tr;
    m.append(w); el.append(m);
  }
}
// La letra gigante se ajusta al ancho útil (1080 − 2 × 70) midiendo de verdad (MEDIDAS 15–18)
function ajustar(el, ancho = 940) {
  el.style.fontSize = '100px';
  const w = el.getBoundingClientRect().width;
  el.style.fontSize = (100 * ancho / w * 0.99).toFixed(1) + 'px';
}

// ── Movimientos ──
// Palabras o letras que suben desde su máscara, una tras otra
function revela(el, l, t0, { paso = 0.07, dur = 0.55, sale = null } = {}) {
  if (!el) return;
  el.style.opacity = l >= t0 - 0.01 ? 1 : 0;
  $$('.w', el).forEach((w, i) => {
    const p = salida((l - t0 - i * paso) / dur);
    const s = sale === null ? 0 : salida((l - sale - i * paso * 0.5) / 0.4);
    w.style.transform = `translateY(${(1 - p) * 112 - s * 112}%)`;
  });
}
// Pieza que entra con varias propiedades a la vez (opacidad, recorrido, escala, desenfoque)
function entra(el, l, t0, { dur = 0.6, y = 60, x = 0, escala = 0.9, gira = 0, borron = 14, curva = rebote } = {}) {
  if (!el) return 0;
  const p = curva((l - t0) / dur), o = lim((l - t0) / (dur * 0.5));
  el.style.opacity = o;
  el.style.transform = `translate(${(1 - p) * x}px, ${(1 - p) * y}px) scale(${mezcla(escala, 1, p)}) rotate(${(1 - p) * gira}deg)`;
  el.style.filter = o >= 1 ? 'none' : `blur(${(1 - o) * borron}px)`;
  return p;
}
const cam = (esc, l, d, { desde = 1, hasta = 1.06 } = {}) => {
  const c = P(esc, 'cam'); if (c) c.style.transform = `scale(${mezcla(desde, hasta, l / d)})`;
};

let T = null, dibujarMuela = null;
const COLOR = { gancho: '#0B0D10', marca: '#1DA1F2', asistente: '#E9EDF2', panel: '#072B47', ciclo: '#0B0D10', datos: '#E9EDF2', cierre: '#1DA1F2' };

const escenas = {
  gancho(l, d) {
    cam('gancho', l, d, { hasta: 1.07 });
    revela(P('gancho', 'reloj'), l, 0.05, { paso: 0.06 });
    // los dos puntos parpadean como un reloj de verdad
    const puntos = $$('[data-p="reloj"] .w')[2]; if (puntos && l > 1) puntos.style.opacity = Math.floor(l * 2) % 2 ? 0.25 : 1;
    revela(P('gancho', 'w1'), l, 0.45);
    revela(P('gancho', 'w2'), l, 0.8);
    revela(P('gancho', 'w3'), l, 1.1);
    // el teléfono se levanta y pisa la letra
    // y sube un poco más cuando llega el último mensaje, para que «Bueno, busco otra clínica» se lea entero
    const tel = P('gancho', 'tel'), p = salida((l - 2.0) / 1.1), f = Math.sin(l * 1.4), sube = salida((l - 5.5) / 0.8) * 360;
    tel.style.opacity = lim((l - 2.0) / 0.3);
    tel.style.transform = `perspective(2600px) translateY(${(1 - p) * 1150 - sube}px) rotateX(${mezcla(38, 12, p)}deg) rotateZ(${mezcla(4, -4, p)}deg) rotateY(${f * 4}deg)`;
    entra(P('gancho', 'n1'), l, 3.1, { y: -50 });
    entra(P('gancho', 'n2'), l, 4.5, { y: -50 });
    entra(P('gancho', 'n3'), l, 5.9, { y: -50 });
  },
  marca(l, d) {
    const p = rebote((l - 0.05) / 0.9);
    dibujarMuela({ giro: l * 0.85, escala: mezcla(0.35, 1, p), subir: 0.72 + Math.sin(l * 1.6) * 0.05, inclina: Math.sin(l) * 0.05 });
    revela(P('marca', 'nombre'), l, 0.9, { paso: 0.04 });
    revela(P('marca', 'l1'), l, 2.0, { paso: 0.08 });
    revela(P('marca', 'l2'), l, 2.6, { paso: 0.08 });
  },
  asistente(l, d) {
    cam('asistente', l, d, { hasta: 1.05 });
    // las tres acciones se escriben gigantes detrás; la que se dice está en tinta, las otras se apagan
    const v = [['v1', 0.35], ['v2', 2.15], ['v3', 3.85]];
    v.forEach(([n, t0], i) => {
      const el = P('asistente', n); revela(el, l, t0);
      const siguiente = v[i + 1] ? v[i + 1][1] : 99;
      el.style.color = l < siguiente ? '#14171A' : '#B9C2CC';
    });
    const tel = P('asistente', 'tel'), p = salida((l - 0.25) / 1.0), f = Math.sin(l * 1.3);
    tel.style.opacity = lim((l - 0.25) / 0.3);
    tel.style.transform = `perspective(2600px) translateY(${(1 - p) * 1000}px) rotateX(${mezcla(30, 9, p)}deg) rotateY(${mezcla(-4, -13, p) + f * 2}deg) rotateZ(${mezcla(-2, 3, p)}deg)`;
    entra(P('asistente', 'm1'), l, 1.0, { y: 40 });
    entra(P('asistente', 'm2'), l, 1.8, { y: 20, curva: salida });
    entra(P('asistente', 'm3'), l, 2.7, { y: 40 });
    // un dedo toca «9:30»
    const chip = P('asistente', 'chip'), toque = P('asistente', 'toque');
    if (chip && toque) {
      const q = lim((l - 3.6) / 0.5), pantalla = chip.offsetParent;   // el chip se mide dentro de la pantalla del teléfono
      toque.style.left = (chip.offsetLeft + chip.offsetWidth / 2 + pantalla.offsetLeft) + 'px';
      toque.style.top = (chip.offsetTop + chip.offsetHeight / 2 + pantalla.offsetTop) + 'px';
      toque.style.opacity = l < 3.6 ? 0 : 1 - q;
      toque.style.transform = `scale(${0.4 + q})`;
      const activo = l >= 3.7;
      chip.style.background = activo ? '#0B6CB3' : '#fff'; chip.style.color = activo ? '#fff' : '#0B6CB3';
      chip.style.transform = `scale(${l >= 3.6 && l < 3.75 ? 0.92 : 1})`;
    }
    entra(P('asistente', 'm4'), l, 4.2, { y: 40 });
    entra(P('asistente', 'sello'), l, 4.9, { y: 0, escala: 1.7, gira: -10, borron: 20, dur: 0.55 });
  },
  panel(l, d) {
    revela(P('panel', 'w1'), l, 0.15);
    revela(P('panel', 'w2'), l, 0.45);
    // el panel real entra inclinado y la cámara lo recorre de lado
    const placa = P('panel', 'placa'), p = salida((l - 0.35) / 1.2), r = vaiven((l - 1.4) / (d - 1.8));
    placa.style.opacity = lim((l - 0.35) / 0.3);
    placa.style.transformOrigin = '50% 0';
    placa.style.transform = `translate(${mezcla(-120, -520, r)}px, ${(1 - p) * 900 + mezcla(0, -110, r)}px) rotateX(${mezcla(60, 30, p)}deg) rotateZ(${mezcla(-2, -9, p)}deg) scale(${mezcla(0.8, 0.98, p)})`;
    const flota = (n, t0, fase) => { const el = P('panel', n); const q = entra(el, l, t0, { y: 80, escala: 0.7 }); if (q >= 1) el.style.transform = `translateY(${Math.sin(l * 1.6 + fase) * 10}px)`; };
    flota('g1', 1.9, 0); flota('g2', 3.1, 1); flota('g3', 4.5, 2); flota('g4', 5.9, 3);
    // la cifra del cobro sube dígito a dígito
    const c = P('panel', 'cifra'), q = salida((l - 3.2) / 1.1);
    c.textContent = '$ ' + Math.round(1340000 * q / 1000 * 1000).toLocaleString('es-CO');
  },
  ciclo(l, d) {
    const n = 5, ini = 0.35, slot = (d - ini - 0.25) / n;
    const k = Math.max(0, Math.min(n - 1, Math.floor((l - ini) / slot)));
    for (let i = 0; i < n; i++) {
      const g = P('ciclo', 'k' + (i + 1)), t0 = ini + i * slot, fin = t0 + slot - 0.18;
      const visible = l >= t0 - 0.02 && (i === n - 1 || l < fin + 0.45);
      g.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) continue;
      $$('.gigante', g).forEach((tit, f) => revela(tit, l, t0 + f * 0.08, { dur: 0.42, sale: i === n - 1 ? null : fin }));
      const pr = $('.prueba', g);
      // el dato entra casi junto con la palabra: en 1,2 s por momento tiene que dar tiempo a leerlo
      const pe = entra(pr, l, t0 + 0.1, { y: 40, escala: 0.85, dur: 0.38 });
      if (i < n - 1 && l > fin) { const s = lim((l - fin) / 0.3); pr.style.opacity = 1 - s; pr.style.transform = `translateY(${-40 * s}px)`; pr.style.filter = `blur(${s * 8}px)`; }
    }
    // el contador cambia con un relevo vertical
    const num = P('ciclo', 'num'), local = (l - ini - k * slot) / 0.35;
    num.textContent = String(k + 1).padStart(2, '0');
    num.style.display = 'inline-block';
    num.style.transform = `translateY(${(1 - salida(local)) * 60}%)`;
    num.style.opacity = lim(local * 1.5); num.style.filter = local < 1 ? `blur(${(1 - lim(local)) * 8}px)` : 'none';
  },
  datos(l, d) {
    cam('datos', l, d, { hasta: 1.05 });
    revela(P('datos', 'ley'), l, 0.1, { paso: 0.03 });
    revela(P('datos', 'num'), l, 0.25, { paso: 0.08, dur: 0.6 });
    entra(P('datos', 'candado'), l, 1.1, { y: 0, escala: 0.5, borron: 10 });
    const arco = P('datos', 'arco'), a = rebote((l - 1.55) / 0.5);
    arco.style.transform = `translateY(${(1 - a) * -2.6}px)`;
    entra(P('datos', 's1'), l, 1.9, { y: 0, escala: 1.3, gira: -4, dur: 0.45 });
    entra(P('datos', 's2'), l, 2.3, { y: 0, escala: 1.3, gira: 3, dur: 0.45 });
    entra(P('datos', 's3'), l, 2.7, { y: 0, escala: 1.3, gira: -3, dur: 0.45 });
  },
  cierre(l, d) {
    // Denti cae, se aplasta al tocar y rebota una vez; después respira
    const denti = P('cierre', 'denti'), cuerpo = P('cierre', 'cuerpo');
    const caida = lim((l - 0.05) / 0.45), y = l < 0.5 ? (1 - caida * caida) * -1100 : 0;
    denti.style.opacity = lim((l - 0.05) / 0.15);
    denti.style.transform = `translateY(${y}px)`;
    const tras = l - 0.5;
    let sx = 1, sy = 1;
    if (tras > 0 && tras < 0.6) { const s = Math.sin(lim(tras / 0.6) * Math.PI) * Math.exp(-tras * 4); sx = 1 + s * 0.22; sy = 1 - s * 0.2; }
    else if (tras >= 0.6) { sy = 1 + Math.sin(tras * 3) * 0.015; }
    cuerpo.style.transform = `scale(${sx}, ${sy}) rotate(${tras > 0.6 ? Math.sin(tras * 2) * 3 : 0}deg)`;
    revela(P('cierre', 'nombre'), l, 0.6, { paso: 0.035 });
    revela(P('cierre', 'lema'), l, 1.15, { paso: 0.06 });
    entra(P('cierre', 'cta'), l, 1.6, { y: 30, escala: 0.6 });
  },
};

// ── Barrido acanalado entre escenas: las tiras suben con el color de la siguiente y bajan ──
const BARRAS = 12, MEDIO = 0.3;
function barrido(t) {
  const caja = $('#barrido');
  const frontera = T.escenas.slice(1).find(e => Math.abs(t - e.inicio) < MEDIO + BARRAS * 0.015);
  $$('i', caja).forEach((b, i) => {
    if (!frontera) { b.style.transform = 'scaleY(0)'; return; }
    const b0 = frontera.inicio, retraso = i * 0.015;
    b.style.background = COLOR[frontera.id];
    if (t < b0) { const p = salida((t - (b0 - MEDIO - BARRAS * 0.015) - retraso) / MEDIO); b.style.transformOrigin = '50% 100%'; b.style.transform = `scaleY(${p})`; }
    else { const p = salida((t - b0 - retraso) / MEDIO); b.style.transformOrigin = '50% 0'; b.style.transform = `scaleY(${1 - p})`; }
  });
}

window.pintar = t => {
  for (const e of T.escenas) {
    const el = $(`[data-escena="${e.id}"]`), visible = t >= e.inicio && t < e.fin;
    el.style.visibility = visible ? 'visible' : 'hidden';
    if (visible) escenas[e.id](t - e.inicio, e.fin - e.inicio);
  }
  barrido(t);
};

window.listo = (async () => {
  T = await (await fetch('voz/tiempos.json', { cache: 'no-store' })).json();
  // la última escena se queda hasta el final del audio
  T.escenas[T.escenas.length - 1].fin = T.total + 0.1;
  await document.fonts.ready;
  $$('[data-palabras]').forEach(el => enmascarar(el, false));
  $$('[data-letras]').forEach(el => enmascarar(el, true));
  $$('.golpe .gigante').forEach(el => enmascarar(el, false));
  // medir con todas las escenas visibles para que los tamaños sean reales
  $$('.escena').forEach(e => { e.style.visibility = 'visible'; });
  $$('[data-ajusta]').forEach(el => ajustar(el));
  ajustar(P('gancho', 'reloj'));
  $$('.escena').forEach(e => { e.style.visibility = 'hidden'; });
  const caja = $('#barrido'); for (let i = 0; i < BARRAS; i++) caja.append(document.createElement('i'));
  dibujarMuela = crearMuela($('#muela'));
  await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  const ifr = $('#panel');
  await new Promise(r => { if (ifr.contentDocument && ifr.contentDocument.readyState === 'complete') r(); else ifr.addEventListener('load', r, { once: true }); });
  await new Promise(r => setTimeout(r, 1200));
  window.pintar(0);
  return T.total;
})();
