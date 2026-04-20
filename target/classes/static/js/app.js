const App = {
  user:    null,
  _token:  localStorage.getItem('ca_token') || null,
  maxPaso: 0,
  autos:   [],

  auto: {
    marca:'', modelo:'', año:'', color:'',
    placa:'', kilometraje:'', transmision:'', combustible:'',
    propietario:'', cedula:'', telefono:'', email:'', nPropietarios:'',
    puntajeTecnico: 0, puntajeMecanico: 0,
    checklistRevision: {}, checklistMecanica: {},
    observacionRevision: '', observacionMecanica: '',
    justificacionPrecio: '', precioManual: 0,
  },
};

const PASO_VISTA = {
  dashboard:1, autos:1, registro:1,
  revision:2, mecanica:3, valuacion:4,
};

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (App._token) opts.headers['Authorization'] = 'Bearer ' + App._token;
  if (body)       opts.body = JSON.stringify(body);

  const res = await fetch(path, opts);


  if (res.status === 401 || res.status === 403) {
    _limpiarSesion();
    mostrarMsgAuth('Tu sesión expiró. Inicia sesión de nuevo.', 'error');
    return null;
  }

  return res;
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
  const msg = document.getElementById('authMsg');
  msg.className = 'auth-msg';
  msg.style.display = 'none';
}

async function login() {
  const email = document.getElementById('loginUser').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value.trim();
  if (!email || !pass) { mostrarMsgAuth('Ingresa tu correo y contraseña.', 'error'); return; }
  if (!email.includes('@')) { mostrarMsgAuth('Ingresa un correo electrónico válido.', 'error'); return; }

  mostrarMsgAuth('Iniciando sesión…', '');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMsgAuth(data.error || 'Correo o contraseña incorrectos.', 'error');
      return;
    }

    App._token = data.token;
    localStorage.setItem('ca_token', data.token);
    iniciarSesion(data.usuario.nombre, data.usuario.email);

  } catch (e) {
    mostrarMsgAuth('No se pudo conectar al servidor.', 'error');
  }
}

async function crearCuenta() {
  const nombre = document.getElementById('regNombre').value.trim();
  const email  = document.getElementById('regUser').value.trim().toLowerCase();
  const pass   = document.getElementById('regPass').value.trim();
  const pass2  = document.getElementById('regPass2').value.trim();

  if (!nombre || !email || !pass || !pass2) { mostrarMsgAuth('Completa todos los campos.', 'error'); return; }
  if (!email.includes('@') || !email.includes('.')) { mostrarMsgAuth('Ingresa un correo electrónico válido.', 'error'); return; }
  if (pass !== pass2)  { mostrarMsgAuth('Las contraseñas no coinciden.', 'error'); return; }
  if (pass.length < 4) { mostrarMsgAuth('La contraseña debe tener al menos 4 caracteres.', 'error'); return; }

  mostrarMsgAuth('Creando cuenta…', '');

  try {
    const res  = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password: pass }),
    });
    const data = await res.json();

    if (!res.ok) { mostrarMsgAuth(data.error || 'No se pudo crear la cuenta.', 'error'); return; }

    mostrarMsgAuth('¡Cuenta creada! Inicia sesión con tu correo.', 'success');
    setTimeout(() => {
      document.getElementById('loginUser').value = email;
      document.getElementById('loginPass').value = '';
      switchTab('login');
    }, 1400);

  } catch (e) {
    mostrarMsgAuth('No se pudo conectar al servidor.', 'error');
  }
}

function mostrarMsgAuth(msg, tipo) {
  const el = document.getElementById('authMsg');
  el.textContent = msg;
  el.className = 'auth-msg ' + tipo;
  el.style.display = 'block';
}

function iniciarSesion(nombre, user) {
  App.user    = { nombre, user, initials: nombre.slice(0, 2).toUpperCase() };
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
  cerrarPanelPerfil();
  _limpiarSesion();
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('authPage').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('authMsg').style.display = 'none';
  switchTab('login');
}

function _limpiarSesion() {
  App.user   = null;
  App._token = null;
  App.maxPaso = 0;
  App.autos  = [];
  localStorage.removeItem('ca_token');
  resetearAutoEnProceso();
}

async function verificarSesionExistente() {
  if (!App._token) return;
  try {
    const res = await api('GET', '/api/auth/me');
    if (!res || !res.ok) { _limpiarSesion(); return; }
    const data = await res.json();
    iniciarSesion(data.nombre, data.username);
  } catch (e) {
    _limpiarSesion();
  }
}

function abrirPanelPerfil() {
  let panel = document.getElementById('panelPerfil');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'panelPerfil';
    panel.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;
      display:flex;align-items:center;justify-content:center;padding:1rem;`;
    document.body.appendChild(panel);
  }

  const u = App.user;
  const total      = App.autos.length;
  const disponibles = App.autos.filter(a => a.estado === 'Disponible').length;
  const vendidos    = App.autos.filter(a => a.estado === 'Vendido').length;

  panel.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border-strong);
                border-radius:16px;padding:2rem;width:100%;max-width:420px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;gap:1rem;">
          <div style="width:60px;height:60px;background:var(--accent);border-radius:50%;
                      display:flex;align-items:center;justify-content:center;
                      font-size:1.4rem;font-weight:800;color:#fff;">${u.initials}</div>
          <div>
            <div style="font-weight:700;font-size:1.05rem;">${u.nombre}</div>
            <div style="color:var(--text-secondary);font-size:.82rem;">@${u.user}</div>
            <span style="background:rgba(74,222,128,.15);color:#4ade80;border-radius:6px;
                         padding:.1rem .55rem;font-size:.72rem;font-weight:600;">Activo</span>
          </div>
        </div>
        <button onclick="cerrarPanelPerfil()"
                style="background:none;border:none;color:var(--text-secondary);font-size:1.3rem;cursor:pointer;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1.5rem;">
        ${statPerfil('Total', total, 'bi-car-front-fill')}
        ${statPerfil('Disponibles', disponibles, 'bi-check-circle-fill')}
        ${statPerfil('Vendidos', vendidos, 'bi-bag-check-fill')}
      </div>
      <div style="display:flex;flex-direction:column;gap:.5rem;">
        <button onclick="cerrarPanelPerfil();showView('autos')"
                style="background:var(--bg-input);border:1px solid var(--border-strong);color:var(--text-primary);
                       border-radius:9px;padding:.65rem 1rem;cursor:pointer;font-size:.875rem;text-align:left;
                       display:flex;align-items:center;gap:.6rem;">
          <i class="bi bi-car-front-fill" style="color:var(--accent);"></i> Ver mis autos registrados
        </button>
        <button onclick="cerrarPanelPerfil();showView('registro')"
                style="background:var(--bg-input);border:1px solid var(--border-strong);color:var(--text-primary);
                       border-radius:9px;padding:.65rem 1rem;cursor:pointer;font-size:.875rem;text-align:left;
                       display:flex;align-items:center;gap:.6rem;">
          <i class="bi bi-plus-circle-fill" style="color:var(--accent);"></i> Registrar nuevo auto
        </button>
        <hr style="border-color:var(--border);margin:.25rem 0;">
        <button onclick="logout()"
                style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#f87171;
                       border-radius:9px;padding:.65rem 1rem;cursor:pointer;font-size:.875rem;text-align:left;
                       display:flex;align-items:center;gap:.6rem;">
          <i class="bi bi-box-arrow-right"></i> Cerrar sesión
        </button>
      </div>
    </div>`;

  panel.style.display = 'flex';
  panel.onclick = e => { if (e.target === panel) cerrarPanelPerfil(); };
}

