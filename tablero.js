/* Panel de control de recepción. Datos de ejemplo con semilla (siempre los mismos), colocados
   alrededor de la fecha de hoy. Lo que se hace aquí (cobrar, recordar, resolver un pase)
   recalcula todo lo que depende de ello: cifras de arriba, caja y listas. */
(() => {
  'use strict';
  const ventana = document.getElementById('ventana');
  if (!ventana) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const dinero = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const fCorta = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
  const fLarga = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const sinPunto = s => s.replace(/\./g, '');
  const iniciales = n => n.split(' ').map(p => p[0]).slice(0, 2).join('');
  const hm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const sentir = t => window.tacto && tacto.sentir(t);

  // ── Semilla ──
  let semilla = 20261112;
  const azar = () => { semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
  const elegir = l => l[Math.floor(azar() * l.length)];

  const HOY = new Date(); HOY.setHours(0, 0, 0, 0);
  const dia = n => { const d = new Date(HOY); d.setDate(d.getDate() + n); return d; };
  // Fuera del horario de la clínica, la demostración se coloca a media mañana para que se vea viva
  const ahoraClinica = () => {
    const a = new Date(), h = a.getHours() + a.getMinutes() / 60;
    if (h >= 8.5 && h <= 18.5 && a.getDay() !== 0) return a;
    const d = new Date(HOY); d.setHours(11, 20, 0, 0); return d;
  };
  const mismoMes = (a, b) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  // ── Pacientes con tratamiento y su historial de pagos (para Pacientes, Pagos y la curva) ──
  const MEDIOS = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Transferencia', 'Nequi'];
  const tratamientos = [
    ['Lucía Méndez', '310 418 2290', 'Endodoncia molar', 650000],
    ['Ana Gutiérrez', '315 201 7745', 'Ortodoncia con brackets', 4800000],
    ['Roberto Salas', '300 392 1184', 'Implante y corona', 4200000],
    ['Sofía Robles', '312 110 9036', 'Ortodoncia invisible', 9500000],
    ['Daniela Ortiz', '320 447 5520', 'Puente fijo, 3 piezas', 3600000],
    ['Rodrigo Sánchez', '301 226 0417', 'Corona de zirconia', 1400000],
    ['Paola Vega', '316 305 6628', 'Blanqueamiento', 750000],
    ['Marco Torres', '304 157 3302', 'Resinas, 3 piezas', 480000],
    ['Elena Cruz', '318 480 7713', 'Extracción de tercer molar', 450000],
    ['Luis Peña', '311 273 9981', 'Guarda oclusal', 520000],
    ['Mariana Ríos', '317 338 1246', 'Carillas, 4 piezas', 4400000],
    ['Jorge Paredes', '300 196 4470', 'Limpieza y profilaxis', 150000],
  ].map(([nombre, tel, trat, total]) => ({ nombre, tel, trat, total, pagado: 0, inicio: -entre(4, 58) }));
  const sueltos = ['Fernanda León', 'Iván Castro', 'Regina Flores', 'Héctor Gil', 'Valeria Mora', 'Óscar Lara', 'Camila Soto', 'Andrés Ruiz', 'Natalia Paz', 'Emilio Vargas'];
  const SERVICIOS = [['Valoración', 60000], ['Valoración', 60000], ['Limpieza y profilaxis', 150000], ['Limpieza y profilaxis', 150000], ['Resina', 160000], ['Resina', 160000], ['Radiografía panorámica', 70000], ['Ajuste de ortodoncia', 120000], ['Extracción simple', 180000], ['Endodoncia, sesión', 300000], ['Blanqueamiento, sesión', 380000]];
  const pagos = [];
  let folio = 1;
  for (let n = -61; n <= -1; n++) {
    const fecha = dia(n), dow = fecha.getDay();
    if (dow === 0) continue;
    for (let k = 0, c = dow === 6 ? entre(2, 4) : entre(4, 7); k < c; k++) {
      const abiertos = tratamientos.filter(t => t.total - t.pagado > 0 && t.inicio <= n && t.nombre !== 'Mariana Ríos');
      if (azar() < 0.3 && abiertos.length) {
        const t = elegir(abiertos), resta = t.total - t.pagado;
        const monto = t.total <= 800000 ? resta : Math.min(resta, entre(2, 8) * 100000);
        if (t.total > 2500000 && t.pagado + monto > t.total * 0.72) continue;
        t.pagado += monto;
        pagos.push({ folio: folio++, fecha, paciente: t.nombre, concepto: t.trat, medio: elegir(MEDIOS), monto });
      } else {
        const [concepto, monto] = elegir(SERVICIOS);
        pagos.push({ folio: folio++, fecha, paciente: elegir(sueltos), concepto, medio: elegir(MEDIOS), monto });
      }
    }
  }
  tratamientos.forEach(t => {
    if (t.total - t.pagado <= 0 && azar() < 0.5) { t.cita = null; return; }
    const d = dia(entre(1, 16)); if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    d.setHours(entre(9, 18), azar() < 0.5 ? 0 : 30); t.cita = d;
  });

  // ── Hoy en recepción ──
  // [hora, minutos, paciente, motivo, tipo, sillón, confirmada]
  const AGENDA = [
    [9, 60, 'Lucía Méndez', 'Endodoncia, 2.ª sesión', 'trat', 1, true],
    [9, 45, 'Jorge Paredes', 'Limpieza', 'limp', 2, true],
    [10.5, 60, 'Marco Torres', 'Resinas', 'trat', 1, true],
    [11, 45, 'Ana Gutiérrez', 'Ajuste de brackets', 'orto', 2, true],
    [12.5, 45, 'Fernanda León', 'Valoración', 'limp', 1, false],
    [16, 60, 'Roberto Salas', 'Revisión de implante', 'trat', 1, false],
    [17.5, 60, 'Sofía Robles', 'Cambio de alineadores', 'orto', 2, true],
  ].map(([h, min, nombre, motivo, tipo, sillon, conf]) => ({ h, min, nombre, motivo, tipo, sillon, conf }));
  // Lo que se cobra hoy: lo que ya pasó por caja y lo que falta
  const COBROS = [
    { nombre: 'Lucía Méndez', concepto: 'Endodoncia, 2.ª sesión', monto: 300000, medio: 'Tarjeta débito' },
    { nombre: 'Jorge Paredes', concepto: 'Limpieza', monto: 150000, medio: 'Efectivo' },
    { nombre: 'Marco Torres', concepto: 'Resinas, 3 piezas', monto: 480000, medio: null },
    { nombre: 'Ana Gutiérrez', concepto: 'Cuota de ortodoncia', monto: 250000, medio: 'Nequi' },
    { nombre: 'Fernanda León', concepto: 'Valoración', monto: 60000, medio: null },
    { nombre: 'Roberto Salas', concepto: 'Abono de implante', monto: 800000, medio: null },
  ];
  // lo que ya pasó por caja hoy también es historial de pagos
  COBROS.filter(c => c.medio).forEach(c => pagos.push({ folio: folio++, fecha: new Date(HOY), paciente: c.nombre, concepto: c.concepto, medio: c.medio, monto: c.monto }));
  const PASES = [
    { nombre: 'Mariana Ríos', hora: '23:12', motivo: 'Presupuesto', texto: '«¿Cuánto cuestan unas carillas? Quiero 4.» Denti no dio cifra.' },
    { nombre: 'Roberto Salas', hora: '07:41', motivo: 'Cambio de cita', texto: '«No llego a las 16:00, ¿me pasan a mañana?» Hay hueco a las 10:30.' },
  ];
  const MANANA = [
    ['09:00', 'Paola Vega', 'Blanqueamiento', true],
    ['10:00', 'Rodrigo Sánchez', 'Prueba de corona', true],
    ['11:30', 'Valeria Mora', 'Valoración', false],
    ['13:00', 'Daniela Ortiz', 'Prueba de puente', false],
    ['17:00', 'Luis Peña', 'Entrega de guarda', true],
  ].map(([h, nombre, motivo, conf]) => ({ h, nombre, motivo, conf, recordado: false }));

  // ── Encabezado ──
  $('#tb-fecha').textContent = fLarga.format(HOY);
  const cobradoHoy = () => COBROS.filter(c => c.medio).reduce((s, c) => s + c.monto, 0);
  function pintarArriba(animar) {
    const pendientes = COBROS.filter(c => !c.medio).length, pases = PASES.filter(p => !p.hecho).length;
    $('#saludo-sub').textContent = `${AGENDA.length} citas · ${pases ? pases + (pases === 1 ? ' conversación' : ' conversaciones') + ' para ti' : 'sin conversaciones pendientes'} · ${pendientes ? pendientes + (pendientes === 1 ? ' cobro pendiente' : ' cobros pendientes') : 'caja al día'}`;
    const el = $('#kpi-cobrado'), txt = dinero.format(cobradoHoy());
    if (animar && window.tacto) tacto.cifra(el, txt); else { el.textContent = txt; el.dataset.valor = txt; }
    const conf = AGENDA.filter(a => a.conf).length;
    $('#kpi-conf').textContent = `${conf} de ${AGENDA.length}`;
  }

  // ── Pases de Denti ──
  function pintarPases() {
    const abiertos = PASES.filter(p => !p.hecho);
    $('#pendientes-n').textContent = abiertos.length;
    $('#asistente-chat').innerHTML = abiertos.length ? abiertos.map(p => `
      <li class="pase" data-nombre="${esc(p.nombre)}">
        <span class="pase-cabeza"><b>${esc(p.nombre)} · ${p.motivo}</b><time>${p.hora}</time></span>
        <p>${esc(p.texto)}</p>
        <span class="pase-acciones"><button class="boton-mini" type="button" data-pase="responder">Responder</button><button class="boton-mini tenue" type="button" data-pase="hecho">Marcar resuelto</button></span>
      </li>`).join('') : '<li class="asistente-hecho">Todo resuelto. Denti te avisa si llega algo nuevo.</li>';
    const primero = abiertos[0];
    $('#asistente-texto').placeholder = primero ? `Responder a ${primero.nombre.split(' ')[0]}` : 'Escríbele a Denti';
  }
  function resolver(nombre) {
    const li = $(`.pase[data-nombre="${CSS.escape(nombre)}"]`);
    const p = PASES.find(x => x.nombre === nombre); if (!p) return;
    p.hecho = true;
    sentir('toque');
    if (li) { li.dataset.sale = ''; setTimeout(() => { pintarPases(); pintarArriba(false); }, 160); }
    else { pintarPases(); pintarArriba(false); }
  }
  $('#asistente-chat').addEventListener('click', e => {
    const b = e.target.closest('[data-pase]'); if (!b) return;
    const nombre = b.closest('.pase').dataset.nombre;
    if (b.dataset.pase === 'hecho') resolver(nombre);
    else { const i = $('#asistente-texto'); i.placeholder = `Responder a ${nombre.split(' ')[0]}`; i.dataset.para = nombre; i.focus(); }
  });
  $('#asistente-form').addEventListener('submit', e => {
    e.preventDefault();
    const i = $('#asistente-texto');
    if (!i.value.trim()) { i.focus(); return; }
    const para = i.dataset.para || (PASES.find(p => !p.hecho) || {}).nombre;
    i.value = ''; delete i.dataset.para;
    if (para) resolver(para);
  });

  // ── Línea de tiempo por sillón (08:00 a 19:00) ──
  const INICIO = 8, FIN = 19;
  const pos = h => ((h - INICIO) / (FIN - INICIO)) * 100;
  function pintarLinea() {
    const ahora = ahoraClinica(), hAhora = ahora.getHours() + ahora.getMinutes() / 60;
    const horas = Array.from({ length: FIN - INICIO }, (_, k) => `<span>${String(INICIO + k).padStart(2, '0')}:00</span>`).join('');
    const carril = s => AGENDA.filter(a => a.sillon === s).map(a => {
      const fin = a.h + a.min / 60, paso = fin <= hAhora ? 'hecha' : a.h <= hAhora ? 'ahora' : 'luego';
      const hh = Math.floor(a.h), mm = Math.round((a.h - hh) * 60);
      return `<div class="cita" data-t="${a.tipo}" data-paso="${paso}" style="--x:${pos(a.h)}%;--w:${pos(fin) - pos(a.h)}%" title="${esc(a.nombre)} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}">
        <span><b>${esc(a.nombre)}</b><small>${esc(a.motivo)}</small></span><span class="avatar">${iniciales(a.nombre)}</span></div>`;
    }).join('');
    const enRango = hAhora >= INICIO && hAhora <= FIN;
    $('#linea-tiempo').innerHTML = `<div class="lt-horas" aria-hidden="true">${horas}</div>
      <div class="lt-carril"><b>Sillón 1</b><div class="lt-pista">${carril(1)}</div></div>
      <div class="lt-carril"><b>Sillón 2</b><div class="lt-pista">${carril(2)}</div></div>
      ${enRango ? `<div class="lt-ahora" style="--x:calc((100% - 64px) * ${(pos(hAhora) / 100).toFixed(4)})"><span>${hm(ahora)}</span></div>` : ''}`;
    // Lo que la recepcionista mira primero: quién está en cada sillón y quién sigue
    const enSillon = s => AGENDA.find(a => a.sillon === s && a.h <= hAhora && a.h + a.min / 60 > hAhora);
    const sigue = AGENDA.filter(a => a.h > hAhora).sort((a, b) => a.h - b.h)[0];
    const hora = h => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
    const ocupa = s => { const a = enSillon(s); return a ? `${esc(a.nombre)}<small>${esc(a.motivo)} · hasta ${hora(a.h + a.min / 60)}</small>` : 'Libre<small>Sin paciente ahora</small>'; };
    $('#lt-estado').innerHTML = `<div><dt>Sillón 1</dt><dd>${ocupa(1)}</dd></div><div><dt>Sillón 2</dt><dd>${ocupa(2)}</dd></div>
      <div><dt>Sigue</dt><dd>${sigue ? `${esc(sigue.nombre)}<small>${hora(sigue.h)} · ${sigue.conf ? 'confirmada' : 'sin confirmar'}</small>` : 'Nadie más hoy<small>La agenda terminó</small>'}</dd></div>`;
    // abre con la hora actual a un tercio del ancho visible (fuera de horario, al inicio del día)
    const marco = $('#linea-tiempo').parentElement, lt = $('#linea-tiempo');
    const objetivo = enRango ? 64 + (lt.clientWidth - 64) * pos(hAhora) / 100 - marco.clientWidth / 3 : 0;
    marco.scrollLeft = Math.max(0, objetivo);
  }

  // ── Cobros de hoy: los pendientes se cobran aquí mismo eligiendo el medio ──
  function pintarCobros() {
    const pend = COBROS.filter(c => !c.medio);
    $('#pagos-hoy-sub').textContent = pend.length ? `${pend.length} por cobrar · ${dinero.format(pend.reduce((s, c) => s + c.monto, 0))}` : 'Todo cobrado';
    $('#pagos-hoy').innerHTML = COBROS.map((c, i) => `
      <li><span class="avatar avatar-rosa">${iniciales(c.nombre)}</span>
        <span class="quien"><b>${esc(c.nombre)}</b><small>${esc(c.concepto)}</small></span>
        <span class="cobro" data-i="${i}"><b>${dinero.format(c.monto)}</b>${c.medio
          ? `<span class="cobro-estado"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>${c.medio.replace('Tarjeta ', 'T. ')}</span>`
          : `<span class="cobro-medios" role="group" aria-label="Cobrar ${esc(c.nombre)} con"><button type="button" data-medio="Efectivo">Efectivo</button><button type="button" data-medio="Tarjeta débito">Tarjeta</button><button type="button" data-medio="Nequi">Nequi</button></span>`}</span></li>`).join('');
  }
  $('#pagos-hoy').addEventListener('click', e => {
    const b = e.target.closest('[data-medio]'); if (!b) return;
    cobrar(+b.closest('.cobro').dataset.i, b.dataset.medio);
  });
  function cobrar(i, medio) {
    const c = COBROS[i]; if (!c || c.medio) return;
    c.medio = medio;
    pagos.push({ folio: folio++, fecha: new Date(HOY), paciente: c.nombre, concepto: c.concepto, medio, monto: c.monto, nuevo: true });
    const t = tratamientos.find(x => x.nombre === c.nombre && x.total - x.pagado > 0); if (t) t.pagado = Math.min(t.total, t.pagado + c.monto);
    pintarCobros(); pintarArriba(true); pintarCaja(); pintarPacientes(); pintarPagos(); pintarCurva();
    const celda = $(`.cobro[data-i="${i}"]`); if (celda) celda.dataset.relevo = '';
    sentir('encaje');
    document.dispatchEvent(new CustomEvent('denti:pago', { detail: { paciente: c.nombre, monto: c.monto } }));
  }
  // El botón negro de arriba lleva al primer cobro pendiente
  $('#tb-registrar').addEventListener('click', () => {
    const i = COBROS.findIndex(c => !c.medio);
    if (i < 0) return;
    const grupo = $(`.cobro[data-i="${i}"] .cobro-medios button`);
    grupo && grupo.focus();
    grupo && grupo.closest('li').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  // ── Mañana: confirmar o recordar ──
  function pintarManana() {
    const sin = MANANA.filter(m => !m.conf && !m.recordado).length;
    $('#manana-sub').textContent = sin ? `${sin} sin confirmar` : 'Todas confirmadas o recordadas';
    $('#manana-lista').innerHTML = MANANA.map((m, i) => `
      <li><time>${m.h}</time><span class="quien"><b>${esc(m.nombre)}</b><small>${esc(m.motivo)}</small></span>
        ${m.conf ? '<span class="confirmo"><span class="punto punto-ok"></span>Confirmó</span>'
          : `<button class="boton-mini" type="button" data-recordar="${i}" ${m.recordado ? 'disabled' : ''}><span class="caras"><span ${m.recordado ? '' : 'data-activa'}>Recordar</span><span ${m.recordado ? 'data-activa' : ''}>Denti le escribió</span></span></button>`}</li>`).join('');
  }
  $('#manana-lista').addEventListener('click', e => {
    const b = e.target.closest('[data-recordar]'); if (!b) return;
    const m = MANANA[+b.dataset.recordar]; if (m.recordado) return;
    m.recordado = true; b.disabled = true;
    tacto.cara(b, 1); sentir('toque');
    setTimeout(() => { $('#manana-sub').textContent = MANANA.some(x => !x.conf && !x.recordado) ? `${MANANA.filter(x => !x.conf && !x.recordado).length} sin confirmar` : 'Todas confirmadas o recordadas'; }, 200);
  });

  // ── Caja de hoy: cápsula de anillos por medio ──
  const GLIFOS = {
    Efectivo: '<path class="glifo" d="M17 20.5h12M23 17v12M19.5 19.5c0-1.4 1.6-2.5 3.5-2.5s3.5 1.1 3.5 2.5-1.6 2.5-3.5 2.5-3.5 1.1-3.5 2.5 1.6 2.5 3.5 2.5 3.5-1.1 3.5-2.5" transform="translate(0 0)"/>',
    Tarjeta: '<rect class="glifo" x="16" y="18" width="14" height="10" rx="2"/><path class="glifo" d="M16 21.5h14"/>',
    Transferencia: '<path class="glifo" d="M17 20h11l-3-3M29 26H18l3 3"/>',
  };
  function pintarCaja() {
    const g = { Efectivo: 0, Tarjeta: 0, Transferencia: 0 };
    COBROS.filter(c => c.medio).forEach(c => { g[c.medio.startsWith('Tarjeta') ? 'Tarjeta' : c.medio === 'Efectivo' ? 'Efectivo' : 'Transferencia'] += c.monto; });
    const total = Object.values(g).reduce((s, v) => s + v, 0) || 1;
    $('#capsula').innerHTML = Object.entries(g).map(([m, v]) => {
      const p = Math.round(v / total * 100);
      return `<li><svg viewBox="0 0 46 46" aria-hidden="true"><circle class="pista-anillo" cx="23" cy="23" r="19"/><circle class="valor-anillo" cx="23" cy="23" r="19" pathLength="100" style="--v:${p}"/>${GLIFOS[m]}</svg>
        <span>${p} %</span><small>${m === 'Transferencia' ? 'Nequi y transf.' : m}</small></li>`;
    }).join('');
    $('#capsula').setAttribute('aria-label', Object.entries(g).map(([m, v]) => `${m} ${dinero.format(v)}`).join(', '));
  }

  // ── Semana ──
  function pintarSemana() {
    const lunes = dia(-((HOY.getDay() + 6) % 7));
    const dias = Array.from({ length: 6 }, (_, k) => { const d = new Date(lunes); d.setDate(d.getDate() + k); return d; });
    const fmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric' }), mes = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
    $('#semana-titulo').textContent = `${fmt.format(dias[0])} – ${fmt.format(dias[5])} de ${mes.format(dias[5])}`;
    const corto = new Intl.DateTimeFormat('es-CO', { weekday: 'short' });
    const ALTO = 64;
    const nombres = [...tratamientos.map(t => t.nombre), ...sueltos];
    const motivos = { orto: ['Ajuste de brackets', 'Alineadores'], trat: ['Endodoncia', 'Resina', 'Corona', 'Implante'], limp: ['Limpieza', 'Valoración'] };
    const columnas = dias.map(d => {
      const esHoy = +d === +HOY;
      let evs = [];
      if (esHoy) evs = AGENDA.map(a => ({ h: a.h, min: a.min, nombre: a.nombre, motivo: a.motivo, tipo: a.tipo, sillon: a.sillon, conf: a.conf }));
      else {
        const sabado = d.getDay() === 6;
        const horas = sabado ? [9, 10, 11.5, 12.5] : [9, 10, 11, 12.5, 16, 17, 18];
        horas.forEach(h => { if (azar() < 0.72) { const tipo = elegir(['orto', 'trat', 'trat', 'limp', 'limp']); evs.push({ h, min: elegir([45, 60]), nombre: elegir(nombres), motivo: elegir(motivos[tipo]), tipo, sillon: entre(1, 2), conf: azar() < 0.75 }); } });
      }
      const html = evs.map(e => {
        const hh = Math.floor(e.h), mm = Math.round((e.h - hh) * 60), fin = new Date(0, 0, 0, hh, mm + e.min);
        return `<div class="ev" data-t="${e.tipo}" data-s="${e.sillon}" style="--t:${(e.h - INICIO) * ALTO + 2}px;--h:${e.min / 60 * ALTO - 4}px">
          <b>${esc(e.nombre)}</b><small>${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} – ${hm(fin)}</small>${e.conf && e.min >= 60 ? '<span class="ev-ok"><span class="punto punto-ok"></span>Confirmada</span>' : ''}</div>`;
      }).join('');
      const ahora = ahoraClinica(), hA = ahora.getHours() + ahora.getMinutes() / 60;
      const linea = esHoy && hA >= INICIO && hA <= FIN ? `<div class="semana-ahora" style="--t:${(hA - INICIO) * ALTO}px"><span>${hm(ahora)}</span></div>` : '';
      return { cab: `<div class="semana-dia"${esHoy ? ' data-hoy' : ''}><span>${sinPunto(corto.format(d))} ${fmt.format(d)}</span></div>`, col: `<div class="semana-col" style="block-size:${(FIN - INICIO) * ALTO}px">${html}${linea}</div>` };
    });
    const horas = Array.from({ length: FIN - INICIO }, (_, k) => `<span>${String(INICIO + k).padStart(2, '0')}:00</span>`).join('');
    $('#semana').innerHTML = `<div class="semana-dia"></div>${columnas.map(c => c.cab).join('')}<div class="semana-horas">${horas}</div>${columnas.map(c => c.col).join('')}`;
  }
  $('#filtro-sillon').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#filtro-sillon button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $$('#semana .ev').forEach(ev => ev.toggleAttribute('data-oculta', b.dataset.s !== 'todos' && ev.dataset.s !== b.dataset.s));
    sentir('seleccion');
  });

  // ── Pacientes ──
  const buscar = $('#tb-buscar');
  const sinAcento = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function pintarPacientes() {
    const q = sinAcento(buscar.value.trim());
    const saldo = tratamientos.reduce((s, t) => s + Math.max(0, t.total - t.pagado), 0);
    $('#pac-resumen').innerHTML = `${tratamientos.length} pacientes con tratamiento · saldo <b>${dinero.format(saldo)}</b>`;
    const lista = tratamientos.filter(t => !q || sinAcento(`${t.nombre} ${t.tel} ${t.trat}`).includes(q)).sort((a, b) => (b.total - b.pagado) - (a.total - a.pagado)).slice(0, 8);
    const caja = $('#tb-pacientes'); caja.classList.add('lista-pacientes');
    caja.innerHTML = lista.length ? lista.map(t => {
      const p = Math.round(t.pagado / t.total * 100), resta = t.total - t.pagado;
      return `<div class="fila-app"><span class="avatar avatar-cielo">${iniciales(t.nombre)}</span>
        <span class="quien"><b>${esc(t.nombre)}</b><small>${esc(t.trat)}</small></span>
        <span class="progreso solo-ancho-app">${p ? `${p} % de ${dinero.format(t.total)}` : `Presupuesto de ${dinero.format(t.total)}`}<i style="--p:${p}%"></i></span>
        <span class="tenue solo-ancho-app">${t.cita ? `${sinPunto(fCorta.format(t.cita))}, ${hm(t.cita)}` : 'Sin cita'}</span>
        <span class="num">${resta ? dinero.format(resta) : 'Pagado'}</span></div>`;
    }).join('') : '<p class="lista-vacia">Ningún paciente coincide con la búsqueda.</p>';
  }
  buscar.addEventListener('input', pintarPacientes);

  // ── Pagos: filtro por medio, curva de 14 días y lista ──
  let medioFiltro = 'Todos';
  const filtros = $('#tb-medios');
  filtros.innerHTML = ['Todos', 'Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Transferencia', 'Nequi'].map(m => `<button type="button" aria-pressed="${m === 'Todos'}" data-medio="${m}">${m}</button>`).join('');
  filtros.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    medioFiltro = b.dataset.medio;
    $$('button', filtros).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    sentir('seleccion'); pintarPagos();
  });
  function pintarPagos() {
    const lista = pagos.filter(p => mismoMes(p.fecha, HOY) && (medioFiltro === 'Todos' || p.medio === medioFiltro)).sort((a, b) => b.fecha - a.fecha || b.folio - a.folio);
    $('#tb-total').innerHTML = `Este mes · ${lista.length} pagos · <b>${dinero.format(lista.reduce((s, p) => s + p.monto, 0))}</b>`;
    const caja = $('#tb-pagos'); caja.classList.add('lista-pagos');
    caja.innerHTML = lista.slice(0, 7).map(p => `<div class="fila-app"${p.nuevo ? ' data-nueva' : ''}><span class="tenue">${sinPunto(fCorta.format(p.fecha))}</span>
      <span class="quien"><b>${esc(p.paciente)}</b><small>${esc(p.concepto)}</small></span>
      <span class="tenue solo-ancho-app">${esc(p.concepto)}</span><span class="tenue solo-ancho-app">${p.medio}</span><span class="num">${dinero.format(p.monto)}</span></div>`).join('');
    pagos.forEach(p => delete p.nuevo);
  }

  const curva = $('#curva');
  function pintarCurva() {
    const w = curva.clientWidth, h = curva.clientHeight;
    if (!w || !h) return;
    const datos = [];
    for (let n = -13; n <= 0; n++) { const f = dia(n); datos.push({ f, v: pagos.filter(p => +p.fecha === +f).reduce((s, p) => s + p.monto, 0) }); }
    const izq = 36, abajo = 20, arriba = 26;
    const tope = Math.ceil(Math.max(...datos.map(d => d.v)) / 1000000) * 1000000 || 1000000;
    const x = i => izq + i * (w - izq - 8) / (datos.length - 1), y = v => arriba + (1 - v / tope) * (h - arriba - abajo);
    const P = datos.map((d, i) => [x(i), y(d.v)]);
    // curva suave (Catmull-Rom a Bézier)
    let dPath = `M${P[0][0]} ${P[0][1]}`;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
      dPath += `C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
    }
    const k = v => v ? `$ ${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M` : '$ 0';
    curva.innerHTML = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
      ${[0, tope / 2, tope].map(t => `<line class="rejilla" x1="${izq}" x2="${w}" y1="${y(t)}" y2="${y(t)}"/><text class="eje" x="${izq - 6}" y="${y(t) + 4}" text-anchor="end">${k(t)}</text>`).join('')}
      ${[0, 13].map(i => `<text class="eje" x="${x(i)}" y="${h - 2}" text-anchor="${i ? 'end' : 'start'}">${sinPunto(fCorta.format(datos[i].f))}</text>`).join('')}
      <path class="trazo-curva" d="${dPath}"/>
      <g class="puntos">${P.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.5"/>`).join('')}</g>
      <circle class="marca-activa" r="4.5" cx="0" cy="0"/>
    </svg><span class="curva-etiqueta"></span>`;
    const marca = $('.marca-activa', curva), et = $('.curva-etiqueta', curva);
    const mostrar = i => {
      const [px, py] = P[i];
      marca.setAttribute('cx', px); marca.setAttribute('cy', py);
      et.textContent = `${sinPunto(fCorta.format(datos[i].f))} · ${datos[i].v ? dinero.format(datos[i].v) : 'Cerrado'}`;
      const ancho = et.offsetWidth;
      et.style.setProperty('--x', Math.max(0, Math.min(w - ancho, px - ancho / 2)) + 'px');
      et.style.setProperty('--y', Math.max(0, py - 28) + 'px');
    };
    // empieza marcando el mejor día; luego sigue al cursor o al dedo
    let mejor = 0; datos.forEach((d, i) => { if (d.v > datos[mejor].v) mejor = i; });
    mostrar(mejor);
    curva.onpointermove = e => { const r = curva.getBoundingClientRect(); mostrar(Math.max(0, Math.min(datos.length - 1, Math.round((e.clientX - r.left - izq) / ((w - izq - 8) / (datos.length - 1)))))); };
    curva.onpointerleave = () => mostrar(mejor);
  }

  // ── Riel: cambia de vista; con flechas el cambio es instantáneo ──
  const pestanas = $$('.riel-app [role=tab]');
  function ir(v, teclado = false) {
    ventana.toggleAttribute('data-teclado', teclado);
    pestanas.forEach(p => { const si = p.dataset.v === v; p.setAttribute('aria-selected', String(si)); p.tabIndex = si ? 0 : -1; if (si && teclado) p.focus(); });
    $$('.tb-vista', ventana).forEach(s => s.toggleAttribute('data-activa', s.dataset.vista === v));
    if (v === 'pagos') requestAnimationFrame(pintarCurva);
    if (!teclado) sentir('seleccion');
  }
  pestanas.forEach(p => p.addEventListener('click', e => ir(p.dataset.v, e.detail === 0)));
  $('.riel-app').addEventListener('keydown', e => {
    const i = pestanas.findIndex(p => p.getAttribute('aria-selected') === 'true');
    const mapa = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: pestanas.length - 1 };
    if (!(e.key in mapa)) return;
    e.preventDefault();
    ir(pestanas[(mapa[e.key] + pestanas.length) % pestanas.length].dataset.v, true);
  });
  ventana.addEventListener('click', e => { const b = e.target.closest('[data-ir]'); if (b) ir(b.dataset.ir); });

  // ── Primera pintura ──
  const vistaInicial = new URLSearchParams(location.search).get('vista');
  pintarArriba(false); pintarPases(); pintarLinea(); pintarCobros(); pintarManana(); pintarCaja(); pintarSemana(); pintarPacientes(); pintarPagos();
  if ('ResizeObserver' in window) new ResizeObserver(pintarCurva).observe(curva);
  setInterval(pintarLinea, 60000);
  if (vistaInicial && pestanas.some(p => p.dataset.v === vistaInicial)) ir(vistaInicial, true);
})();
