import { Chip } from "@mui/material";

const roleColor = {
  ADMIN: "primary",
  OPERADOR: "secondary",
  CONSULTA: "default"
};

const RoleChip = ({ value }) => {
  const label = String(value || "SIN ROL").toUpperCase();
  return <Chip label={label} color={roleColor[label] || "default"} size="small" />;
};

export default RoleChip;
