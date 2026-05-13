import MantenimientoPage from "../mantenimientos/MantenimientoPage";

const DietasPage = () => (
  <MantenimientoPage
    title="Dietas"
    subtitle="Pagos por sesiones de junta directiva"
    endpoint="/dietas"
    dependencies={[{ key: "junta", endpoint: "/junta-directiva" }]}
    searchFields={["juntaNombre", "juntaPuesto", "acta"]}
    columns={[
      { key: "juntaNombre", label: "Miembro" },
      { key: "juntaPuesto", label: "Puesto" },
      { key: "acta", label: "Acta" },
      { key: "sesionesMes", label: "Sesiones" },
      { key: "total", label: "Total" }
    ]}
    fields={[
      { key: "idJuntaDirectiva", label: "Junta directiva", required: true, type: "select", source: "junta", getValue: (item) => item.id, getLabel: (item) => `${item.nombre} ${item.apellidos} - ${item.puesto}` },
      { key: "fechaSesion", label: "Fecha sesion", required: true, type: "date" },
      { key: "fechaPago", label: "Fecha pago", required: true, type: "date" },
      { key: "sesionesMes", label: "Sesiones mes", required: true, type: "number" },
      { key: "acta", label: "Acta", required: true },
      { key: "valor", label: "Valor", required: true, type: "number" },
      { key: "retencionIsr", label: "Retencion ISR", required: true, type: "number" },
      { key: "liquido", label: "Liquido", required: true, type: "number" },
      { key: "total", label: "Total", required: true, type: "number" }
    ]}
  />
);

export default DietasPage;
