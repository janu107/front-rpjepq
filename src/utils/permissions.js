// Permisos del usuario. El backend es quien manda (middlewares/role.middleware.js y
// utils/permisosModulo.js); aquí solo se decide qué se muestra en el menú y qué
// botones aparecen.
//
// Cada usuario tiene, por VENTANA del menú, un nivel: Consulta (1), Opera (2) o
// Total (3). Se guarda como "VENTANA:NIVEL" (ej. "REG_DIETAS:OPERA"). Los permisos de
// módulo completo ("REGIMEN:OPERA") y los roles anteriores (OPERADOR, EPQ, CONSULTA…)
// valen para todas las ventanas de su módulo. ADMIN es el superusuario.
export const rolesOf = (user) => {
  const lista = Array.isArray(user?.roles) && user.roles.length
    ? user.roles
    : [user?.rol || user?.role || user?.tipoRol || user?.rolNombre];
  return [...new Set(lista.map((r) => String(r || "").toUpperCase()).filter(Boolean))];
};

const MODULOS = ["CATALOGOS", "EPQ", "REGIMEN", "JUBILADOS", "REPORTES"];
const NEGOCIO = ["EPQ", "REGIMEN", "JUBILADOS"];
const NIVELES = { CONSULTA: 1, OPERA: 2, TOTAL: 3 };

// Ventanas: clave, módulo(s) y rutas de pantalla (igual que el backend).
const PANTALLAS = [
  ["CATALOGOS", ["CATALOGOS"], ["/catalogos"]],
  ["EPQ_EMPLEADOS", ["EPQ"], ["/aportaciones", "/aportaciones-dashboard"]],
  ["EPQ_APORTACIONES", ["EPQ"], ["/aportaciones/detalle"]],
  ["EPQ_PRESTAMOS", ["EPQ"], ["/prestamos"]],
  ["REG_EMPLEADOS", ["REGIMEN"], ["/empleados-regimen", "/empleados", "/salarios"]],
  ["REG_TIEMPO_EXTRA", ["REGIMEN"], ["/tiempo-extra"]],
  ["REG_JUNTA", ["REGIMEN"], ["/junta-directiva"]],
  ["REG_DIETAS", ["REGIMEN"], ["/dietas"]],
  ["REG_DESC_JUDICIALES", ["REGIMEN"], ["/descuentos-judiciales"]],
  ["REG_PRESTAMOS", ["REGIMEN"], ["/prestamos-regimen"]],
  ["JUB_CONTROL", ["JUBILADOS"], ["/jubilados"]],
  ["JUB_BENEFICIARIOS", ["JUBILADOS"], ["/beneficiarios"]],
  ["JUB_FALLECIMIENTOS", ["JUBILADOS"], ["/fallecimientos"]],
  ["JUB_AMPARISTAS", ["JUBILADOS"], ["/amparistas"]],
  ["JUB_CONVENIOS", ["JUBILADOS"], ["/convenios"]],
  ["JUB_SUSPENSIONES", ["JUBILADOS"], ["/suspensiones"]],
  ["JUB_ESTADO_CUENTA", ["JUBILADOS"], ["/estado-cuenta"]],
  ["JUB_REPORTES", ["JUBILADOS"], ["/reportes-jubilados"]],
  ["JUB_PRESTACIONES", ["JUBILADOS"], ["/prestaciones-jubilados"]],
  ["JUB_PRESTAMOS", ["JUBILADOS"], ["/prestamos-jubilados"]],
  ["NOM_EMPLEADOS", ["REGIMEN"], ["/planillas-trabajadores", "/generacion-planilla"]],
  ["NOM_JUBILADOS", ["JUBILADOS"], ["/planillas-pensionados", "/nominas-jubilados"]],
  ["NOM_TIEMPO_EXTRA", ["REGIMEN"], ["/nomina-tiempo-extra"]],
  ["NOM_PRESTACIONES", ["REGIMEN"], ["/prestaciones"]],
  ["NOM_OTROS_DESC", ["REGIMEN"], ["/otros-descuentos"]],
  ["NOM_CONSULTA", ["REGIMEN", "JUBILADOS"], ["/nomina"]],
  ["REP_IMPRESIONES", ["REPORTES"], ["/impresiones", "/impresiones-jubilacion"]],
  ["REP_REPORTES", ["REPORTES"], ["/reportes"]]
].map(([clave, familias, paths]) => ({ clave, familias, paths }));
const CLAVES = PANTALLAS.map((p) => p.clave);