function cerrarPanelPerfil() {
  const p = document.getElementById('panelPerfil');
  if (p) p.style.display = 'none';
}

function statPerfil(label, val, icon) {
  return `<div style="background:var(--bg-input);border:1px solid var(--border);
                      border-radius:10px;padding:.75rem;text-align:center;">
    <i class="bi ${icon}" style="color:var(--accent);font-size:1.1rem;"></i>
    <div style="font-size:1.2rem;font-weight:700;margin:.2rem 0;">${val}</div>
    <div style="font-size:.7rem;color:var(--text-secondary);">${label}</div>
  </div>`;
}

function actualizarLocks() {
  document.querySelectorAll('.sb-link[data-view]').forEach(link => {
    const paso = PASO_VISTA[link.dataset.view] || 1;
    link.classList.toggle('locked', paso > App.maxPaso);
  });
}

const pageTitles = {
  dashboard:'Dashboard', autos:'Autos registrados', registro:'Registrar auto',
  revision:'Revisión técnica', mecanica:'Revisión mecánica', valuacion:'Valuación / Precio',
};

function showView(id) {
  const paso = PASO_VISTA[id] || 1;
  if (paso > App.maxPaso) { mostrarToast('⚠ Completa el paso anterior primero', 'warn'); return; }

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const v = document.getElementById('view-' + id);
  if (v) v.classList.add('active');

  document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
  const link = document.querySelector(`.sb-link[data-view="${id}"]`);
  if (link) link.classList.add('active');

  setTexto('topbarTitle', pageTitles[id] || id);
  window.scrollTo(0, 0);

  if (id === 'registro')  { restaurarFormularioRegistro(); actualizarResumen(); }
  if (id === 'revision')  { restaurarChecklist('revision'); actualizarBanner(); }
  if (id === 'mecanica')  { restaurarChecklist('mecanica'); actualizarBanner(); actualizarDisplayPuntajes(); }
  if (id === 'valuacion') calcularValuacion();
  if (id === 'dashboard') cargarDashboard();
  if (id === 'autos')     cargarVistaAutos();
}

async function cargarDashboard() {
  try {

    const resStats = await api('GET', '/api/autos/stats');
    if (resStats && resStats.ok) {
      const stats = await resStats.json();
      setTexto('statTotal',       stats.total       || 0);
      setTexto('statRevision',    stats.enRevision   || 0);
      setTexto('statDisponibles', stats.disponibles  || 0);
      setTexto('statVendidos',    stats.vendidos     || 0);
    }


    const resAutos = await api('GET', '/api/autos');
    if (resAutos && resAutos.ok) {
      App.autos = await resAutos.json();
      renderizarTablaAutos();
    }
  } catch (e) {
    console.error('Error cargando dashboard:', e);
  }
}

function renderizarTablaAutos() {
  const tbody = document.getElementById('dashboardTbody');
  if (!tbody) return;

  if (!App.autos.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-dim);">
      <i class="bi bi-car-front" style="font-size:1.5rem;display:block;margin-bottom:.5rem;"></i>
      No hay autos registrados aún</td></tr>`;
    return;
  }

  tbody.innerHTML = App.autos.slice(0, 8).map(a => {
    const bc  = a.estado === 'Disponible' ? 'badge-ok' : a.estado === 'Vendido' ? 'badge-sold' : 'badge-pend';
    const pre = a.precio ? '$' + Number(a.precio).toLocaleString('es-CO') : '—';
    const km  = a.kilometraje ? Number(a.kilometraje).toLocaleString('es-CO') : '—';
    return `<tr>
      <td><strong>${a.marca} ${a.modelo}</strong><br>
          <small style="color:var(--text-secondary);">${a.placa}</small></td>
      <td>${a.año || '—'}</td><td>${km}</td><td><strong>${pre}</strong></td>
      <td><span class="${bc}">${a.estado}</span></td>
      <td><button class="btn-ghost" style="padding:.25rem .65rem;font-size:.75rem;"
                  onclick="verDetalleAuto('${a.id}')">
            <i class="bi bi-eye-fill me-1"></i>Ver</button></td>
    </tr>`;
  }).join('');
}

let autosFiltrados = [];
let paginaActual   = 1;
const AUTOS_POR_PAGINA = 8;

async function cargarVistaAutos() {
  try {
    const res = await api('GET', '/api/autos');
    if (res && res.ok) {
      App.autos      = await res.json();
      autosFiltrados = [...App.autos];
      paginaActual   = 1;
      renderizarTablaAutosVista();
    }
  } catch (e) {
    console.error('Error cargando autos:', e);
  }
}

function filtrarAutos() {
  const txt    = (document.getElementById('filtroTexto')?.value  || '').trim().toLowerCase();
  const estado = document.getElementById('filtroEstado')?.value  || 'Todos';
  const año    = document.getElementById('filtroAnio')?.value    || 'Todos';

  autosFiltrados = App.autos.filter(a => {
    const t = !txt ||
      (a.marca  && a.marca.toLowerCase().includes(txt))  ||
      (a.modelo && a.modelo.toLowerCase().includes(txt)) ||
      (a.placa  && a.placa.toLowerCase().includes(txt));
    const e = estado === 'Todos' || a.estado === estado;
    const y = año    === 'Todos' || String(a.año) === año;
    return t && e && y;
  });
  paginaActual = 1;
  renderizarTablaAutosVista();
}

function renderizarTablaAutosVista() {
  const tbody  = document.getElementById('autosTbody');
  const conteo = document.getElementById('autosConteo');
  if (!tbody) return;

  const total    = autosFiltrados.length;
  const totalPag = Math.max(1, Math.ceil(total / AUTOS_POR_PAGINA));
  paginaActual   = Math.min(paginaActual, totalPag);
  const inicio   = (paginaActual - 1) * AUTOS_POR_PAGINA;
  const pagina   = autosFiltrados.slice(inicio, inicio + AUTOS_POR_PAGINA);

  if (conteo) {
    conteo.textContent = total + ' registro' + (total !== 1 ? 's' : '') +
      (total !== App.autos.length ? ' (filtrado de ' + App.autos.length + ')' : '');
  }

  if (!pagina.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-dim);">
      <i class="bi bi-search" style="font-size:1.5rem;display:block;margin-bottom:.5rem;"></i>
      No se encontraron autos</td></tr>`;
    renderizarPaginacion(totalPag); return;
  }

  tbody.innerHTML = pagina.map(a => {
    const bc  = a.estado === 'Disponible' ? 'badge-ok' : a.estado === 'Vendido' ? 'badge-sold' : 'badge-pend';
    const pre = a.precio ? '$' + Number(a.precio).toLocaleString('es-CO') : '—';
    const km  = a.kilometraje ? Number(a.kilometraje).toLocaleString('es-CO') + ' km' : '—';
    return `<tr>
      <td><strong>${a.marca} ${a.modelo}</strong><br>
          <small style="color:var(--text-secondary);">${a.color || ''}</small></td>
      <td>${a.placa}</td><td>${a.año || '—'}</td><td>${km}</td>
      <td><strong>${pre}</strong></td>
      <td><span class="${bc}">${a.estado}</span></td>
      <td style="white-space:nowrap;">
        <button class="btn-ghost" style="padding:.25rem .6rem;font-size:.75rem;margin-right:3px;"
                onclick="verDetalleAuto('${a.id}')" title="Ver"><i class="bi bi-eye-fill"></i></button>
        <button class="btn-ghost" style="padding:.25rem .6rem;font-size:.75rem;margin-right:3px;"
                onclick="abrirModalEstado('${a.id}')" title="Estado"><i class="bi bi-pencil-fill"></i></button>
        <button class="btn-ghost" style="padding:.25rem .6rem;font-size:.75rem;color:#f87171;"
                onclick="confirmarArchivarAuto('${a.id}')" title="Archivar"><i class="bi bi-archive-fill"></i></button>
      </td>
    </tr>`;
  }).join('');

  renderizarPaginacion(totalPag);
}

