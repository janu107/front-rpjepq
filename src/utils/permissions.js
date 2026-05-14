const roleOf = (user) => String(user?.rol || user?.role || user?.tipoRol || user?.rolNombre || "").toUpperCase();

export const hasRole = (user, rolesPermitidos = []) => rolesPermitidos.map((role) => String(role).toUpperCase()).includes(roleOf(user));
export const isAdmin = (user) => hasRole(user, ["ADMIN"]);
export const isOperator = (user) => hasRole(user, ["OPERADOR"]);
export const isConsulta = (user) => hasRole(user, ["CONSULTA"]);

export const canCreate = (user) => hasRole(user, ["ADMIN", "OPERADOR"]);
export const canEdit = (user) => hasRole(user, ["ADMIN", "OPERADOR"]);
export const canDelete = (user) => isAdmin(user);
export const canViewAudit = (user) => isAdmin(user);
export const canGeneratePayroll = (user) => hasRole(user, ["ADMIN", "OPERADOR"]);
export const canCleanPayroll = (user) => isAdmin(user);
export const canManageRoles = (user) => isAdmin(user);
