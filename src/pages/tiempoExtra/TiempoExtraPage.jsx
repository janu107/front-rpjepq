import MantenimientoPage from "../mantenimientos/MantenimientoPage";

// Tiempo extraordinario:
//   FECHA PAGO determina el periodo. El backend deriva inicio/fin del mes
//   (primer y último día) y los persiste en tex_fecha_hora_inicio/final.
//   tex_tipo_hora: 1=NORMAL, 2=DOBLE.
const tipoHoraOptions = [
  { value: 1, label: "NORMAL" },
  { value: 2, label: "DOBLE" }
];

const lastDayOfMonth = (year, month) => {
  const dias = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dias[month - 1];
};
// Muestra una fecha "YYYY-MM-DD" como "DD/MM/YYYY".
const ddmmyyyy = (v) => {
  if (!v) return "";
  const [y, m, d] = String(v).slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : String(v);
};
// El pago es quincenal y el período trabajado es el MES ANTERIOR completo:
// pago 15/10/2026 -> del 01/09/2026 al 30/09/2026 (igual que lo guarda el servidor).
const mesAnterior = (fechaPago) => {
  if (!fechaPago) return null;
  let [y, m] = String(fechaPago).slice(0, 7).split("-").map(Number);
  m -= 1;
  if (m === 0) { m = 12; y -= 1; }
  return { y, m };
};
const primerDia = (form) => {
  const p = mesAnterior(form.fechaPago);
  return p ? `01/${String(p.m).padStart(2, "0")}/${p.y}` : "";
};
const ultimoDia = (form) => {
  const p = mesAnterior(form.fechaPago);
  return p ? `${String(lastDayOfMonth(p.y, p.m)).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}` : "";
};

const TiempoExtraPage = () => (
  <MantenimientoPage
    addMode
    title="Tiempo extraordinario"
    subtitle="Registro de horas extra de empleados"
    endpoint="/tiempo-extra"
    dependencies={[{ key: "empleados", endpoint: "/empleados" }]}
    searchFields={["empleadoNombre", "empleadoDpi", "empleadoCodigo", "motivo", "tipoHoraNombre"]}
    columns={[
      { key: "empleadoCodigo", label: "Codigo" },
      { key: "empleadoNombre", label: "Empleado" },
      { key: "fechaPago", label: "Fecha pago", render: (row) => ddmmyyyy(row.fechaPago) },
      { key: "fechaInicio", label: "Período trabajado", render: (row) => (row.fechaInicio ? `${ddmmyyyy(row.fechaInicio)} al ${ddmmyyyy(row.fechaFinal)}` : "") },
      { key: "tipoHoraNombre", label: "Tipo hora" },
      { key: "cantidadHoras", label: "Horas al mes" },
      { key: "motivo", label: "Motivo" }
    ]}
    fields={[
      { key: "idEmpleado", label: "Empleado", required: true, type: "autocomplete", source: "empleados", placeholder: "Escriba el código o el nombre", getValue: (item) => item.id, getCode: (item) => item.idEmpleado, getLabel: (item) => `${item.idEmpleado} - ${item.nombres} ${item.apellidos}` },
      { key: "fechaPago", label: "Fecha pago", required: true, type: "date" },
      { key: "tipoHora", label: "Tipo hora", required: true, type: "select", options: tipoHoraOptions },
      { key: "cantidadHoras", label: "Cantidad horas al mes", required: true, type: "number" },
      // Calculados de solo lectura (el backend persiste estos valores).
      { key: "inicioAuto", label: "Período trabajado: inicio (mes anterior)", compute: (form) => primerDia(form) },
      { key: "finAuto", label: "Período trabajado: fin (mes anterior)", compute: (form) => ultimoDia(form) },
      { key: "motivo", label: "Motivo", fullWidth: true }
    ]}
    formSections={[
      { title: "Datos del registro", fields: ["idEmpleado", "fechaPago", "tipoHora", "cantidadHoras", "inicioAuto", "finAuto"] },
      { title: "Detalle", fields: ["motivo"] }
    ]}
  />
);

export default TiempoExtraPage;