function renderizarPaginacion(totalPag) {
  const nav = document.getElementById('paginacionAutos');
  if (!nav) return;
  let html = `<li class="page-item ${paginaActual===1?'disabled':''}">
    <a class="page-link" style="background:var(--bg-input);border-color:var(--border-strong);
       color:${paginaActual===1?'var(--text-dim)':'var(--text-primary)'};cursor:pointer;"
       onclick="cambiarPagina(${paginaActual-1})">‹</a></li>`;
  for (let i = 1; i <= totalPag; i++) {
    html += `<li class="page-item ${i===paginaActual?'active':''}">
      <a class="page-link" style="background:${i===paginaActual?'var(--accent)':'var(--bg-input)'};
         border-color:${i===paginaActual?'var(--accent)':'var(--border-strong)'};
         color:${i===paginaActual?'#fff':'var(--text-primary)'};cursor:pointer;"
         onclick="cambiarPagina(${i})">${i}</a></li>`;
  }
  html += `<li class="page-item ${paginaActual===totalPag?'disabled':''}">
    <a class="page-link" style="background:var(--bg-input);border-color:var(--border-strong);
       color:${paginaActual===totalPag?'var(--text-dim)':'var(--text-primary)'};cursor:pointer;"
       onclick="cambiarPagina(${paginaActual+1})">›</a></li>`;
  nav.innerHTML = html;
}

function cambiarPagina(n) {
  const totalPag = Math.max(1, Math.ceil(autosFiltrados.length / AUTOS_POR_PAGINA));
  if (n < 1 || n > totalPag) return;
  paginaActual = n;
  renderizarTablaAutosVista();
}

async function verDetalleAuto(id) {
  const a = App.autos.find(x => x.id === id);
  if (!a) return;

  let modal = document.getElementById('modalDetalle');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalDetalle';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;
      display:flex;align-items:center;justify-content:center;padding:1rem;`;
    document.body.appendChild(modal);
  }


  let propietario = { nombre: a.propietario || '—', telefono: '', email: '' };
  if (a.cedula) {
    try {
      const resProp = await api('GET', `/api/propietarios/cedula/${encodeURIComponent(a.cedula)}`);
      if (resProp && resProp.ok) {
        const dataProp = await resProp.json();
        if (dataProp.encontrado) propietario = dataProp;
      }
    } catch (e) {}
  }

  const bc   = a.estado === 'Disponible' ? 'badge-ok' : a.estado === 'Vendido' ? 'badge-sold' : 'badge-pend';
  const pre  = a.precio ? '$' + Number(a.precio).toLocaleString('es-CO') : '—';
  const km   = a.kilometraje ? Number(a.kilometraje).toLocaleString('es-CO') + ' km' : '—';
  const pt   = a.puntajeTecnico  || a.puntajeTec  || 0;
  const pm   = a.puntajeMecanico || a.puntajeMec  || 0;
  const comb = Math.round((pt + pm) / 2);
  const colorScore = v => v >= 75 ? '#4ade80' : v >= 50 ? '#fbbf24' : '#f87171';


  const obsRev = a.observacionRevision || a.observacion_revision || '';
  const obsMec = a.observacionMecanica || a.observacion_mecanica || '';

  modal.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border-strong);
                border-radius:16px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;">
      <div style="padding:1.4rem 1.5rem 1rem;border-bottom:1px solid var(--border);
                  display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:700;font-size:1.1rem;">${a.marca} ${a.modelo} ${a.año || ''}</div>
          <div style="color:var(--text-secondary);font-size:.82rem;margin-top:.15rem;">
            ${a.placa}${a.fechaRegistro ? ' · Registrado el ' + a.fechaRegistro : ''}
          </div>
        </div>
        <button onclick="document.getElementById('modalDetalle').style.display='none'"
                style="background:none;border:none;color:var(--text-secondary);font-size:1.4rem;cursor:pointer;">✕</button>
      </div>
      <div style="padding:1.2rem 1.5rem;">
        <!-- Solo el estado arriba -->
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.2rem;">
          <span class="${bc}">${a.estado}</span>
        </div>
        <!-- Puntajes -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-bottom:1.2rem;">
          ${scoreBox('Técnico',   pt,   colorScore(pt))}
          ${scoreBox('Mecánico',  pm,   colorScore(pm))}
          ${scoreBox('Combinado', comb, colorScore(comb))}
        </div>
        <!-- Vehículo -->
        <div style="font-size:.78rem;font-weight:600;color:var(--text-secondary);
                    text-transform:uppercase;letter-spacing:.05em;margin-bottom:.6rem;">Vehículo</div>
        <table style="width:100%;font-size:.84rem;border-collapse:collapse;margin-bottom:1.2rem;">
          ${filaDato('Kilometraje',  km)}
          ${filaDato('Color',        a.color        || '—')}
          ${filaDato('Transmisión',  a.transmision  || '—')}
          ${filaDato('Combustible',  a.combustible  || '—')}
          ${filaDato('Precio', `<strong style="color:var(--accent);">${pre}</strong>`)}
        </table>
        <!-- Propietario -->
        <div style="font-size:.78rem;font-weight:600;color:var(--text-secondary);
                    text-transform:uppercase;letter-spacing:.05em;margin-bottom:.6rem;">Propietario</div>
        <table style="width:100%;font-size:.84rem;border-collapse:collapse;margin-bottom:1.2rem;">
          ${filaDato('Nombre',   propietario.nombre || a.propietario || '—')}
          ${a.nPropietarios ? filaDato('N.º propietarios', a.nPropietarios) : ''}
          ${propietario.telefono ? filaDato('Teléfono', `<a href="tel:${propietario.telefono}" style="color:var(--accent);text-decoration:none;">${propietario.telefono}</a>`) : ''}
          ${propietario.email    ? filaDato('Email',    `<a href="mailto:${propietario.email}" style="color:var(--accent);text-decoration:none;">${propietario.email}</a>`)    : ''}
        </table>
        <!-- Observaciones -->
        ${obsRev || obsMec ? `
          <div style="font-size:.78rem;font-weight:600;color:var(--text-secondary);
                      text-transform:uppercase;letter-spacing:.05em;margin-bottom:.6rem;">Observaciones</div>
          ${obsRev ? `<div style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:.65rem .85rem;font-size:.82rem;color:var(--text-secondary);margin-bottom:.5rem;"><strong style="color:var(--text-primary);">Técnica:</strong> ${obsRev}</div>` : ''}
          ${obsMec ? `<div style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:.65rem .85rem;font-size:.82rem;color:var(--text-secondary);"><strong style="color:var(--text-primary);">Mecánica:</strong> ${obsMec}</div>` : ''}
        ` : ''}
        <div style="display:flex;gap:.5rem;margin-top:1.3rem;flex-wrap:wrap;">
          <button onclick="confirmarArchivarAuto('${a.id}');document.getElementById('modalDetalle').style.display='none'"
                  style="background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);color:#f87171;
                         border-radius:9px;padding:.6rem 1rem;cursor:pointer;font-size:.85rem;
                         display:flex;align-items:center;gap:.4rem;">
            <i class="bi bi-archive-fill"></i> Archivar
          </button>
          <button onclick="abrirModalEstado('${a.id}')"
                  style="flex:1;background:var(--bg-input);border:1px solid var(--border-strong);
                         color:var(--text-primary);border-radius:9px;padding:.6rem 1rem;cursor:pointer;font-size:.85rem;
                         display:flex;align-items:center;justify-content:center;gap:.4rem;">
            <i class="bi bi-pencil-fill"></i> Cambiar estado
          </button>
          <button onclick="document.getElementById('modalDetalle').style.display='none'"
                  style="flex:1;background:var(--bg-input);border:1px solid var(--border-strong);
                         color:var(--text-secondary);border-radius:9px;padding:.6rem 1rem;cursor:pointer;font-size:.85rem;">
            Cerrar
          </button>
        </div>
      </div>
    </div>`;

  modal.style.display = 'flex';
  modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
}

