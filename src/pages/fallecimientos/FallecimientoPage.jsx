import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EditIcon from "@mui/icons-material/Edit";
import UndoIcon from "@mui/icons-material/Undo";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import BadgeIcon from "@mui/icons-material/Badge";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import HandshakeIcon from "@mui/icons-material/Handshake";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormControlLabel, Grid, InputLabel,
  ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem, Paper, Radio, RadioGroup, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import BuscadorPersona from "../../components/common/BuscadorPersona";
import CampoFecha from "../../components/common/CampoFecha";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { canDelete } from "../../utils/permissions";

const PRIMARIO = "#1F4E79";
const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hoy = () => new Date().toISOString().slice(0, 10);
const edad = (f) => { const h = new Date(); const n = new Date(f); let e = h.getFullYear() - n.getFullYear(); const m = h.getMonth() - n.getMonth(); if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e -= 1; return e; };

// Menú de acciones de un fallecido, agrupado y con una línea de ayuda por opción.
// Las opciones que no aplican se muestran deshabilitadas con el motivo.
const AccionesFallecido = ({ grupos }) => {
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <Button size="small" variant="outlined" endIcon={<ArrowDropDownIcon />} onClick={(e) => setAnchor(e.currentTarget)}>Acciones</Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { width: 380, maxWidth: "calc(100vw - 32px)" } } }}>
        {grupos.filter((g) => g.items.length).map((g, gi) => [
          gi > 0 && <Divider key={`d${gi}`} />,
          <ListSubheader key={`h${gi}`} sx={{ lineHeight: "32px", fontWeight: 800, color: PRIMARIO }}>{g.titulo}</ListSubheader>,
          ...g.items.map((it) => (
            <MenuItem key={it.titulo} disabled={!!it.motivo} onClick={() => { setAnchor(null); it.onClick(); }}
              sx={{ alignItems: "flex-start", whiteSpace: "normal", py: 1 }}>
              <ListItemIcon sx={{ mt: 0.25, color: it.color ? `${it.color}.main` : "inherit" }}>{it.icono}</ListItemIcon>
              <ListItemText primary={it.titulo} secondary={it.motivo || it.ayuda}
                primaryTypographyProps={{ fontWeight: 700, fontSize: 14, color: it.color ? `${it.color}.main` : "text.primary" }}
                secondaryTypographyProps={{ fontSize: 12, color: it.motivo ? "warning.dark" : "text.secondary" }} />
            </MenuItem>
          ))
        ])}
      </Menu>
    </>
  );
};

