/* Diagnóstico DentiCode. Lee chats exportados de WhatsApp en el navegador (nada sale de aquí),
   encuentra cada consulta nueva de un paciente y mide cuándo llegó y cuánto tardó la clínica
   en contestar. Solo muestra totales: nunca nombres, teléfonos ni textos. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
  const HORA = 3600e3, DIA = 24 * HORA;
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  // ── Lectura de un chat exportado ──
  // Android: «12/11/26, 11:47 p. m. - Lucía: hola»   iPhone: «[12/11/26, 11:47:04 p. m.] Lucía: hola»
  const CABEZA = /^\[?(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap])\.?\s?m\.?)?\]?\s*(?:-\s*)?(.*)$/i;
  function leerChat(texto) {
    const crudos = [];
    let actual = null;
    for (let linea of texto.split(/\r?\n/)) {
      linea = linea.replace(/[‎‏‪-‮﻿]/g, '').replace(/[  ]/g, ' ');
      const m = linea.match(CABEZA);
      if (m) {
        const resto = m[8], quien = resto.match(/^([^:]{1,60}):\s?(.*)$/);
        actual = quien ? { a: +m[1], b: +m[2], y: +m[3], h: +m[4], min: +m[5], ampm: (m[7] || '').toLowerCase(), autor: quien[1].trim(), texto: quien[2] } : null;
        if (actual) crudos.push(actual);
      } else if (actual && linea.trim()) actual.texto += ' ' + linea.trim();
    }
    return crudos;
  }
  // Día y mes: en Colombia va primero el día; si algún primer número pasa de 12, seguro; si el segundo pasa de 12, es mes/día.
  function fechar(crudos) {
    const mesPrimero = !crudos.some(c => c.a > 12) && crudos.some(c => c.b > 12);
    return crudos.map(c => {
      const dia = mesPrimero ? c.b : c.a, mes = mesPrimero ? c.a : c.b;
      let h = c.h;
      if (c.ampm) h = (h % 12) + (c.ampm === 'p' ? 12 : 0);
      return { fecha: new Date(c.y < 100 ? 2000 + c.y : c.y, mes - 1, dia, h, c.min), autor: c.autor, texto: c.texto };
    }).filter(m => !isNaN(m.fecha));
  }

  // ── Estado ──
  let chats = [];          // [{ mensajes: [...] }]
  const leerNumero = sel => parseInt(String($(sel).value).replace(/\D/g, ''), 10) || 0;
  const minutos = v => { const [h, m] = (v || '').split(':').map(Number); return isNaN(h) ? null : h * 60 + (m || 0); };
  function horario() {
    return {
      lv: [minutos($('#c-lv-abre').value), minutos($('#c-lv-cierra').value)],
      sa: [minutos($('#c-sa-abre').value), minutos($('#c-sa-cierra').value)],
    };
  }
  function abierto(fecha, hor) {
    const d = fecha.getDay(), m = fecha.getHours() * 60 + fecha.getMinutes();
    const tramo = d === 0 ? null : d === 6 ? hor.sa : hor.lv;
    return !!tramo && tramo[0] !== null && tramo[1] !== null && m >= tramo[0] && m < tramo[1];
  }

  // ── Archivos ──
  async function cargar(lista) {
    const textos = [];
    for (const f of lista) {
      if (/\.zip$/i.test(f.name) || f.type.includes('zip')) {
        if (!window.JSZip) { avisar('Para leer archivos .zip hace falta conexión a internet la primera vez. Descomprímelo y sube el .txt.'); continue; }
        const zip = await JSZip.loadAsync(f);
        for (const nombre of Object.keys(zip.files)) if (/\.txt$/i.test(nombre)) textos.push(await zip.files[nombre].async('string'));
      } else textos.push(await f.text());
    }
    const nuevos = textos.map(t => ({ mensajes: fechar(leerChat(t)) })).filter(c => c.mensajes.length);
    if (!nuevos.length) { avisar('No encontramos mensajes en esos archivos. ¿Son chats exportados de WhatsApp, sin archivos?'); return; }
    chats = chats.concat(nuevos);
    elegirClinica();
    calcular();
  }
  function avisar(texto) { $('#estado-archivos').textContent = texto; }

  // La clínica es quien aparece en más chats distintos
  function elegirClinica(preferida) {
    const enChats = new Map();
    chats.forEach(c => new Set(c.mensajes.map(m => m.autor)).forEach(a => enChats.set(a, (enChats.get(a) || 0) + 1)));
    const orden = [...enChats.entries()].sort((a, b) => b[1] - a[1]);
    const sel = $('#quien');
    sel.innerHTML = orden.slice(0, 12).map(([a, n]) => `<option value="${a.replace(/"/g, '&quot;')}">${a.replace(/</g, '&lt;')} · en ${n} ${n === 1 ? 'chat' : 'chats'}</option>`).join('');
    sel.value = preferida && enChats.has(preferida) ? preferida : orden[0][0];
    $('#campo-quien').hidden = false;
    const msgs = chats.reduce((s, c) => s + c.mensajes.length, 0);
    avisar(`${chats.length} ${chats.length === 1 ? 'chat cargado' : 'chats cargados'} · ${entero.format(msgs)} mensajes.`);
  }

  // ── Análisis ──
  function analizar() {
    const clinica = $('#quien').value, hor = horario();
    const consultas = [];
    let min = Infinity, max = -Infinity;
    for (const c of chats) {
      const ms = [...c.mensajes].sort((a, b) => a.fecha - b.fecha);
      let previo = null, abierta = null;
      for (const m of ms) {
        min = Math.min(min, +m.fecha); max = Math.max(max, +m.fecha);
        const deClinica = m.autor === clinica;
        if (!deClinica) {
          // Una consulta nueva empieza tras 6 h de silencio en el chat. Lo que el paciente escribe
          // dentro de la misma conversación («La de 9:30», «gracias») sigue siendo la misma consulta.
          const nueva = !previo || (m.fecha - previo.fecha) > 6 * HORA;
          if (nueva) { abierta = { inicio: m.fecha, texto: m.texto, respuesta: null }; consultas.push(abierta); }
          else if (abierta && !abierta.respuesta) abierta.texto += ' ' + m.texto;
        } else if (abierta && !abierta.respuesta) abierta.respuesta = m.fecha;
        previo = m;
      }
    }
    consultas.forEach(q => {
      q.fuera = !abierto(q.inicio, hor);
      q.espera = q.respuesta ? q.respuesta - q.inicio : null;
      q.sin = !q.respuesta || q.espera > 48 * HORA;
      q.tema = tema(q.texto);
    });
    return { consultas, dias: Math.max(1, Math.round((max - min) / DIA)), desde: new Date(min), hasta: new Date(max) };
  }
  function tema(t) {
    t = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/(dolor|duele|urgen|hinch|inflam|sangr|roto|partid|absceso|fiebre)/.test(t)) return 'Dolor o urgencia';
    if (/(cita|agend|turno|disponib|cupo|espacio|atender|consulta|valoracion|me pueden ver)/.test(t)) return 'Pedir o cambiar una cita';
    if (/(precio|cuanto|valor|costo|cuesta|vale|cotiza|tarifa)/.test(t)) return 'Precios';
    if (/(donde|direccion|ubica|parque|como llego)/.test(t)) return 'Dirección y horarios';
    if (/(horario|abren|atienden|hasta que hora)/.test(t)) return 'Dirección y horarios';
    return 'Otras preguntas';
  }
  const mediana = l => { if (!l.length) return null; const s = [...l].sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
  const duracion = ms => {
    if (ms === null) return '—';
    const m = Math.round(ms / 60000);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    if (h < 24) return r ? `${h} h ${r} min` : `${h} h`;
    return `${Math.floor(h / 24)} d ${h % 24} h`;
  };

  // ── Pintar ──
  function calcular() {
    $('#r-clinica').textContent = $('#c-nombre').value.trim() || 'la clínica';
    if (!chats.length) { $('#r-vacio').hidden = false; $('#r-contenido').hidden = true; return; }
    const { consultas, dias, desde, hasta } = analizar();
    const fuera = consultas.filter(q => q.fuera), dentro = consultas.filter(q => !q.fuera);
    if (!consultas.length) { $('#r-vacio').hidden = false; $('#r-contenido').hidden = true; avisar('Los chats no tienen consultas de pacientes. Revisa que el nombre de la clínica sea el correcto.'); return; }
    $('#r-vacio').hidden = true; $('#r-contenido').hidden = false;
    const fFecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    $('#r-periodo').textContent = `Del ${fFecha.format(desde)} al ${fFecha.format(hasta)} · ${dias} días · ${chats.length} chats`;

    const pct = n => consultas.length ? Math.round(n / consultas.length * 100) : 0;
    const espFuera = mediana(fuera.filter(q => q.espera !== null).map(q => q.espera));
    const espDentro = mediana(dentro.filter(q => q.espera !== null).map(q => q.espera));
    const sin = consultas.filter(q => q.sin);
    const esperaron = fuera.filter(q => q.sin || q.espera > HORA).length;

    $('#r-consultas').textContent = entero.format(consultas.length);
    $('#r-consultas-nota').textContent = `${decimal.format(consultas.length / dias * 30)} al mes`;
    $('#r-fuera').textContent = `${entero.format(fuera.length)} · ${pct(fuera.length)} %`;
    $('#r-fuera-nota').textContent = 'Con la clínica cerrada';
    $('#r-espera-fuera').textContent = duracion(espFuera);
    $('#r-espera-dentro').textContent = `En horario: ${duracion(espDentro)} · mediana`;
    $('#r-sin').textContent = entero.format(sin.length);
    $('#r-sin-nota').textContent = `${sin.filter(q => q.fuera).length} de ellas llegaron fuera de horario`;

    // Por hora: dos tramos apilados, en horario abajo y fuera arriba
    const porHora = Array.from({ length: 24 }, () => ({ f: 0, d: 0 }));
    consultas.forEach(q => porHora[q.inicio.getHours()][q.fuera ? 'f' : 'd']++);
    const tope = Math.max(...porHora.map(x => x.f + x.d), 1);
    const pico = porHora.reduce((b, x, i) => (x.f > porHora[b].f ? i : b), 0);
    const hrs = $('#r-horas');
    hrs.innerHTML = porHora.map((x, h) => `<div class="barra-h" tabindex="0" title="${String(h).padStart(2, '0')}:00 · ${x.f} fuera de horario, ${x.d} en horario" style="--f:${x.f / tope * 100}%;--d:${x.d / tope * 100}%">
        ${h === pico && x.f ? `<b style="--h:${(x.f + x.d) / tope * 100}%">${x.f}</b>` : ''}<i class="f"></i><i class="d"></i>${h % 3 === 0 ? `<span>${String(h).padStart(2, '0')}</span>` : ''}</div>`).join('');
    hrs.setAttribute('aria-label', `Consultas por hora del día. La hora con más consultas fuera de horario es las ${pico}:00, con ${porHora[pico].f}.`);
    $('#r-horas-tabla').innerHTML = '<tr><th>Hora</th><th>Fuera de horario</th><th>En horario</th></tr>' + porHora.map((x, h) => `<tr><td>${String(h).padStart(2, '0')}:00</td><td>${x.f}</td><td>${x.d}</td></tr>`).join('');

    // Temas y días (solo fuera de horario)
    const contar = (lista, clave) => { const m = new Map(); lista.forEach(q => m.set(clave(q), (m.get(clave(q)) || 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
    const filas = (pares, total) => pares.map(([k, n]) => `<li><b>${k}</b><em>${n} · ${Math.round(n / total * 100)} %</em><i style="--p:${n / total * 100}%"></i></li>`).join('');
    $('#r-temas').innerHTML = fuera.length ? filas(contar(fuera, q => q.tema), fuera.length) : '<li><b>No hubo consultas fuera de horario.</b></li>';
    $('#r-dias').innerHTML = fuera.length ? filas(contar(fuera, q => DIAS[q.inicio.getDay()].replace(/^./, c => c.toUpperCase())), fuera.length) : '<li><b>—</b></li>';

    // Dinero
    const factor = 30 / dias, valor = leerNumero('#c-valor'), perdida = leerNumero('#c-perdida') / 100;
    const esperaronMes = esperaron * factor, perdidosMes = esperaronMes * perdida, plataChat = perdidosMes * valor;
    const presupuestos = leerNumero('#c-presupuestos'), valorPres = leerNumero('#c-presupuesto-valor'), recupera = leerNumero('#c-recupera') / 100;
    const dormidos = leerNumero('#c-dormidos');
    const plataPres = presupuestos / 3 * recupera * valorPres;
    const plataDorm = dormidos * recupera * valor;
    $('#d-esperaron').textContent = decimal.format(esperaronMes);
    $('#d-esperaron-nota').textContent = `${esperaron} en ${dias} días, llevado a 30 días`;
    $('#d-perdidos').textContent = decimal.format(perdidosMes);
    $('#d-perdidos-nota').textContent = `El ${Math.round(perdida * 100)} % de los que esperaron`;
    $('#d-plata-chat').textContent = pesos.format(plataChat);
    $('#d-plata-presupuestos').textContent = pesos.format(plataPres);
    $('#d-presupuestos-nota').textContent = presupuestos ? `${presupuestos} en 3 meses; se recupera el ${Math.round(recupera * 100)} %` : 'Sin dato: pregúntale a la recepcionista';
    $('#d-plata-dormidos').textContent = pesos.format(plataDorm);
    $('#d-dormidos-nota').textContent = dormidos ? `Una sola vez: ${dormidos} pacientes, vuelve el ${Math.round(recupera * 100)} %. No entra en el total mensual.` : 'Sin dato: sale del programa de agenda';
    $('#d-total').textContent = pesos.format(plataChat + plataPres);

    $('#r-frase').innerHTML = `En ${dias} días llegaron <strong>${entero.format(consultas.length)} consultas</strong> por WhatsApp. <strong>${pct(fuera.length)} %</strong> llegaron con la clínica cerrada y la primera respuesta tardó <strong>${duracion(espFuera)}</strong> (mediana). Con estos supuestos son unos <strong>${decimal.format(perdidosMes)} pacientes</strong> y <strong>${pesos.format(plataChat)}</strong> al mes que se van a otra clínica.`;
  }

  // ── Chats de ejemplo: se escriben como un export real de Android y pasan por el mismo lector ──
  function ejemplo() {
    let s = 7;
    const azar = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const elegir = l => l[Math.floor(azar() * l.length)];
    const hor = horario(), clinica = $('#c-nombre').value.trim() || 'Clínica Dental Ruiz';
    const pregunta = {
      cita: ['Hola, buenas noches. ¿Tienen cita para mañana?', 'Buenas, quisiera agendar una valoración', '¿Me pueden dar cita esta semana para limpieza?', 'Hola, necesito cambiar mi cita del jueves'],
      dolor: ['Hola, me duele mucho una muela, ¿me pueden atender?', 'Se me partió un diente, ¿tienen cupo?', 'Tengo la encía hinchada desde ayer'],
      precio: ['¿Cuánto vale el blanqueamiento?', 'Buenas, ¿qué precio tienen los brackets?', '¿Cuánto cuesta una limpieza?'],
      donde: ['¿Dónde quedan ubicados?', '¿Tienen parqueadero?'],
    };
    const temas = ['cita', 'cita', 'cita', 'dolor', 'precio', 'precio', 'donde'];
    const respuestas = ['Hola, claro. Tenemos espacio a las 9:30 o a las 11:00.', 'Buenos días, con gusto. ¿Le sirve el martes a las 10:00?', 'Hola, le comparto la información.'];
    const fmt = d => {
      const h = d.getHours(), p = h >= 12 ? 'p. m.' : 'a. m.', h12 = h % 12 || 12;
      return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}, ${h12}:${String(d.getMinutes()).padStart(2, '0')} ${p} - `;
    };
    const siguienteApertura = d => {
      const n = new Date(d);
      for (let k = 0; k < 8; k++) {
        if (k) { n.setDate(n.getDate() + 1); }
        const tramo = n.getDay() === 0 ? null : n.getDay() === 6 ? hor.sa : hor.lv;
        if (!tramo || tramo[0] === null) continue;
        const ap = new Date(n); ap.setHours(Math.floor(tramo[0] / 60), tramo[0] % 60, 0, 0);
        if (ap > d) return ap;
      }
      return new Date(+d + 12 * HORA);
    };
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const textos = [];
    for (let c = 0; c < 42; c++) {
      const tel = `+57 3${Math.floor(azar() * 30 + 0).toString().padStart(2, '0')} ${Math.floor(azar() * 900 + 100)} ${Math.floor(azar() * 9000 + 1000)}`;
      const lineas = [];
      for (let e = 0, n = 1 + Math.floor(azar() * 2); e < n; e++) {
        const d = new Date(+hoy - Math.floor(azar() * 45) * DIA);
        const nocturna = azar() < 0.42;
        d.setHours(nocturna ? elegir([19, 20, 21, 21, 22, 22, 23, 6, 7]) : elegir([8, 9, 10, 11, 12, 14, 15, 16, 17, 18]), Math.floor(azar() * 60));
        const t = elegir(temas);
        lineas.push([+d, fmt(d) + `${tel}: ${elegir(pregunta[t])}`]);
        let r;
        if (abierto(d, hor)) r = new Date(+d + (3 + Math.floor(azar() * 45)) * 60000);
        else { if (azar() < 0.12) continue; r = new Date(+siguienteApertura(d) + (10 + Math.floor(azar() * 150)) * 60000); }
        lineas.push([+r, fmt(r) + `${clinica}: ${elegir(respuestas)}`]);
        if (azar() < 0.6) { const r2 = new Date(+r + (2 + Math.floor(azar() * 30)) * 60000); lineas.push([+r2, fmt(r2) + `${tel}: Listo, muchas gracias`]); }
      }
      textos.push(lineas.sort((a, b) => a[0] - b[0]).map(l => l[1]).join('\n'));
    }
    chats = textos.map(t => ({ mensajes: fechar(leerChat(t)) }));
    elegirClinica(clinica);
    avisar(`Ejemplo cargado: ${chats.length} chats inventados. Con chats reales, el resultado cambia.`);
    if (!leerNumero('#c-presupuestos')) $('#c-presupuestos').value = '14';
    if (!leerNumero('#c-dormidos')) $('#c-dormidos').value = '120';
    calcular();
  }

  // ── Eventos ──
  $('#archivos').addEventListener('change', e => { if (e.target.files.length) cargar([...e.target.files]); e.target.value = ''; });
  const zona = $('#soltar');
  ['dragenter', 'dragover'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.dataset.encima = ''; }));
  ['dragleave', 'drop'].forEach(t => zona.addEventListener(t, () => delete zona.dataset.encima));
  zona.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length) cargar([...e.dataTransfer.files]); });
  $('#ejemplo').addEventListener('click', ejemplo);
  $('#quien').addEventListener('change', calcular);
  document.querySelectorAll('.paso input').forEach(i => i.addEventListener('input', calcular));
  // los montos se escriben con puntos de miles al salir del campo
  ['#c-valor', '#c-presupuesto-valor'].forEach(sel => $(sel).addEventListener('blur', () => { $(sel).value = entero.format(leerNumero(sel)); }));
  $('#imprimir')?.addEventListener('click', () => window.print());   // no existe en la versión publicada
  calcular();
})();