function scoreBox(label, val, color) {
  return `<div style="background:var(--bg-input);border:1px solid var(--border);border-radius:10px;padding:.65rem;text-align:center;">
    <div style="font-size:1.25rem;font-weight:800;color:${color};">${val}</div>
    <div style="font-size:.72rem;color:var(--text-secondary);margin-top:.1rem;">${label}</div>
  </div>`;
}

function filaDato(label, valor) {
  return `<tr>
    <td style="color:var(--text-secondary);padding:.3rem 0;width:38%;vertical-align:top;">${label}</td>
    <td style="padding:.3rem 0;">${valor}</td>
  </tr>`;
}

function abrirModalEstado(id) {
  const a = App.autos.find(x => x.id === id);
  if (!a) return;

  let modal = document.getElementById('modalEstado');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalEstado';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;
      display:flex;align-items:center;justify-content:center;padding:1rem;`;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border-strong);
                border-radius:14px;padding:1.5rem;width:100%;max-width:360px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
        <strong>Cambiar estado</strong>
        <button onclick="document.getElementById('modalEstado').style.display='none'"
                style="background:none;border:none;color:var(--text-secondary);font-size:1.3rem;cursor:pointer;">✕</button>
      </div>
      <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:1rem;">
        ${a.marca} ${a.modelo} — <strong>${a.placa}</strong>
      </p>
      <div style="display:flex;flex-direction:column;gap:.5rem;">
        ${['Disponible','En revisión','Vendido'].map(est => `
          <button onclick="cambiarEstadoAuto('${id}','${est}')"
                  style="background:${a.estado===est?'var(--accent)':'var(--bg-input)'};
                         border:1px solid ${a.estado===est?'var(--accent)':'var(--border-strong)'};
                         color:${a.estado===est?'#fff':'var(--text-primary)'};
                         border-radius:8px;padding:.55rem 1rem;cursor:pointer;font-size:.875rem;text-align:left;">
            ${a.estado===est?'<i class="bi bi-check2 me-1"></i>':''}${est}
          </button>`).join('')}
      </div>
    </div>`;

  modal.style.display = 'flex';
  modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
}

async function cambiarEstadoAuto(id, nuevoEstado) {
  document.getElementById('modalEstado').style.display = 'none';
  const md = document.getElementById('modalDetalle');
  if (md) md.style.display = 'none';

  try {
    const res = await api('PATCH', `/api/autos/${id}/estado`, { estado: nuevoEstado });
    if (!res || !res.ok) { mostrarToast('Error al cambiar estado', 'warn'); return; }
  } catch (e) {
    mostrarToast('Error de conexión', 'warn'); return;
  }


  const a = App.autos.find(x => x.id === id);
  if (a) a.estado = nuevoEstado;

  mostrarToast('✓ Estado actualizado a "' + nuevoEstado + '"');
  renderizarTablaAutos();
  autosFiltrados = [...App.autos];
  renderizarTablaAutosVista();
}

function confirmarArchivarAuto(id) {
  const a = App.autos.find(x => x.id === id);
  if (!a) return;

  let modal = document.getElementById('modalArchivar');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalArchivar';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10001;
      display:flex;align-items:center;justify-content:center;padding:1rem;`;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border-strong);
                border-radius:14px;padding:1.5rem;width:100%;max-width:380px;">
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;">
        <div style="width:40px;height:40px;background:rgba(248,113,113,.15);border-radius:10px;
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="bi bi-archive-fill" style="color:#f87171;font-size:1.1rem;"></i>
        </div>
        <div>
          <div style="font-weight:700;">Archivar auto</div>
          <div style="font-size:.82rem;color:var(--text-secondary);">Esta acción se puede deshacer</div>
        </div>
      </div>
      <p style="font-size:.875rem;color:var(--text-secondary);margin-bottom:1.2rem;line-height:1.6;">
        <strong style="color:var(--text-primary);">${a.marca} ${a.modelo} — ${a.placa}</strong>
        será ocultado de todas las listas. Los datos se conservan en MongoDB.
      </p>
      <div style="display:flex;gap:.5rem;">
        <button onclick="ejecutarArchivar('${id}')"
                style="flex:1;background:rgba(248,113,113,.15);border:1px solid rgba(248,113,113,.35);
                       color:#f87171;border-radius:9px;padding:.65rem;cursor:pointer;font-size:.875rem;">
          <i class="bi bi-archive-fill me-1"></i> Sí, archivar
        </button>
        <button onclick="document.getElementById('modalArchivar').style.display='none'"
                style="flex:1;background:var(--bg-input);border:1px solid var(--border-strong);
                       color:var(--text-secondary);border-radius:9px;padding:.65rem;cursor:pointer;font-size:.875rem;">
          Cancelar
        </button>
      </div>
    </div>`;

  modal.style.display = 'flex';
  modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
}

