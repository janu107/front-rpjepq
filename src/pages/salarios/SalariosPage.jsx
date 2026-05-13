import MantenimientoPage from "../mantenimientos/MantenimientoPage";

const SalariosPage = () => (
  <MantenimientoPage
    title="Salarios"
    subtitle="Base salarial para procesos de nomina"
    endpoint="/salarios"
    dependencies={[
      { key: "manejos", endpoint: "/catalogos/manejo-administracion" },
      { key: "tiposIngreso", endpoint: "/catalogos/tipo-ingreso" }
    ]}
    searchFields={["manejoDescripcion", "tipoIngresoNombre", "tipoIngresoDescripcion"]}
    columns={[
      { key: "manejoDescripcion", label: "Manejo" },
      { key: "tipoIngresoNombre", label: "Tipo ingreso" },
      { key: "salario", label: "Salario" }
    ]}
    fields={[
      { key: "tipoManejo", label: "Manejo administracion", required: true, type: "select", source: "manejos", getValue: (item) => item.id, getLabel: (item) => item.descripcion },
      { key: "tipoIngreso", label: "Tipo ingreso", required: true, type: "select", source: "tiposIngreso", getValue: (item) => item.id, getLabel: (item) => `${item.tipoIngreso} - ${item.descripcion}` },
      { key: "salario", label: "Salario", required: true, type: "number" }
    ]}
  />
);

export default SalariosPage;
