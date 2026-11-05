import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid,
  LinearProgress, MenuItem, Radio, RadioGroup, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { canEdit } from "../../utils/permissions";

// Estado de cuenta de un beneficiario (viuda o huérfano de un jubilado fallecido).
const PRIMARIO = "#1F4E79";
const MES3 = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nombrePrest = (p) => { const s = String(p || ""); const m = Number(s.slice(4, 6)); return s.length === 6 && m === 13 ? `AGUINALDO ${s.slice(0, 4)}` : s.length === 6 && m === 14 ? `BONO 14 ${s.slice(0, 4)}` : null; };
const fmtPer = (p) => { const s = String(p || ""); return nombrePrest(s) || (s.length === 6 ? `${MES3[Number(s.slice(4, 6)) - 1]} ${s.slice(0, 4)}` : s); };
const fmtFecha = (v) => (v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—");
const COLOR_ESTADO = { PAGADA: "success", PARCIAL: "warning", PENDIENTE: "error", "SE CREA AL CERRAR": "default" };
const CONCEPTO = { "COBRO DEUDA DEL FALLECIDO": "Pago de la deuda del fallecido (nómina de deuda)", "LIQUIDACION ORFANDAD": "Lo atrasado (cumplió 18)" };
const MODO_18 = { COMPLETO: "Completo, de una vez", PORCENTAJE: "Por porcentaje mensual", CONVENIO: "Por convenio" };

const Dato = ({ etiqueta, valor, fuerte }) => (
  <Grid item xs={6} md={3}>
    <Typography variant="caption" color="text.secondary">{etiqueta}</Typography>
    <Typography sx={{ fontWeight: fuerte ? 800 : 600, color: fuerte ? PRIMARIO : "inherit" }}>{valor}</Typography>
  </Grid>
);

const EstadoCuentaBeneficiario = ({ idBeneficiario, onClose }) => {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const cargar = () => axiosClient.get(`/beneficiarios/${idBeneficiario}/estado-cuenta`)
    .then(({ data }) => setDatos(data.data))
    .catch((e) => setError(e.response?.data?.message || "No fue posible cargar el estado de cuenta."));
  useEffect(() => {
    if (!idBeneficiario) return;
    setDatos(null); setError(null);
    cargar();
  }, [idBeneficiario]);

  // Hijo que cumple 18: forma de cobro de lo atrasado (completo, porcentaje o convenio).
  const [cobro18, setCobro18] = useState(null);
  const abrirCobro18 = () => {
    const f = datos.formaCobro18;
    const hoy = new Date().toISOString().slice(0, 10);
    setCobro18({ modo: f.modo, cuota: f.convenio ? String(f.convenio.cuota) : "", documento: f.convenio?.documento || "",
      autorizadoPor: f.convenio?.autorizadoPor || "JUNTA_DIRECTIVA", fechaInicio: f.convenio?.fechaInicio ? String(f.convenio.fechaInicio).slice(0, 10) : hoy });
  };
  const guardarCobro18 = async () => {
    try {
      const body = cobro18.modo === "CONVENIO"
        ? { modo: "CONVENIO", cuota: Number(cobro18.cuota), documento: cobro18.documento, autorizadoPor: cobro18.autorizadoPor, fechaInicio: cobro18.fechaInicio }
        : { modo: cobro18.modo };
      const { data } = await axiosClient.put(`/beneficiarios/${idBeneficiario}/forma-cobro`, body);
      setCobro18(null);
      await cargar();
      const rec = data.data?.planillasRecalculadas || [];
      Swal.fire({ icon: "success", title: "Forma de cobro guardada", text: rec.length ? `Se recalculó la planilla ${rec.join(", ")}.` : "Aplica desde la próxima planilla que se genere.", timer: 2500, showConfirmButton: false });
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "No fue posible guardar.", "error"); }
  };

  const [descargando, setDescargando] = useState(false);
  const exportarPdf = async () => {
    setDescargando(true);
    try {
      const resp = await axiosClient.get(`/beneficiarios/${idBeneficiario}/estado-cuenta/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `estado_cuenta_${String(datos?.beneficiario?.nombre || idBeneficiario).toLowerCase().replace(/[^a-z0-9]+/g, "_")}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch {
      Swal.fire("Error", "No fue posible generar el PDF.", "error");
    } finally { setDescargando(false); }
  };
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
              <Dato etiqueta="Monto mensual (juez)" valor={`${fmtQ(b.monto)} (${Number(b.porcentaje).toFixed(2)}% de ${fmtQ(datos.fallecido.pension)})`} />
              <Dato etiqueta="Edad" valor={b.edad !== null ? `${b.edad} años${b.esMenor ? " (menor)" : ""}` : "—"} />
              <Dato etiqueta="Se le debe por mes" valor={fmtQ(datos.mensual.seLeDebe)} />
              <Dato etiqueta={`Se le paga por mes (${datos.mensual.porcentajePlanilla}%)`} valor={fmtQ(datos.mensual.seLePaga)} />
              <Dato etiqueta="Se deposita a" valor={`${b.pago.aNombreDe}${b.pago.esTutora ? " (tutor)" : ""}`} />
              <Dato etiqueta="Cuenta" valor={b.pago.formaPago === "ABONO CUENTA" ? `${b.pago.banco || ""} ${b.pago.cuenta || ""}` : (b.pago.formaPago || "Sin datos de pago")} />
            </Grid>

            {datos.formaCobro18 && (() => {
              const f = datos.formaCobro18;
              return (
                <Alert severity={b.esMenor ? "info" : "warning"} variant="outlined"
                  action={canEdit(user) && b.estado === "ACTIVO" && <Button size="small" onClick={abrirCobro18}>Forma de cobro</Button>}>
                  <b>Al cumplir 18 años ({fmtFecha(f.cumple18)})</b>: ese mes se le paga proporcional a los días antes del cumpleaños y desde el
                  mes siguiente ya no cobra orfandad. Lo que se le deba lo cobra: <b>{MODO_18[f.modo]}</b>
                  {f.modo === "CONVENIO" && f.convenio ? ` (${fmtQ(f.convenio.cuota)}/mes, doc. ${f.convenio.documento})` : ""}
                  {f.modo === "PORCENTAJE" ? ` (${fmtQ(f.cuotaPorcentaje)}/mes, el ${f.porcentaje}% de su monto)` : ""}.
                  {f.pendiente > 0 ? <> Hoy se le debe <b>{fmtQ(f.pendiente)}</b>.</> : null}
                </Alert>
              );
            })()}
            {df && df.canceladaFuera && (
              <Alert severity="success">
                La deuda del fallecido (<b>{fmtQ(df.canceladaFuera.monto)}</b>, {df.canceladaFuera.meses} {df.canceladaFuera.meses === 1 ? "mes" : "meses"}) se le pagó <b>fuera del sistema</b> el{" "}
                {fmtFecha(df.canceladaFuera.fecha)} ({df.canceladaFuera.documento}). Lo que cobra ahora es su pensión por <b>VIUDEZ</b>.
              </Alert>
            )}
            {df && !df.canceladaFuera && (
              <Box sx={{ p: 2, border: "1px solid #dde3ea", borderRadius: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARIO }}>Deuda del fallecido (la cobra el cónyuge)</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Dato etiqueta="Total de la deuda" valor={fmtQ(df.total)} />
                  <Dato etiqueta="Pagado" valor={fmtQ(df.pagado)} />
                  <Dato etiqueta="Falta" valor={fmtQ(df.pendiente)} fuerte />
                  <Dato etiqueta="Cobrado por ella" valor={fmtQ(df.cobradoPorBeneficiaria)} />
                  <Dato etiqueta={df.formaCobro?.modo === "CONVENIO" ? "Cuota mensual (convenio)" : `Cuota mensual (${df.formaCobro?.porcentaje ?? 50}%)`} valor={fmtQ(df.cuotaMensual)} />
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
                {["ESPOSA", "ESPOSO"].includes(b.parentesco) ? "Viudez" : "Orfandad"}: lo que se le debe mes a mes
              </Typography>
              <Grid container spacing={2} sx={{ mb: 1 }}>
                <Dato etiqueta="Total que se le debe" valor={fmtQ(datos.resumen.debe)} />
                <Dato etiqueta="Pagado" valor={fmtQ(datos.resumen.pagado)} />
                <Dato etiqueta="Pendiente" valor={fmtQ(datos.resumen.pendiente)} fuerte />
                <Dato etiqueta="Meses" valor={datos.meses.length} />
              </Grid>
              {datos.meses.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {["ESPOSA", "ESPOSO"].includes(b.parentesco) && df && df.pendiente > 0
                    ? "La viudez empieza la planilla siguiente a terminar de cobrar la deuda del fallecido."
                    : "Aún no hay meses: se crean al cerrar cada planilla."}
                </Typography>
              ) : (
                <>
                {datos.meses.some((m) => m.porCrear) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Los meses <b>SE CREA AL CERRAR</b> ya se le deben (desde febrero 2023 o desde que falleció, lo que sea después) y quedan registrados
                    al cerrar la próxima planilla; lo que se le paga se abona al mes más antiguo.
                    {datos.meses.some((m) => m.recibidoFuera) && <> En viudez, los meses anteriores ya recibieron el {datos.mensual?.porcentajePlanilla ?? 50}% fuera del sistema (columna Pagado): se le debe el resto.</>}
                  </Typography>
                )}
                <Table size="small">
                  <TableHead>
                    <TableRow><TableCell>Mes</TableCell><TableCell align="right">Se le debe</TableCell><TableCell align="right">Pagado</TableCell><TableCell align="right">Pendiente</TableCell><TableCell>Estado</TableCell><TableCell>Pagado con</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {datos.meses.map((m) => (
                      <TableRow key={m.periodo}>
                        <TableCell>{fmtPer(m.periodo)}</TableCell>
                        <TableCell align="right">{fmtQ(m.debe)}</TableCell>
                        <TableCell align="right">
                          {m.recibidoFuera || (Number(m.pagado) > 0 && !m.pagadoCon) ? (
                            <Tooltip arrow title="Recibido fuera del sistema (pagado con el código del fallecido)">
                              <span style={{ borderBottom: "1px dotted #999", cursor: "help" }}>{fmtQ(m.pagado)}</span>
                            </Tooltip>
                          ) : fmtQ(m.pagado)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtQ(m.pendiente)}</TableCell>
                        <TableCell><Chip size="small" color={COLOR_ESTADO[m.estado] || "default"} label={m.estado} /></TableCell>
                        <TableCell>{m.pagadoCon ? m.pagadoCon.split(", ").map(fmtPer).join(", ") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </>
              )}
            </Box>

            {datos.historiaConCodigo?.length > 0 && (() => {
              const hc = datos.historiaConCodigo;
              const suma = (k) => hc.reduce((a, x) => a + Number(x[k] || 0), 0);
              return (
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARIO }}>
                    Cobrado con el código del fallecido ({fmtPer(hc[0].periodo)} a {fmtPer(hc[hc.length - 1].periodo)})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Después de que falleció, la pensión se siguió pagando con su código: eso lo cobró {b.nombre}. Desde enero 2023 cada mes se debe
                    completo y se paga la mitad, igual que a los jubilados.
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 1 }}>
                    <Dato etiqueta="Meses" valor={hc.length} />
                    <Dato etiqueta="Total recibido" valor={fmtQ(suma("recibido"))} />
                    <Dato etiqueta="Deuda desde 2023" valor={fmtQ(suma("debe"))} />
                    <Dato etiqueta="Pendiente" valor={fmtQ(suma("saldo"))} fuerte />
                  </Grid>
                  <Box sx={{ maxHeight: 300, overflowY: "auto", border: "1px solid #dde3ea", borderRadius: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Mes</TableCell><TableCell align="right">Pensión</TableCell><TableCell align="right">Recibido</TableCell>
                          <TableCell align="right">Se debía</TableCell><TableCell align="right">Pagado de la deuda</TableCell>
                          <TableCell align="right">Pendiente</TableCell><TableCell>Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...hc].reverse().map((m) => (
                          <TableRow key={m.periodo}>
                            <TableCell>{fmtPer(m.periodo)}</TableCell>
                            <TableCell align="right">{fmtQ(m.pension)}</TableCell>
                            <TableCell align="right">{fmtQ(m.recibido)}</TableCell>
                            <TableCell align="right">{m.debe > 0 ? fmtQ(m.debe) : "—"}</TableCell>
                            <TableCell align="right">{m.debe > 0 ? fmtQ(m.pagado) : "—"}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{m.debe > 0 ? fmtQ(m.saldo) : "—"}</TableCell>
                            <TableCell>
                              <Tooltip title={m.canceladaFuera ? `Pagado fuera del sistema (${m.canceladaFuera})` : ""}>
                                <Chip size="small" label={m.estado}
                                  color={m.estado === "PENDIENTE" ? "error" : m.estado === "PARCIAL" ? "warning" : "success"} variant={m.debe > 0 ? "filled" : "outlined"} />
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              );
            })()}

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
      <Dialog open={!!cobro18} onClose={() => setCobro18(null)} fullWidth maxWidth="sm">
        <DialogTitle>Forma de cobro al cumplir 18 — {b?.nombre}</DialogTitle>
        <DialogContent dividers>
          {cobro18 && datos?.formaCobro18 && (
            <Stack spacing={1.5}>
              <Typography variant="body2">Lo que se le debe hoy: <b>{fmtQ(datos.formaCobro18.pendiente)}</b>. ¿Cómo lo cobra?</Typography>
              <RadioGroup value={cobro18.modo} onChange={(e) => setCobro18((c) => ({ ...c, modo: e.target.value }))}>
                <FormControlLabel value="COMPLETO" control={<Radio />} label="Completo: todo de una vez en la planilla siguiente al cumpleaños" />
                <FormControlLabel value="PORCENTAJE" control={<Radio />}
                  label={`Por porcentaje: ${fmtQ(datos.formaCobro18.cuotaPorcentaje)} cada mes (el ${datos.formaCobro18.porcentaje}% de su monto) hasta saldar`} />
                <FormControlLabel value="CONVENIO" control={<Radio />} label="Por convenio: una cuota mensual fija acordada" />
              </RadioGroup>
              {cobro18.modo === "CONVENIO" && (
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Cuota mensual (Q) *" type="number" size="small" fullWidth value={cobro18.cuota} inputProps={{ min: 0, step: "0.01" }}
                      onChange={(e) => setCobro18((c) => ({ ...c, cuota: e.target.value }))}
                      helperText={Number(cobro18.cuota) > 0 && datos.formaCobro18.pendiente > 0 ? `≈ ${Math.ceil(datos.formaCobro18.pendiente / Number(cobro18.cuota))} meses` : " "} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Desde *" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} value={cobro18.fechaInicio}
                      onChange={(e) => setCobro18((c) => ({ ...c, fechaInicio: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="No. documento *" size="small" fullWidth value={cobro18.documento} onChange={(e) => setCobro18((c) => ({ ...c, documento: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField select label="Autorizado por *" size="small" fullWidth value={cobro18.autorizadoPor} onChange={(e) => setCobro18((c) => ({ ...c, autorizadoPor: e.target.value }))}>
                      <MenuItem value="JUNTA_DIRECTIVA">Junta directiva</MenuItem>
                      <MenuItem value="JUEZ">Juez</MenuItem>
                      <MenuItem value="ACUERDO_INTERNO">Acuerdo interno</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCobro18(null)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarCobro18}
            disabled={!cobro18 || (cobro18.modo === "CONVENIO" && (!(Number(cobro18.cuota) > 0) || !cobro18.documento.trim() || !cobro18.fechaInicio))}>Guardar</Button>
        </DialogActions>
      </Dialog>
      <DialogActions>
        <Button startIcon={<PictureAsPdfIcon />} onClick={exportarPdf} disabled={!datos || descargando}>Exportar PDF</Button>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EstadoCuentaBeneficiario;