async function ejecutarArchivar(id) {
  document.getElementById('modalArchivar').style.display = 'none';

  try {
    const res = await api('PATCH', `/api/autos/${id}/archivar`);
    if (!res || !res.ok) { mostrarToast('Error al archivar', 'warn'); return; }
  } catch (e) {
    mostrarToast('Error de conexión', 'warn'); return;
  }


  App.autos      = App.autos.filter(x => x.id !== id);
  autosFiltrados = [...App.autos];

  mostrarToast('Auto archivado — datos conservados en MongoDB');
  renderizarTablaAutos();
  renderizarTablaAutosVista();
}

const camposAuto = [
  'marca','modelo','año','color',
  'placa','kilometraje','transmision','combustible',
  'propietario','cedula','telefono','email','nPropietarios'
];

function bindRegistroInputs() {
  camposAuto.forEach(campo => {
    const el = document.getElementById('inp_' + campo);
    if (!el) return;
    el.addEventListener('input',  () => { App.auto[campo] = el.value; actualizarResumen(); });
    el.addEventListener('change', () => { App.auto[campo] = el.value; actualizarResumen(); });
  });

  const obsRev = document.getElementById('obsRevision');
  if (obsRev) obsRev.addEventListener('input', () => { App.auto.observacionRevision = obsRev.value; });
  const obsMec = document.getElementById('obsMecanica');
  if (obsMec) obsMec.addEventListener('input', () => { App.auto.observacionMecanica = obsMec.value; });
  const justPrecio = document.getElementById('justPrecio');
  if (justPrecio) justPrecio.addEventListener('input', () => { App.auto.justificacionPrecio = justPrecio.value; });
}

function restaurarFormularioRegistro() {
  const inpMarca = document.getElementById('inp_marca');
  if (inpMarca && App.auto.marca) {
    inpMarca.value = App.auto.marca;
    actualizarModelos();
  }
  camposAuto.forEach(campo => {
    if (campo === 'marca') return;
    const el = document.getElementById('inp_' + campo);
    if (el && App.auto[campo] !== undefined) el.value = App.auto[campo];
  });
}

function restaurarChecklist(vistaId) {
  const grupos  = document.querySelectorAll(`#view-${vistaId} .check-options`);
  const estado  = vistaId === 'revision' ? App.auto.checklistRevision : App.auto.checklistMecanica;

  grupos.forEach((grupo, idx) => {
    grupo.querySelectorAll('.btn-opt').forEach(b => b.classList.remove('active'));
    const val = estado[idx];
    if (val) { const btn = grupo.querySelector(`.btn-opt.${val}`); if (btn) btn.classList.add('active'); }
  });

  if (vistaId === 'revision') {
    const obs = document.getElementById('obsRevision');
    if (obs) obs.value = App.auto.observacionRevision || '';
  }
  if (vistaId === 'mecanica') {
    const obs = document.getElementById('obsMecanica');
    if (obs) obs.value = App.auto.observacionMecanica || '';
  }
  recalcularPuntajes();
}

function actualizarResumen() {
  const a = App.auto;
  const vehiculo = [a.marca, a.modelo, a.año].filter(Boolean).join(' · ') || '—';
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
  const sub    = [a.placa, a.año,
    a.kilometraje ? Number(a.kilometraje).toLocaleString('es-CO') + ' km' : '']
    .filter(Boolean).join(' · ') || '—';
  document.querySelectorAll('#bannerNombre').forEach(el => el.textContent = nombre);
  document.querySelectorAll('#bannerSub').forEach(el => el.textContent = sub);
}

async function guardarYContinuar() {
  if (!validarFormularioRegistro()) return;


  try {

    await api('POST', '/api/autos/nuevo');


    if (App.auto.cedula) {
      await api('POST', '/api/propietarios', {
        nombre:   App.auto.propietario || '',
        cedula:   App.auto.cedula,
        telefono: App.auto.telefono    || '',
        email:    App.auto.email       || '',
      });
    }


    await api('PUT', '/api/autos/actual', {
      marca:       App.auto.marca,
      modelo:      App.auto.modelo,
      año:         App.auto.año,
      color:       App.auto.color,
      placa:       App.auto.placa,
      kilometraje: App.auto.kilometraje,
      transmision: App.auto.transmision,
      combustible: App.auto.combustible,
      propietario:    App.auto.propietario,
      cedula:         App.auto.cedula,
      nPropietarios:  App.auto.nPropietarios || '',
    });
  } catch (e) {  }

  App.maxPaso = Math.max(App.maxPaso, 2);
  actualizarLocks();
  mostrarToast('✓ Datos guardados correctamente');
  showView('revision');
}

function avanzarRevision() {
  if (!validarChecklist('revision')) return;

  App.maxPaso = Math.max(App.maxPaso, 3);
  actualizarLocks();
  showView('mecanica');
}

function avanzarMecanica() {
  if (!validarChecklist('mecanica')) return;

  App.maxPaso = Math.max(App.maxPaso, 4);
  actualizarLocks();
  showView('valuacion');
}

function volverAlPaso(vistaId) { showView(vistaId); }

function resetearAutoEnProceso() {
  App.auto = {
    marca:'', modelo:'', año:'', color:'',
    placa:'', kilometraje:'', transmision:'', combustible:'',
    propietario:'', cedula:'', telefono:'', email:'', nPropietarios:'',
    puntajeTecnico:0, puntajeMecanico:0,
    checklistRevision:{}, checklistMecanica:{},
    observacionRevision:'', observacionMecanica:'',
    justificacionPrecio:'', precioManual:0,
  };
  App.maxPaso = 1;
  limpiarFormularioRegistro();
  actualizarLocks();
}

