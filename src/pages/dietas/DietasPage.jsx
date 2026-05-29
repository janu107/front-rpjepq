import MantenimientoPage from "../mantenimientos/MantenimientoPage";

// Version IV: el monto de la dieta se calcula desde RPJ_CAT_PARAMETRO_GENERAL.
//   VALOR     = par_pago_dieta * sesiones
//   RETENCION = VALOR * par_isr / 100
//   LIQUIDO   = VALOR - RETENCION
// Los montos solo se muestran como referencia (solo lectura); el backend es la
// fuente de verdad y recalcula al guardar. La columna TOTAL ya no se muestra.
const computeDieta = (form, options) => {
  const parametro = (options?.parametros || [])[0];
  const pagoDieta = Number(parametro?.pagoDieta || 0);
  const isr = Number(parametro?.isr || 0);
  const sesiones = Number(form.sesionesMes) > 0 ? Number(form.sesionesMes) : 1;
  const valor = Number((pagoDieta * sesiones).toFixed(2));
  const retencionIsr = Number((valor * isr / 100).toFixed(2));
  const liquido = Number((valor - retencionIsr).toFixed(2));
  return { valor, retencionIsr, liquido };
};

const formatMoney = (value) => (Number.isFinite(value) ? `Q ${value.toFixed(2)}` : "");

const DietasPage = () => (
  <MantenimientoPage
    title="Pago de Dietas"
    subtitle="Pagos por sesiones de junta directiva"
    endpoint="/dietas"
    dependencies={[
      { key: "junta", endpoint: "/junta-directiva" },
      { key: "parametros", endpoint: "/catalogos/parametro-general" }
    ]}
    searchFields={["juntaNombre", "juntaPuesto", "acta"]}
    columns={[
      { key: "juntaNombre", label: "Miembro" },
      { key: "juntaPuesto", label: "Puesto" },
      { key: "acta", label: "Acta" },
      { key: "sesionesMes", label: "Sesiones" },
      { key: "valor", label: "Valor", render: (row) => formatMoney(Number(row.valor)) },
      { key: "retencionIsr", label: "Retencion", render: (row) => formatMoney(Number(row.retencionIsr)) },
      { key: "liquido", label: "Liquido", render: (row) => formatMoney(Number(row.liquido)) }
    ]}
    fields={[
      { key: "idJuntaDirectiva", label: "Junta directiva", required: true, type: "select", source: "junta", getValue: (item) => item.id, getLabel: (item) => `${item.nombre} ${item.apellidos} - ${item.puesto}` },
      { key: "fechaSesion", label: "Fecha sesion", required: true, type: "date" },
      { key: "fechaPago", label: "Fecha pago", required: true, type: "date" },
      { key: "sesionesMes", label: "Sesiones mes", required: true, type: "number" },
      { key: "acta", label: "Acta", required: true },
      // Montos calculados (solo lectura). El backend recalcula al guardar.
      { key: "valor", label: "Valor", compute: (form, options) => formatMoney(computeDieta(form, options).valor) },
      { key: "retencionIsr", label: "Retencion ISR", compute: (form, options) => formatMoney(computeDieta(form, options).retencionIsr) },
      { key: "liquido", label: "Liquido", compute: (form, options) => formatMoney(computeDieta(form, options).liquido) }
    ]}
  />
);

export default DietasPage;
