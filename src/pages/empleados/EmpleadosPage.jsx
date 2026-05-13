import MantenimientoPage from "../mantenimientos/MantenimientoPage";

const estadoCivilOptions = ["SOLTERO", "CASADO", "UNIDO", "DIVORCIADO", "VIUDO"].map((value) => ({ value, label: value }));
const tipoPuestoOptions = ["ADMINISTRATIVO", "OPERATIVO", "TECNICO", "OTRO"].map((value) => ({ value, label: value }));

const EmpleadosPage = () => (
  <MantenimientoPage
    title="Empleados"
    subtitle="Mantenimiento de empleados"
    endpoint="/empleados"
    dependencies={[
      { key: "manejos", endpoint: "/catalogos/manejo-administracion" },
      { key: "puestos", endpoint: "/catalogos/puestos" }
    ]}
    searchFields={["nombres", "apellidos", "dpi", "puestoNombre", "manejoDescripcion"]}
    columns={[
      { key: "idEmpleado", label: "ID" },
      { key: "nombres", label: "Nombres" },
      { key: "apellidos", label: "Apellidos" },
      { key: "dpi", label: "DPI" },
      { key: "tipoPuesto", label: "Tipo puesto" },
      { key: "puestoNombre", label: "Puesto" },
      { key: "manejoDescripcion", label: "Manejo" }
    ]}
    fields={[
      { key: "tipoManejo", label: "Manejo administracion", required: true, type: "select", source: "manejos", getValue: (item) => item.id, getLabel: (item) => item.descripcion },
      { key: "idEmpleado", label: "ID empleado", required: true, type: "number" },
      { key: "nombres", label: "Nombres", required: true },
      { key: "apellidos", label: "Apellidos", required: true },
      { key: "direccion", label: "Direccion", required: true },
      { key: "nit", label: "NIT" },
      { key: "dpi", label: "DPI", required: true },
      { key: "estadoCivil", label: "Estado civil", required: true, type: "select", options: estadoCivilOptions },
      { key: "profesionOficio", label: "Profesion u oficio" },
      { key: "fechaNacimiento", label: "Fecha nacimiento", required: true, type: "date" },
      { key: "tipoPuesto", label: "Tipo puesto", required: true, type: "select", options: tipoPuestoOptions },
      { key: "idPuesto", label: "Puesto", required: true, type: "select", source: "puestos", getValue: (item) => item.id, getLabel: (item) => item.nombre }
    ]}
  />
);

export default EmpleadosPage;
