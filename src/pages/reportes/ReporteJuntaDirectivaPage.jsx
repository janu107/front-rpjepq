import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import ReportePDF from "./ReportePDF";

const fmt = (v) => (v ? String(v).slice(0, 10) : "—");

const COLUMNS = [
  { key: "idJunta", label: "ID", width: 55 },
  { key: "nombre", label: "Nombre", width: 150, bold: true },
  { key: "apellidos", label: "Apellidos", width: 160, bold: true },
  { key: "tipoJunta", label: "Tipo junta", width: 130 },
  { key: "puesto", label: "Puesto", width: 150 },
  { key: "nit", label: "NIT", width: 100 },
  { key: "estado", label: "Estado", width: 80 },
  { key: "fechaInicio", label: "F. Inicio", width: 90, render: (r) => fmt(r.fechaInicio) },
  { key: "fechaFinal", label: "F. Final", width: 90, render: (r) => fmt(r.fechaFinal) },
  { key: "manejoDescripcion", label: "Manejo", width: 110 }
];

const FILTER_DEFS = [
  { key: "tipoJunta", label: "Tipo junta", dynamic: true },
  { key: "estado", label: "Estado", options: ["ACTIVO", "INACTIVO"] },
  { key: "puesto", label: "Puesto", dynamic: true }
];

const ReporteJuntaDirectivaPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get("/reportes/regimen/junta-directiva")
      .then((res) => setRows(res.data.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ReportePDF
      titulo="Reporte de Junta Directiva"
      rows={rows}
      loading={loading}
      columns={COLUMNS}
      searchKeys={["nombre", "apellidos", "puesto", "tipoJunta", "nit", "estado"]}
      filterDefs={FILTER_DEFS}
      getTotales={(f) => [
        { label: "Total miembros", value: f.length },
        {
          label: "Activos",
          value: f.filter((r) => r.estado === "ACTIVO").length
        }
      ]}
    />
  );
};

export default ReporteJuntaDirectivaPage;
