import MantenimientoPage from "../mantenimientos/MantenimientoPage";

const TiempoExtraPage = () => (
  <MantenimientoPage
    addMode
    title="Tiempo extraordinario"
    subtitle="Registro de horas extra de empleados"
    endpoint="/tiempo-extra"
    dependencies={[{ key: "empleados", endpoint: "/empleados" }]}
    searchFields={["empleadoNombre", "empleadoDpi", "empleadoCodigo", "motivo"]}
    columns={[
      { key: "empleadoCodigo", label: "Codigo" },
      { key: "empleadoNombre", label: "Empleado" },
      { key: "fecha", label: "Fecha" },
      { key: "cantidadHoras", label: "Horas al mes" },
      { key: "motivo", label: "Motivo" }
    ]}
    fields={[
      { key: "idEmpleado", label: "Empleado", required: true, type: "select", source: "empleados", getValue: (item) => item.id, getLabel: (item) => `${item.idEmpleado} - ${item.nombres} ${item.apellidos}` },
      { key: "fecha", label: "Fecha", required: true, type: "date" },
      { key: "cantidadHoras", label: "Cantidad horas al mes", required: true, type: "number" },
      { key: "motivo", label: "Motivo", required: true }
    ]}
  />
);

export default TiempoExtraPage;
