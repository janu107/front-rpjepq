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
  return <Chip label={label} color={roleColor[label] || "default"} size="small" />;
};

export default RoleChip;
