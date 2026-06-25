// ============================================================================
// Reglas de estado de planilla (CAMBIO X) — fuente única de verdad en frontend.
// Debe mantenerse equivalente a back-rpjepq/src/utils/planillaEstado.js.
//
//   ABIERTA   -> generar     -> GENERADA
//   GENERADA  -> cerrar      -> CERRADA
//   GENERADA  -> reversar    -> REVERSADA
//   REVERSADA -> generar     -> GENERADA   (volver a generar)
//   CERRADA   -> (solo consulta / reportes)
// ============================================================================

export const ESTADOS = { ABIERTA: "ABIERTA", GENERADA: "GENERADA", REVERSADA: "REVERSADA", CERRADA: "CERRADA" };

export const puedeGenerar     = (e) => e === ESTADOS.ABIERTA || e === ESTADOS.REVERSADA;
export const puedeReversar    = (e) => e === ESTADOS.GENERADA;
export const puedeCerrar      = (e) => e === ESTADOS.GENERADA;
export const puedeEditarMontos = (e) => e === ESTADOS.GENERADA;
export const esConsulta       = (e) => e === ESTADOS.CERRADA;
export const tieneDetalle     = (e) => [ESTADOS.GENERADA, ESTADOS.CERRADA, ESTADOS.REVERSADA].includes(e);

// Texto del botón de generación según el estado (ABIERTA = generar, REVERSADA = volver a generar).
export const textoBotonGenerar = (e) => (e === ESTADOS.REVERSADA ? "Volver a Generar" : "Generar Nómina");

export const ESTADO_COLORS = {
  ABIERTA:  { color: "success", bg: "#e8f5e9", txt: "#2e7d32" },
  GENERADA: { color: "info",    bg: "#e3f2fd", txt: "#1565c0" },
  CERRADA:  { color: "default", bg: "#f5f5f5", txt: "#616161" },
  REVERSADA:{ color: "error",   bg: "#ffebee", txt: "#c62828" }
};
