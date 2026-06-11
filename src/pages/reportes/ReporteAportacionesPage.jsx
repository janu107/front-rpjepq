import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import ReportePDF from "./ReportePDF";

const money = (v) => `Q ${Number(v || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (v) => (v ? String(v).slice(0, 10) : "—");
const sexoLabel = (v) => (v === "M" ? "Masculino" : v === "F" ? "Femenino" : v || "—");

const COLUMNS = [
  { key: "aportanteId", label: "ID", width: 55 },
  { key: "_nombre", label: "Nombre completo", width: 200, bold: true, render: (r) => `${r.nombre} ${r.apellido}` },
  { key: "sexo", label: "Sexo", width: 80, render: (r) => sexoLabel(r.sexo) },
  { key: "dpi", label: "DPI", width: 115 },
  { key: "gerencia", label: "Gerencia", width: 150 },
  { key: "estado", label: "Estado", width: 80 },
  { key: "tienePrestamo", label: "Préstamo", width: 75, render: (r) => (r.tienePrestamo ? "SI" : "NO") },
  { key: "fechaInicio", label: "F. Inicio", width: 90, render: (r) => fmt(r.fechaInicio) },
  { key: "fechaFin", label: "F. Fin", width: 90, render: (r) => fmt(r.fechaFin) },
  { key: "totalAportado", label: "Total Q", width: 110, render: (r) => money(r.totalAportado) },
  { key: "cantidadAportes", label: "# Aportes", width: 75 }
];

const FILTER_DEFS = [
  { key: "estado", label: "Estado", options: ["ACTIVO", "INACTIVO", "RETIRADO"] },
  { key: "gerencia", label: "Gerencia", dynamic: true }
];

const ReporteAportacionesPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get("/reportes/regimen/aportaciones")
      .then((res) => setRows(res.data.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ReportePDF
      titulo="Reporte de Aportaciones de Empleados"
      rows={rows}
      loading={loading}
      columns={COLUMNS}
      searchKeys={["nombre", "apellido", "dpi", "gerencia", "estado"]}
      filterDefs={FILTER_DEFS}
      getTotales={(f) => [
        { label: "Total empleados", value: f.length },
        { label: "Total aportes", value: f.reduce((s, r) => s + Number(r.cantidadAportes || 0), 0) },
        { label: "Total aportado", value: money(f.reduce((s, r) => s + Number(r.totalAportado || 0), 0)), main: true }
      ]}
    />
  );
};

export default ReporteAportacionesPage;
