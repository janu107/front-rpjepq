import MantenimientoPage from "../mantenimientos/MantenimientoPage";

const OtrosDescuentosPage = () => (
  <MantenimientoPage
    title="Otros descuentos"
    subtitle="Descuentos administrativos para nomina"
    endpoint="/otros-descuentos"
    dependencies={[
      { key: "manejos", endpoint: "/catalogos/manejo-administracion" },
      { key: "tiposDescuento", endpoint: "/catalogos/tipo-descuento" }
    ]}
    searchFields={["manejoDescripcion", "tipoDescuentoNombre", "tipoDescuentoDescripcion", "motivo"]}
    columns={[
      { key: "manejoDescripcion", label: "Manejo" },
      { key: "tipoDescuentoNombre", label: "Tipo descuento" },
      { key: "valor", label: "Valor" },
      { key: "motivo", label: "Motivo" },
      { key: "fecha", label: "Fecha" }
    ]}
    fields={[
      { key: "tipoManejo", label: "Manejo administracion", required: true, type: "select", source: "manejos", getValue: (item) => item.id, getLabel: (item) => item.descripcion },
      { key: "tipoDescuento", label: "Tipo descuento", required: true, type: "select", source: "tiposDescuento", getValue: (item) => item.id, getLabel: (item) => `${item.tipoDescuento} - ${item.descripcion}` },
      { key: "valor", label: "Valor", required: true, type: "number" },
      { key: "motivo", label: "Motivo", required: true },
      { key: "fecha", label: "Fecha", required: true, type: "date" }
    ]}
  />
);

export default OtrosDescuentosPage;
