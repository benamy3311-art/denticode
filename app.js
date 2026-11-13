/* DentiCode — comportamiento de la página. La respuesta al tocar viene de tacto.js. */
(() => {
  'use strict';

  // Número de WhatsApp de DentiCode, con indicativo de país y sin espacios (ej. 573001234567).
  // Mientras esté vacío, el formulario confirma pero no abre WhatsApp.
  const WHATSAPP_DENTICODE = '';

  const reducido = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ── Titular móvil: cada línea al ancho real del contenedor (MEDIDAS.md 15–18) ──
  // Un solo tamaño para todas las líneas: el de la más larga. 1 % de margen porque las letras
  // redondas sobresalen de su caja.
  function ajustar(bloque) {
    const ancho = bloque.parentElement.clientWidth;
    if (!ancho || !bloque.offsetParent) return;
    const lineas = $$('.linea', bloque);
    for (let pasada = 0; pasada < 2; pasada++) {
      const actual = parseFloat(getComputedStyle(bloque).fontSize);
      const mayor = Math.max(...lineas.map(l => l.getBoundingClientRect().width));
      bloque.style.fontSize = (actual * (ancho * 0.99) / mayor).toFixed(2) + 'px';
    }
  }
  const bloques = $$('.ajusta');
  const reajustar = () => bloques.forEach(ajustar);
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(reajustar);
    bloques.forEach(b => ro.observe(b.parentElement));
  } else addEventListener('resize', reajustar);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(reajustar);

  // ── Respaldo de la muela: llega con un fundido cuando está decodificado ──
  const respaldo = $('.heroe-respaldo');
  if (respaldo) {
    const marcar = () => respaldo.dataset.cargada = '';
    if (respaldo.complete && respaldo.naturalWidth) marcar();
    else { respaldo.addEventListener('load', marcar); respaldo.addEventListener('error', () => respaldo.remove()); }
  }

  // ── Entrada al aparecer: una vez, de arriba abajo, 40 ms entre piezas ──
  const grupos = new Map();
  $$('.revela').forEach(el => {
    const grupo = el.closest('section, footer') || document.body;
    if (!grupos.has(grupo)) grupos.set(grupo, []);
    const lista = grupos.get(grupo);
    el.style.setProperty('--orden', Math.min(lista.length, 7));
    lista.push(el);
  });
  const alVer = (umbral, fn) => {
    if (!('IntersectionObserver' in window)) return el => fn(el);
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); }
    }), { threshold: umbral, rootMargin: '0px 0px -8% 0px' });
    return el => io.observe(el);
  };
  const verRevela = alVer(0.15, el => { el.dataset.visto = ''; });
  $$('.revela').forEach(verRevela);

  // ── Una noche: 44 segundos contados en seis pasos ──
  const pasos = $$('#pasos li');
  const piezasChat = $$('#chat [data-paso]');
  const estado = $('#chat-estado');
  const repetir = $('#repetir');
  let relojes = [];
  function pintarPaso(i) {
    pasos.forEach((li, n) => li.toggleAttribute('data-hecho', n <= i));
    piezasChat.forEach(p => p.toggleAttribute('data-visible', +p.dataset.paso <= i));
    if (estado) estado.textContent = i === 2 || i === 3 ? 'DentiCode está escribiendo…' : 'en línea';
    if (i >= 0) document.dispatchEvent(new CustomEvent('denti:paso', { detail: i }));
    if (i === 5) {
      const trazo = $('#chat .msg-sistema');
      setTimeout(() => trazo && trazo.setAttribute('data-dibujado', ''), 120);
    }
  }
  function reproducir() {
    relojes.forEach(clearTimeout);
    relojes = [];
    $('#chat .msg-sistema')?.removeAttribute('data-dibujado');
    pintarPaso(-1);
    if (reducido.matches) { pintarPaso(pasos.length - 1); return; }
    tacto.cara(repetir, 1);
    repetir.disabled = true;
    const ritmo = [250, 1050, 1900, 2700, 3700, 4600];
    ritmo.forEach((t, i) => relojes.push(setTimeout(() => pintarPaso(i), t)));
    relojes.push(setTimeout(() => { tacto.cara(repetir, 0); repetir.disabled = false; }, 5200));
  }
  if (pasos.length) {
    alVer(0.35, reproducir)($('#chat'));
    repetir.addEventListener('click', reproducir);
  }

  // ── La mañana: la cifra rueda una vez al entrar ──
  const cifra = $('#cifra-pacientes');
  if (cifra) alVer(0.5, () => setTimeout(() => tacto.cifra(cifra, '3'), 450))(cifra);

  // ── El ciclo del paciente: cinco momentos en el mismo sitio ──
  // Se cambia tocando el riel, arrastrando el escenario o con las flechas. El riel es un segmentado:
  // una sola píldora que viaja con muelle y toma el ancho de cada momento.
  const riel = $('.indice');
  const escenario = $('#escenario');
  const ciclo = $('#ciclo');
  if (riel && escenario) {
    const pestanas = $$('[role=tab]', riel);
    const momentos = pestanas.map(t => document.getElementById(t.getAttribute('aria-controls')));
    let actual = 0, relojes = [];

    // El tramo oscuro de la línea se coloca junto al nombre activo. Se calcula con la posición final
    // (las filas cerradas miden lo que su botón), no con la de mitad del despliegue.
    const colocarPildora = () => {
      const y = pestanas.slice(0, actual).reduce((s, t) => s + t.offsetHeight, 0);
      riel.style.setProperty('--y', y + 'px');
      riel.style.setProperty('--h', pestanas[actual].offsetHeight + 'px');
      if (!riel.dataset.medido) requestAnimationFrame(() => requestAnimationFrame(() => { riel.dataset.medido = 'ya'; }));
    };

    // Lo que pasa dentro de cada escena, en su orden (causa y consecuencia)
    const guiones = {
      'panel-ficha': m => relojes.push(setTimeout(() => $('.trazo', m)?.parentElement.setAttribute('data-dibujado', ''), 1600)),
      'panel-silla': () => { tacto.cara($('#hueco-relevo'), 0); relojes.push(setTimeout(() => tacto.cara($('#hueco-relevo'), 1), 1200)); },
      'panel-resena': () => {
        const c = $('#cifra-resenas'); c.textContent = '211'; delete c.dataset.valor;
        relojes.push(setTimeout(() => tacto.cifra(c, '212'), 1700));
      },
    };
    function jugar(m) {
      relojes.forEach(clearTimeout); relojes = [];
      momentos.forEach(x => { if (x !== m) { x.removeAttribute('data-juega'); $('[data-dibujado]', x)?.removeAttribute('data-dibujado'); } });
      m.removeAttribute('data-juega');
      void m.offsetWidth;
      m.dataset.juega = '';
      guiones[m.id]?.(m);
      document.dispatchEvent(new CustomEvent('denti:momento', { detail: m.id }));
    }

    function ir(n, { teclado = false, enfocar = false } = {}) {
      n = Math.max(0, Math.min(momentos.length - 1, n));
      if (n === actual) { volverAlSitio(); return; }
      const dir = n > actual ? 1 : -1;
      const sale = momentos[actual], entra = momentos[n];
      ciclo.toggleAttribute('data-teclado', teclado);
      // el que entra viene del lado hacia el que se avanza; el que sale se va por el otro
      entra.style.transition = 'none';
      entra.style.translate = `${dir * 16}px 0`;
      void entra.offsetWidth;
      entra.style.transition = '';
      entra.style.translate = '';
      sale.style.translate = `${dir * -16}px 0`;
      sale.removeAttribute('data-activo');
      entra.dataset.activo = '';
      pestanas.forEach((t, i) => {
        t.setAttribute('aria-selected', String(i === n));
        t.tabIndex = i === n ? 0 : -1;
        t.parentElement.toggleAttribute('data-activo', i === n);
      });
      actual = n;
      colocarPildora();
      if (enfocar) pestanas[n].focus();
      if (!teclado) tacto.sentir('seleccion');
      jugar(entra);
    }

    pestanas.forEach((t, i) => t.addEventListener('click', e => ir(i, { teclado: e.detail === 0 })));
    riel.addEventListener('keydown', e => {
      const mapa = { ArrowDown: actual + 1, ArrowRight: actual + 1, ArrowUp: actual - 1, ArrowLeft: actual - 1, Home: 0, End: momentos.length - 1 };
      if (!(e.key in mapa)) return;
      e.preventDefault();
      ir(mapa[e.key], { teclado: true, enfocar: true });
    });

    // Arrastrar el escenario: sigue al dedo 1:1, cede como goma en los extremos y decide con el impulso
    const rastro = tacto.rastro();
    let x0 = null, y0 = 0, dx = 0, horizontal = null, activo = null;
    function volverAlSitio() {
      const m = momentos[actual];
      m.style.transition = '';
      m.style.translate = '';
    }
    escenario.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      x0 = e.clientX; y0 = e.clientY; dx = 0; horizontal = null; activo = momentos[actual];
      rastro.limpiar();
    });
    escenario.addEventListener('pointermove', e => {
      if (x0 === null) return;
      const mx = e.clientX - x0, my = e.clientY - y0;
      if (horizontal === null && Math.hypot(mx, my) > 8) {
        horizontal = Math.abs(mx) > Math.abs(my);
        if (horizontal) { escenario.setPointerCapture(e.pointerId); escenario.dataset.arrastra = ''; activo.style.transition = 'none'; }
        else { x0 = null; return; }
      }
      if (!horizontal) return;
      rastro.anotar(e.clientX, 0);
      const ancho = escenario.clientWidth;
      const enBorde = (mx > 0 && actual === 0) || (mx < 0 && actual === momentos.length - 1);
      dx = enBorde ? tacto.goma(mx, ancho * 0.25) : mx;
      activo.style.translate = `${dx}px 0`;
    });
    const soltar = () => {
      if (x0 === null) return;
      x0 = null;
      delete escenario.dataset.arrastra;
      if (!horizontal) return;
      const destino = dx + tacto.proyectar(rastro.velocidad().x, 0.99);
      activo.style.transition = '';
      const umbral = escenario.clientWidth * 0.22;
      if (destino < -umbral && actual < momentos.length - 1) ir(actual + 1);
      else if (destino > umbral && actual > 0) ir(actual - 1);
      else { volverAlSitio(); if (Math.abs(dx) > 24) tacto.sentir('limite'); }
    };
    escenario.addEventListener('pointerup', soltar);
    escenario.addEventListener('pointercancel', soltar);
    // un arrastre no debe acabar en clic sobre lo que hay dentro
    escenario.addEventListener('click', e => { if (Math.abs(dx) > 8) { e.preventDefault(); e.stopPropagation(); dx = 0; } }, true);

    if ('ResizeObserver' in window) new ResizeObserver(colocarPildora).observe(riel);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(colocarPildora);
    colocarPildora();
    alVer(0.35, () => jugar(momentos[actual]))(escenario);
  }

  // ── Hojas: menú y demo ──
  const abrir = id => {
    const d = document.getElementById(id);
    if (!d) return;
    if (id === 'demo') reiniciarDemo();
    d.showModal();
  };
  document.addEventListener('click', e => {
    const disparador = e.target.closest('[data-abre]');
    if (disparador) { abrir(disparador.dataset.abre); return; }
    const cierre = e.target.closest('[data-cierra]');
    if (cierre) { cierre.closest('dialog').close(); return; }
  });
  $$('dialog.hoja').forEach(d => {
    // tocar fuera de la hoja la cierra
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
  });
  $$('#menu nav a').forEach(a => a.addEventListener('click', () => $('#menu').close()));

  // Arrastrar la hoja hacia abajo la cierra, con el mismo muelle (TACTO.md §7)
  $$('.hoja .asa').forEach(asa => {
    const hoja = asa.closest('.hoja');
    let y0 = null, dy = 0;
    const rastro = tacto.rastro();
    asa.style.touchAction = 'none';
    asa.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; rastro.limpiar(); asa.setPointerCapture(e.pointerId); hoja.style.transition = 'none'; });
    asa.addEventListener('pointermove', e => {
      if (y0 === null) return;
      dy = e.clientY - y0;
      rastro.anotar(0, e.clientY);
      hoja.style.translate = `0 ${dy > 0 ? dy : tacto.goma(dy, 200)}px`;
    });
    const soltar = () => {
      if (y0 === null) return;
      y0 = null;
      const v = rastro.velocidad().y;
      hoja.style.transition = '';
      hoja.style.translate = '';
      if (dy + tacto.proyectar(v) > hoja.offsetHeight * 0.4) hoja.close();
    };
    asa.addEventListener('pointerup', soltar);
    asa.addEventListener('pointercancel', soltar);
  });

  // ── Demo: la acción clave de la página ──
  const form = $('#form-demo');
  const enviar = form.querySelector('[type=submit]');
  const gracias = form.querySelector('.demo-gracias');
  const telefono = form.elements.whatsapp;
  const campoTel = telefono.closest('.campo');
  const errorTel = campoTel.querySelector('.campo-error');
  const digitos = v => v.replace(/\D/g, '');
  function reiniciarDemo() {
    tacto.cara(enviar, 0);
    enviar.disabled = false;
    gracias.hidden = true;
  }
  function validarTel() {
    const ok = digitos(telefono.value).length >= 10;
    campoTel.toggleAttribute('data-error', !ok);
    errorTel.hidden = ok;
    telefono.setAttribute('aria-invalid', String(!ok));
    return ok;
  }
  // Se valida al salir del campo, no mientras se escribe; el error se va en cuanto se corrige.
  telefono.addEventListener('blur', () => { if (telefono.value) validarTel(); });
  telefono.addEventListener('input', () => { if (campoTel.hasAttribute('data-error') && digitos(telefono.value).length >= 10) validarTel(); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const vacios = ['nombre', 'clinica', 'ciudad'].map(n => form.elements[n]).filter(i => !i.value.trim());
    const telOk = validarTel();
    if (vacios.length || !telOk) {
      const primero = vacios[0] || telefono;
      const campo = primero.closest('.campo');
      campo.removeAttribute('data-sacude');
      void campo.offsetWidth;
      campo.setAttribute('data-sacude', '');
      tacto.sentir('error');
      document.dispatchEvent(new CustomEvent('denti:demo', { detail: 'error' }));
      primero.focus();
      return;
    }
    enviar.disabled = true;
    tacto.cara(enviar, 1);
    const d = Object.fromEntries(new FormData(form));
    const texto = `Hola, quiero una demo de DentiCode.\nNombre: ${d.nombre}\nClínica: ${d.clinica}\nCiudad: ${d.ciudad}\nWhatsApp: ${d.whatsapp}`;
    // El indicador se queda al menos 500 ms para no parpadear
    setTimeout(() => {
      tacto.cara(enviar, 2);
      tacto.sentir('exito');
      document.dispatchEvent(new CustomEvent('denti:demo', { detail: 'listo' }));
      gracias.hidden = false;
      if (WHATSAPP_DENTICODE) setTimeout(() => window.open(`https://wa.me/${WHATSAPP_DENTICODE}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener'), 700);
    }, 600);
  });
})();
