// ══════════════════════════════
//  ESTADO GLOBAL
// ══════════════════════════════
const App = {
  user: null,

  // Paso máximo desbloqueado (0=ninguno, 1=dashboard/autos/registro, 2=revision, 3=mecanica, 4=valuacion)
  maxPaso: 0,

  // Auto en proceso actual
  auto: {
    marca:'', modelo:'', anio:'', color:'',
    placa:'', kilometraje:'', transmision:'', combustible:'',
    propietario:'', cedula:'', telefono:'', email:'',
    puntajeTecnico: 0,
    puntajeMecanico: 0,
  },

  // Lista de autos registrados
  autos: [],

  // Cuentas de usuario registradas
  cuentas: [],
};

// Orden de los pasos para validar acceso
const PASO_VISTA = {
  dashboard: 1,
  autos:     1,
  registro:  1,
  revision:  2,
  mecanica:  3,
  valuacion: 4,
};

// ══════════════════════════════
//  AUTH — TABS
// ══════════════════════════════
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
  document.getElementById('authMsg').className = 'auth-msg';
  document.getElementById('authMsg').style.display = 'none';
}

// ══════════════════════════════
//  LOGIN
// ══════════════════════════════
function login() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();

  if (!user || !pass) {
    mostrarMsgAuth('Ingresa usuario y contraseña.', 'error'); return;
  }

  // Verificar si existe la cuenta
  const cuenta = App.cuentas.find(c => c.user === user && c.pass === pass);
  if (!cuenta) {
    mostrarMsgAuth('Usuario o contraseña incorrectos.', 'error'); return;
  }

  iniciarSesion(cuenta.nombre || user, user);
}

// ══════════════════════════════
//  CREAR CUENTA
// ══════════════════════════════
function crearCuenta() {
  const nombre = document.getElementById('regNombre').value.trim();
  const user   = document.getElementById('regUser').value.trim();
  const pass   = document.getElementById('regPass').value.trim();
  const pass2  = document.getElementById('regPass2').value.trim();

  if (!nombre || !user || !pass || !pass2) {
    mostrarMsgAuth('Completa todos los campos.', 'error'); return;
  }
  if (pass !== pass2) {
    mostrarMsgAuth('Las contraseñas no coinciden.', 'error'); return;
  }
  if (pass.length < 4) {
    mostrarMsgAuth('La contraseña debe tener al menos 4 caracteres.', 'error'); return;
  }
  if (App.cuentas.find(c => c.user === user)) {
    mostrarMsgAuth('Ese nombre de usuario ya existe.', 'error'); return;
  }

  App.cuentas.push({ nombre, user, pass });
  mostrarMsgAuth('¡Cuenta creada! Inicia sesión.', 'success');

  setTimeout(() => {
    document.getElementById('loginUser').value = user;
    document.getElementById('loginPass').value = '';
    switchTab('login');
  }, 1400);
}

function mostrarMsgAuth(msg, tipo) {
  const el = document.getElementById('authMsg');
  el.textContent = msg;
  el.className = 'auth-msg ' + tipo;
  el.style.display = 'block';
}

function iniciarSesion(nombre, user) {
  App.user = { nombre, user, initials: nombre.slice(0,2).toUpperCase() };
  App.maxPaso = 1;

  document.getElementById('authPage').style.display = 'none';
  document.getElementById('appShell').style.display = 'block';

  setTexto('sbAvatarText',    App.user.initials);
  setTexto('sbUserName',      App.user.nombre);
  setTexto('topbarAvatarTxt', App.user.initials);
  setTexto('topbarUserName',  App.user.nombre);

  actualizarLocks();
  showView('dashboard');
}

function logout() {
  App.user   = null;
  App.maxPaso = 0;
  App.auto   = { marca:'', modelo:'', anio:'', color:'', placa:'', kilometraje:'',
                 transmision:'', combustible:'', propietario:'', cedula:'',
                 telefono:'', email:'', puntajeTecnico:0, puntajeMecanico:0 };

  document.getElementById('appShell').style.display = 'none';
  document.getElementById('authPage').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('authMsg').style.display = 'none';
  switchTab('login');
}

// ══════════════════════════════
//  LOCKS DE SIDEBAR
// ══════════════════════════════
function actualizarLocks() {
  document.querySelectorAll('.sb-link[data-view]').forEach(link => {
    const vista = link.dataset.view;
    const paso  = PASO_VISTA[vista] || 1;
    if (paso > App.maxPaso) {
      link.classList.add('locked');
    } else {
      link.classList.remove('locked');
    }
  });
}

