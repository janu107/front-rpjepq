import MantenimientoPage from "../mantenimientos/MantenimientoPage";

const estadoCivilOptions = ["SOLTERO", "CASADO", "UNIDO", "DIVORCIADO", "VIUDO"].map((value) => ({ value, label: value }));
const tipoPuestoOptions = ["ADMINISTRATIVO", "OPERATIVO", "TECNICO", "OTRO"].map((value) => ({ value, label: value }));

const EmpleadosPage = ({
  title = "Empleado EPQ",
  subtitle = "Mantenimiento de empleados EPQ",
  fixedManejoId = 4
}) => (
  <MantenimientoPage
    title={title}
    subtitle={subtitle}
    endpoint="/empleados"
    fixedManejoId={fixedManejoId}
    dependencies={[
      { key: "manejos", endpoint: "/catalogos/manejo-administracion" },
      { key: "puestos", endpoint: "/catalogos/puestos" },
      { key: "tiposIngreso", endpoint: "/catalogos/tipo-ingreso" }
    ]}
    salaryConfig={{
      requiredOnCreate: true,
      fields: [
        { key: "tipoIngreso", label: "Tipo ingreso", required: true, type: "select", source: "tiposIngreso", getValue: (item) => item.id, getLabel: (item) => `${item.tipoIngreso} - ${item.descripcion}` },
        { key: "salario", label: "Salario", required: true, type: "number" }
      ]
    }}
    searchFields={["nombres", "apellidos", "dpi", "puestoNombre", "manejoDescripcion"]}
    columns={[
      { key: "id", label: "Codigo" },
      { key: "idEmpleado", label: "ID empleado" },
      { key: "nombres", label: "Nombres" },
      { key: "apellidos", label: "Apellidos" },
      { key: "dpi", label: "DPI" },
      { key: "tipoPuesto", label: "Tipo puesto" },
      { key: "puestoNombre", label: "Puesto" },
      { key: "manejoDescripcion", label: "Manejo" }
    ]}
    fields={[
      { key: "tipoManejo", label: "Manejo administracion", required: true, type: "select", source: "manejos", getValue: (item) => item.id, getLabel: (item) => item.descripcion, disabled: true },
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
    formSections={[
      { title: "Datos principales", fields: ["tipoManejo", "idEmpleado", "nombres", "apellidos"] },
      { title: "Identificacion", fields: ["dpi", "nit", "direccion", "estadoCivil"] },
      { title: "Puesto y manejo", fields: ["tipoPuesto", "idPuesto"] },
      { title: "Fechas y datos adicionales", fields: ["fechaNacimiento", "profesionOficio"] }
    ]}
  />
);

export default EmpleadosPage;
