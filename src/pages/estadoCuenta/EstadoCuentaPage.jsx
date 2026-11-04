import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import HistoryIcon from "@mui/icons-material/History";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import GavelIcon from "@mui/icons-material/Gavel";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import UndoIcon from "@mui/icons-material/Undo";
import {
  Alert, Box, Button, IconButton, MenuItem, TextField, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Skeleton,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import BuscadorPersona from "../../components/common/BuscadorPersona";
import PageHeader from "../../components/common/PageHeader";
import EstadoCuentaBeneficiario from "../beneficiarios/EstadoCuentaBeneficiario";
import { useAuth } from "../../context/AuthContext";
import { canEdit } from "../../utils/permissions";

const PRIMARIO = "#1F4E79";
const ROJO = "#F44336";
const VERDE = "#4CAF50";
const AMARILLO = "#FF9800";

const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nombrePrest = (p) => { const s = String(p || ""); const m = Number(s.slice(4, 6)); return s.length === 6 && m === 13 ? `AGUINALDO ${s.slice(0, 4)}` : s.length === 6 && m === 14 ? `BONO 14 ${s.slice(0, 4)}` : null; };
const fmtPeriodo = (p) => { const s = String(p); return nombrePrest(s) || (s.length === 6 ? `${s.slice(4, 6)}/${s.slice(0, 4)}` : s); };

const AZUL = "#1976D2";
const VERDE_AZUL = "#00897B";
const fmtFecha = (v) => (v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—");

// Grupos de descuento (los mismos de la nómina impresa).
const GRUPOS_DESC = [
  { campo: "asociacion", titulo: "Asociación" },
  { campo: "prestamos", titulo: "Préstamo Régimen" },
  { campo: "banrural", titulo: "Banrural" },
  { campo: "bantrab", titulo: "Bantrab" },
  { campo: "judicial", titulo: "Judicial" },
  { campo: "otros", titulo: "IGSS / Otros" }
];

const colorEstadoDeuda = (d) => {
  if (d.enProceso) return AZUL;                // planilla generada, aún sin cerrar
  if (d.estado === "CANCELADA") return VERDE_AZUL; // pagado fuera del sistema
  if (!d.esDeuda) return VERDE;               // historia (pagado 100%)
  if (d.estado === "PAGADA") return VERDE;
  if (d.estado === "PARCIAL") return AMARILLO;
  return ROJO;                                 // PENDIENTE
};

const Dato = ({ label, valor }) => (
  <Grid item xs={12} sm={6} md={3}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography sx={{ fontWeight: 600 }}>{valor}</Typography>
  </Grid>
);

const EstadoCuentaPage = () => {
  const [loading, setLoading] = useState(false);
  const [jub, setJub] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [historiaOpen, setHistoriaOpen] = useState(false);
  const [historia, setHistoria] = useState([]);
  const [idSel, setIdSel] = useState(null);
  const [estadoBen, setEstadoBen] = useState(null);
  const { user } = useAuth();
  // Ajuste de descuentos de un mes de la historia: { periodo, datos, descuentos: [{ id?, tipo, valor }] }
  const [ajuste, setAjuste] = useState(null);
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);
  const abrirAjuste = async (periodo) => {
    try {
      const { data } = await axiosClient.get(`/jubilados/${idSel}/historia/${periodo}/descuentos`);
      const m = data.data;
      if (!m.editable) { Swal.fire("No se puede ajustar", m.motivo, "info"); return; }
      setAjuste({ periodo, datos: m, descuentos: m.descuentos.map((x) => ({ id: x.id, tipo: x.tipo, valor: String(x.valor) })) });
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "No fue posible cargar los descuentos del mes.", "error"); }
  };
  const totalAjuste = ajuste ? Math.round(ajuste.descuentos.reduce((a, x) => a + Number(x.valor || 0), 0) * 100) / 100 : 0;
  const liquidoAjuste = ajuste ? Math.max(Math.round((ajuste.datos.pension - totalAjuste) * 100) / 100, 0) : 0;
  const guardarAjuste = async () => {
    setGuardandoAjuste(true);
    try {
      await axiosClient.put(`/jubilados/${idSel}/historia/${ajuste.periodo}/descuentos`, {
        descuentos: ajuste.descuentos.map((x) => ({ id: x.id, tipo: Number(x.tipo), valor: Number(x.valor || 0) }))
      });
      setAjuste(null);
      await recargarHistoria();
      Swal.fire({ icon: "success", title: "Mes ajustado", text: "Se recalcularon el líquido, lo recibido y la deuda del mes.", timer: 1800, showConfirmButton: false });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "No fue posible guardar.", "error");
    } finally { setGuardandoAjuste(false); }
  };
  const recargarHistoria = async () => {
    const [h, r] = await Promise.all([axiosClient.get(`/jubilados/${idSel}/historia-completa`), axiosClient.get(`/jubilados/${idSel}/resumen-financiero`)]);
    setHistoria(h.data.data || []); setResumen(r.data.data);
  };
  // Un mes de la deuda que ya se pagó fuera del sistema (solo este jubilado y este mes).
  const marcarMesPagado = async (d) => {
    // Solo botones: la ventana de la historia retiene el foco y no deja escribir en un Swal.
    const r = await Swal.fire({
      icon: "question", title: `¿Confirmar ${fmtPeriodo(d.periodo)} como pagado?`,
      html: `El saldo del mes (<b>${fmtQ(d.saldo)}</b>) queda pagado fuera del sistema, con fecha de hoy y su usuario.<br>Solo afecta a este jubilado y a este mes; se puede revertir.`,
      showCancelButton: true, confirmButtonText: "Sí, pagado", cancelButtonText: "Cancelar", confirmButtonColor: "#2e7d32"
    });
    if (!r.isConfirmed) return;
    try {
      await axiosClient.post(`/jubilados/${idSel}/historia/${d.periodo}/cancelar`, {});
      await recargarHistoria();
      Swal.fire({ icon: "success", title: "Mes pagado", timer: 1600, showConfirmButton: false });
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "No fue posible marcar el mes.", "error"); }
  };
  const revertirMesPagado = async (d) => {
    const r = await Swal.fire({
      icon: "warning", title: `Revertir ${fmtPeriodo(d.periodo)}`,
      text: "El mes vuelve a quedar pendiente en la deuda.",
      showCancelButton: true, confirmButtonText: "Revertir", cancelButtonText: "Cancelar", confirmButtonColor: "#c62828"
    });
    if (!r.isConfirmed) return;
    try {
      await axiosClient.post(`/jubilados/${idSel}/historia/${d.periodo}/cancelar/revertir`, { motivo: "Revertido desde estado de cuenta" });
      await recargarHistoria();
      Swal.fire({ icon: "success", title: "Mes pendiente otra vez", timer: 1600, showConfirmButton: false });
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "No fue posible revertir.", "error"); }
  };
  const liquidacionPdf = async () => {
    try {
      const resp = await axiosClient.get(`/jubilados/${idSel}/liquidacion.pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `liquidacion_deuda_${jub?.idJubilado || idSel}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch { Swal.fire("Error", "No fue posible generar la liquidación.", "error"); }
  };
  const location = useLocation();
  // Solo se muestran las columnas de descuento que el jubilado tiene en algún mes.
  const gruposUsados = GRUPOS_DESC.filter((g) => historia.some((d) => Number(d.desglose?.[g.campo] || 0) > 0));

  const seleccionar = async (opt) => {
    if (!opt) { setJub(null); setResumen(null); setBeneficiarios([]); setPagos([]); setIdSel(null); return; }
    setIdSel(opt.id);
    setLoading(true);
    try {
      const [g, r, b, p] = await Promise.all([
        axiosClient.get(`/jubilados/${opt.id}`),
        axiosClient.get(`/jubilados/${opt.id}/resumen-financiero`),
        axiosClient.get(`/jubilados/${opt.id}/beneficiarios-activos`),
        axiosClient.get(`/jubilados/${opt.id}/ultimos-pagos`, { params: { limit: 12 } })
      ]);
      setJub(g.data.data); setResumen(r.data.data); setBeneficiarios(b.data.data || []); setPagos(p.data.data || []);
    } catch {
      Swal.fire("Error", "No fue posible cargar el estado de cuenta.", "error");
    } finally { setLoading(false); }
  };

  const verHistoria = async () => {
    try {
      const { data } = await axiosClient.get(`/jubilados/${idSel}/historia-completa`);
      setHistoria(data.data || []); setHistoriaOpen(true);
    } catch { Swal.fire("Error", "No fue posible cargar la historia.", "error"); }
  };

  const exportarPdf = async () => {
    try {
      const resp = await axiosClient.get(`/jubilados/${idSel}/estado-cuenta.pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      window.open(url, "_blank");
    } catch {
      Swal.fire("PDF no disponible", "El reporte PDF aún no está habilitado en el servidor.", "info");
    }
  };

  // Precarga desde reportes / fallecimientos (navigate con state {id})
  useEffect(() => {
    if (location.state?.id) seleccionar({ id: location.state.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const saldo = Number(resumen?.deudaPendiente || 0);
  const fall = resumen?.fallecimiento;

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Estado de Cuenta" subtitle="Consulta del estado financiero del jubilado (solo lectura)" />

      <Paper sx={{ p: 2.5 }}>
        <BuscadorPersona
          label="Buscar jubilado por código, nombre o DPI (vivos y fallecidos)"
          endpoint="/jubilados/buscar"
          value={null}
          getOptionLabel={(o) => (o ? `${o.idJubilado} - ${o.nombreCompleto} — ${o.dpi}` : "")}
          renderOption={(props, o) => (
            <li {...props} key={o.id}>{o.estadoPago === "FALLECIDO" ? "⚰️ " : ""}{o.idJubilado} - {o.nombreCompleto} — {o.dpi}</li>
          )}
          onSelect={seleccionar}
        />
      </Paper>

      {loading && (
        <Paper sx={{ p: 2.5 }}><Skeleton height={40} /><Skeleton height={30} width="60%" /><Skeleton height={120} /></Paper>
      )}

      {!loading && jub && (
        <>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ color: PRIMARIO }}>
                {jub.nombres} {jub.apellidos} {resumen?.estadoPago === "FALLECIDO" && "⚰️"}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<HistoryIcon />} onClick={verHistoria}>Ver historia completa</Button>
                <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={exportarPdf}>Exportar PDF</Button>
                <Button variant="outlined" startIcon={<GavelIcon />} onClick={liquidacionPdf}>Liquidación PDF</Button>
              </Stack>
            </Stack>
            <Grid container spacing={2}>
              <Dato label="DPI" valor={jub.dpi} />
              <Dato label="Tipo de pago" valor={resumen?.tipoPago} />
              <Dato label="Estado de pago" valor={resumen?.estadoPago} />
              <Dato label="Cuota mensual (pensión)" valor={fmtQ(resumen?.pension)} />
              <Dato label="Meses adeudados" valor={resumen?.periodosDeuda ?? 0} />
              <Dato label="Total pagado" valor={fmtQ(resumen?.totalPagado)} />
              <Dato label="Meses de historia" valor={resumen?.periodosHistoria ?? 0} />
            </Grid>
            {fall && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <b>Falleció el {fmtFecha(fall.fecha)}</b>{fall.certificado ? ` (certificado ${fall.certificado})` : ""}. Lo que se paga desde
                entonces es a sus <b>beneficiarios</b>: vea el estado de cuenta de cada uno en la tabla de abajo.
                {fall.cobradoPorConyuge && (
                  <> {fall.cobradoPorConyuge.meses === 1 ? "El" : "Los"} <b>{fall.cobradoPorConyuge.meses} {fall.cobradoPorConyuge.meses === 1 ? "mes" : "meses"}</b> que se {fall.cobradoPorConyuge.meses === 1 ? "pagó" : "pagaron"} con su código después de fallecer
                    ({fmtPeriodo(fall.cobradoPorConyuge.desde)} a {fmtPeriodo(fall.cobradoPorConyuge.hasta)}) los cobró su <b>cónyuge</b> y aparecen en el
                    estado de cuenta de ella o él; aquí solo queda lo suyo hasta el fallecimiento.</>
                )}
                {fall.cancelacion ? (
                  <> Su deuda de <b>{fmtQ(fall.cancelacion.monto)}</b> ({fall.cancelacion.meses} {fall.cancelacion.meses === 1 ? "mes" : "meses"}) se pagó <b>fuera del sistema</b> el {fmtFecha(fall.cancelacion.fecha)} ({fall.cancelacion.documento}): el cónyuge cobra su VIUDEZ.</>
                ) : saldo > 0 ? <> El saldo pendiente de abajo es su deuda: la <b>cobra el cónyuge</b> antes de pasar a VIUDEZ.</> : null}
              </Alert>
            )}
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, textAlign: "center", bgcolor: saldo > 0 ? "rgba(244,67,54,0.08)" : "rgba(76,175,80,0.08)" }}>
              <Typography variant="caption" color="text.secondary">
                {fall ? (fall.cancelacion ? "DEUDA DEL FALLECIDO (PAGADA FUERA DEL SISTEMA)" : "DEUDA DEL FALLECIDO PENDIENTE (LA COBRA EL CÓNYUGE)") : "SALDO PENDIENTE"}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 34, color: saldo > 0 ? ROJO : VERDE }}>{fmtQ(saldo)}</Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 0.5, color: PRIMARIO }}>Beneficiarios activos</Typography>
            {fall && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Cada beneficiario tiene su propio estado de cuenta: lo que se le debe mes a mes, lo pagado y lo pendiente.</Typography>}
            {beneficiarios.length === 0 ? <Typography color="text.secondary">Sin beneficiarios activos.</Typography> : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell><TableCell>Parentesco</TableCell><TableCell align="right">Monto mensual (juez)</TableCell>
                    <TableCell align="right">Se le paga (50%)</TableCell><TableCell align="right">Estado de cuenta</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {beneficiarios.map((b) => {
                    const monto = b.monto ?? Number(resumen?.pension || 0) * (Number(b.porcentaje) / 100);
                    return (
                      <TableRow key={b.id}>
                        <TableCell>{`${b.nombres || ""} ${b.apellidos}`.trim()}</TableCell>
                        <TableCell>{b.tipoParentesco}</TableCell>
                        <TableCell align="right">{fmtQ(monto)}</TableCell>
                        <TableCell align="right">{fmtQ(monto * 0.5)}</TableCell>
                        <TableCell align="right">
                          <Button size="small" startIcon={<ReceiptLongIcon />} onClick={() => setEstadoBen(b.id)}>Ver</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 1.5, color: PRIMARIO }}>Últimos pagos</Typography>
            {pagos.length === 0 ? <Typography color="text.secondary">Sin pagos registrados.</Typography> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>Período</TableCell><TableCell>Fecha pago</TableCell><TableCell align="right">Recibido</TableCell><TableCell align="right">Al mes actual</TableCell><TableCell align="right">A meses anteriores</TableCell></TableRow></TableHead>
                <TableBody>
                  {pagos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.periodo}</TableCell>
                      <TableCell>{p.fechaPago ? String(p.fechaPago).slice(0, 10) : ""}</TableCell>
                      <TableCell align="right">{fmtQ(p.total)}</TableCell>
                      <TableCell align="right">{fmtQ(p.pagoCorriente)}</TableCell>
                      <TableCell align="right">{fmtQ(p.abono)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}

      <EstadoCuentaBeneficiario idBeneficiario={estadoBen} onClose={() => setEstadoBen(null)} />

      <Dialog open={!!ajuste} onClose={() => setAjuste(null)} fullWidth maxWidth="sm">
        <DialogTitle>Ajustar descuentos — {ajuste ? fmtPeriodo(ajuste.periodo) : ""}</DialogTitle>
        <DialogContent dividers>
          {ajuste && (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Pensión del mes: <b>{fmtQ(ajuste.datos.pension)}</b>. Escriba los descuentos correctos (por ejemplo, el saldo real del préstamo en su último mes).
              </Typography>
              {ajuste.descuentos.map((x, i) => (
                <Stack key={x.id || `n${i}`} direction="row" spacing={1} alignItems="center">
                  <TextField select size="small" label="Tipo" value={x.tipo} sx={{ flex: 1 }}
                    onChange={(e) => setAjuste((a) => ({ ...a, descuentos: a.descuentos.map((y, k) => (k === i ? { ...y, tipo: e.target.value } : y)) }))}>
                    {ajuste.datos.tipos.map((t) => <MenuItem key={t.id} value={t.id}>{t.descripcion}</MenuItem>)}
                  </TextField>
                  <TextField size="small" type="number" label="Monto (Q)" value={x.valor} sx={{ width: 150 }} inputProps={{ min: 0, step: "0.01", style: { textAlign: "right" } }}
                    onChange={(e) => setAjuste((a) => ({ ...a, descuentos: a.descuentos.map((y, k) => (k === i ? { ...y, valor: e.target.value } : y)) }))} />
                  <IconButton size="small" color="error" onClick={() => setAjuste((a) => ({ ...a, descuentos: a.descuentos.filter((_, k) => k !== i) }))}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              ))}
              <Box>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setAjuste((a) => ({ ...a, descuentos: [...a.descuentos, { tipo: 9, valor: "" }] }))}>Agregar descuento</Button>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: "#F4F6F8", borderRadius: 1.5 }}>
                <Grid container spacing={1}>
                  <Dato label="Total descuentos" valor={fmtQ(totalAjuste)} />
                  <Dato label="Líquido (se le debe)" valor={fmtQ(liquidoAjuste)} />
                  <Dato label={`Recibido en el mes (${ajuste.datos.porcentaje}%)`} valor={fmtQ(Math.round(liquidoAjuste * ajuste.datos.porcentaje) / 100)} />
                  <Dato label="Antes se le debía" valor={fmtQ(ajuste.datos.deuda?.original)} />
                </Grid>
              </Box>
              {totalAjuste > ajuste.datos.pension && <Alert severity="error">Los descuentos no pueden ser mayores que la pensión.</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAjuste(null)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarAjuste} disabled={guardandoAjuste || !ajuste || totalAjuste > (ajuste?.datos?.pension || 0)}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historiaOpen} onClose={() => setHistoriaOpen(false)} fullWidth maxWidth={gruposUsados.length > 2 ? "xl" : "lg"}>
        <DialogTitle>Historia completa</DialogTitle>
        <DialogContent dividers sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
            <b>Descuentos</b>: se muestran por tipo (solo los que tiene el jubilado); pase el mouse sobre el total para ver el detalle exacto.
            <b> Monto generado</b>: lo que vale el mes (pensión − descuentos).
            <b> Recibido en el mes</b>: lo que se le pagó en la planilla de ese mes (desde enero 2023, la mitad).
            <b> Abonado a la deuda</b>: lo pagado de la mitad pendiente de ese mes; las nóminas nuevas abonan al mes pendiente más antiguo.
            <b> Saldo</b>: lo que todavía se le debe de ese mes. Lo que se paga en cada nómina nueva se abona al mes
            pendiente más antiguo; por eso el mes de la nómina queda con su pensión completa pendiente.
            <b> EN PROCESO</b>: planilla generada que aún no se cierra.
            <b> CANCELADA</b>: mes de la deuda que se pagó fuera del sistema (toda la deuda en Fallecimientos, o un mes con el botón ✓).
            <b> Ajustar</b> (lápiz): corrige los descuentos de un mes de la carga histórica (por ejemplo, el último mes de un préstamo con saldo menor a la cuota).
            <b> AGUINALDO / BONO 14</b> (columna Ingreso): del jubilado fallecido, al 100% (proporcional a los días vividos del período, o completo si el período ya había terminado y no se le pagó); se suman a la deuda que cobra el cónyuge.
            <b> ✓ Marcar pagado</b>: un mes que ya se pagó fuera del sistema (por ejemplo, enero 2023); se confirma con un clic (queda la fecha y el usuario) y se puede revertir.
          </Typography>
          <Table size="small" stickyHeader sx={{ "& thead th": { bgcolor: "#F4F6F8", zIndex: 2 } }}>
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2}>Período</TableCell>
                <TableCell rowSpan={2}>Ingreso</TableCell>
                <TableCell rowSpan={2} align="right">Pensión completa</TableCell>
                <TableCell colSpan={gruposUsados.length + 1} align="center" sx={{ borderLeft: "1px solid #DDE3EA", borderRight: "1px solid #DDE3EA" }}>Descuentos</TableCell>
                <TableCell rowSpan={2} align="right">Monto generado</TableCell>
                <TableCell rowSpan={2} align="right">Recibido en el mes</TableCell><TableCell rowSpan={2} align="right">Abonado a la deuda</TableCell><TableCell rowSpan={2} align="right">Saldo</TableCell><TableCell rowSpan={2}>Estado</TableCell><TableCell rowSpan={2}>Tipo</TableCell>
                {canEdit(user) && <TableCell rowSpan={2} align="center">Ajustar</TableCell>}
              </TableRow>
              <TableRow sx={{ "& th": { top: 37, fontSize: 12, color: "text.secondary", py: 0.5 } }}>
                {gruposUsados.map((g, k) => (
                  <TableCell key={g.campo} align="right" sx={k === 0 ? { borderLeft: "1px solid #DDE3EA" } : undefined}>{g.titulo}</TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 700, borderRight: "1px solid #DDE3EA", ...(gruposUsados.length === 0 ? { borderLeft: "1px solid #DDE3EA" } : {}) }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historia.map((d) => {
                const color = colorEstadoDeuda(d);
                return (
                  <TableRow key={d.id} sx={{ bgcolor: `${color}14` }}>
                    <TableCell sx={{ whiteSpace: "nowrap", fontWeight: d.ingreso && d.ingreso !== "PENSIÓN" ? 700 : 400 }}>{fmtPeriodo(d.periodo)}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" label={d.ingreso || "PENSIÓN"}
                        sx={{ fontSize: 11, height: 20, ...(d.ingreso && d.ingreso !== "PENSIÓN" ? { borderColor: "#6A1B9A", color: "#6A1B9A", fontWeight: 700 } : { color: "text.secondary" }) }} />
                    </TableCell>
                    <TableCell align="right">{d.ingreso && d.ingreso !== "PENSIÓN" ? "—" : fmtQ(d.pensionCompleta)}</TableCell>
                    {gruposUsados.map((g, k) => {
                      const v = Number(d.desglose?.[g.campo] || 0);
                      return (
                        <TableCell key={g.campo} align="right" sx={{ color: v > 0 ? "inherit" : "text.disabled", ...(k === 0 ? { borderLeft: "1px solid #DDE3EA" } : {}) }}>
                          {v > 0 ? fmtQ(v) : "—"}
                        </TableCell>
                      );
                    })}
                    <TableCell align="right" sx={{ fontWeight: 600, borderRight: "1px solid #DDE3EA", ...(gruposUsados.length === 0 ? { borderLeft: "1px solid #DDE3EA" } : {}) }}>
                      {d.descuentos > 0 ? (
                        <Tooltip title={(d.detalleDescuentos || "Pensión − monto generado").split(" | ").map((t) => <div key={t}>{t}</div>)} arrow>
                          <span style={{ borderBottom: "1px dotted #999", cursor: "help" }}>{fmtQ(d.descuentos)}</span>
                        </Tooltip>
                      ) : fmtQ(0)}
                    </TableCell>
                    <TableCell align="right">{fmtQ(d.montoGenerado)}</TableCell>
                    <TableCell align="right">{fmtQ(d.recibidoMes)}</TableCell>
                    <TableCell align="right">
                      {d.sinDeuda ? "—" : d.canceladaFuera ? (
                        <Tooltip arrow title={`Pagado fuera del sistema (${d.canceladaFuera})`}>
                          <span style={{ borderBottom: "1px dotted #999", cursor: "help" }}>{fmtQ(d.montoPagado)}</span>
                        </Tooltip>
                      ) : d.pagadoCon?.length ? (
                        <Tooltip arrow title={`Pagado con la planilla de ${d.pagadoCon.map(fmtPeriodo).join(", ")}`}>
                          <span style={{ borderBottom: "1px dotted #999", cursor: "help" }}>{fmtQ(d.montoPagado)}</span>
                        </Tooltip>
                      ) : fmtQ(d.montoPagado)}
                    </TableCell>
                    <TableCell align="right">{fmtQ(d.saldo)}</TableCell>
                    <TableCell><Chip size="small" label={d.enProceso ? "EN PROCESO" : d.esDeuda ? d.estado : "HISTORIA"} sx={{ bgcolor: color, color: "#fff" }} /></TableCell>
                    <TableCell>{d.tipoPago}</TableCell>
                    {canEdit(user) && (
                      <TableCell align="center" sx={{ py: 0 }}>
                        {d.esDeuda && !d.enProceso && (!d.ingreso || d.ingreso === "PENSIÓN") && (
                          <Tooltip title="Corregir los descuentos de este mes">
                            <IconButton size="small" onClick={() => abrirAjuste(d.periodo)}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                        {d.esDeuda && !d.enProceso && !d.canceladaFuera && Number(d.saldo) > 0 && (
                          <Tooltip title="Marcar este mes como pagado fuera del sistema">
                            <IconButton size="small" color="success" onClick={() => marcarMesPagado(d)}><TaskAltIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                        {d.canceladaMes && (
                          <Tooltip title="Revertir: el mes vuelve a quedar pendiente">
                            <IconButton size="small" color="warning" onClick={() => revertirMesPagado(d)}><UndoIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions><Button onClick={() => setHistoriaOpen(false)}>Cerrar</Button></DialogActions>
      </Dialog>
    </Stack>
  );
};

export default EstadoCuentaPage;
