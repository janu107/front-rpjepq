import { Chip } from "@mui/material";

const statusColor = {
  ACTIVO: "success",
  INACTIVO: "default",
  RETIRADO: "warning",
  CANCELADO: "error",
  MORA: "warning",
  ANULADO: "error"
};

const StatusChip = ({ value }) => {
  const label = String(value || "N/A").toUpperCase();
  return <Chip label={label} color={statusColor[label] || "default"} size="small" variant={label === "INACTIVO" ? "outlined" : "filled"} />;
};

export default StatusChip;
