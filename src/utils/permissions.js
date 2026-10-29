// Un usuario puede tener varios roles (user.roles). Los roles originales ADMIN y
// OPERADOR siguen funcionando; los nuevos (CATALOGOS, EPQ, REGIMEN, JUBILADOS,
// REPORTES, ADMINISTRACION, CONSULTA) tienen alcance por módulo. El backend es
// quien manda: esto sólo decide qué se muestra en el menú y qué botones aparecen.
export const rolesOf = (user) => {
  const lista = Array.isArray(user?.roles) && user.roles.length
    ? user.roles
    : [user?.rol || user?.role || user?.tipoRol || user?.rolNombre];
  return [...new Set(lista.map((r) => String(r || "").toUpperCase()).filter(Boolean))];
};

const ROLES_NUEVOS = ["CATALOGOS", "EPQ", "REGIMEN", "JUBILADOS", "REPORTES", "ADMINISTRACION", "CONSULTA"];
const MODULOS_NEGOCIO = ["EPQ", "REGIMEN", "JUBILADOS"];

// Módulo(s) de cada ruta de pantalla (equivale al mapa por URL del backend).
const MODULOS_PATH = [
  ["/catalogos", ["CATALOGOS"]],
  ["/aportaciones", ["EPQ"]],
  ["/aportaciones-dashboard", ["EPQ"]],
  ["/prestamos-regimen", ["REGIMEN"]],
  ["/prestamos", ["EPQ"]],
  ["/empleados", ["REGIMEN"]],
  ["/empleados-regimen", ["REGIMEN"]],
  ["/salarios", ["REGIMEN"]],
  ["/tiempo-extra", ["REGIMEN"]],
  ["/junta-directiva", ["REGIMEN"]],
  ["/dietas", ["REGIMEN"]],
  ["/descuentos-judiciales", ["REGIMEN"]],
  ["/otros-descuentos", ["REGIMEN"]],
  ["/generacion-planilla", ["REGIMEN"]],
  ["/planillas-trabajadores", ["REGIMEN"]],
  ["/nomina-tiempo-extra", ["REGIMEN"]],
  ["/prestaciones-jubilados", ["JUBILADOS"]],
  ["/prestaciones", ["REGIMEN"]],
  ["/nomina", ["REGIMEN", "JUBILADOS"]],
  ["/jubilados", ["JUBILADOS"]],
  ["/beneficiarios", ["JUBILADOS"]],
  ["/fallecimientos", ["JUBILADOS"]],
  ["/amparistas", ["JUBILADOS"]],
  ["/convenios", ["JUBILADOS"]],
  ["/suspensiones", ["JUBILADOS"]],
  ["/estado-cuenta", ["JUBILADOS"]],
  ["/reportes-jubilados", ["JUBILADOS", "REPORTES"]],
  ["/planillas-pensionados", ["JUBILADOS"]],
  ["/nominas-jubilados", ["JUBILADOS"]],
  ["/reportes", ["REPORTES"]],
  ["/impresiones", ["REPORTES"]],
  ["/impresiones-jubilacion", ["REPORTES"]]
];

const modulosDePath = (path) => {
  const limpio = String(path || "").split("?")[0];
  const hit = MODULOS_PATH.find(([prefijo]) => limpio === prefijo || limpio.startsWith(`${prefijo}/`));
  return hit ? hit[1] : [];
};

// ¿Puede entrar a esta pantalla? `rolesPermitidos` son los roles originales que ya
// declaraba la ruta/ítem de menú; si es sólo ["ADMIN"], es una pantalla de administración.
export const puedeEntrar = (user, path, rolesPermitidos = []) => {
  const roles = rolesOf(user);
  const permitidos = rolesPermitidos.map((r) => String(r).toUpperCase());

  if (!permitidos.length) return true;
  if (roles.includes("ADMIN")) return permitidos.includes("ADMIN");
  if (roles.includes("OPERADOR") && permitidos.includes("OPERADOR")) return true;
  if (permitidos.length === 1 && permitidos[0] === "ADMIN") return false;
  if (path === "/dashboard") return roles.some((r) => ROLES_NUEVOS.includes(r) || r === "OPERADOR");
  if (!path) return true;

  if (roles.includes("ADMINISTRACION")) return true;
  const modulos = modulosDePath(path);
  if (modulos.includes("CATALOGOS")) return roles.includes("CATALOGOS");
  if (roles.some((r) => MODULOS_NEGOCIO.includes(r) && modulos.includes(r))) return true;
  if (modulos.includes("REPORTES") && roles.some((r) => r === "REPORTES" || r === "CONSULTA" || MODULOS_NEGOCIO.includes(r))) return true;
  if (roles.includes("CONSULTA") && modulos.some((m) => MODULOS_NEGOCIO.includes(m))) return true;
  return false;
};

// Coincidencia simple por rol (sin módulo): se usa para ítems sin ruta propia.
export const hasRole = (user, rolesPermitidos = []) => {
  const permitidos = rolesPermitidos.map((role) => String(role).toUpperCase());
  return rolesOf(user).some((r) => permitidos.includes(r));
};
export const isAdmin = (user) => hasRole(user, ["ADMIN"]);
export const isOperator = (user) => hasRole(user, ["OPERADOR"]);

// Sólo lectura: tiene CONSULTA/REPORTES y ningún rol que permita escribir.
const ROLES_ESCRITURA = ["ADMIN", "OPERADOR", "ADMINISTRACION", "CATALOGOS", "EPQ", "REGIMEN", "JUBILADOS"];
export const isConsulta = (user) => {
  const roles = rolesOf(user);
  return roles.length > 0 && !roles.some((r) => ROLES_ESCRITURA.includes(r));
};

export const canCreate = (user) => hasRole(user, ROLES_ESCRITURA);
export const canEdit = (user) => hasRole(user, ROLES_ESCRITURA);
export const canDelete = (user) => isAdmin(user);
export const canViewAudit = (user) => isAdmin(user);
export const canGeneratePayroll = (user) => hasRole(user, ROLES_ESCRITURA);
export const canCleanPayroll = (user) => isAdmin(user);
export const canManageRoles = (user) => isAdmin(user);
