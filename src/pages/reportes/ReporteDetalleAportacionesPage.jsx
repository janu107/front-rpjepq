import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import ReportePDF from "./ReportePDF";

const money = (v) => `Q ${Number(v || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (v) => (v ? String(v).slice(0, 10) : "—");

const COLUMNS = [
  { key: "correlativo", label: "Correlativo", width: 80 },
  { key: "_nombre", label: "Nombre completo", width: 220, bold: true, render: (r) => `${r.nombre} ${r.apellido}` },
  { key: "dpi", label: "DPI", width: 120 },
  { key: "gerencia", label: "Gerencia", width: 150 },
  { key: "manejoDescripcion", label: "Manejo", width: 110 },
  { key: "estado", label: "Estado", width: 80 },
  { key: "fechaPago", label: "Fecha", width: 95, render: (r) => fmt(r.fechaPago) },
  { key: "valor", label: "Valor mensual Q", width: 120, render: (r) => money(r.valor) }
];

const FILTER_DEFS = [
  { key: "estado", label: "Estado", options: ["ACTIVO", "INACTIVO", "RETIRADO"] },
  { key: "gerencia", label: "Gerencia", dynamic: true },
  { key: "manejoDescripcion", label: "Manejo", dynamic: true }
];

const ReporteDetalleAportacionesPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get("/reportes/regimen/detalle-aportaciones")
      .then((res) => setRows(res.data.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ReportePDF
      titulo="Reporte de Detalle de Aportaciones"
      rows={rows}
      loading={loading}
      columns={COLUMNS}
      searchKeys={["nombre", "apellido", "dpi", "gerencia", "estado"]}
      filterDefs={FILTER_DEFS}
      getTotales={(f) => [
        { label: "Total registros", value: f.length },
        { label: "Total aportado", value: money(f.reduce((s, r) => s + Number(r.valor || 0), 0)), main: true }
      ]}
    />
  );
};

export default ReporteDetalleAportacionesPage;