// ══════════════════════════════
//  NAVEGACIÓN
// ══════════════════════════════
const pageTitles = {
  dashboard: 'Dashboard',
  autos:     'Autos registrados',
  registro:  'Registrar auto',
  revision:  'Revisión técnica',
  mecanica:  'Revisión mecánica',
  valuacion: 'Valuación / Precio',
};

function showView(id) {
  const paso = PASO_VISTA[id] || 1;

  // Bloquear acceso si el paso no está desbloqueado
  if (paso > App.maxPaso) {
    mostrarToast('⚠ Completa el paso anterior primero', 'warn');
    return;
  }

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const v = document.getElementById('view-' + id);
  if (v) v.classList.add('active');

  document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
  const link = document.querySelector(`.sb-link[data-view="${id}"]`);
  if (link) link.classList.add('active');

  setTexto('topbarTitle', pageTitles[id] || id);
  window.scrollTo(0, 0);

  if (id === 'registro')  actualizarResumen();
  if (id === 'revision')  { actualizarBanner(); }
  if (id === 'mecanica')  { actualizarBanner(); }
  if (id === 'valuacion') calcularValuacion();
  if (id === 'dashboard') renderizarTablaAutos();
}

// ══════════════════════════════
//  DATOS DINÁMICOS — REGISTRO
// ══════════════════════════════
const camposAuto = [
  'marca','modelo','anio','color',
  'placa','kilometraje','transmision','combustible',
  'propietario','cedula','telefono','email'
];

function bindRegistroInputs() {
  camposAuto.forEach(campo => {
    const el = document.getElementById('inp_' + campo);
    if (!el) return;
    const h = () => { App.auto[campo] = el.value; actualizarResumen(); };
    el.addEventListener('input',  h);
    el.addEventListener('change', h);
  });
}

function actualizarResumen() {
  const a = App.auto;
  const vehiculo = [a.marca, a.modelo, a.anio].filter(Boolean).join(' · ') || '—';
  const km = a.kilometraje ? Number(a.kilometraje).toLocaleString('es-CO') + ' km' : '—';
  setTexto('rs_vehiculo', vehiculo);
  setTexto('rs_placa',    a.placa       || '—');
  setTexto('rs_km',       km);
  setTexto('rs_color',    a.color       || '—');
  setTexto('rs_trans',    a.transmision || '—');
  setTexto('rs_prop',     a.propietario || '—');
}

function actualizarBanner() {
  const a = App.auto;
  const nombre = [a.marca, a.modelo].filter(Boolean).join(' ') || 'Sin especificar';
  const sub = [a.placa, a.anio,
    a.kilometraje ? Number(a.kilometraje).toLocaleString('es-CO') + ' km' : '']
    .filter(Boolean).join(' · ') || '—';
  setTexto('bannerNombre', nombre);
  setTexto('bannerSub', sub);
}

// ══════════════════════════════
//  GUARDAR AUTO Y AVANZAR
// ══════════════════════════════
function guardarYContinuar() {
  const a = App.auto;
  if (!a.marca || !a.modelo || !a.placa) {
    mostrarToast('Completa marca, modelo y placa', 'warn'); return;
  }

  // Avanzar al paso 2 (revisión técnica)
  App.maxPaso = Math.max(App.maxPaso, 2);
  actualizarLocks();

  // Resetear puntajes y checklist
  resetChecklist('revision');
  App.auto.puntajeTecnico  = 0;
  App.auto.puntajeMecanico = 0;
  actualizarDisplayPuntajes();

  mostrarToast('✓ Auto guardado correctamente');
  showView('revision');
}

// ══════════════════════════════
//  REGISTRAR AUTO EN LISTA
// ══════════════════════════════
function registrarAutoFinal() {
  const a = App.auto;
  if (!a.marca || !a.modelo || !a.placa) {
    mostrarToast('Completa los datos del auto primero', 'warn'); return;
  }

  const precio = parseInt(document.getElementById('inp_precioFinal')?.value) || 0;

  App.autos.unshift({
    id:           Date.now(),
    marca:        a.marca,
    modelo:       a.modelo,
    anio:         a.anio,
    color:        a.color,
    placa:        a.placa,
    kilometraje:  a.kilometraje,
    transmision:  a.transmision,
    propietario:  a.propietario,
    puntajeTec:   a.puntajeTecnico,
    puntajeMec:   a.puntajeMecanico,
    precio:       precio,
    estado:       'Disponible',
  });

  // Resetear para el siguiente auto
  App.maxPaso = 1;
  App.auto = { marca:'', modelo:'', anio:'', color:'', placa:'', kilometraje:'',
               transmision:'', combustible:'', propietario:'', cedula:'',
               telefono:'', email:'', puntajeTecnico:0, puntajeMecanico:0 };
  limpiarFormularioRegistro();
  actualizarLocks();
  mostrarToast('✓ Auto publicado y registrado');
  showView('dashboard');
}

