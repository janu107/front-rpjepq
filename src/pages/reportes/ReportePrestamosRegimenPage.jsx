import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import ReportePDF from "./ReportePDF";

const money = (v) => `Q ${Number(v || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (v) => (v ? String(v).slice(0, 10) : "—");

const COLUMNS = [
  { key: "noReferencia", label: "No. Referencia", width: 100 },
  { key: "personaNombre", label: "Persona", width: 200, bold: true },
  { key: "bancoNombre", label: "Banco", width: 120 },
  { key: "monto", label: "Monto", width: 95, render: (r) => money(r.monto) },
  { key: "valorMes", label: "Valor mes", width: 95, render: (r) => money(r.valorMes) },
  { key: "saldo", label: "Saldo", width: 95, render: (r) => money(r.saldo) },
  { key: "noCuotas", label: "Cuotas", width: 60 },
  { key: "fechaInicio", label: "F. Inicio", width: 90, render: (r) => fmt(r.fechaInicio) },
  { key: "fechaFin", label: "F. Fin", width: 90, render: (r) => fmt(r.fechaFin) },
  { key: "uso", label: "Uso", width: 130 },
  { key: "estado", label: "Estado", width: 85 }
];

const FILTER_DEFS = [
  { key: "estado", label: "Estado", options: ["ACTIVO", "CANCELADO", "MORA", "ANULADO"] },
  { key: "bancoNombre", label: "Banco", dynamic: true }
];

const ReportePrestamosRegimenPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get("/reportes/regimen/prestamos-regimen")
      .then((res) => setRows(res.data.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ReportePDF
      titulo="Reporte de Préstamos Régimen"
      rows={rows}
      loading={loading}
      columns={COLUMNS}
      searchKeys={["noReferencia", "personaNombre", "bancoNombre", "uso", "estado"]}
      filterDefs={FILTER_DEFS}
      getTotales={(f) => [
        { label: "Total registros", value: f.length },
        { label: "Total monto", value: money(f.reduce((s, r) => s + Number(r.monto || 0), 0)) },
        { label: "Saldo total", value: money(f.reduce((s, r) => s + Number(r.saldo || 0), 0)), main: true }
      ]}
    />
  );
};

export default ReportePrestamosRegimenPage;