const EQUIVALENCIAS = {
  OPERADOR: { CATALOGOS: 2, EPQ: 2, REGIMEN: 2, JUBILADOS: 2, REPORTES: 1 },
  ADMINISTRACION: { CATALOGOS: 2, EPQ: 2, REGIMEN: 2, JUBILADOS: 2, REPORTES: 1 },
  CATALOGOS: { CATALOGOS: 2 }, EPQ: { EPQ: 2 }, REGIMEN: { REGIMEN: 2 }, JUBILADOS: { JUBILADOS: 2 },
  REPORTES: { REPORTES: 1 }, CONSULTA: { EPQ: 1, REGIMEN: 1, JUBILADOS: 1, REPORTES: 1 }
};

// { CLAVE_VENTANA: 0..3 }
export const nivelesPorPantalla = (rolesLista = []) => {
  const out = Object.fromEntries(CLAVES.map((c) => [c, 0]));
  const porModulo = (m, n) => PANTALLAS.forEach((p) => { if (p.familias.includes(m)) out[p.clave] = Math.max(out[p.clave], n); });
  rolesLista.map((r) => String(r || "").toUpperCase()).forEach((rol) => {
    const [a, b] = rol.split(":");
    if (NIVELES[b] && CLAVES.includes(a)) out[a] = Math.max(out[a], NIVELES[b]);
    else if (NIVELES[b] && MODULOS.includes(a)) porModulo(a, NIVELES[b]);
    else if (EQUIVALENCIAS[a]) Object.entries(EQUIVALENCIAS[a]).forEach(([m, n]) => porModulo(m, n));
  });
  return out;
};

// Ventana de una ruta (la de prefijo más largo: /aportaciones/detalle antes que /aportaciones).
const pantallaDePath = (path) => {
  const limpio = String(path || "").split("?")[0].replace(/^\/rpj_administrativo/, "") || "/";
  let mejor = null; let largo = -1;
  PANTALLAS.forEach((p) => p.paths.forEach((pre) => {
    if ((limpio === pre || limpio.startsWith(`${pre}/`)) && pre.length > largo) { mejor = p; largo = pre.length; }
  }));
  return mejor;
};

const nivelMax = (user) => Math.max(0, ...Object.values(nivelesPorPantalla(rolesOf(user))));
// Nivel en la ventana abierta (por la URL); si no es una ventana conocida, el mayor que tenga.
const nivelActual = (user) => {
  const p = typeof window !== "undefined" ? pantallaDePath(window.location.pathname) : null;
  return p ? nivelesPorPantalla(rolesOf(user))[p.clave] : nivelMax(user);
};

// ¿Puede entrar a esta pantalla? `rolesPermitidos` son los roles que ya declaraba la
// ruta/ítem de menú; si es solo ["ADMIN"], es una pantalla de administración.
export const puedeEntrar = (user, path, rolesPermitidos = []) => {
  const roles = rolesOf(user);
  const permitidos = rolesPermitidos.map((r) => String(r).toUpperCase());

  if (!permitidos.length) return true;
  if (roles.includes("ADMIN")) return permitidos.includes("ADMIN");
  if (permitidos.length === 1 && permitidos[0] === "ADMIN") return false;

  const nv = nivelesPorPantalla(roles);
  if (path === "/dashboard") return Object.values(nv).some((n) => n > 0);
  if (!path) return true;

  const p = pantallaDePath(path);
  if (p) return nv[p.clave] > 0;
  // Grupos del menú (/catalogos, etc.): si tiene alguna ventana dentro.
  return PANTALLAS.some((x) => nv[x.clave] > 0 && x.paths.some((pre) => pre.startsWith(`${path}/`) || pre === path));
};

// Coincidencia simple por rol (sin ventana): se usa para ítems sin ruta propia.
export const hasRole = (user, rolesPermitidos = []) => {
  const permitidos = rolesPermitidos.map((role) => String(role).toUpperCase());
  return rolesOf(user).some((r) => permitidos.includes(r));
};
export const isAdmin = (user) => hasRole(user, ["ADMIN"]);
export const isOperator = (user) => hasRole(user, ["OPERADOR"]);

// Escribir en la ventana abierta: ADMIN, OPERADOR o nivel Opera/Total en esa ventana.
const puedeEscribir = (user) => isAdmin(user) || isOperator(user) || nivelActual(user) >= 2;
export const isConsulta = (user) => rolesOf(user).length > 0 && !puedeEscribir(user);

export const canCreate = (user) => puedeEscribir(user);
export const canEdit = (user) => puedeEscribir(user);
// Eliminar / revertir: ADMIN o nivel Total en la ventana abierta.
export const canDelete = (user) => isAdmin(user) || nivelActual(user) >= 3;
export const canViewAudit = (user) => isAdmin(user);
export const canGeneratePayroll = (user) => puedeEscribir(user);
export const canCleanPayroll = (user) => isAdmin(user);
export const canManageRoles = (user) => isAdmin(user);
export { NEGOCIO };