const FallecimientoPage = () => {
  const navigate = useNavigate();
  const [jub, setJub] = useState(null);
  const [deuda, setDeuda] = useState(0);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [form, setForm] = useState({ fechaFallecimiento: "", noDefuncion: "", metodoPago: "PAGO_NORMAL", observaciones: "" });
  const [guardando, setGuardando] = useState(false);
  const { user } = useAuth();

  // --- Forma de cobro de la deuda del fallecido (porcentaje o convenio) ---
  const [cobro, setCobro] = useState(null); // { id, nombre, datos, modo, cuota, documento, autorizadoPor, fechaInicio, observaciones }
  const [guardandoCobro, setGuardandoCobro] = useState(false);
  const abrirCobro = async (id, nombre, modoInicial) => {
    try {
      const { data } = await axiosClient.get(`/jubilados/${id}/forma-cobro`);
      const d = data.data;
      if (!d.conyuge) { Swal.fire("Sin cónyuge", "El fallecido no tiene esposa o esposo activo: no hay a quién cobrarle la deuda.", "info"); return; }
      const c = d.convenio;
      setCobro({
        id, nombre, datos: d, modo: modoInicial || d.modo,
        cuota: c ? String(c.cuota) : "", documento: c?.documento || "", autorizadoPor: c?.autorizadoPor || "JUNTA_DIRECTIVA",
        fechaInicio: c?.fechaInicio ? String(c.fechaInicio).slice(0, 10) : hoy(), observaciones: ""
      });
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "No fue posible cargar la forma de cobro.", "error"); }
  };
  const guardarCobro = async () => {
    setGuardandoCobro(true);
    try {
      const body = cobro.modo === "CONVENIO"
        ? { modo: "CONVENIO", cuota: Number(cobro.cuota), documento: cobro.documento, autorizadoPor: cobro.autorizadoPor, fechaInicio: cobro.fechaInicio, observaciones: cobro.observaciones }
        : { modo: "PORCENTAJE", observaciones: cobro.observaciones };
      const { data } = await axiosClient.put(`/jubilados/${cobro.id}/forma-cobro`, body);
      const rec = data.data?.planillasRecalculadas || [];
      setCobro(null);
      cargarFallecidos();
      Swal.fire({ icon: "success", title: "Forma de cobro guardada",
        html: `${body.modo === "CONVENIO" ? `El cónyuge cobrará <b>${fmtQ(body.cuota)}</b> al mes hasta saldar la deuda.` : "El cónyuge cobrará como se le pagaba al fallecido (porcentaje)."}${rec.length ? `<br>Se recalculó la planilla ${rec.join(", ")}.` : "<br>Aplica desde la próxima planilla que se genere."}` });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "No fue posible guardar.", "error");
    } finally { setGuardandoCobro(false); }
  };

  // --- Fallecimientos ya registrados: corregir o revertir ---
  const [fallecidos, setFallecidos] = useState([]);
  const [corregir, setCorregir] = useState(null); // { id, nombre, fechaFallecimiento, noDefuncion }
  // Empleado EPQ que falleció en servicio (nunca fue jubilado).
  const [servicio, setServicio] = useState(null); // { aportante, codigo, fechaFallecimiento, noDefuncion, pensionReferencia, tipoJubilacion }
  const [aportantes, setAportantes] = useState([]);
  const [tiposJub, setTiposJub] = useState([]);
  const abrirServicio = async () => {
    setServicio({ aportante: null, codigo: "", fechaFallecimiento: "", noDefuncion: "", pensionReferencia: "", tipoJubilacion: 3 });
    try {
      const [a, o] = await Promise.all([axiosClient.get("/aportaciones"), axiosClient.get("/impresiones/opciones").catch(() => ({ data: {} }))]);
      setAportantes((a.data.data || []).filter((x) => String(x.estado).toUpperCase() !== "FALLECIDO"));
      setTiposJub(o.data?.data?.tiposJubilacion || []);
    } catch { setAportantes([]); }
  };
  const guardarServicio = async () => {
    try {
      const { data } = await axiosClient.post("/jubilados/fallecido-en-servicio", {
        idAportacion: servicio.aportante?.id, codigo: Number(servicio.codigo), fechaFallecimiento: servicio.fechaFallecimiento,
        noDefuncion: servicio.noDefuncion, pensionReferencia: Number(servicio.pensionReferencia), tipoJubilacion: servicio.tipoJubilacion
      });
      const d = data.data || {};
      setServicio(null);
      cargarFallecidos();
      const per = String(d.inicioBeneficios || "");
      const r = await Swal.fire({
        icon: "success", title: "Registrado",
        html: `<b>${d.codigo} — ${d.nombre}</b> quedó registrado como fallecido en servicio.<br>Ahora registre a sus <b>beneficiarios</b>:
               quedarán activos y cobran desde la planilla <b>${per.slice(4)}/${per.slice(0, 4)}</b>, sin meses atrasados ni deuda.`,
        showCancelButton: true, confirmButtonText: "Ir a Beneficiarios", cancelButtonText: "Después"
      });
      if (r.isConfirmed) navigate("/beneficiarios");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible registrarlo.", "error");
    }
  };
  // Deuda del fallecido pagada fuera del sistema: { id, nombre, deuda, meses, fecha, documento, observaciones }
  const [cancelar, setCancelar] = useState(null);
  const fmtFecha = (v) => (v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—");
  const guardarCancelacion = async () => {
    try {
      const { data } = await axiosClient.post(`/jubilados/${cancelar.id}/deuda/cancelar`, {
        fecha: cancelar.fecha, documento: cancelar.documento, observaciones: cancelar.observaciones
      });
      const d = data.data || {};
      setCancelar(null);
      cargarFallecidos();
      Swal.fire("Listo", `Se registró la deuda de ${fmtQ(d.total)} (${d.meses} ${d.meses === 1 ? "mes" : "meses"}) como pagada fuera del sistema. El cónyuge pasa a cobrar VIUDEZ.${
        d.planillasRecalculadas?.length ? ` Se recalcularon los beneficiarios de la planilla ${d.planillasRecalculadas.join(", ")} (generada).` : ""}`, "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible registrar la cancelación.", "error");
    }
  };
  const revertirCancelacion = async (f) => {
    const r = await Swal.fire({
      icon: "warning", title: "Revertir cancelación de la deuda",
      html: `La deuda de <b>${f.nombre}</b> (${fmtQ(f.cancelacion.monto)}) vuelve a quedar pendiente y el cónyuge vuelve a cobrarla.`,
      input: "text", inputLabel: "Motivo", inputValidator: (v) => (!String(v || "").trim() ? "Indique el motivo" : null),
      showCancelButton: true, confirmButtonText: "Revertir", cancelButtonText: "Cancelar", confirmButtonColor: "#c62828"
    });
    if (!r.isConfirmed) return;
    try {
      await axiosClient.post(`/jubilados/${f.id}/deuda/cancelar/revertir`, { motivo: r.value });
      cargarFallecidos();
      Swal.fire("Listo", "Cancelación revertida.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible revertir.", "error");
    }
  };
  const cargarFallecidos = async () => {
    try { const { data } = await axiosClient.get("/jubilados/fallecidos"); setFallecidos(data.data || []); } catch { setFallecidos([]); }
  };
  useEffect(() => { cargarFallecidos(); }, []);

  // Texto del ajuste de la deuda (mes proporcional y meses borrados).
  const textoAjuste = (a) => {
    if (!a) return "";
    const per = (p) => `${String(p).slice(4, 6)}/${String(p).slice(0, 4)}`;
    const partes = [];
    if (a.proporcional) partes.push(`<b>${per(a.mes)}</b> se calculó proporcional a <b>${a.dias} de 30 días</b>: se le debía ${fmtQ(a.proporcional.liquido)} (recibido ${fmtQ(a.proporcional.recibido)}).`);
    if (a.mesesBorrados?.length) partes.push(`Se quitaron de su deuda los meses posteriores: <b>${a.mesesBorrados.map(per).join(", ")}</b>.`);
    if (a.prestaciones?.length) {
      partes.push(`Se agregó a su deuda (la cobra el cónyuge): ${a.prestaciones.map((x) => `<b>${x.prestacion}</b> ${x.completo ? "completo" : "proporcional"} ${x.dias} días = ${fmtQ(x.monto)}`).join("; ")}.`);
    }
    (a.avisos || []).forEach((x) => partes.push(x));
    return partes.length ? `<br><br>${partes.join("<br>")}` : "";
  };
  const guardarCorreccion = async () => {
    try {
      const { data } = await axiosClient.put(`/jubilados/${corregir.id}/fallecimiento`, {
        fechaFallecimiento: corregir.fechaFallecimiento, noDefuncion: corregir.noDefuncion
      });
      setCorregir(null);
      cargarFallecidos();
      Swal.fire({ icon: data.data?.aviso ? "warning" : "success", title: "Fallecimiento corregido",
        html: `${data.data?.aviso || "Al generar la planilla se recalcula con la nueva fecha."}${textoAjuste(data.data?.ajuste)}` });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible corregir.", "error");
    }
  };

  const revertir = async (f) => {
    const r = await Swal.fire({
      icon: "warning", title: "Revertir fallecimiento",
      html: `<b>${f.codigo} — ${f.nombre}</b> vuelve a quedar <b>ACTIVO</b> y sus beneficiarios a <b>REGISTRADO</b>, como si no se hubiera registrado el fallecimiento.`,
      showCancelButton: true, confirmButtonText: "Revertir", cancelButtonText: "Cancelar", confirmButtonColor: "#c62828"
    });
    if (!r.isConfirmed) return;
    try {
      await axiosClient.post(`/jubilados/${f.id}/fallecimiento/revertir`, {});
      cargarFallecidos();
      Swal.fire("Listo", "Fallecimiento revertido.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible revertir.", "error");
    }
  };

  const seleccionar = async (opt) => {
    setForm({ fechaFallecimiento: "", noDefuncion: "", metodoPago: "PAGO_NORMAL", observaciones: "" });
    if (!opt) { setJub(null); setDeuda(0); setBeneficiarios([]); return; }
    try {
      const [g, d, b] = await Promise.all([
        axiosClient.get(`/jubilados/${opt.id}`),
        axiosClient.get(`/jubilados/${opt.id}/deuda-total`),
        axiosClient.get(`/jubilados/${opt.id}/beneficiarios-registrados`)
      ]);
      setJub(g.data.data); setDeuda(Number(d.data.data?.deudaTotal || 0)); setBeneficiarios(b.data.data || []);
    } catch { Swal.fire("Error", "No fue posible cargar los datos del jubilado.", "error"); }
  };

  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const sinBeneficiarios = jub && beneficiarios.length === 0;
  const fechaJub = jub?.fechaJubilacion ? String(jub.fechaJubilacion).slice(0, 10) : null;

  const errFecha = (() => {
    if (!form.fechaFallecimiento) return "";
    if (form.fechaFallecimiento > hoy()) return "No puede ser futura";
    if (fechaJub && form.fechaFallecimiento < fechaJub) return "No puede ser anterior a la jubilación";
    return "";
  })();

  const formValido = jub && !sinBeneficiarios && form.fechaFallecimiento && !errFecha && form.noDefuncion.trim();

  const confirmar = async () => {
    if (!formValido) { Swal.fire("Validación", "Complete los campos y corrija los errores.", "warning"); return; }
    const nombre = `${jub.nombres} ${jub.apellidos}`;
    const r = await Swal.fire({
      title: "Confirmar Fallecimiento",
      html: `<p>¿Confirma el fallecimiento de <b>${nombre}</b>? Se activarán <b>${beneficiarios.length}</b> beneficiarios.</p><p style="color:#F44336"><b>Esta acción NO se puede deshacer.</b></p>`,
      icon: "warning", showCancelButton: true, confirmButtonText: "Confirmar", cancelButtonText: "Cancelar", confirmButtonColor: "#F44336"
    });
    if (!r.isConfirmed) return;
    try {
      setGuardando(true);
      const { data } = await axiosClient.post(`/jubilados/${jub.id}/fallecimiento`, {
        fechaFallecimiento: form.fechaFallecimiento, noDefuncion: form.noDefuncion
      });
      const n = data.data?.beneficiariosActivados ?? beneficiarios.length;
      await Swal.fire({ icon: "success", title: "Listo", html: `Fallecimiento registrado. ${n} beneficiarios activados.${textoAjuste(data.data?.ajuste)}` });
      cargarFallecidos();
      const idFallecido = jub.id;
      setJub(null); setBeneficiarios([]); setDeuda(0);
      // Convenio: se define de una vez la cuota mensual.
      if (form.metodoPago === "CONVENIO") abrirCobro(idFallecido, nombre, "CONVENIO");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible registrar el fallecimiento.", "error");
    } finally { setGuardando(false); }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Registrar Fallecimiento" subtitle="Marca al jubilado como fallecido y activa a sus beneficiarios" />

      <Paper sx={{ p: 2.5 }}>
        <BuscadorPersona
          label="Buscar jubilado por código, nombre o DPI (solo vivos)"
          endpoint="/jubilados/buscar"
          extraParams={{ estado: "ACTIVO" }}
          value={null}
          getOptionLabel={(o) => (o ? `${o.idJubilado} - ${o.nombreCompleto} — ${o.dpi}` : "")}
          onSelect={seleccionar}
        />
      </Paper>

      {jub && (
        <Paper sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}><Typography variant="h6" sx={{ color: PRIMARIO }}>{jub.nombres} {jub.apellidos}</Typography></Grid>
            <Grid item xs={12} md={6} textAlign={{ md: "right" }}><Chip color="error" label={`Deuda acumulada: ${fmtQ(deuda)}`} sx={{ fontWeight: 700 }} /></Grid>
          </Grid>

          {sinBeneficiarios ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              Este jubilado no tiene beneficiarios registrados. Registre beneficiarios antes de continuar.
            </Alert>
          ) : (
            <>
              <Typography sx={{ mt: 2, mb: 1, fontWeight: 600 }}>Beneficiarios que se activarán:</Typography>
              <Table size="small">
                <TableHead><TableRow><TableCell>Nombre</TableCell><TableCell>Parentesco</TableCell><TableCell align="right">Monto mensual</TableCell><TableCell>Qué cobrará</TableCell><TableCell>Alerta</TableCell></TableRow></TableHead>
                <TableBody>
                  {beneficiarios.map((b) => {
                    const menor = edad(b.fechaNacimiento) < 18;
                    const alerta = menor && !b.tieneTutora;
                    return (
                      <TableRow key={b.id}>
                        <TableCell>{`${b.nombres || ""} ${b.apellidos}`.trim()}</TableCell>
                        <TableCell>{b.tipoParentesco}</TableCell>
                        <TableCell align="right">{b.monto !== null && b.monto !== undefined ? fmtQ(b.monto) : `${Number(b.porcentaje).toFixed(2)}%`}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {["ESPOSA", "ESPOSO"].includes(b.tipoParentesco)
                              ? (deuda > 0 ? "Primero la deuda del fallecido; al terminarla, viudez" : "Viudez")
                              : b.tipoParentesco === "HIJO_INVALIDEZ" ? "Orfandad (sin límite de edad)"
                                : b.tipoParentesco !== "HIJO" ? "Solo registro (aún sin regla de pago)"
                                : menor ? "Orfandad hasta los 18 (se paga al tutor)" : "Mayor de edad: solo lo que se le deba"}
                          </Typography>
                        </TableCell>
                        <TableCell>{alerta && <Chip size="small" color="warning" icon={<WarningAmberIcon />} label="Menor sin tutora" />}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <Alert severity="info" sx={{ mt: 2 }}>
                <b>Cómo se paga a los beneficiarios</b> (en la planilla de jubilados):<br />
                • <b>Cónyuge</b> (viuda o viudo): cobra lo que recibía el jubilado (el % de la planilla sobre su líquido) y todo se abona a su deuda
                {deuda > 0 ? <> de <b>{fmtQ(deuda)}</b></> : null}, del mes más viejo al más nuevo. Al terminarla, la planilla siguiente pasa a <b>viudez</b>:
                su monto, pagado con el mismo % de la planilla (el resto queda como deuda a su favor).<br />
                • <b>Hijos menores</b>: <b>orfandad</b>, su monto pagado con el % de la planilla, a su tutor (madre, tío, tía u otro mayor de edad). Al cumplir 18 se les paga
                de una vez lo que se les debe y dejan de cobrar.
              </Alert>

              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={4}>
                  <CampoFecha label="Fecha fallecimiento *" value={form.fechaFallecimiento} onChange={(v) => setForm((f) => ({ ...f, fechaFallecimiento: v }))} />
                  {errFecha && <Typography variant="caption" color="error">{errFecha}</Typography>}
                </Grid>
                <Grid item xs={12} md={4}><TextField label="No. certificado defunción *" value={form.noDefuncion} onChange={setF("noDefuncion")} inputProps={{ maxLength: 50 }} fullWidth /></Grid>
                <Grid item xs={12} md={4}>
                  <FormControl>
                    <Typography variant="caption" color="text.secondary">Método pago deuda</Typography>
                    <RadioGroup row value={form.metodoPago} onChange={setF("metodoPago")}>
                      <FormControlLabel value="PAGO_NORMAL" control={<Radio />} label="Por porcentaje" />
                      <FormControlLabel value="CONVENIO" control={<Radio />} label="Convenio" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid item xs={12}><TextField label="Observaciones" value={form.observaciones} onChange={setF("observaciones")} multiline rows={2} fullWidth /></Grid>
                <Grid item xs={12}>
                  <Button variant="contained" color="error" disabled={!formValido || guardando} onClick={confirmar}>Confirmar Fallecimiento</Button>
                  {!formValido && !sinBeneficiarios && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      {!form.fechaFallecimiento ? "Falta la fecha de fallecimiento." : errFecha ? errFecha : !form.noDefuncion.trim() ? "Falta el No. de certificado de defunción." : ""}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </>
          )}
        </Paper>
      )}

      {/* Fallecimientos ya registrados */}
      <Paper sx={{ p: 2.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box>
            <Typography variant="h6" sx={{ color: PRIMARIO }}>Empleado EPQ que falleció en servicio</Typography>
            <Typography variant="body2" color="text.secondary">
              Si falleció mientras aportaba (nunca fue jubilado), regístrelo aquí para asignarle beneficiarios. No tiene deuda:
              su cónyuge entra directo a <b>viudez</b> y sus hijos a <b>orfandad</b>, desde la próxima planilla.
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<BadgeIcon />} onClick={abrirServicio} sx={{ whiteSpace: "nowrap", flex: "none" }}>Registrar fallecido en servicio</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ color: PRIMARIO, mb: 0.5 }}>Fallecimientos registrados</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          En <b>Acciones</b> de cada fallecido: la <b>forma de cobro</b> de su deuda (porcentaje o convenio), registrar que la deuda <b>ya se pagó fuera del sistema</b>
          (el cónyuge pasa directo a VIUDEZ), y <b>corregir o revertir</b> el registro mientras ninguna planilla CERRADA haya pagado a sus beneficiarios.
        </Typography>
        {fallecidos.length === 0 ? (
          <Typography color="text.secondary">No hay fallecimientos registrados.</Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell><TableCell>Jubilado</TableCell><TableCell>Fecha fallecimiento</TableCell>
                <TableCell>Certificado</TableCell><TableCell align="center">Beneficiarios</TableCell><TableCell>Deuda del fallecido</TableCell>
                <TableCell>Planillas</TableCell><TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fallecidos.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.codigo}</TableCell>
                  <TableCell>{f.nombre}{f.enServicio && <Chip size="small" color="info" variant="outlined" label="Falleció en servicio" sx={{ display: "flex", width: "fit-content", mt: 0.5 }} />}</TableCell>
                  <TableCell>{f.fechaFallecimiento ? String(f.fechaFallecimiento).slice(0, 10).split("-").reverse().join("/") : "—"}</TableCell>
                  <TableCell>{f.noDefuncion || "—"}</TableCell>
                  <TableCell align="center">{f.beneficiarios}</TableCell>
                  <TableCell>
                    {f.cancelacion ? (
                      <>
                        <Chip size="small" color="success" icon={<TaskAltIcon />} label={`Pagada fuera del sistema · ${fmtQ(f.cancelacion.monto)}`} />
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {fmtFecha(f.cancelacion.fecha)} · {f.cancelacion.documento}
                        </Typography>
                      </>
                    ) : f.deudaPendiente > 0 ? (
                      <>
                        <Chip size="small" color="error" variant="outlined" label={`${fmtQ(f.deudaPendiente)} pendiente`} />
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{f.mesesPendientes} {f.mesesPendientes === 1 ? "mes" : "meses"} · la cobra el cónyuge</Typography>
                        <Chip size="small" variant="outlined" color={f.cuotaConvenio ? "secondary" : "default"} sx={{ mt: 0.5 }}
                          label={f.cuotaConvenio ? `Convenio · ${fmtQ(f.cuotaConvenio)}/mes` : "Por porcentaje"} />
                      </>
                    ) : <Chip size="small" color="success" variant="outlined" label={f.enServicio ? "Sin deuda (en servicio)" : "Saldada"} />}
                  </TableCell>
                  <TableCell>
                    {f.planillasCerradas && <Chip size="small" color="success" variant="outlined" label={`Pagado en ${f.planillasCerradas}`} sx={{ mr: 0.5 }} />}
                    {f.planillasGeneradas && <Chip size="small" color="warning" variant="outlined" label={`Generada ${f.planillasGeneradas}`} />}
                    {!f.planillasCerradas && !f.planillasGeneradas && <Typography variant="caption" color="text.secondary">Aún sin planilla</Typography>}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" startIcon={<ReceiptLongIcon />} onClick={() => navigate("/estado-cuenta", { state: { id: f.id } })}>Estado de cuenta</Button>
                      <AccionesFallecido grupos={[
                        {
                          titulo: "Deuda del fallecido",
                          items: f.enServicio
                            ? [{ titulo: "Sin deuda", icono: <TaskAltIcon fontSize="small" />, motivo: "Falleció en servicio: el cónyuge y los hijos cobran directo su pensión.", onClick: () => {} }]
                            : [
                              {
                                titulo: "Forma de cobro", icono: <HandshakeIcon fontSize="small" />, color: "secondary",
                                ayuda: `Cómo cobra el cónyuge la deuda (hoy: ${f.cuotaConvenio ? `convenio ${fmtQ(f.cuotaConvenio)}/mes` : "por porcentaje"}). Cambiar a porcentaje o convenio.`,
                                motivo: f.cancelacion ? "La deuda ya se pagó fuera del sistema." : f.deudaPendiente > 0 ? null : "No tiene deuda pendiente.",
                                onClick: () => abrirCobro(f.id, f.nombre)
                              },
                              ...(f.cancelacion ? [{
                                titulo: "Revertir pago fuera del sistema", icono: <UndoIcon fontSize="small" />, color: "warning",
                                ayuda: "Se registró por error: la deuda vuelve a quedar pendiente y el cónyuge vuelve a cobrarla.",
                                motivo: canDelete(user) ? null : "Necesita nivel Total en Jubilados (o ser administrador).",
                                onClick: () => revertirCancelacion(f)
                              }] : [{
                                titulo: "Registrar deuda pagada fuera del sistema", icono: <TaskAltIcon fontSize="small" />, color: "success",
                                ayuda: "La deuda ya se le pagó al cónyuge (caja, cheque, resolución): pasa directo a VIUDEZ.",
                                motivo: f.deudaPendiente > 0 ? null : "No tiene deuda pendiente.",
                                onClick: () => setCancelar({ id: f.id, nombre: f.nombre, deuda: f.deudaPendiente, meses: f.mesesPendientes, fecha: hoy(), documento: "", observaciones: "" })
                              }])
                            ]
                        },
                        {
                          titulo: "Registro del fallecimiento",
                          items: [
                            {
                              titulo: "Corregir fecha o certificado", icono: <EditIcon fontSize="small" />,
                              ayuda: "Recalcula el mes proporcional y el aguinaldo y bono 14 del fallecido.",
                              motivo: f.editable ? null : "Ya se pagó a sus beneficiarios en una planilla cerrada: no se puede cambiar.",
                              onClick: () => setCorregir({ id: f.id, nombre: f.nombre, fechaFallecimiento: String(f.fechaFallecimiento || "").slice(0, 10), noDefuncion: f.noDefuncion || "" })
                            },
                            ...(f.enServicio ? [] : [{
                              titulo: "Revertir fallecimiento", icono: <PersonOffIcon fontSize="small" />, color: "error",
                              ayuda: "Se registró por error: vuelve a ser jubilado activo y sus beneficiarios a REGISTRADO.",
                              motivo: !f.editable ? "Ya se pagó a sus beneficiarios en una planilla cerrada." : canDelete(user) ? null : "Necesita nivel Total en Jubilados (o ser administrador).",
                              onClick: () => revertir(f)
                            }])
                          ]
                        }
                      ]} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </Box>
        )}
      </Paper>

      <Dialog open={!!servicio} onClose={() => setServicio(null)} fullWidth maxWidth="sm">
        <DialogTitle>Empleado EPQ que falleció en servicio</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Autocomplete
              options={aportantes} value={servicio?.aportante || null} autoHighlight autoSelect
              onChange={(_, v) => setServicio((x) => ({ ...x, aportante: v, codigo: v ? String(v.idAportacion) : "" }))}
              getOptionLabel={(o) => `${o.idAportacion} — ${o.nombre} ${o.apellido} — ${o.dpi}`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              filterOptions={(ops, { inputValue }) => {
                const t = inputValue.trim().toLowerCase().split(/\s+/).filter(Boolean);
                return ops.filter((o) => t.every((w) => `${o.idAportacion} ${o.nombre} ${o.apellido} ${o.dpi}`.toLowerCase().includes(w))).slice(0, 50);
              }}
              renderInput={(p) => <TextField {...p} label="Empleado EPQ *" placeholder="Código, nombre o DPI" />}
            />
            <TextField label="Código con el que quedará registrado *" value={servicio?.codigo || ""} type="number"
              helperText="Se propone su código de empleado EPQ; cámbielo si ya lo usa otro jubilado"
              onChange={(e) => setServicio((x) => ({ ...x, codigo: e.target.value }))} fullWidth />
            <CampoFecha label="Fecha de fallecimiento *" value={servicio?.fechaFallecimiento || ""} onChange={(v) => setServicio((x) => ({ ...x, fechaFallecimiento: v }))} />
            <TextField label="No. certificado de defunción *" value={servicio?.noDefuncion || ""} inputProps={{ maxLength: 50 }}
              onChange={(e) => setServicio((x) => ({ ...x, noDefuncion: e.target.value.toUpperCase() }))} fullWidth />
            <TextField label="Pensión de referencia (Q) *" type="number" value={servicio?.pensionReferencia || ""}
              helperText="La pensión que le hubiera correspondido: el cónyuge recibe hasta el 50% y los hijos, entre todos, hasta el otro 50%"
              onChange={(e) => setServicio((x) => ({ ...x, pensionReferencia: e.target.value }))} fullWidth />
            {tiposJub.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Tipo de jubilación</InputLabel>
                <Select label="Tipo de jubilación" value={servicio?.tipoJubilacion || 3} onChange={(e) => setServicio((x) => ({ ...x, tipoJubilacion: e.target.value }))}>
                  {tiposJub.map((t) => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <Alert severity="info">El empleado EPQ queda en estado <b>FALLECIDO</b> (deja de aportar). Después registre a sus beneficiarios en <b>Beneficiarios</b>.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServicio(null)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarServicio}
            disabled={!servicio?.aportante || !servicio?.codigo || !servicio?.fechaFallecimiento || !String(servicio?.noDefuncion || "").trim() || !(Number(servicio?.pensionReferencia) > 0)}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!cancelar} onClose={() => setCancelar(null)} fullWidth maxWidth="sm">
        <DialogTitle>Deuda del fallecido pagada fuera del sistema — {cancelar?.nombre}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Alert severity="info">
              Se marcará{cancelar?.meses === 1 ? "" : "n"} como <b>pagado{cancelar?.meses === 1 ? "" : "s"}</b> {cancelar?.meses === 1 ? "el mes pendiente" : `los ${cancelar?.meses} meses pendientes`} (<b>{fmtQ(cancelar?.deuda)}</b>). Desde la próxima planilla
              el cónyuge ya no cobra la deuda: cobra su <b>pensión por VIUDEZ</b> (su monto, con la regla del 50%). Los hijos siguen igual.
            </Alert>
            <CampoFecha label="Fecha en que se pagó *" value={cancelar?.fecha || ""} onChange={(v) => setCancelar((c) => ({ ...c, fecha: v }))} />
            <TextField label="Documento que lo respalda *" placeholder="Resolución, acta, No. de cheque…" value={cancelar?.documento || ""}
              inputProps={{ maxLength: 100 }} onChange={(e) => setCancelar((c) => ({ ...c, documento: e.target.value.toUpperCase() }))} fullWidth />
            <TextField label="Observaciones" value={cancelar?.observaciones || ""} multiline minRows={2} inputProps={{ maxLength: 500 }}
              onChange={(e) => setCancelar((c) => ({ ...c, observaciones: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelar(null)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={guardarCancelacion}
            disabled={!cancelar?.fecha || !String(cancelar?.documento || "").trim()}>Registrar pago</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!cobro} onClose={() => setCobro(null)} fullWidth maxWidth="sm">
        <DialogTitle>Forma de cobro de la deuda — {cobro?.nombre}</DialogTitle>
        <DialogContent dividers>
          {cobro && (() => {
            const d = cobro.datos;
            const cuota = Number(cobro.cuota || 0);
            const meses = (q) => (q > 0 ? Math.ceil(d.pendiente / q) : null);
            return (
              <Stack spacing={1.5}>
                <Typography variant="body2">
                  La cobra <b>{d.conyuge.nombre}</b> ({d.conyuge.parentesco}). Deuda pendiente: <b>{fmtQ(d.pendiente)}</b>.
                </Typography>
                <RadioGroup value={cobro.modo} onChange={(e) => setCobro((c) => ({ ...c, modo: e.target.value }))}>
                  <FormControlLabel value="PORCENTAJE" control={<Radio />} label={
                    <span>Por porcentaje (como se le pagaba al fallecido): {d.porcentaje}% de su último líquido {fmtQ(d.ultimoLiquido)} = <b>{fmtQ(d.cuotaPorcentaje)}</b>/mes{meses(d.cuotaPorcentaje) ? ` · ≈ ${meses(d.cuotaPorcentaje)} meses` : ""}</span>
                  } />
                  <FormControlLabel value="CONVENIO" control={<Radio />} label="Por convenio: una cuota mensual fija acordada" />
                </RadioGroup>
                {cobro.modo === "CONVENIO" && (
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Cuota mensual (Q) *" type="number" size="small" fullWidth value={cobro.cuota}
                        inputProps={{ min: 0, step: "0.01" }} onChange={(e) => setCobro((c) => ({ ...c, cuota: e.target.value }))}
                        helperText={cuota > 0 ? `≈ ${meses(cuota)} meses para saldar` : " "} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <CampoFecha label="Desde (fecha de inicio) *" value={cobro.fechaInicio} onChange={(v) => setCobro((c) => ({ ...c, fechaInicio: v }))} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="No. documento del convenio *" size="small" fullWidth value={cobro.documento} inputProps={{ maxLength: 100 }}
                        onChange={(e) => setCobro((c) => ({ ...c, documento: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField select label="Autorizado por *" size="small" fullWidth value={cobro.autorizadoPor}
                        onChange={(e) => setCobro((c) => ({ ...c, autorizadoPor: e.target.value }))}>
                        <MenuItem value="JUNTA_DIRECTIVA">Junta directiva</MenuItem>
                        <MenuItem value="JUEZ">Juez</MenuItem>
                        <MenuItem value="ACUERDO_INTERNO">Acuerdo interno</MenuItem>
                      </TextField>
                    </Grid>
                  </Grid>
                )}
                <TextField label="Observaciones" size="small" fullWidth multiline rows={2} value={cobro.observaciones}
                  onChange={(e) => setCobro((c) => ({ ...c, observaciones: e.target.value }))} />
                {d.convenio && (
                  <Alert severity="info">
                    Convenio vigente: {fmtQ(d.convenio.cuota)}/mes desde {fmtFecha(d.convenio.fechaInicio)} · doc. {d.convenio.documento}.
                    {cobro.modo === "CONVENIO" ? " Al guardar se reemplaza por el nuevo." : " Al guardar se cancela y vuelve a porcentaje."}
                  </Alert>
                )}
                <Alert severity="warning" variant="outlined">Aplica desde la planilla que se genere; si hay una planilla de jubilados generada sin cerrar, se recalcula.</Alert>
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCobro(null)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarCobro}
            disabled={guardandoCobro || !cobro || (cobro.modo === "CONVENIO" && (!(Number(cobro.cuota) > 0) || !cobro.documento.trim() || !cobro.fechaInicio))}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!corregir} onClose={() => setCorregir(null)} fullWidth maxWidth="sm">
        <DialogTitle>Corregir fallecimiento — {corregir?.nombre}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <CampoFecha label="Fecha fallecimiento *" value={corregir?.fechaFallecimiento || ""} onChange={(v) => setCorregir((c) => ({ ...c, fechaFallecimiento: v }))} />
            <TextField label="No. certificado defunción *" value={corregir?.noDefuncion || ""} inputProps={{ maxLength: 50 }}
              onChange={(e) => setCorregir((c) => ({ ...c, noDefuncion: e.target.value }))} fullWidth />
            <Alert severity="info">Si la planilla del mes ya está GENERADA con sus beneficiarios, reviértala y genérela de nuevo para recalcular.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCorregir(null)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarCorreccion}
            disabled={!corregir?.fechaFallecimiento || !String(corregir?.noDefuncion || "").trim()}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default FallecimientoPage;
