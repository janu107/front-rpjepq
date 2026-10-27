import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, InputAdornment, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
  TextField, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";

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

const initialForm = { numero: "", fechaInicio: "", fechaFinal: "", fechaPago: "", porcentajePago: "100.00" };

const PlanillasTrabajadoresPage = () => {
  const navigate = useNavigate();

  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(20);

  // Más reciente primero (por período YYYYMM) y filtro por período: "202609",
  // "2026" o el nombre del mes ("septiembre").
  const filtradas = useMemo(() => {
    const t = buscar.trim().toLowerCase();
    return [...planillas]
      .sort((a, b) => Number(b.numero || 0) - Number(a.numero || 0) || Number(b.id) - Number(a.id))
      .filter((p) => !t || String(p.numero || "").includes(t) || formatPeriodo(p.numero).toLowerCase().includes(t));
  }, [planillas, buscar]);
  const visibles = filtradas.slice(pagina * porPagina, pagina * porPagina + porPagina);

  const load = async () => {
    setLoading(true);
    try {
      const r1 = await axiosClient.get("/planillas-trabajadores");
      setPlanillas(r1.data.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Solo se crea una planilla cuando las anteriores están CERRADAS.
  const pendiente = [...planillas].filter((p) => p.estadoProceso !== "CERRADA")
    .sort((a, b) => Number(a.numero) - Number(b.numero))[0];

  const abrirNueva = () => {
    if (pendiente) {
      Swal.fire("No se puede crear", `La planilla de ${formatPeriodo(pendiente.numero)} está ${pendiente.estadoProceso}. Ciérrela antes de crear otra.`, "warning");
      return;
    }
    setForm(initialForm); setDialogOpen(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await axiosClient.post("/planillas-trabajadores", form);
      setDialogOpen(false);
      setForm(initialForm);
      Swal.fire("Éxito", "Planilla creada correctamente", "success");
      load();
    } catch (_) {}
    finally { setSaving(false); }
  };

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Planilla de Empleados Régimen</Typography>
          <Typography variant="body2" color="text.secondary">Gestión del proceso de nómina mensual de empleados régimen</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNueva}>
          Nueva Planilla
        </Button>
      </Stack>

      <TextField
        size="small" sx={{ mb: 2, width: { xs: "100%", sm: 340 } }}
        placeholder="Buscar planilla (ej. 202609, 2026 o septiembre)"
        value={buscar}
        onChange={(e) => { setBuscar(e.target.value); setPagina(0); }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f5f7fa" }}>
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
            {visibles.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{formatPeriodo(p.numero)} <Typography component="span" variant="caption" color="text.secondary">({p.numero})</Typography></TableCell>
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
                    onClick={() => navigate(`/planillas-trabajadores/${p.id}`)}
                  >
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !filtradas.length && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <AssignmentIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1, display: "block", mx: "auto" }} />
                  <Typography color="text.secondary">
                    {planillas.length ? "Ninguna planilla coincide con la búsqueda" : "No hay planillas de empleados registradas"}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtradas.length}
          page={Math.min(pagina, Math.max(Math.ceil(filtradas.length / porPagina) - 1, 0))}
          onPageChange={(_, p) => setPagina(p)}
          rowsPerPage={porPagina}
          onRowsPerPageChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(0); }}
          rowsPerPageOptions={[5, 10, 15, 20]}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </TableContainer>

      {/* Dialog: Nueva Planilla */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva Planilla de Empleados</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
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
                helperText="Normalmente 100.00%"
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
    </Box>
  );
};

export default PlanillasTrabajadoresPage;
