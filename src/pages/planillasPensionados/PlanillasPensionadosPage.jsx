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

const initialForm = { tipoPlanilla: "", numero: "", fechaInicio: "", fechaFinal: "", fechaPago: "", porcentajePago: "50.00" };
const initialDeudaForm = { periodoFinal: "", porcentaje: "50.00" };

const PlanillasPensionadosPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.rol?.toUpperCase() === "ADMIN";

  const [planillas, setPlanillas] = useState([]);
  const [tiposPlanilla, setTiposPlanilla] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deudaDialogOpen, setDeudaDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [deudaForm, setDeudaForm] = useState(initialDeudaForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        axiosClient.get("/planillas-pensionados"),
        axiosClient.get("/catalogos/tipo-planilla")
      ]);
      setPlanillas(r1.data.data || []);
      setTiposPlanilla(r2.data.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await axiosClient.post("/planillas-pensionados", form);
      setDialogOpen(false);
      setForm(initialForm);
      Swal.fire("Éxito", "Planilla creada correctamente", "success");
      load();
    } catch (_) {}
    finally { setSaving(false); }
  };

  const handleDeudaHistorica = async () => {
    const confirm = await Swal.fire({
      title: "Generar deuda histórica masiva",
      text: `¿Confirma generar la deuda histórica hasta el período ${formatPeriodo(deudaForm.periodoFinal)} con ${deudaForm.porcentaje}% pagado?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, generar",
      cancelButtonText: "Cancelar"
    });
    if (!confirm.isConfirmed) return;
    setSaving(true);
    try {
      const res = await axiosClient.post("/planillas-pensionados/deuda-historica/masivo", {
        periodoFinal: deudaForm.periodoFinal,
        porcentaje: deudaForm.porcentaje
      });
      setDeudaDialogOpen(false);
      setDeudaForm(initialDeudaForm);
      Swal.fire("Éxito", `Procesados: ${res.data.data?.jubiladosProcesados} jubilados — ${res.data.data?.totalDeudas} registros generados`, "success");
    } catch (_) {}
    finally { setSaving(false); }
  };

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setDF = (k, v) => setDeudaForm((p) => ({ ...p, [k]: v }));

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Planilla de Pensionados</Typography>
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva Planilla de Pensionados</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Planilla</InputLabel>
                <Select label="Tipo de Planilla" value={form.tipoPlanilla} onChange={(e) => setF("tipoPlanilla", e.target.value)}>
                  {tiposPlanilla.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.descripcion}</MenuItem>
                  ))}
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
              <TextField fullWidth size="small" label="Fecha Inicio" type="date" value={form.fechaInicio}
                onChange={(e) => setF("fechaInicio", e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Fecha Final" type="date" value={form.fechaFinal}
                onChange={(e) => setF("fechaFinal", e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Fecha de Pago" type="date" value={form.fechaPago}
                onChange={(e) => setF("fechaPago", e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? "Guardando..." : "Crear Planilla"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Carga deuda histórica */}
      <Dialog open={deudaDialogOpen} onClose={() => setDeudaDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Carga Masiva de Deuda Histórica</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Genera registros de deuda histórica para todos los pensionados activos desde su fecha de jubilación hasta el período indicado.
            Solo ejecutar UNA VEZ al poner el sistema en producción.
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Período Final (YYYYMM)" value={deudaForm.periodoFinal}
                onChange={(e) => setDF("periodoFinal", e.target.value)}
                inputProps={{ maxLength: 6 }}
                helperText="Ej: 202605 para mayo 2026"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Porcentaje pagado (%)" type="number"
                value={deudaForm.porcentaje} onChange={(e) => setDF("porcentaje", e.target.value)}
                inputProps={{ min: 1, max: 100, step: 0.01 }}
                helperText="Porcentaje que se ha estado pagando (ej: 50.00)"
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
