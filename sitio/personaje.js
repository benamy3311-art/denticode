/* Denti — cambia de gesto según la sección que se está leyendo y reacciona a lo que pasa en ella
   (la noche, el ciclo del paciente, la demo). Cada frase se dice una sola vez por visita, salvo
   que la provoque la persona (tocar a Denti o cambiar de momento en el ciclo). */
(() => {
  'use strict';
  const denti = document.getElementById('denti');
  const cuerpo = document.getElementById('denti-cuerpo');
  const globo = document.getElementById('denti-globo');
  if (!denti) return;
  const caras = [...denti.querySelectorAll('.cara')];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)');

  // Qué hace en cada sección: gesto y frase
  const SECCIONES = {
    heroe:      { cara: 'feliz',    frase: 'Hola, soy Denti. Ordeno tu clínica y contesto cuando cierra.' },
    noche:      { cara: 'feliz',    frase: 'Son las 23:47. Mira lo que hago.' },
    manana:     { cara: 'contento', frase: 'Buenos días. Anoche agendé a 3.' },
    responde:   { cara: 'pensando', frase: 'Si no lo sé, no lo invento.' },
    pasa:       { cara: 'serio',    frase: 'Esto se lo paso a tu equipo.' },
    aclaracion: { cara: 'guino',    frase: 'Yo no reemplazo a nadie.' },
    ciclo:      { cara: 'leyendo',  frase: null },
    piloto:     { cara: 'feliz',    frase: '¿Me pruebas un mes?' },
    tablero:    { cara: 'leyendo',  frase: 'Esto ve tu recepción cada mañana.' },
  };
  // En la noche sigue el chat paso a paso
  const PASOS = [
    { cara: 'sorpresa', frase: 'Un audio. Lo escucho.' },
    { cara: 'pensando', frase: null },
    { cara: 'leyendo',  frase: 'Reviso la agenda…' },
    { cara: 'feliz',    frase: null },
    { cara: 'feliz',    frase: null },
    { cara: 'contento', frase: 'Cita creada. A dormir.' },
  ];
  // En el ciclo, cada momento tiene su gesto; algunos cambian a mitad de la escena
  const MOMENTOS = {
    'panel-ficha':   [{ cara: 'leyendo',  frase: 'Ya leí su ficha. Alérgica a la penicilina.' }],
    'panel-silla':   [{ cara: 'sorpresa', frase: 'Paola canceló…' }, { cara: 'contento', frase: 'Silla llena otra vez.', tras: 1300 }],
    'panel-plan':    [{ cara: 'feliz',    frase: 'Le escribo a Roberto.' }],
    'panel-resena':  [{ cara: 'guino',    frase: null }, { cara: 'contento', frase: 'Una reseña más.', tras: 1800 }],
    'panel-dormido': [{ cara: 'dormido',  frase: 'Ana lleva un año sin venir…' }, { cara: 'feliz', frase: 'Vuelve el martes.', tras: 1500 }],
  };

  let caraActual = 'feliz', relojGlobo = 0, relojesMomento = [];
  const dichas = new Set();

  function poner(nombre) {
    if (nombre === caraActual) return;
    caraActual = nombre;
    caras.forEach(c => c.toggleAttribute('data-activa', c.dataset.cara === nombre));
    if (reducido.matches) return;
    cuerpo.removeAttribute('data-cambia');
    void cuerpo.getBBox();
    cuerpo.setAttribute('data-cambia', '');
  }
  cuerpo.addEventListener('animationend', e => { if (e.animationName === 'denti-cambia') cuerpo.removeAttribute('data-cambia'); });

  function decir(frase, { siempre = false } = {}) {
    if (!frase || (!siempre && dichas.has(frase))) return;
    dichas.add(frase);
    clearTimeout(relojGlobo);
    const mostrar = () => {
      globo.textContent = frase;
      globo.setAttribute('data-abierto', '');
      relojGlobo = setTimeout(() => globo.removeAttribute('data-abierto'), 2600 + frase.length * 30);
    };
    // si ya había un globo abierto, primero se va y luego llega el nuevo
    if (globo.hasAttribute('data-abierto')) { globo.removeAttribute('data-abierto'); relojGlobo = setTimeout(mostrar, 170); }
    else mostrar();
  }

  // ── Parpadeo: cada 3–6 s, solo con los ojos abiertos ──
  (function parpadear() {
    setTimeout(() => {
      if (!reducido.matches && !document.hidden) {
        denti.setAttribute('data-parpadea', '');
        setTimeout(() => denti.removeAttribute('data-parpadea'), 130);
      }
      parpadear();
    }, 3000 + Math.random() * 3000);
  })();

  // ── Qué sección se está leyendo: la que cruza la mitad de la pantalla ──
  const zonas = [
    ['heroe', document.querySelector('.heroe')],
    ['noche', document.getElementById('noche')],
    ['manana', document.getElementById('manana')],
    ['responde', document.querySelector('#responde .listas > div:first-child')],
    ['pasa', document.querySelector('#responde .listas > div:last-child')],
    ['aclaracion', document.querySelector('.aclaracion')],
    ['ciclo', document.getElementById('ciclo')],
    ['piloto', document.getElementById('piloto')],
    ['tablero', document.getElementById('ventana')],
  ].filter(([, el]) => el);
  let seccion = null;
  const io = new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      if (!e.isIntersecting) return;
      const nombre = zonas.find(([, el]) => el === e.target)[0];
      if (nombre === seccion) return;
      seccion = nombre;
      relojesMomento.forEach(clearTimeout); relojesMomento = [];
      const s = SECCIONES[nombre];
      poner(s.cara);
      decir(s.frase);
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  zonas.forEach(([, el]) => io.observe(el));

  // ── Reacciones a lo que pasa dentro de las secciones ──
  document.addEventListener('denti:paso', e => {
    const p = PASOS[e.detail];
    if (!p || seccion !== 'noche') return;
    poner(p.cara);
    decir(p.frase);
  });
  document.addEventListener('denti:momento', e => {
    const guion = MOMENTOS[e.detail];
    if (!guion) return;
    relojesMomento.forEach(clearTimeout); relojesMomento = [];
    guion.forEach(g => relojesMomento.push(setTimeout(() => { poner(g.cara); decir(g.frase, { siempre: true }); }, g.tras || 0)));
  });
  document.addEventListener('denti:pago', e => {
    poner('contento');
    decir(`${e.detail.paciente.split(' ')[0]} abonó. Ya cuadra el saldo.`, { siempre: true });
  });
  document.addEventListener('denti:demo', e => {
    if (e.detail === 'listo') { poner('contento'); decir('Te escribimos hoy mismo.', { siempre: true }); }
    else { poner('serio'); decir('Falta un dato.', { siempre: true }); }
  });

  // ── Tocar a Denti: se alegra y repite lo que tiene que decir aquí ──
  denti.addEventListener('click', () => {
    const anterior = caraActual;
    poner('contento');
    tacto.sentir('toque');
    const s = SECCIONES[seccion] || SECCIONES.heroe;
    decir(s.frase || 'Toca los momentos del paciente.', { siempre: true });
    setTimeout(() => poner(anterior === 'contento' ? 'feliz' : anterior), 1400);
  });
})();
