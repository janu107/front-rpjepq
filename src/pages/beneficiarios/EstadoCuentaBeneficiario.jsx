import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid,
  LinearProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography
} from "@mui/material";
import { useEffect, useState } from "react";

import axiosClient from "../../api/axiosClient";

// Estado de cuenta de un beneficiario (viuda o huérfano de un jubilado fallecido).
const PRIMARIO = "#1F4E79";
const MES3 = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPer = (p) => { const s = String(p || ""); return s.length === 6 ? `${MES3[Number(s.slice(4, 6)) - 1]} ${s.slice(0, 4)}` : s; };
const fmtFecha = (v) => (v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—");
const COLOR_ESTADO = { PAGADA: "success", PARCIAL: "warning", PENDIENTE: "error" };
const CONCEPTO = { "COBRO DEUDA DEL FALLECIDO": "Cobro de la deuda del fallecido", "LIQUIDACION ORFANDAD": "Liquidación (cumplió 18)" };

const Dato = ({ etiqueta, valor, fuerte }) => (
  <Grid item xs={6} md={3}>
    <Typography variant="caption" color="text.secondary">{etiqueta}</Typography>
    <Typography sx={{ fontWeight: fuerte ? 800 : 600, color: fuerte ? PRIMARIO : "inherit" }}>{valor}</Typography>
  </Grid>
);

const EstadoCuentaBeneficiario = ({ idBeneficiario, onClose }) => {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!idBeneficiario) return;
    setDatos(null); setError(null);
    axiosClient.get(`/beneficiarios/${idBeneficiario}/estado-cuenta`)
      .then(({ data }) => setDatos(data.data))
      .catch((e) => setError(e.response?.data?.message || "No fue posible cargar el estado de cuenta."));
  }, [idBeneficiario]);

  const b = datos?.beneficiario;
  const df = datos?.deudaFallecido;
  const avance = df && df.total > 0 ? Math.min(100, (df.pagado / df.total) * 100) : 0;

  return (
    <Dialog open={Boolean(idBeneficiario)} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        Estado de cuenta — {b?.nombre || ""}
        {b && <Chip size="small" sx={{ ml: 1.5 }} label={b.parentesco} />}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}
        {!datos && !error && <CircularProgress size={26} />}
        {datos && (
          <Stack spacing={2.5}>
            <Box>
              <Chip color={datos.fase === "TERMINADO" ? "default" : "primary"} label={datos.fase} sx={{ fontWeight: 700 }} />
            </Box>
            <Grid container spacing={2}>
              <Dato etiqueta="Beneficiario de" valor={`${datos.fallecido.codigo} — ${datos.fallecido.nombre}`} />
              <Dato etiqueta="Fecha de fallecimiento" valor={fmtFecha(datos.fallecido.fechaFallecimiento)} />
              <Dato etiqueta="Porcentaje" valor={`${Number(b.porcentaje).toFixed(2)}% de ${fmtQ(datos.fallecido.pension)}`} />
              <Dato etiqueta="Edad" valor={b.edad !== null ? `${b.edad} años${b.esMenor ? " (menor)" : ""}` : "—"} />
              <Dato etiqueta="Se le debe por mes" valor={fmtQ(datos.mensual.seLeDebe)} />
              <Dato etiqueta={`Se le paga por mes (${datos.mensual.porcentajePlanilla}%)`} valor={fmtQ(datos.mensual.seLePaga)} />
              <Dato etiqueta="Se deposita a" valor={`${b.pago.aNombreDe}${b.pago.esTutora ? " (tutora)" : ""}`} />
              <Dato etiqueta="Cuenta" valor={b.pago.formaPago === "ABONO CUENTA" ? `${b.pago.banco || ""} ${b.pago.cuenta || ""}` : (b.pago.formaPago || "Sin datos de pago")} />
            </Grid>

            {df && (
              <Box sx={{ p: 2, border: "1px solid #dde3ea", borderRadius: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARIO }}>Deuda del fallecido (la cobra la esposa)</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Dato etiqueta="Total de la deuda" valor={fmtQ(df.total)} />
                  <Dato etiqueta="Pagado" valor={fmtQ(df.pagado)} />
                  <Dato etiqueta="Falta" valor={fmtQ(df.pendiente)} fuerte />
                  <Dato etiqueta="Cobrado por ella" valor={fmtQ(df.cobradoPorBeneficiaria)} />
                  <Dato etiqueta="Cuota mensual" valor={fmtQ(df.cuotaMensual)} />
                  <Dato etiqueta="Meses para terminar (aprox.)" valor={df.mesesParaTerminar ?? "—"} />
                  <Dato etiqueta="Próximo mes a abonar" valor={df.proximoMes ? fmtPer(df.proximoMes) : "—"} />
                  <Dato etiqueta="Meses pendientes" valor={df.mesesPendientes} />
                </Grid>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1.5 }}>
                  <LinearProgress variant="determinate" value={avance} sx={{ flex: 1, height: 10, borderRadius: 5 }} />
                  <Typography variant="body2" sx={{ minWidth: 48 }}>{avance.toFixed(1)}%</Typography>
                </Stack>
                {df.pendiente <= 0 && <Alert severity="success" sx={{ mt: 1.5 }}>La deuda del fallecido está saldada: ya cobra viudez.</Alert>}
              </Box>
            )}

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARIO, mb: 0.5 }}>
                {b.parentesco === "ESPOSA" ? "Viudez" : "Orfandad"}: lo que se le debe mes a mes
              </Typography>
              <Grid container spacing={2} sx={{ mb: 1 }}>
                <Dato etiqueta="Total que se le debe" valor={fmtQ(datos.resumen.debe)} />
                <Dato etiqueta="Pagado" valor={fmtQ(datos.resumen.pagado)} />
                <Dato etiqueta="Pendiente" valor={fmtQ(datos.resumen.pendiente)} fuerte />
                <Dato etiqueta="Meses" valor={datos.meses.length} />
              </Grid>
              {datos.meses.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {b.parentesco === "ESPOSA" && df && df.pendiente > 0
                    ? "La viudez empieza la planilla siguiente a terminar de cobrar la deuda del fallecido."
                    : "Aún no hay meses: se crean al cerrar cada planilla."}
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow><TableCell>Mes</TableCell><TableCell align="right">Se le debe</TableCell><TableCell align="right">Pagado</TableCell><TableCell align="right">Pendiente</TableCell><TableCell>Estado</TableCell><TableCell>Pagado con</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {datos.meses.map((m) => (
                      <TableRow key={m.periodo}>
                        <TableCell>{fmtPer(m.periodo)}</TableCell>
                        <TableCell align="right">{fmtQ(m.debe)}</TableCell>
                        <TableCell align="right">{fmtQ(m.pagado)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtQ(m.pendiente)}</TableCell>
                        <TableCell><Chip size="small" color={COLOR_ESTADO[m.estado] || "default"} label={m.estado} /></TableCell>
                        <TableCell>{m.pagadoCon ? m.pagadoCon.split(", ").map(fmtPer).join(", ") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARIO, mb: 0.5 }}>
                Pagos recibidos <Typography component="span" variant="body2" color="text.secondary">· total cobrado {fmtQ(datos.resumen.recibido)} en {datos.resumen.planillasCobradas} planilla(s) cerrada(s)</Typography>
              </Typography>
              {datos.pagos.length === 0 ? <Typography variant="body2" color="text.secondary">Todavía no aparece en ninguna planilla.</Typography> : (
                <Table size="small">
                  <TableHead><TableRow><TableCell>Planilla</TableCell><TableCell>Fecha de pago</TableCell><TableCell>Concepto</TableCell><TableCell align="right">Monto</TableCell><TableCell>Estado</TableCell></TableRow></TableHead>
                  <TableBody>
                    {datos.pagos.map((x) => (
                      <TableRow key={`${x.planilla}-${x.concepto}`}>
                        <TableCell>{fmtPer(x.planilla)}</TableCell>
                        <TableCell>{fmtFecha(x.fechaPago)}</TableCell>
                        <TableCell>{CONCEPTO[x.concepto] || (x.concepto === "VIUDEZ" ? "Viudez" : "Orfandad")}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtQ(x.monto)}</TableCell>
                        <TableCell>
                          <Tooltip title={x.estadoPlanilla === "GENERADA" ? "Planilla generada, aún sin cerrar: el pago se aplica al cerrar" : ""}>
                            <Chip size="small" variant="outlined" color={x.estadoPlanilla === "CERRADA" ? "success" : "warning"} label={x.estadoPlanilla === "GENERADA" ? "EN PROCESO" : x.estadoPlanilla} />
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
    </Dialog>
  );
};

export default EstadoCuentaBeneficiario;