function limpiarFormularioRegistro() {
  camposAuto.forEach(campo => {
    const el = document.getElementById('inp_' + campo);
    if (el) el.value = '';
  });
  actualizarResumen();
}

// ══════════════════════════════
//  TABLA DASHBOARD
// ══════════════════════════════
function renderizarTablaAutos() {
  const tbody = document.getElementById('dashboardTbody');
  const statsContainer = document.getElementById('dashboardStats');
  if (!tbody) return;

  // Stats
  const total       = App.autos.length;
  const enRevision  = App.autos.filter(a => a.estado === 'En revisión').length;
  const disponibles = App.autos.filter(a => a.estado === 'Disponible').length;
  const vendidos    = App.autos.filter(a => a.estado === 'Vendido').length;

  setTexto('statTotal',       total);
  setTexto('statRevision',    enRevision);
  setTexto('statDisponibles', disponibles);
  setTexto('statVendidos',    vendidos);

  if (!App.autos.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:2rem; color:var(--text-dim);">
          <i class="bi bi-car-front" style="font-size:1.5rem; display:block; margin-bottom:.5rem;"></i>
          No hay autos registrados aún
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = App.autos.slice(0, 8).map(auto => {
    const badgeClass = auto.estado === 'Disponible' ? 'badge-ok' :
                       auto.estado === 'Vendido'    ? 'badge-sold' : 'badge-pend';
    const precio = auto.precio ? '$' + Number(auto.precio).toLocaleString('es-CO') : '—';
    const km     = auto.kilometraje ? Number(auto.kilometraje).toLocaleString('es-CO') : '—';
    return `
      <tr>
        <td>
          <strong>${auto.marca} ${auto.modelo}</strong><br>
          <small style="color:var(--text-secondary);">${auto.placa}</small>
        </td>
        <td>${auto.anio || '—'}</td>
        <td>${km}</td>
        <td><strong>${precio}</strong></td>
        <td><span class="${badgeClass}">${auto.estado}</span></td>
        <td>
          <button class="btn-ghost" style="padding:.25rem .65rem;font-size:.75rem;"
                  onclick="verDetalle(${auto.id})">Ver</button>
        </td>
      </tr>`;
  }).join('');
}

function verDetalle(id) {
  const auto = App.autos.find(a => a.id === id);
  if (!auto) return;
  mostrarToast(`${auto.marca} ${auto.modelo} — ${auto.placa}`);
}

// ══════════════════════════════
//  AVANZAR PASOS
// ══════════════════════════════
function avanzarRevision() {
  App.maxPaso = Math.max(App.maxPaso, 3);
  actualizarLocks();
  resetChecklist('mecanica');
  App.auto.puntajeMecanico = 0;
  actualizarDisplayPuntajes();
  showView('mecanica');
}

function avanzarMecanica() {
  App.maxPaso = Math.max(App.maxPaso, 4);
  actualizarLocks();
  showView('valuacion');
}

// ══════════════════════════════
//  CHECKLIST
// ══════════════════════════════
function resetChecklist(vistaId) {
  const items = document.querySelectorAll(`#view-${vistaId} .btn-opt`);
  items.forEach(b => b.classList.remove('active'));
  if (vistaId === 'revision') {
    setTexto('scoreTecnico', '0');
    const bar = document.getElementById('barTecnico');
    if (bar) { bar.style.width='0%'; bar.style.background='var(--accent)'; }
    App.auto.puntajeTecnico = 0;
  }
  if (vistaId === 'mecanica') {
    setTexto('scoreMecanico', '0');
    const bar = document.getElementById('barMecanico');
    if (bar) { bar.style.width='0%'; bar.style.background='var(--accent)'; }
    App.auto.puntajeMecanico = 0;
  }
  actualizarDisplayPuntajes();
}

function selectOpt(btn) {
  const group = btn.closest('.check-options');
  group.querySelectorAll('.btn-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  recalcularPuntajes();
}

function recalcularPuntajes() {
  const itemsTec = document.querySelectorAll('#view-revision .check-options');
  const itemsMec = document.querySelectorAll('#view-mecanica .check-options');
  App.auto.puntajeTecnico  = calcPuntaje(itemsTec);
  App.auto.puntajeMecanico = calcPuntaje(itemsMec);
  actualizarDisplayPuntajes();
}

function calcPuntaje(grupos) {
  if (!grupos.length) return 0;
  let total = 0;
  grupos.forEach(g => {
    const act = g.querySelector('.btn-opt.active');
    if (!act) return;
    if (act.classList.contains('bueno'))   total += 10;
    if (act.classList.contains('regular')) total += 5;
  });
  return Math.round((total / (grupos.length * 10)) * 100);
}

function actualizarDisplayPuntajes() {
  const pt = App.auto.puntajeTecnico;
  const pm = App.auto.puntajeMecanico;
  const comb = Math.round((pt + pm) / 2);

  setTexto('scoreTecnico',   pt);
  setTexto('scoreMecanico',  pm);
  setTexto('miniPT',         pt + ' / 100');
  setTexto('miniPM',         pm + ' / 100');
  setTexto('scoreCombinado', comb + ' / 100');

  setBar('barTecnico',  pt);
  setBar('barMecanico', pm);
}

function setBar(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = pct + '%';
  el.style.background = pct >= 75 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#f87171';
}

// ══════════════════════════════
//  VALUACIÓN
//  Descuento equilibrado:
//  100 pts → 0%   |  90 pts → 5%
//   80 pts → 12%  |  70 pts → 20%
//   60 pts → 30%  |  50 pts → 42%
//   40 pts → 55%  |  < 40   → 65%
// ══════════════════════════════
function calcularValuacion() {
  const a   = App.auto;
  const pt  = a.puntajeTecnico;
  const pm  = a.puntajeMecanico;
  const comb = Math.round((pt + pm) / 2);

  // Precio base según año
  const anio     = parseInt(a.anio) || 2020;
  const edad     = new Date().getFullYear() - anio;
  const precioBase = Math.max(20_000_000, 90_000_000 - (edad * 5_500_000));

  // Tabla de descuentos equilibrada
  let descPct;
  if      (comb >= 95) descPct = 0;
  else if (comb >= 85) descPct = 5;
  else if (comb >= 75) descPct = 12;
  else if (comb >= 65) descPct = 20;
  else if (comb >= 55) descPct = 30;
  else if (comb >= 45) descPct = 42;
  else if (comb >= 35) descPct = 55;
  else                 descPct = 65;

  const descVal   = Math.round(precioBase * descPct / 100);
  const precioFinal = precioBase - descVal;

  setTexto('val_vehiculo',    [a.marca, a.modelo, a.anio].filter(Boolean).join(' · ') || '—');
  setTexto('val_placa',       a.placa        || '—');
  setTexto('val_km',          a.kilometraje  ? Number(a.kilometraje).toLocaleString('es-CO') + ' km' : '—');
  setTexto('val_color',       a.color        || '—');
  setTexto('val_propietario', a.propietario  || '—');
  setTexto('val_pt',          pt);
  setTexto('val_pm',          pm);
  setTexto('val_combinado',   comb + ' / 100');
  setTexto('val_base',        '$' + precioBase.toLocaleString('es-CO'));
  setTexto('val_desc_pct',    descPct + '%');
  setTexto('val_desc_val',    '− $' + descVal.toLocaleString('es-CO'));
  setTexto('val_precio_grande', '$' + precioFinal.toLocaleString('es-CO'));
  setTexto('val_tag_desc',    'Descuento aplicado: ' + descPct + '%');
  setTexto('val_final_row',   '$' + precioFinal.toLocaleString('es-CO'));
  setBar('barCombinado', comb);

  const inp = document.getElementById('inp_precioFinal');
  if (inp) inp.value = precioFinal;
}

function onPrecioManualChange() {
  const val = parseInt(document.getElementById('inp_precioFinal')?.value) || 0;
  const fmt = '$' + val.toLocaleString('es-CO');
  setTexto('val_precio_grande', fmt);
  setTexto('val_final_row', fmt);
}

// ══════════════════════════════
//  TOAST
// ══════════════════════════════
function mostrarToast(msg, tipo = 'ok') {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.style.borderColor = tipo === 'warn'
    ? 'rgba(251,191,36,.35)'
    : 'rgba(74,222,128,.3)';
  toast.style.color = tipo === 'warn' ? '#fbbf24' : '#4ade80';
  toast.innerHTML = `<i class="bi bi-${tipo === 'warn' ? 'exclamation-circle' : 'check-circle-fill'}"></i> ${msg}`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ══════════════════════════════
//  UTILIDADES
// ══════════════════════════════
function setTexto(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ══════════════════════════════
//  INIT
// ══════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  bindRegistroInputs();

  // Registrar una cuenta de demo para facilitar pruebas
  App.cuentas.push({ nombre: 'Admin', user: 'admin', pass: '1234' });

  // Enter en login
  ['loginUser','loginPass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  });
  // Enter en registro
  ['regNombre','regUser','regPass','regPass2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') crearCuenta(); });
  });
});
