import MantenimientoPage from "../mantenimientos/MantenimientoPage";

// Pago de Dietas (modelo vdi_*): encabezado de pago mensual por miembro de junta.
//   VALOR      = par_pago_dieta * total_sesiones
//   ISR        = VALOR * par_isr / 100
//   VALOR_PAGO = VALOR - ISR   (liquido)
// Los montos se muestran como referencia (solo lectura); el backend recalcula
// al guardar desde RPJ_CAT_PARAMETRO_GENERAL (no se hardcodean valores).
const tipoDocumentoOptions = [
  { value: "CHEQUE", label: "Cheque" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "DEPOSITO", label: "Deposito" }
];
const estadoOptions = [
  { value: "PENDIENTE", label: "PENDIENTE" },
  { value: "PAGADO", label: "PAGADO" },
  { value: "RECIBIDO", label: "RECIBIDO" },
  { value: "ANULADO", label: "ANULADO" }
];

const computeMontos = (form, options) => {
  const parametro = (options?.parametros || [])[0];
  const pagoDieta = Number(parametro?.pagoDieta || 0);
  const isr = Number(parametro?.isr || 0);
  const sesiones = Number(form.totalSesiones) >= 0 ? Number(form.totalSesiones) : 0;
  const valor = Number((pagoDieta * sesiones).toFixed(2));
  const isrMonto = Number((valor * isr / 100).toFixed(2));
  const valorPago = Number((valor - isrMonto).toFixed(2));
  return { valor, isr: isrMonto, valorPago };
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
    searchFields={["juntaNombre", "juntaPuesto", "noDocumento", "estado"]}
    columns={[
      { key: "juntaNombre", label: "Miembro" },
      { key: "juntaPuesto", label: "Puesto" },
      { key: "totalSesiones", label: "Sesiones" },
      { key: "valor", label: "Valor", render: (row) => formatMoney(Number(row.valor)) },
      { key: "isr", label: "ISR", render: (row) => formatMoney(Number(row.isr)) },
      { key: "valorPago", label: "Liquido", render: (row) => formatMoney(Number(row.valorPago)) },
      { key: "estado", label: "Estado", chip: true }
    ]}
    fields={[
      { key: "idJuntaDirectiva", label: "Miembro junta", required: true, type: "select", source: "junta", getValue: (item) => item.id, getLabel: (item) => `${item.nombre} ${item.apellidos} - ${item.puesto}` },
      { key: "totalSesiones", label: "Total de sesiones", required: true, type: "number" },
      // Montos calculados (solo lectura). El backend recalcula al guardar.
      { key: "valor", label: "Valor", compute: (form, options) => formatMoney(computeMontos(form, options).valor) },
      { key: "isr", label: "ISR", compute: (form, options) => formatMoney(computeMontos(form, options).isr) },
      { key: "valorPago", label: "Liquido a pagar", compute: (form, options) => formatMoney(computeMontos(form, options).valorPago) },
      { key: "estado", label: "Estado", required: true, type: "select", options: estadoOptions, defaultValue: "PENDIENTE" },
      { key: "tipoDocumento", label: "Tipo documento", type: "select", options: tipoDocumentoOptions },
      { key: "noDocumento", label: "No. documento" },
      { key: "banco", label: "Banco" },
      { key: "fechaPago", label: "Fecha de pago", type: "date" },
      { key: "fechaRecibido", label: "Fecha de recibido", type: "date" },
      { key: "observaciones", label: "Observaciones" }
    ]}
    formSections={[
      { title: "Datos de la dieta", fields: ["idJuntaDirectiva", "totalSesiones", "valor", "isr", "valorPago"] },
      { title: "Pago", fields: ["estado", "tipoDocumento", "noDocumento", "banco", "fechaPago", "fechaRecibido", "observaciones"] }
    ]}
  />
);

export default DietasPage;
