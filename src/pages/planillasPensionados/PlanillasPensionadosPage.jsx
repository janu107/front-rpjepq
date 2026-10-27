import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import HistoryIcon from "@mui/icons-material/History";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
  TextField, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
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
  const [buscar, setBuscar] = useState("");
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(20);

  // Más reciente primero (por período YYYYMM) y filtro por período: "202611",
  // "2026" o el nombre del mes ("noviembre").
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
      // CAMBIO X: la planilla de pensionados es siempre NÓMINA JUBILADOS; ya no
      // se carga el catálogo de tipos para elegir.
      const r1 = await axiosClient.get("/planillas-pensionados");
      setPlanillas(r1.data.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Solo se crea una planilla cuando las anteriores del mismo tipo están CERRADAS.
  const pendienteDeTipo = (tipo) => planillas
    .filter((p) => Number(p.tipoPlanilla) === Number(tipo) && p.estadoProceso !== "CERRADA")
    .sort((a, b) => Number(a.numero) - Number(b.numero))[0];

  const handleCreate = async (event) => {
    event.preventDefault();
    const pend = pendienteDeTipo(form.tipoPlanilla || 2);
    if (pend) {
      Swal.fire("No se puede crear", `La planilla de ${formatPeriodo(pend.numero)} está ${pend.estadoProceso}. Ciérrela antes de crear otra.`, "warning");
      return;
    }
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
      load();
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
          ${(r.prestamosTraslapados || []).length ? `<div style="margin-top:8px;padding:8px;border-radius:6px;background:#FFF4E5;color:#7A4100">
            <b>Revisar préstamos que se cruzan</b> (en esos meses se restan las dos cuotas; si es una renovación,
            ajuste la fecha fin del préstamo anterior o anúlelo y vuelva a correr la carga):<br/>
            ${r.prestamosTraslapados.map((t) => `${t.codigo} - ${t.nombre}: ref. ${t.refA} y ${t.refB} (${String(t.desde).slice(0,10)} a ${String(t.hasta).slice(0,10)})`).join("<br/>")}
          </div>` : ""}
          <span style="color:#666">La deuda se rehízo con lo pagado hasta la fecha. Puede volver a ejecutarse cuando registre más pensiones o préstamos.</span>
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

      <TextField
        size="small" sx={{ mb: 2, width: { xs: "100%", sm: 340 } }}
        placeholder="Buscar planilla (ej. 202611, 2026 o noviembre)"
        value={buscar}
        onChange={(e) => { setBuscar(e.target.value); setPagina(0); }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

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
            {visibles.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{p.tipoPlanillaNombre || p.tipoPlanillaDescripcion || "-"}</TableCell>
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
                    onClick={() => navigate(`/planillas-pensionados/${p.id}`)}
                  >
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !filtradas.length && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <AssignmentIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1, display: "block", mx: "auto" }} />
                  <Typography color="text.secondary">
                    {planillas.length ? "Ninguna planilla coincide con la búsqueda" : "No hay planillas de pensionados registradas"}
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
            <b>Antes del período</b> indicado se registra el pago completo. <b>Desde ese período</b> cada mes
            queda como deuda por su líquido (pensión − descuentos del mes, incluidos los préstamos vigentes) y se
            paga el porcentaje del líquido, que se aplica al mes adeudado más antiguo.
            <br /><br />
            Se puede volver a ejecutar (por ejemplo, al registrar la pensión de más jubilados): la deuda de todos se
            rehace con lo pagado hasta la fecha. Lo pagado en cada nómina se abona a la deuda al <b>cerrar</b> la planilla.
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
