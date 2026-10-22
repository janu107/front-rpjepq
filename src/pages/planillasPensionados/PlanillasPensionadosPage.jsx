import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import HistoryIcon from "@mui/icons-material/History";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const formatPeriodo = (p) => { if (!p) return "-"; const s = String(p); return `${MESES[parseInt(s.slice(4,6))-1] || ""} ${s.slice(0,4)}`; };
const money = (v) => `Q ${Number(v||0).toLocaleString("es-GT",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = (d) => d ? String(d).slice(0,10) : "-";

const ESTADO_COLORS = {
  ABIERTA: { color: "success", label: "ABIERTA" },
  GENERADA: { color: "info", label: "GENERADA" },
  CERRADA: { color: "default", label: "CERRADA" },
  REVERSADA: { color: "error", label: "REVERSADA" }
};

const EstadoBadge = ({ estado }) => {
  const cfg = ESTADO_COLORS[estado] || { color: "default", label: estado || "-" };
  return <Chip size="small" color={cfg.color} label={cfg.label} />;
};

const initialForm = { tipoPlanilla: 2, numero: "", fechaInicio: "", fechaFinal: "", fechaPago: "", porcentajePago: "50.00" };
const initialDeudaForm = { periodoFinal: "", porcentaje: "50.00" };

const PlanillasPensionadosPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.rol?.toUpperCase() === "ADMIN";

  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deudaDialogOpen, setDeudaDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [deudaForm, setDeudaForm] = useState(initialDeudaForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // CAMBIO X: la planilla de pensionados es siempre NÓMINA JUBILADOS; ya no
      // se carga el catálogo de tipos para elegir.
      const r1 = await axiosClient.get("/planillas-pensionados");
      setPlanillas(r1.data.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    // Leer las fechas del formulario también cubre el autocompletado del navegador,
    // que puede mostrar un valor sin haber actualizado el estado de React.
    const fields = new FormData(event.currentTarget);
    const payload = {
      ...form,
      fechaInicio: fields.get("fechaInicio"),
      fechaFinal: fields.get("fechaFinal"),
      fechaPago: fields.get("fechaPago")
    };
    setSaving(true);
    try {
      await axiosClient.post("/planillas-pensionados", payload);
      setDialogOpen(false);
      setForm(initialForm);
      Swal.fire("Éxito", "Planilla creada correctamente", "success");
      load();
    } catch (_) {}
    finally { setSaving(false); }
  };

  const handleDeudaHistorica = async () => {
    const confirm = await Swal.fire({
      title: "Carga histórica de jubilados",
      text: `Se crearán las planillas mensuales desde la jubilación más antigua hasta el mes anterior. Antes de ${formatPeriodo(deudaForm.periodoFinal)} se paga completo; desde ${formatPeriodo(deudaForm.periodoFinal)} se paga el ${deudaForm.porcentaje}% y el resto queda como deuda. ¿Continuar?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, generar",
      cancelButtonText: "Cancelar"
    });
    if (!confirm.isConfirmed) return;
    setSaving(true);
    try {
      const res = await axiosClient.post("/planillas-pensionados/deuda-historica/masivo", {
        periodoDeuda: deudaForm.periodoFinal,
        porcentaje: deudaForm.porcentaje
      });
      const r = res.data.data || {};
      setDeudaDialogOpen(false);
      setDeudaForm(initialDeudaForm);
      Swal.fire({
        title: "Carga histórica completada",
        icon: "success",
        html: `<div style="text-align:left;font-size:14px;line-height:1.7">
          <b>Rango:</b> ${r.periodoInicio ? formatPeriodo(String(r.periodoInicio)) : "—"} a ${r.periodoFin ? formatPeriodo(String(r.periodoFin)) : "—"}<br/>
          <b>Jubilados con pensión:</b> ${r.jubiladosProcesados ?? 0}<br/>
          <b>Planillas creadas:</b> ${r.planillasCreadas ?? 0}<br/>
          <b>Pagos registrados:</b> ${r.renglones ?? 0}<br/>
          <b>Deudas nuevas:</b> ${r.totalDeudas ?? 0}${r.deudasAjustadas ? ` &nbsp;·&nbsp; ajustadas: ${r.deudasAjustadas}` : ""}${r.deudasEliminadas ? ` &nbsp;·&nbsp; quitadas (meses pagados completos): ${r.deudasEliminadas}` : ""}<br/>
          ${r.sinPension ? `<b>Omitidos sin pensión:</b> ${r.sinPension} (entrarán cuando tengan valor)<br/>` : ""}
          <span style="color:#666">Lo que ya existía con pagos no se modificó. Puede volver a ejecutarse sin duplicar.</span>
        </div>`
      });
    } catch (_) {}
    finally { setSaving(false); }
  };

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setDF = (k, v) => setDeudaForm((p) => ({ ...p, [k]: v }));

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Planilla de Jubilados y Amparistas</Typography>
          <Typography variant="body2" color="text.secondary">Gestión del proceso de nómina mensual de pensionados</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {isAdmin && (
            <Button variant="outlined" startIcon={<HistoryIcon />} onClick={() => setDeudaDialogOpen(true)}>
              Carga Deuda Histórica
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(initialForm); setDialogOpen(true); }}>
            Nueva Planilla
          </Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f5f7fa" }}>
              <TableCell>Tipo</TableCell>
              <TableCell>Número</TableCell>
              <TableCell>Fecha Inicio</TableCell>
              <TableCell>Fecha Final</TableCell>
              <TableCell>Fecha Pago</TableCell>
              <TableCell align="center">%</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Total Ingresos</TableCell>
              <TableCell align="right">Neto a Pagar</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {planillas.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{p.tipoPlanillaNombre || p.tipoPlanillaDescripcion || "-"}</TableCell>
                <TableCell>{formatPeriodo(p.numero)}</TableCell>
                <TableCell>{fmtDate(p.fechaInicio)}</TableCell>
                <TableCell>{fmtDate(p.fechaFinal)}</TableCell>
                <TableCell>{fmtDate(p.fechaPago)}</TableCell>
                <TableCell align="center">{p.porcentajePago}%</TableCell>
                <TableCell><EstadoBadge estado={p.estadoProceso} /></TableCell>
                <TableCell align="right">{money(p.totalIngresos)}</TableCell>
                <TableCell align="right"><b>{money(p.netoPagar)}</b></TableCell>
                <TableCell align="center">
                  <Button
                    size="small" variant="outlined" startIcon={<VisibilityIcon />}
                    onClick={() => navigate(`/planillas-pensionados/${p.id}`)}
                  >
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !planillas.length && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <AssignmentIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1, display: "block", mx: "auto" }} />
                  <Typography color="text.secondary">No hay planillas de pensionados registradas</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog: Nueva Planilla */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ component: "form", onSubmit: handleCreate }}>
        <DialogTitle>Nueva Planilla de Jubilados o Amparistas</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              {/* Un solo lugar para las dos nóminas de jubilados: la normal
                  (tipo 2) y la de amparistas (tipo 4, siempre al 100%). */}
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Planilla</InputLabel>
                <Select
                  label="Tipo de Planilla"
                  value={form.tipoPlanilla || 2}
                  onChange={(e) => {
                    const tipo = Number(e.target.value);
                    // Los amparistas cobran el 100% por sentencia judicial.
                    setForm((f) => ({ ...f, tipoPlanilla: tipo, porcentajePago: tipo === 4 ? "100.00" : f.porcentajePago }));
                  }}
                >
                  <MenuItem value={2}>NÓMINA JUBILADOS (normal)</MenuItem>
                  <MenuItem value={4}>NÓMINA AMPARISTAS (100%)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Número (YYYYMM)" value={form.numero}
                onChange={(e) => setF("numero", e.target.value)}
                inputProps={{ maxLength: 6, pattern: "[0-9]*" }}
                helperText="Ej: 202606 para junio 2026"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Porcentaje a Pagar (%)" type="number"
                value={form.porcentajePago} onChange={(e) => setF("porcentajePago", e.target.value)}
                inputProps={{ min: 1, max: 100, step: 0.01 }}
                helperText="Normalmente 50.00%"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Fecha Inicio" name="fechaInicio" type="date" required value={form.fechaInicio}
                onChange={(e) => setF("fechaInicio", e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Fecha Final" name="fechaFinal" type="date" required value={form.fechaFinal}
                onChange={(e) => setF("fechaFinal", e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Fecha de Pago" name="fechaPago" type="date" required value={form.fechaPago}
                onChange={(e) => setF("fechaPago", e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Crear Planilla"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Carga deuda histórica */}
      <Dialog open={deudaDialogOpen} onClose={() => setDeudaDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Carga Histórica de Jubilados</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Crea las planillas de jubilados mes a mes, desde la fecha de jubilación más antigua hasta el mes anterior
            al actual (pago el último día de cada mes). Cada jubilado entra desde su propia fecha de jubilación y solo
            si tiene pensión configurada.
            <br /><br />
            <b>Antes del período</b> indicado se registra el pago completo. <b>Desde ese período</b> se paga el
            porcentaje y la diferencia queda como deuda, que las nóminas siguientes van completando mes a mes.
            Se puede volver a ejecutar: lo que ya existe no se duplica.
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Período desde el que se paga el porcentaje (YYYYMM)" value={deudaForm.periodoFinal}
                onChange={(e) => setDF("periodoFinal", e.target.value)}
                inputProps={{ maxLength: 6 }}
                helperText="Ej: 202303 para marzo 2023"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Porcentaje pagado (%)" type="number"
                value={deudaForm.porcentaje} onChange={(e) => setDF("porcentaje", e.target.value)}
                inputProps={{ min: 1, max: 100, step: 0.01 }}
                helperText="Porcentaje pagado desde ese período (ej: 50.00)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeudaDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="warning" onClick={handleDeudaHistorica} disabled={saving}>
            {saving ? "Generando..." : "Generar Deuda"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanillasPensionadosPage;
