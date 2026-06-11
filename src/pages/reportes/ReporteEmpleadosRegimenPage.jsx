import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import ReportePDF from "./ReportePDF";

const fmt = (v) => (v ? String(v).slice(0, 10) : "—");
const sexoLabel = (v) => (v === "M" ? "Masculino" : v === "F" ? "Femenino" : v || "—");

const COLUMNS = [
  { key: "idEmpleado", label: "ID Emp.", width: 65 },
  { key: "nombres", label: "Nombres", width: 160, bold: true },
  { key: "apellidos", label: "Apellidos", width: 160, bold: true },
  { key: "sexo", label: "Sexo", width: 80, render: (r) => sexoLabel(r.sexo) },
  { key: "dpi", label: "DPI", width: 115 },
  { key: "estadoCivil", label: "Est. civil", width: 90 },
  { key: "tipoPuesto", label: "Tipo puesto", width: 90 },
  { key: "puestoNombre", label: "Puesto", width: 160 },
  { key: "areaDescripcion", label: "Area", width: 120 },
  { key: "manejoDescripcion", label: "Manejo", width: 110 }
];

const FILTER_DEFS = [
  { key: "tipoPuesto", label: "Tipo puesto", options: ["FIJO", "CONTRATO", "TEMPORAL"] },
  { key: "sexo", label: "Sexo", options: ["M", "F"] },
  { key: "areaDescripcion", label: "Area", dynamic: true },
  { key: "manejoDescripcion", label: "Manejo", dynamic: true }
];

const ReporteEmpleadosRegimenPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get("/reportes/regimen/empleados-regimen")
      .then((res) => setRows(res.data.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ReportePDF
      titulo="Reporte de Empleados Régimen"
      rows={rows}
      loading={loading}
      columns={COLUMNS}
      searchKeys={["nombres", "apellidos", "dpi", "puestoNombre", "areaDescripcion"]}
      filterDefs={FILTER_DEFS}
      getTotales={(f) => [
        { label: "Total empleados", value: f.length, main: true },
        { label: "Fijo", value: f.filter((r) => r.tipoPuesto === "FIJO").length },
        { label: "Contrato", value: f.filter((r) => r.tipoPuesto === "CONTRATO").length },
        { label: "Temporal", value: f.filter((r) => r.tipoPuesto === "TEMPORAL").length }
      ]}
    />
  );
};

export default ReporteEmpleadosRegimenPage;
