import MantenimientoPage from "../mantenimientos/MantenimientoPage";

const estadoOptions = ["ACTIVO", "INACTIVO"].map((value) => ({ value, label: value }));
const estadoCivilOptions = ["SOLTERO", "CASADO", "UNIDO", "DIVORCIADO", "VIUDO"].map((value) => ({ value, label: value }));

const JubiladosPage = () => (
  <MantenimientoPage
    title="Control de Jubilados"
    subtitle="Mantenimiento de jubilados"
    endpoint="/jubilados"
    fixedManejoId={2}
    uniqueIdField="idJubilado"
    uniqueIdMessage="EL ID DE JUBILADO YA EXISTE. INGRESE UN ID DIFERENTE."
    dependencies={[
      { key: "manejos", endpoint: "/catalogos/manejo-administracion" },
      { key: "tiposJubilacion", endpoint: "/catalogos/tipo-jubilacion" },
      { key: "tiposIngreso", endpoint: "/catalogos/tipo-ingreso" }
    ]}
    salaryConfig={{
      fields: [
        { key: "tipoIngreso", label: "Tipo ingreso", required: true, type: "select", source: "tiposIngreso", getValue: (item) => item.id, getLabel: (item) => `${item.tipoIngreso} - ${item.descripcion}` },
        { key: "salario", label: "Salario", required: true, type: "number" }
      ]
    }}
    searchFields={["nombres", "apellidos", "dpi", "estado", "manejoDescripcion", "tipoJubilacionDescripcion"]}
    columns={[
      { key: "idJubilado", label: "ID" },
      { key: "nombres", label: "Nombres" },
      { key: "apellidos", label: "Apellidos" },
      { key: "dpi", label: "DPI" },
      { key: "estado", label: "Estado", chip: true },
      { key: "tipoJubilacionDescripcion", label: "Tipo jubilacion" },
      { key: "manejoDescripcion", label: "Manejo" }
    ]}
    fields={[
      { key: "tipoManejo", label: "Manejo administracion", required: true, type: "select", source: "manejos", getValue: (item) => item.id, getLabel: (item) => item.descripcion, disabled: true },
      { key: "idJubilado", label: "ID jubilado", required: true, type: "number" },
      { key: "nombres", label: "Nombres", required: true },
      { key: "apellidos", label: "Apellidos", required: true },
      { key: "fechaNacimiento", label: "Fecha nacimiento", required: true, type: "date" },
      { key: "dpi", label: "DPI", required: true },
      { key: "direccion", label: "Direccion", required: true },
      { key: "profesionOficio", label: "Profesion u oficio" },
      { key: "estadoCivil", label: "Estado civil", required: true, type: "select", options: estadoCivilOptions },
      { key: "estado", label: "Estado", required: true, type: "select", options: estadoOptions, defaultValue: "ACTIVO" },
      { key: "fechaJubilacion", label: "Fecha jubilacion", required: true, type: "date" },
      { key: "tipoJubilacion", label: "Tipo jubilacion", required: true, type: "select", source: "tiposJubilacion", getValue: (item) => item.id, getLabel: (item) => item.descripcion }
    ]}
  />
);

export default JubiladosPage;
