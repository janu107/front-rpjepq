import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import ReportePDF from "./ReportePDF";

const money = (v) => `Q ${Number(v || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (v) => (v ? String(v).slice(0, 10) : "—");

const COLUMNS = [
  { key: "miembroNombre", label: "Miembro", width: 190, bold: true },
  { key: "puesto", label: "Puesto", width: 140 },
  { key: "tipoJunta", label: "Tipo junta", width: 100 },
  { key: "periodo", label: "Periodo", width: 80 },
  { key: "sesionesMes", label: "Sesiones", width: 70 },
  { key: "valor", label: "Valor Q", width: 90, render: (r) => money(r.valor) },
  { key: "retencionIsr", label: "Ret. ISR", width: 90, render: (r) => money(r.retencionIsr) },
  { key: "liquido", label: "Liquido Q", width: 90, render: (r) => money(r.liquido) },
  { key: "estado", label: "Estado", width: 90 },
  { key: "fechaPago", label: "F. Pago", width: 90, render: (r) => fmt(r.fechaPago) }
];

const FILTER_DEFS = [
  { key: "tipoJunta", label: "Tipo junta", dynamic: true },
  { key: "puesto", label: "Puesto", dynamic: true },
  { key: "estado", label: "Estado", dynamic: true }
];

const ReporteDietasPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get("/reportes/regimen/dietas")
      .then((res) => setRows(res.data.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ReportePDF
      titulo="Reporte de Pago de Dietas"
      rows={rows}
      loading={loading}
      columns={COLUMNS}
      searchKeys={["miembroNombre", "puesto", "tipoJunta", "estado", "periodo"]}
      filterDefs={FILTER_DEFS}
      getTotales={(f) => [
        { label: "Total registros", value: f.length },
        { label: "Total bruto", value: money(f.reduce((s, r) => s + Number(r.valor || 0), 0)) },
        { label: "Total ISR", value: money(f.reduce((s, r) => s + Number(r.retencionIsr || 0), 0)) },
        { label: "Total liquido", value: money(f.reduce((s, r) => s + Number(r.liquido || 0), 0)), main: true }
      ]}
    />
  );
};

export default ReporteDietasPage;
