import GavelIcon from "@mui/icons-material/Gavel";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import {
  Alert, Button, Chip, Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import BuscadorPersona from "../../components/common/BuscadorPersona";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../utils/permissions";

const PRIMARIO = "#1F4E79";
const fmtFecha = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join("/") : "");
const hoy = () => new Date().toISOString().slice(0, 10);

const nuevoForm = () => ({ noExpediente: "", juzgado: "", fechaSentencia: "", fechaEfectiva: "", abogado: "", observaciones: "" });

const AmparistasPage = () => {
  const { user } = useAuth();
  const [jubilado, setJubilado] = useState(null);
  const [form, setForm] = useState(nuevoForm());
  const [expedienteError, setExpedienteError] = useState("");
  const [vigentes, setVigentes] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const cargarVigentes = async () => {
    try { const { data } = await axiosClient.get("/amparistas/vigentes"); setVigentes(data.data || []); } catch { setVigentes([]); }
  };
  useEffect(() => { cargarVigentes(); }, []);

  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const verificarExpediente = async () => {
    const exp = form.noExpediente.trim();
    if (!exp) { setExpedienteError(""); return; }
    try {
      const { data } = await axiosClient.get("/amparistas/verificar-expediente", { params: { exp } });
      setExpedienteError(data.data?.existe ? "Ya existe un juicio con ese expediente" : "");
    } catch { setExpedienteError(""); }
  };

  const errores = useMemo(() => {
    const e = {};
    if (form.fechaSentencia && form.fechaSentencia > hoy()) e.fechaSentencia = "No puede ser futura";
    if (form.fechaEfectiva && form.fechaSentencia && form.fechaEfectiva < form.fechaSentencia) e.fechaEfectiva = "Debe ser >= fecha de sentencia";
    return e;
  }, [form]);

  const formValido = jubilado && form.noExpediente.trim() && form.juzgado.trim() && form.fechaSentencia && form.fechaEfectiva
    && !expedienteError && Object.keys(errores).length === 0;

  const confirmar = async () => {
    if (!formValido) { Swal.fire("Validación", "Complete los campos obligatorios y corrija los errores.", "warning"); return; }
    const html = `<div style="text-align:left">
      <p>¿Confirma registrar a <b>${jubilado.nombreCompleto}</b> como AMPARISTA?</p>
      <ul style="margin-top:8px">
        <li>Cobrará el <b>100%</b> desde el <b>${fmtFecha(form.fechaEfectiva)}</b>.</li>
        <li>Su deuda vieja se recalcula al 100%.</li>
        <li>Va en nómina de amparistas (tipo 4).</li>
        <li>NO saldrá en la nómina normal.</li>
      </ul></div>`;
    const r = await Swal.fire({ title: "Registrar Amparista", html, showCancelButton: true, confirmButtonText: "Confirmar", cancelButtonText: "Cancelar", confirmButtonColor: PRIMARIO });
    if (!r.isConfirmed) return;
    try {
      setGuardando(true);
      const { data } = await axiosClient.post("/amparistas/registrar", { idJubilado: jubilado.id, ...form });
      Swal.fire("Listo", data.data?.message || "Amparista registrado.", "success");
      setJubilado(null); setForm(nuevoForm()); setExpedienteError(""); cargarVigentes();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible registrar el amparista.", "error");
    } finally { setGuardando(false); }
  };

  const revocar = async (row) => {
    const r = await Swal.fire({
      title: "Revocar amparista", input: "text", inputLabel: "Motivo de la revocación (obligatorio)",
      inputValidator: (v) => (!v || !v.trim() ? "El motivo es obligatorio" : undefined),
      icon: "warning", showCancelButton: true, confirmButtonText: "Sí, revocar", cancelButtonText: "Cancelar", confirmButtonColor: "#F44336"
    });
    if (!r.isConfirmed) return;
    try {
      await axiosClient.post(`/amparistas/${row.id}/revocar`, { motivo: r.value });
      Swal.fire("Listo", "Amparista revocado.", "success");
      cargarVigentes();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible revocar.", "error");
    }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Amparistas / Juicios" subtitle="Registro de jubilados que ganaron amparo (cobran 100%)" />

      <Paper sx={{ p: 2.5 }}>
        <BuscadorPersona
          label="Buscar jubilado (NORMAL sin juicio vigente)"
          endpoint="/jubilados/no-amparistas"
          value={jubilado}
          getOptionLabel={(o) => (o ? `${o.nombreCompleto} — ${o.dpi}` : "")}
          onSelect={setJubilado}
        />
        {jubilado && (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Typography sx={{ fontWeight: 600 }}>{jubilado.nombreCompleto}</Typography>
            <Chip label="Cobra actualmente: 50% (Normal)" color="warning" />
          </Stack>
        )}

        {jubilado && (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={4}>
              <TextField label="No. expediente *" value={form.noExpediente} onChange={setF("noExpediente")} onBlur={verificarExpediente}
                error={!!expedienteError} helperText={expedienteError} fullWidth />
            </Grid>
            <Grid item xs={12} md={8}><TextField label="Juzgado *" value={form.juzgado} onChange={setF("juzgado")} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="Fecha sentencia *" type="date" value={form.fechaSentencia} onChange={setF("fechaSentencia")} error={!!errores.fechaSentencia} helperText={errores.fechaSentencia} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="Fecha efectiva 100% *" type="date" value={form.fechaEfectiva} onChange={setF("fechaEfectiva")} error={!!errores.fechaEfectiva} helperText={errores.fechaEfectiva} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="Abogado" value={form.abogado} onChange={setF("abogado")} fullWidth /></Grid>
            <Grid item xs={12}><TextField label="Observaciones" value={form.observaciones} onChange={setF("observaciones")} multiline rows={2} fullWidth /></Grid>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<GavelIcon />} disabled={!formValido || guardando} onClick={confirmar}>Confirmar Amparista</Button>
            </Grid>
          </Grid>
        )}
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ mb: 1.5, color: PRIMARIO }}>Amparistas vigentes</Typography>
        {vigentes.length === 0 ? <Typography color="text.secondary">No hay amparistas vigentes.</Typography> : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Expediente</TableCell><TableCell>Jubilado</TableCell><TableCell>Juzgado</TableCell>
                <TableCell>F. Sentencia</TableCell><TableCell>F. Efectiva</TableCell>
                {isAdmin(user) && <TableCell align="center">Acción</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {vigentes.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.noExpediente}</TableCell>
                  <TableCell>{v.jubiladoNombre}</TableCell>
                  <TableCell>{v.juzgado}</TableCell>
                  <TableCell>{fmtFecha(v.fechaSentencia)}</TableCell>
                  <TableCell>{fmtFecha(v.fechaEfectiva)}</TableCell>
                  {isAdmin(user) && <TableCell align="center"><Button size="small" color="error" startIcon={<AutorenewIcon />} onClick={() => revocar(v)}>Revocar</Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!isAdmin(user) && <Alert severity="info" sx={{ mt: 2 }}>Solo un ADMINISTRADOR puede revocar amparistas.</Alert>}
      </Paper>
    </Stack>
  );
};

export default AmparistasPage;
