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
const primerDia = (form) => {
  const f = form.fechaPago;
  if (!f) return "";
  return `${String(f).slice(0, 7)}-01`;
};
const ultimoDia = (form) => {
  const f = form.fechaPago;
  if (!f) return "";
  const [y, m] = String(f).slice(0, 7).split("-").map(Number);
  return `${String(f).slice(0, 7)}-${String(lastDayOfMonth(y, m)).padStart(2, "0")}`;
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
      { key: "fechaPago", label: "Fecha pago" },
      { key: "tipoHoraNombre", label: "Tipo hora" },
      { key: "cantidadHoras", label: "Horas al mes" },
      { key: "motivo", label: "Motivo" }
    ]}
    fields={[
      { key: "idEmpleado", label: "Empleado", required: true, type: "select", source: "empleados", getValue: (item) => item.id, getLabel: (item) => `${item.idEmpleado} - ${item.nombres} ${item.apellidos}` },
      { key: "fechaPago", label: "Fecha pago", required: true, type: "date" },
      { key: "tipoHora", label: "Tipo hora", required: true, type: "select", options: tipoHoraOptions },
      { key: "cantidadHoras", label: "Cantidad horas al mes", required: true, type: "number" },
      // Calculados de solo lectura (el backend persiste estos valores).
      { key: "inicioAuto", label: "Inicio (auto)", compute: (form) => primerDia(form) },
      { key: "finAuto", label: "Fin (auto)", compute: (form) => ultimoDia(form) },
      { key: "motivo", label: "Motivo", fullWidth: true }
    ]}
    formSections={[
      { title: "Datos del registro", fields: ["idEmpleado", "fechaPago", "tipoHora", "cantidadHoras", "inicioAuto", "finAuto"] },
      { title: "Detalle", fields: ["motivo"] }
    ]}
  />
);

export default TiempoExtraPage;