async function registrarAutoFinal() {
  const a = App.auto;
  if (!a.marca || !a.modelo || !a.placa) {
    mostrarToast('Completa los datos del auto primero', 'warn'); return;
  }

  const precio = parseInt(document.getElementById('inp_precioFinal')?.value) || 0;

  try {

    const fechaHoy = new Date().toLocaleDateString('es-CO');
    await api('PUT', '/api/autos/actual', {
      marca:               a.marca,
      modelo:              a.modelo,
      año:                 a.año,
      color:               a.color,
      placa:               a.placa,
      kilometraje:         a.kilometraje,
      transmision:         a.transmision,
      combustible:         a.combustible,
      propietario:         a.propietario,
      cedula:              a.cedula,
      nPropietarios:       a.nPropietarios || '',
      puntajeTecnico:      a.puntajeTecnico,
      puntajeMecanico:     a.puntajeMecanico,
      observacionRevision: a.observacionRevision || '',
      observacionMecanica: a.observacionMecanica || '',
      precio,
      fechaRegistro:       fechaHoy,
    });


    const res = await api('POST', '/api/autos/publicar');
    if (!res || !res.ok) {
      const err = await res?.json();
      mostrarToast(err?.error || 'Error al publicar el auto', 'warn'); return;
    }
  } catch (e) {
    mostrarToast('Error de conexión al guardar', 'warn'); return;
  }

  resetearAutoEnProceso();
  mostrarToast('✓ Auto registrado y guardado en MongoDB');
  showView('dashboard');
}

function limpiarFormularioRegistro() {
  camposAuto.forEach(campo => {
    const el = document.getElementById('inp_' + campo);
    if (el) el.value = '';
  });
  ['obsRevision','obsMecanica','justPrecio'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  actualizarResumen();
}

function guardarBorrador() {
  try {
    localStorage.setItem('ca_borrador', JSON.stringify(App.auto));
    mostrarToast('✓ Borrador guardado');
  } catch(e) { mostrarToast('No se pudo guardar el borrador', 'warn'); }
}

function cargarBorrador() {
  try {
    const data = localStorage.getItem('ca_borrador');
    if (!data) { mostrarToast('No hay borrador guardado', 'warn'); return; }
    Object.assign(App.auto, JSON.parse(data));
    restaurarFormularioRegistro();
    actualizarResumen();
    mostrarToast('✓ Borrador cargado');
  } catch(e) { mostrarToast('Error al cargar el borrador', 'warn'); }
}

function selectOpt(btn) {
  const group = btn.closest('.check-options');
  group.querySelectorAll('.btn-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');


  const item = btn.closest('.check-item');
  if (item) { item.style.background = ''; item.style.outline = ''; }

  const vistaId = btn.closest('.view')?.id?.replace('view-', '');
  if (vistaId === 'revision' || vistaId === 'mecanica') {
    const grupos    = document.querySelectorAll(`#view-${vistaId} .check-options`);
    const estadoKey = vistaId === 'revision' ? 'checklistRevision' : 'checklistMecanica';
    grupos.forEach((g, idx) => {
      const act = g.querySelector('.btn-opt.active');
      if (act) {
        App.auto[estadoKey][idx] = act.classList.contains('bueno') ? 'bueno'
          : act.classList.contains('regular') ? 'regular' : 'malo';
      }
    });
  }
  recalcularPuntajes();
}

function recalcularPuntajes() {
  App.auto.puntajeTecnico  = calcPuntaje(document.querySelectorAll('#view-revision .check-options'));
  App.auto.puntajeMecanico = calcPuntaje(document.querySelectorAll('#view-mecanica .check-options'));
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
  const pt   = App.auto.puntajeTecnico;
  const pm   = App.auto.puntajeMecanico;
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
  el.style.width      = pct + '%';
  el.style.background = pct >= 75 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#f87171';
}

function calcularValuacion() {
  const a    = App.auto;
  const pt   = a.puntajeTecnico;
  const pm   = a.puntajeMecanico;
  const comb = Math.round((pt + pm) / 2);

  const anio       = parseInt(a.año) || 2020;
  const edad       = new Date().getFullYear() - anio;
  const precioBase = Math.max(20_000_000, 90_000_000 - (edad * 5_500_000));

  let descPct;
  if      (comb >= 95) descPct = 0;
  else if (comb >= 85) descPct = 5;
  else if (comb >= 75) descPct = 12;
  else if (comb >= 65) descPct = 20;
  else if (comb >= 55) descPct = 30;
  else if (comb >= 45) descPct = 42;
  else if (comb >= 35) descPct = 55;
  else                 descPct = 65;

  const descVal     = Math.round(precioBase * descPct / 100);
  const precioFinal = precioBase - descVal;

  setTexto('val_vehiculo',    [a.marca, a.modelo, a.año].filter(Boolean).join(' · ') || '—');
  setTexto('val_placa',       a.placa       || '—');
  setTexto('val_km',          a.kilometraje ? Number(a.kilometraje).toLocaleString('es-CO') + ' km' : '—');
  setTexto('val_color',       a.color       || '—');
  setTexto('val_propietario', a.propietario || '—');
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
  if (inp) inp.value = App.auto.precioManual > 0 ? App.auto.precioManual : precioFinal;

  const justPrecio = document.getElementById('justPrecio');
  if (justPrecio) justPrecio.value = App.auto.justificacionPrecio || '';
}

function onPrecioManualChange() {
  const val = parseInt(document.getElementById('inp_precioFinal')?.value) || 0;
  App.auto.precioManual = val;
  const fmt = '$' + val.toLocaleString('es-CO');
  setTexto('val_precio_grande', fmt);
  setTexto('val_final_row',     fmt);
}

function validarFormularioRegistro() {
  const obligatorios = [
    { id:'inp_marca',       label:'Marca'              },
    { id:'inp_modelo',      label:'Modelo'             },
    { id:'inp_año',         label:'Año'                },
    { id:'inp_placa',       label:'Placa'              },
    { id:'inp_kilometraje', label:'Kilometraje'        },
    { id:'inp_transmision', label:'Transmisión'        },
    { id:'inp_combustible', label:'Combustible'        },
    { id:'inp_propietario', label:'Nombre propietario' },
    { id:'inp_cedula',      label:'Cédula / NIT'       },
  ];

  let faltantes = [];
  obligatorios.forEach(({ id, label }) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.value || el.value.trim() === '') {
      faltantes.push(label);
      el.style.borderColor = '#f87171';
      el.style.boxShadow   = '0 0 0 2px rgba(248,113,113,.25)';
    } else {
      el.style.borderColor = '';
      el.style.boxShadow   = '';
    }
  });

  const inpAño = document.getElementById('inp_año');
  if (inpAño && inpAño.value) {
    const n = parseInt(inpAño.value);
    if (isNaN(n) || n < 1950 || n > new Date().getFullYear() + 1) {
      faltantes.push('Año válido');
      inpAño.style.borderColor = '#f87171';
      inpAño.style.boxShadow   = '0 0 0 2px rgba(248,113,113,.25)';
    }
  }

  if (faltantes.length > 0) {
    mostrarToast('⚠ Completa: ' + faltantes.slice(0,3).join(', ') +
      (faltantes.length > 3 ? ' y ' + (faltantes.length-3) + ' más' : ''), 'warn');
    const primero = document.getElementById(
      obligatorios.find(({ id }) => {
        const el = document.getElementById(id);
        return el && (!el.value || !el.value.trim());
      })?.id
    );
    if (primero) primero.scrollIntoView({ behavior:'smooth', block:'center' });
    return false;
  }
  return true;
}

