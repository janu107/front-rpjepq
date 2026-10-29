import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EditIcon from "@mui/icons-material/Edit";
import UndoIcon from "@mui/icons-material/Undo";
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Grid, Paper, Radio, RadioGroup, Stack,
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
import { isAdmin } from "../../utils/permissions";

const PRIMARIO = "#1F4E79";
const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hoy = () => new Date().toISOString().slice(0, 10);
const edad = (f) => { const h = new Date(); const n = new Date(f); let e = h.getFullYear() - n.getFullYear(); const m = h.getMonth() - n.getMonth(); if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e -= 1; return e; };

const FallecimientoPage = () => {
  const navigate = useNavigate();
  const [jub, setJub] = useState(null);
  const [deuda, setDeuda] = useState(0);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [form, setForm] = useState({ fechaFallecimiento: "", noDefuncion: "", metodoPago: "PAGO_NORMAL", observaciones: "" });
  const [guardando, setGuardando] = useState(false);
  const { user } = useAuth();

  // --- Fallecimientos ya registrados: corregir o revertir ---
  const [fallecidos, setFallecidos] = useState([]);
  const [corregir, setCorregir] = useState(null); // { id, nombre, fechaFallecimiento, noDefuncion }
  const cargarFallecidos = async () => {
    try { const { data } = await axiosClient.get("/jubilados/fallecidos"); setFallecidos(data.data || []); } catch { setFallecidos([]); }
  };
  useEffect(() => { cargarFallecidos(); }, []);

  const guardarCorreccion = async () => {
    try {
      const { data } = await axiosClient.put(`/jubilados/${corregir.id}/fallecimiento`, {
        fechaFallecimiento: corregir.fechaFallecimiento, noDefuncion: corregir.noDefuncion
      });
      setCorregir(null);
      cargarFallecidos();
      Swal.fire({ icon: data.data?.aviso ? "warning" : "success", title: "Fallecimiento corregido", text: data.data?.aviso || "Al generar la planilla se recalcula con la nueva fecha." });
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
      await Swal.fire("Listo", `Fallecimiento registrado. ${n} beneficiarios activados.`, "success");
      cargarFallecidos();
      if (form.metodoPago === "CONVENIO") {
        navigate("/convenios", { state: { tipo: "jubilado", id: jub.id, nombre } });
        return;
      }
      setJub(null); setBeneficiarios([]); setDeuda(0);
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
                <TableHead><TableRow><TableCell>Nombre</TableCell><TableCell>Parentesco</TableCell><TableCell align="right">%</TableCell><TableCell>Qué cobrará</TableCell><TableCell>Alerta</TableCell></TableRow></TableHead>
                <TableBody>
                  {beneficiarios.map((b) => {
                    const menor = edad(b.fechaNacimiento) < 18;
                    const alerta = menor && !b.tieneTutora;
                    return (
                      <TableRow key={b.id}>
                        <TableCell>{`${b.nombres || ""} ${b.apellidos}`.trim()}</TableCell>
                        <TableCell>{b.tipoParentesco}</TableCell>
                        <TableCell align="right">{Number(b.porcentaje).toFixed(2)}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {b.tipoParentesco === "ESPOSA"
                              ? (deuda > 0 ? "Primero la deuda del fallecido; al terminarla, viudez" : "Viudez")
                              : b.tipoParentesco === "HIJO_INVALIDEZ" ? "Orfandad (sin límite de edad)"
                                : menor ? "Orfandad hasta los 18 (se paga a la tutora)" : "Mayor de edad: solo lo que se le deba"}
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
                • <b>Esposa</b>: cobra lo que recibía el jubilado (el % de la planilla sobre su líquido) y todo se abona a su deuda
                {deuda > 0 ? <> de <b>{fmtQ(deuda)}</b></> : null}, del mes más viejo al más nuevo. Al terminarla, la planilla siguiente pasa a <b>viudez</b>:
                su % de la pensión, pagado con el mismo % de la planilla (el resto queda como deuda a su favor).<br />
                • <b>Hijos menores</b>: <b>orfandad</b>, su % de la pensión pagado con el % de la planilla, a la tutora. Al cumplir 18 se les paga
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
                      <FormControlLabel value="PAGO_NORMAL" control={<Radio />} label="Pago normal 50%" />
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
        <Typography variant="h6" sx={{ color: PRIMARIO, mb: 0.5 }}>Fallecimientos registrados</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Se puede corregir la fecha o el certificado (o revertir el registro) mientras ninguna planilla CERRADA haya pagado a sus beneficiarios.
        </Typography>
        {fallecidos.length === 0 ? (
          <Typography color="text.secondary">No hay fallecimientos registrados.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell><TableCell>Jubilado</TableCell><TableCell>Fecha fallecimiento</TableCell>
                <TableCell>Certificado</TableCell><TableCell align="center">Beneficiarios</TableCell><TableCell>Planillas</TableCell><TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fallecidos.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.codigo}</TableCell>
                  <TableCell>{f.nombre}</TableCell>
                  <TableCell>{f.fechaFallecimiento ? String(f.fechaFallecimiento).slice(0, 10).split("-").reverse().join("/") : "—"}</TableCell>
                  <TableCell>{f.noDefuncion || "—"}</TableCell>
                  <TableCell align="center">{f.beneficiarios}</TableCell>
                  <TableCell>
                    {f.planillasCerradas && <Chip size="small" color="success" variant="outlined" label={`Pagado en ${f.planillasCerradas}`} sx={{ mr: 0.5 }} />}
                    {f.planillasGeneradas && <Chip size="small" color="warning" variant="outlined" label={`Generada ${f.planillasGeneradas}`} />}
                    {!f.planillasCerradas && !f.planillasGeneradas && <Typography variant="caption" color="text.secondary">Aún sin planilla</Typography>}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {f.editable ? (
                      <>
                        <Button size="small" startIcon={<EditIcon />} onClick={() => setCorregir({ id: f.id, nombre: f.nombre, fechaFallecimiento: String(f.fechaFallecimiento || "").slice(0, 10), noDefuncion: f.noDefuncion || "" })}>Corregir</Button>
                        {isAdmin(user) && <Button size="small" color="error" startIcon={<UndoIcon />} onClick={() => revertir(f)}>Revertir</Button>}
                      </>
                    ) : <Typography variant="caption" color="text.secondary">Ya pagado: no se puede cambiar</Typography>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

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
