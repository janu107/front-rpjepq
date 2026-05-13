import MantenimientoPage from "../mantenimientos/MantenimientoPage";

const tipoHoraOptions = ["DIURNA", "NOCTURNA", "MIXTA", "FERIADO"].map((value) => ({ value, label: value }));

const TiempoExtraPage = () => (
  <MantenimientoPage
    title="Tiempo extraordinario"
    subtitle="Registro de horas extra de empleados"
    endpoint="/tiempo-extra"
    dependencies={[{ key: "empleados", endpoint: "/empleados" }]}
    searchFields={["empleadoNombre", "empleadoDpi", "motivo", "tipoHora"]}
    columns={[
      { key: "empleadoNombre", label: "Empleado" },
      { key: "tipoHora", label: "Tipo hora" },
      { key: "cantidadHoras", label: "Horas" },
      { key: "motivo", label: "Motivo" }
    ]}
    fields={[
      { key: "idEmpleado", label: "Empleado", required: true, type: "select", source: "empleados", getValue: (item) => item.id, getLabel: (item) => `${item.nombres} ${item.apellidos} - ${item.dpi}` },
      { key: "fechaHoraInicio", label: "Fecha/hora inicio", required: true, type: "datetime-local" },
      { key: "fechaHoraFinal", label: "Fecha/hora final", required: true, type: "datetime-local" },
      { key: "cantidadHoras", label: "Cantidad horas", type: "number" },
      { key: "motivo", label: "Motivo", required: true },
      { key: "tipoHora", label: "Tipo hora", required: true, type: "select", options: tipoHoraOptions }
    ]}
  />
);

export default TiempoExtraPage;