function validarChecklist(vistaId) {
  const grupos = document.querySelectorAll(`#view-${vistaId} .check-options`);
  let sinSeleccion = 0;
  grupos.forEach(grupo => {
    const item = grupo.closest('.check-item');
    if (!grupo.querySelector('.btn-opt.active')) {
      sinSeleccion++;
      if (item) { item.style.background='rgba(248,113,113,.08)'; item.style.outline='1px solid rgba(248,113,113,.4)'; item.style.borderRadius='8px'; }
    } else {
      if (item) { item.style.background=''; item.style.outline=''; }
    }
  });
  if (sinSeleccion > 0) {
    mostrarToast(`⚠ Faltan ${sinSeleccion} ítem${sinSeleccion>1?'s':''} por evaluar`, 'warn');
    const primero = document.querySelector(`#view-${vistaId} .check-options:not(:has(.btn-opt.active))`);
    if (primero) primero.scrollIntoView({ behavior:'smooth', block:'center' });
    return false;
  }
  return true;
}

let _cedulaTimer = null;
function onCedulaInput() {
  clearTimeout(_cedulaTimer);
  const cedula = document.getElementById('inp_cedula')?.value?.trim();
  if (!cedula || cedula.length < 5) return;
  _cedulaTimer = setTimeout(async () => {
    try {
      const res = await api('GET', `/api/propietarios/cedula/${encodeURIComponent(cedula)}`);
      if (!res || !res.ok) return;
      const data = await res.json();
      if (data.encontrado) {

        const inpNombre = document.getElementById('inp_propietario');
        const inpTel    = document.getElementById('inp_telefono');
        const inpEmail  = document.getElementById('inp_email');
        if (inpNombre) { inpNombre.value = data.nombre    || ''; App.auto.propietario = data.nombre    || ''; }
        if (inpTel)    { inpTel.value    = data.telefono  || ''; App.auto.telefono    = data.telefono  || ''; }
        if (inpEmail)  { inpEmail.value  = data.email     || ''; App.auto.email       = data.email     || ''; }
        actualizarResumen();
        mostrarToast('✓ Propietario encontrado: ' + data.nombre);
      }
    } catch (e) {}
  }, 600);
}

const CATALOGO_AUTOS = {
  "Toyota":      ["Corolla","Camry","RAV4","Highlander","Prius","Land Cruiser","Yaris","Hilux","Fortuner","4Runner","Avalon","C-HR","Venza","Sequoia","Tacoma","Tundra","GR86","Supra","FJ Cruiser","Rush","Innova","Avanza","Wigo","Starlet","Etios"],
  "Mazda":       ["Mazda2","Mazda3","Mazda6","CX-3","CX-30","CX-5","CX-50","CX-60","CX-90","MX-5 Miata","MX-30","BT-50","RX-7","RX-8","626","323"],
  "Kia":         ["Picanto","Rio","Cerato","Forte","Stinger","Sportage","Sorento","Telluride","Soul","Seltos","Niro","EV6","EV9","Carnival","Stonic","XCeed","ProCeed","K5","K8","K900","Mohave"],
  "Renault":     ["Logan","Sandero","Duster","Kwid","Captur","Koleos","Megane","Clio","Fluence","Symbol","Oroch","Alaskan","Arkana","Zoe","Triber","Kardian","Stepway"],
  "Chevrolet":   ["Spark","Sail","Aveo","Cruze","Malibu","Camaro","Corvette","Equinox","Trax","Trailblazer","Traverse","Tahoe","Suburban","Silverado","Colorado","Captiva","Onix","Tracker","Montana","Blazer","Bolt EV"],
  "Hyundai":     ["i10","i20","i30","Elantra","Sonata","Accent","Tucson","Santa Fe","Palisade","Venue","Creta","Kona","Ioniq","Ioniq 5","Ioniq 6","Starex","H1","Veloster","Genesis","Nexo"],
  "Ford":        ["Fiesta","Focus","Mustang","Fusion","Taurus","EcoSport","Escape","Edge","Explorer","Expedition","Bronco","Bronco Sport","Maverick","Ranger","F-150","F-250","Transit","Puma","Kuga","Territory"],
  "Volkswagen":  ["Polo","Golf","Jetta","Passat","Arteon","Tiguan","T-Cross","T-Roc","Touareg","Atlas","ID.4","ID.3","Amarok","Caddy","Taos","Virtus","Nivus","Saveiro"],
  "Nissan":      ["Versa","Sentra","Altima","Maxima","Tiida","Kicks","Qashqai","X-Trail","Murano","Pathfinder","Armada","Frontier","Navara","GT-R","370Z","400Z","Leaf","Ariya","Terra","NP300"],
  "Honda":       ["Fit","Jazz","City","Civic","Accord","HR-V","CR-V","Pilot","Passport","Ridgeline","Odyssey","Element","BR-V","WR-V","ZR-V","Insight"],
  "Suzuki":      ["Alto","Celerio","Swift","Baleno","Ciaz","Vitara","S-Cross","Ignis","Jimny","Grand Vitara","Ertiga","XL7","Fronx"],
  "BMW":         ["116i","118i","120i","M2","M3","M4","M5","318i","320i","325i","330i","418i","420i","430i","520i","528i","530i","540i","730i","740i","750i","X1","X2","X3","X4","X5","X6","X7","iX","i4","i7","Z4"],
  "Mercedes-Benz":["A180","A200","A250","C180","C200","C220","C300","E200","E250","E300","E350","S350","S400","S500","GLA180","GLA200","GLC200","GLC300","GLE300","GLE400","GLS350","GLS450","CLA200","CLA250","EQA","EQB","EQC","EQS","AMG GT"],
  "Audi":        ["A1","A3","A4","A5","A6","A7","A8","Q2","Q3","Q5","Q7","Q8","TT","R8","e-tron","e-tron GT","RS3","RS4","RS5","RS6","RS7","S3","S4","S5","S6","S7","S8","SQ5","SQ7","SQ8"],
  "Jeep":        ["Renegade","Compass","Cherokee","Grand Cherokee","Wrangler","Gladiator","Commander","Avenger","Grand Wagoneer"],
  "Mitsubishi":  ["Mirage","Attrage","Lancer","Galant","Eclipse Cross","ASX","Outlander","Outlander Sport","Pajero","Montero","L200","Triton","Xpander","Xforce"],
  "Subaru":      ["Impreza","Legacy","Outback","Forester","XV","Crosstrek","Ascent","BRZ","WRX","WRX STI","Solterra"],
  "Volvo":       ["S60","S90","V60","V90","XC40","XC60","XC90","C40","EX30","EX90"],
  "Peugeot":     ["208","308","408","508","2008","3008","5008","Landtrek","Partner","Expert","Boxer"],
  "Fiat":        ["500","Mobi","Argo","Cronos","Siena","Pulse","Fastback","Toro","Doblo","Ducato"],
  "Dodge":       ["Neon","Charger","Challenger","Durango","Journey","RAM 1500","RAM 2500","Hornet","Viper"],
  "Land Rover":  ["Defender","Discovery","Discovery Sport","Freelander","Range Rover","Range Rover Sport","Range Rover Evoque","Range Rover Velar"],
  "Porsche":     ["911","718 Cayman","718 Boxster","Taycan","Panamera","Macan","Cayenne"],
  "Lexus":       ["IS","ES","GS","LS","UX","NX","RX","GX","LX","RC","LC","RZ"],
  "Alfa Romeo":  ["Giulia","Stelvio","Tonale","Giulietta","MiTo","4C","Spider"],
  "Seat":        ["Ibiza","Leon","Arona","Ateca","Tarraco","Mii","Alhambra","Toledo"],
  "Skoda":       ["Fabia","Octavia","Superb","Kamiq","Karoq","Kodiaq","Enyaq","Scala","Rapid"],
  "MINI":        ["Cooper","Cooper S","Clubman","Countryman","Paceman","Convertible","JCW"],
  "Tesla":       ["Model 3","Model Y","Model S","Model X","Cybertruck","Roadster"],
  "BYD":         ["Atto 3","Han","Tang","Song Plus","Seal","Dolphin","Yuan Plus","Shark"],
  "Chery":       ["QQ","Tiggo 2","Tiggo 4","Tiggo 7","Tiggo 8","Arrizo 5","Arrizo 6","Omoda 5","Omoda C9"],
  "JAC":         ["J2","J3","J4","S2","S3","S4","S5","T6","T8","EV"],
  "MG":          ["MG3","MG5","MG6","ZS","HS","RX5","RX8","One","Marvel R","EHS"],
  "Geely":       ["Coolray","Okavango","Emgrand","Azkarra","BL","MK","EC7"],
  "Ssangyong":   ["Tivoli","Korando","Rexton","Musso","Actyon","Rodius"],
  "Isuzu":       ["D-Max","MU-X","Trooper","Crosswind","Sportivo"],
  "RAM":         ["700","1000","1500","2500","3500","ProMaster"],
  "GMC":         ["Sierra","Canyon","Terrain","Acadia","Yukon"],
  "Cadillac":    ["CT4","CT5","XT4","XT5","XT6","Escalade","LYRIQ"],
  "Ferrari":     ["Roma","Portofino","SF90","812","F8","296","GTC4Lusso","Purosangue"],
  "Lamborghini": ["Huracán","Aventador","Urus","Revuelto","Sterrato"],
  "Maserati":    ["Ghibli","Quattroporte","Levante","Grecale","MC20","GranTurismo"],
};

