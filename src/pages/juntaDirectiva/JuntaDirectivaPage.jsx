import MantenimientoPage from "../mantenimientos/MantenimientoPage";

const estadoOptions = ["ACTIVO", "INACTIVO"].map((value) => ({ value, label: value }));
const tipoJuntaOptions = ["JUNTA ADMINISTRADORA", "JUNTA VIGILANCIA"].map((value) => ({ value, label: value }));

const JuntaDirectivaPage = () => (
  <MantenimientoPage
    title="Junta Directiva"
    subtitle="Mantenimiento de miembros de junta directiva"
    endpoint="/junta-directiva"
    fixedManejoId={3}
    dependencies={[
      { key: "manejos", endpoint: "/catalogos/manejo-administracion" },
      { key: "puestos", endpoint: "/catalogos/puestos" }
    ]}
    searchFields={["nombre", "apellidos", "nit", "puesto", "estado", "manejoDescripcion"]}
    columns={[
      { key: "idJunta", label: "ID" },
      { key: "nombre", label: "Nombre" },
      { key: "apellidos", label: "Apellidos" },
      { key: "tipoJunta", label: "Tipo junta" },
      { key: "puesto", label: "Puesto" },
      { key: "estado", label: "Estado", chip: true },
      { key: "manejoDescripcion", label: "Manejo" }
    ]}
    fields={[
      { key: "tipoManejo", label: "Manejo administracion", required: true, type: "select", source: "manejos", getValue: (item) => item.id, getLabel: (item) => item.descripcion, disabled: true },
      { key: "idJunta", label: "ID junta", required: true, type: "number" },
      { key: "nombre", label: "Nombre", required: true },
      { key: "apellidos", label: "Apellidos", required: true },
      { key: "tipoJunta", label: "Tipo junta", required: true, type: "select", options: tipoJuntaOptions },
      { key: "nit", label: "NIT", required: true },
      { key: "puesto", label: "Puesto", required: true, type: "select", source: "puestos", getValue: (item) => item.nombre, getLabel: (item) => item.nombre, filterByFixedManejo: true },
      { key: "estado", label: "Estado", required: true, type: "select", options: estadoOptions, defaultValue: "ACTIVO" },
      { key: "fechaInicio", label: "Fecha inicio", required: true, type: "date" },
      { key: "fechaFinal", label: "Fecha final", required: true, type: "date" }
    ]}
  />
);

export default JuntaDirectivaPage;
