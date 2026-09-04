import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import {
  Button, Chip, FormControl, FormControlLabel, Grid, Paper, Radio, RadioGroup, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import BuscadorPersona from "../../components/common/BuscadorPersona";
import PageHeader from "../../components/common/PageHeader";

const PRIMARIO = "#1F4E79";
const TIPOS = ["MENSUAL", "QUINCENAL", "UNICO", "CUOTAS_GRANDES"];
const AUTORIZA = ["JUEZ", "JUNTA_DIRECTIVA", "ACUERDO_INTERNO"];
const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hoy = () => new Date().toISOString().slice(0, 10);

const calcFin = (tipo, inicio, cuotas) => {
  if (!inicio) return "";
  const d = new Date(`${inicio}T00:00:00`);
  if (tipo === "UNICO") return inicio;
  if (tipo === "QUINCENAL") d.setDate(d.getDate() + cuotas * 15);
  else d.setMonth(d.getMonth() + cuotas); // MENSUAL / CUOTAS_GRANDES
  return d.toISOString().slice(0, 10);
};

const nuevoForm = () => ({ tipo: "MENSUAL", cuotas: 1, fechaInicio: hoy(), autorizadoPor: "", noDocumento: "" });

const ConveniosPage = () => {
  const location = useLocation();
  const [persona, setPersona] = useState(null); // {tipo, id, nombre}
  const [deuda, setDeuda] = useState(0);
  const [form, setForm] = useState(nuevoForm());
  const [vigentes, setVigentes] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const cargarVigentes = async () => {
    try { const { data } = await axiosClient.get("/convenios/vigentes"); setVigentes(data.data || []); } catch { setVigentes([]); }
  };

  const cargarDeuda = async (tipo, id, nombre) => {
    try {
      const { data } = await axiosClient.get(`/convenios/deuda/${tipo}/${id}`);
      setPersona({ tipo, id, nombre: nombre || `${tipo} #${id}` });
      setDeuda(Number(data.data?.saldo || 0));
      setForm(nuevoForm());
    } catch { Swal.fire("Error", "No fue posible cargar la deuda.", "error"); }
  };

  useEffect(() => { cargarVigentes(); }, []);
  // Precarga desde Fallecimientos (navigate con state)
  useEffect(() => {
    const s = location.state;
    if (s?.id && s?.tipo) cargarDeuda(s.tipo, s.id, s.nombre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const cuotas = form.tipo === "UNICO" ? 1 : Math.max(parseInt(form.cuotas, 10) || 0, 0);
  const montoCuota = useMemo(() => (deuda > 0 && cuotas >= 1 ? Math.round((deuda / cuotas) * 100) / 100 : 0), [deuda, cuotas]);
  const fechaFin = useMemo(() => calcFin(form.tipo, form.fechaInicio, cuotas), [form.tipo, form.fechaInicio, cuotas]);

  const valido = persona && deuda > 0 && cuotas >= 1 && form.fechaInicio >= hoy() && form.autorizadoPor && form.noDocumento.trim();

  const guardar = async () => {
    if (!valido) { Swal.fire("Validación", "Complete los campos requeridos.", "warning"); return; }
    try {
      setGuardando(true);
      const payload = {
        tipo: form.tipo, cantidadCuotas: cuotas, deudaTotal: deuda,
        fechaInicio: form.fechaInicio, autorizadoPor: form.autorizadoPor, noDocumento: form.noDocumento,
        [persona.tipo === "jubilado" ? "idJubilado" : "idBeneficiario"]: persona.id
      };
      const { data } = await axiosClient.post("/convenios/crear", payload);
      Swal.fire("Listo", `Convenio creado. Vigencia: ${data.data?.fechaInicio} a ${data.data?.fechaFin}.`, "success");
      setPersona(null); setDeuda(0); setForm(nuevoForm()); cargarVigentes();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible crear el convenio.", "error");
    } finally { setGuardando(false); }
  };

  const cancelar = async (row) => {
    const r = await Swal.fire({ title: "Cancelar convenio", text: `Documento ${row.noDocumento}`, icon: "warning", showCancelButton: true, confirmButtonText: "Sí, cancelar", cancelButtonText: "No", confirmButtonColor: "#F44336" });
    if (!r.isConfirmed) return;
    try { await axiosClient.put(`/convenios/${row.id}/cancelar`); Swal.fire("Listo", "Convenio cancelado.", "success"); cargarVigentes(); }
    catch (error) { Swal.fire("Error", error.response?.data?.message || "No fue posible cancelar.", "error"); }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Convenios de Pago" subtitle="Acuerdos de pago de deuda de jubilados o beneficiarios" />

      <Paper sx={{ p: 2.5 }}>
        <BuscadorPersona
          label="Buscar por código, nombre o DPI (personas con deuda pendiente)"
          endpoint="/convenios/candidatos"
          value={null}
          getOptionLabel={(o) => (o ? `${o.codigo} - ${o.nombre} — ${o.dpi} (${o.tipo})` : "")}
          onSelect={(o) => (o ? cargarDeuda(o.tipo, o.id, o.nombre) : setPersona(null))}
        />
        {persona && (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Typography sx={{ fontWeight: 600 }}>{persona.nombre}</Typography>
            <Chip color="error" label={`Deuda pendiente: ${fmtQ(deuda)}`} sx={{ fontWeight: 700 }} />
          </Stack>
        )}

        {persona && (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <FormControl>
                <Typography variant="caption" color="text.secondary">Tipo de convenio</Typography>
                <RadioGroup row value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value, cuotas: e.target.value === "UNICO" ? 1 : form.cuotas })}>
                  {TIPOS.map((t) => <FormControlLabel key={t} value={t} control={<Radio />} label={t} />)}
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}><TextField label="Cantidad de cuotas" type="number" value={cuotas} onChange={setF("cuotas")} disabled={form.tipo === "UNICO"} inputProps={{ min: 1 }} fullWidth /></Grid>
            <Grid item xs={6} md={3}><TextField label="Monto por cuota" value={fmtQ(montoCuota)} InputProps={{ readOnly: true }} variant="filled" fullWidth /></Grid>
            <Grid item xs={6} md={3}><TextField label="Fecha inicio" type="date" value={form.fechaInicio} onChange={setF("fechaInicio")} inputProps={{ min: hoy() }} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={6} md={3}><TextField label="Fecha fin estimada" value={fechaFin} InputProps={{ readOnly: true }} variant="filled" fullWidth /></Grid>
            <Grid item xs={12} md={6}>
              <FormControl>
                <Typography variant="caption" color="text.secondary">Autorizado por</Typography>
                <RadioGroup row value={form.autorizadoPor} onChange={setF("autorizadoPor")}>
                  {AUTORIZA.map((a) => <FormControlLabel key={a} value={a} control={<Radio />} label={a.replace("_", " ")} />)}
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}><TextField label="No. documento *" value={form.noDocumento} onChange={setF("noDocumento")} fullWidth /></Grid>
            <Grid item xs={12}>
              <Button variant="contained" color="success" startIcon={<SaveIcon />} disabled={!valido || guardando} onClick={guardar}>Guardar</Button>
            </Grid>
          </Grid>
        )}
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ mb: 1.5, color: PRIMARIO }}>Convenios vigentes</Typography>
        {vigentes.length === 0 ? <Typography color="text.secondary">No hay convenios vigentes.</Typography> : (
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Titular</TableCell><TableCell>Tipo</TableCell><TableCell align="right">Deuda</TableCell>
              <TableCell align="right">Cuota</TableCell><TableCell>Inicio</TableCell><TableCell>Fin</TableCell><TableCell>Doc.</TableCell><TableCell align="center">Acción</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {vigentes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.titular} <Chip size="small" label={c.tipoTitular} sx={{ ml: 0.5 }} /></TableCell>
                  <TableCell>{c.tipo}</TableCell>
                  <TableCell align="right">{fmtQ(c.deudaTotal)}</TableCell>
                  <TableCell align="right">{fmtQ(c.montoCuota)}</TableCell>
                  <TableCell>{c.fechaInicio ? String(c.fechaInicio).slice(0, 10) : ""}</TableCell>
                  <TableCell>{c.fechaFin ? String(c.fechaFin).slice(0, 10) : ""}</TableCell>
                  <TableCell>{c.noDocumento}</TableCell>
                  <TableCell align="center"><Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => cancelar(c)}>Cancelar</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
};

export default ConveniosPage;