function inicializarCatalogoAutos() {
  const selectMarca = document.getElementById('inp_marca');
  if (!selectMarca) return;
  selectMarca.innerHTML = '<option value="">Seleccionar…</option>';
  Object.keys(CATALOGO_AUTOS).sort().forEach(marca => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = marca;
    selectMarca.appendChild(opt);
  });

  const datalist = document.getElementById('listaAnios');
  if (datalist) {
    const anioActual = new Date().getFullYear();
    for (let y = anioActual; y >= 1990; y--) {
      const opt = document.createElement('option');
      opt.value = String(y);
      datalist.appendChild(opt);
    }
  }
}

function actualizarModelos() {
  const marca    = document.getElementById('inp_marca')?.value;
  const selModel = document.getElementById('inp_modelo');
  if (!selModel) return;
  App.auto.marca = marca || '';
  actualizarResumen();
  if (!marca || !CATALOGO_AUTOS[marca]) {
    selModel.innerHTML = '<option value="">Selecciona una marca primero…</option>';
    App.auto.modelo = '';
    return;
  }
  selModel.innerHTML = '<option value="">Seleccionar modelo…</option>';
  CATALOGO_AUTOS[marca].forEach(modelo => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = modelo;
    selModel.appendChild(opt);
  });
  if (App.auto.modelo) selModel.value = App.auto.modelo;
}

function mostrarToast(msg, tipo = 'ok') {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.style.borderColor = tipo==='warn' ? 'rgba(251,191,36,.35)' : 'rgba(74,222,128,.3)';
  toast.style.color       = tipo==='warn' ? '#fbbf24' : '#4ade80';
  toast.innerHTML = `<i class="bi bi-${tipo==='warn'?'exclamation-circle':'check-circle-fill'}"></i> ${msg}`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function setTexto(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

document.addEventListener('DOMContentLoaded', async () => {
  bindRegistroInputs();
  inicializarCatalogoAutos();


  const filtroTextoEl = document.querySelector('#view-autos input[type="text"]');
  if (filtroTextoEl) { filtroTextoEl.id = 'filtroTexto'; filtroTextoEl.addEventListener('input', filtrarAutos); }
  const selects = document.querySelectorAll('#view-autos select');
  if (selects[0]) { selects[0].id = 'filtroEstado'; selects[0].addEventListener('change', filtrarAutos); }
  if (selects[1]) { selects[1].id = 'filtroAnio';   selects[1].addEventListener('change', filtrarAutos); }
  const btnFiltrar = document.querySelector('#view-autos .cd-body .btn-ghost');
  if (btnFiltrar) btnFiltrar.onclick = filtrarAutos;
  const paginacionUl = document.querySelector('#view-autos .pagination');
  if (paginacionUl) paginacionUl.id = 'paginacionAutos';




  document.querySelectorAll('#view-registro .btn-ghost').forEach(b => {
    if (b.innerHTML.includes('floppy') || b.innerHTML.includes('borrador')) b.onclick = guardarBorrador;
  });


  const sbFooter = document.querySelector('.sb-footer');
  if (sbFooter) sbFooter.onclick = e => { e.stopPropagation(); abrirPanelPerfil(); };
  const topbarPill = document.querySelector('.topbar-user-pill');
  if (topbarPill) topbarPill.onclick = e => { e.stopPropagation(); abrirPanelPerfil(); };


  const btnVolverRev = document.querySelector('#view-revision .btn-ghost');
  if (btnVolverRev) btnVolverRev.onclick = () => volverAlPaso('registro');
  const btnVolverMec = document.querySelector('#view-mecanica .btn-ghost');
  if (btnVolverMec) btnVolverMec.onclick = () => volverAlPaso('revision');


  const inpCedula = document.getElementById('inp_cedula');
  if (inpCedula) inpCedula.addEventListener('input', onCedulaInput);


  ['inp_marca','inp_modelo','inp_año','inp_placa','inp_kilometraje',
   'inp_transmision','inp_combustible','inp_propietario','inp_cedula'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input',  () => { if (el.value?.trim()) { el.style.borderColor=''; el.style.boxShadow=''; } });
    el.addEventListener('change', () => { if (el.value?.trim()) { el.style.borderColor=''; el.style.boxShadow=''; } });
  });


  await verificarSesionExistente();
});