import MantenimientoPage from "../mantenimientos/MantenimientoPage";

const tipoHoraOptions = ["DIURNA", "NOCTURNA", "MIXTA", "FERIADO"].map((value) => ({ value, label: value }));

// Diferencia en horas entre inicio y final. La columna es INT, por lo que se redondea
// hacia arriba cualquier fraccion (mismo criterio que el backend).
const computeHoras = (inicio, final) => {
  if (!inicio || !final) return "";
  const diffMs = new Date(final) - new Date(inicio);
  if (!(diffMs > 0)) return "";
  return String(Math.ceil(diffMs / 3600000));
};

const validateRango = (form) => {
  if (form.fechaHoraInicio && form.fechaHoraFinal && new Date(form.fechaHoraFinal) <= new Date(form.fechaHoraInicio)) {
    return "La fecha/hora final debe ser mayor que la fecha/hora inicio.";
  }
  return null;
};

const TiempoExtraPage = () => (
  <MantenimientoPage
    addMode
    title="Tiempo extraordinario"
    subtitle="Registro de horas extra de empleados"
    endpoint="/tiempo-extra"
    dependencies={[{ key: "empleados", endpoint: "/empleados" }]}
    searchFields={["empleadoNombre", "empleadoDpi", "empleadoCodigo", "motivo", "tipoHora"]}
    customValidate={validateRango}
    columns={[
      { key: "empleadoCodigo", label: "Codigo" },
      { key: "empleadoNombre", label: "Empleado" },
      { key: "tipoHora", label: "Tipo hora" },
      { key: "cantidadHoras", label: "Horas" },
      { key: "motivo", label: "Motivo" }
    ]}
    fields={[
      { key: "idEmpleado", label: "Empleado", required: true, type: "select", source: "empleados", getValue: (item) => item.id, getLabel: (item) => `${item.idEmpleado} - ${item.nombres} ${item.apellidos}` },
      { key: "fechaHoraInicio", label: "Fecha/hora inicio", required: true, type: "datetime-local" },
      { key: "fechaHoraFinal", label: "Fecha/hora final", required: true, type: "datetime-local" },
      // Calculado automaticamente a partir de inicio/final (solo lectura).
      { key: "cantidadHoras", label: "Cantidad horas", compute: (form) => computeHoras(form.fechaHoraInicio, form.fechaHoraFinal) },
      { key: "motivo", label: "Motivo", required: true },
      { key: "tipoHora", label: "Tipo hora", required: true, type: "select", options: tipoHoraOptions }
    ]}
  />
);

export default TiempoExtraPage;
