import { Chip } from "@mui/material";

const roleColor = {
  ADMIN: "primary",
  ADMINISTRACION: "primary",
  OPERADOR: "secondary",
  CATALOGOS: "secondary",
  EPQ: "secondary",
  REGIMEN: "secondary",
  JUBILADOS: "secondary",
  REPORTES: "info",
  CONSULTA: "default"
};

const RoleChip = ({ value }) => {
  const label = String(value || "SIN ROL").toUpperCase();
  // Permiso de módulo "JUBILADOS:OPERA" -> "JUBILADOS · OPERA".
  const [modulo, nivel] = label.split(":");
  if (nivel) return <Chip label={`${modulo.replace(/_/g, " ")} · ${nivel}`} color={nivel === "TOTAL" ? "success" : nivel === "OPERA" ? "secondary" : "default"} size="small" variant="outlined" />;
  return <Chip label={label} color={roleColor[label] || "default"} size="small" />;
};

export default RoleChip;
