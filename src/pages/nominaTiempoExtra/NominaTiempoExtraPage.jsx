import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import UndoIcon from "@mui/icons-material/Undo";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canGeneratePayroll } from "../../utils/permissions";

const money = (v) => `Q ${Number(v || 0).toFixed(2)}`;
const ESTADO_COLOR = { ABIERTA: "success", GENERADA: "info", CERRADA: "default", REVERSADA: "error" };

const NominaTiempoExtraPage = () => {
  const { user } = useAuth();
  const [planillas, setPlanillas] = useState([]);
  const [form, setForm] = useState({ numero: "", fechaInicio: "", fechaFinal: "", fechaPago: "" });
  const [detalle, setDetalle] = useState({ id: null, numero: null, estado: null, rows: [] });
  const [loading, setLoading] = useState(false);
  const [reversarDialog, setReversarDialog] = useState({ open: false, motivo: "" });

  const load = async () => {
    try {
      const { data } = await axiosClient.get("/nomina-tiempo-extra");
      setPlanillas(data.data || []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar planillas.", "error");
    }
  };
  useEffect(() => { load(); }, []);

  const crear = async () => {
    if (!form.numero || String(form.numero).length !== 6) { Swal.fire("Validación", "El número debe tener formato YYYYMM (6 dígitos).", "warning"); return; }
    if (!form.fechaInicio || !form.fechaFinal || !form.fechaPago) { Swal.fire("Validación", "Complete las fechas.", "warning"); return; }
    setLoading(true);
    try {
      await axiosClient.post("/nomina-tiempo-extra", form);
      Swal.fire("Listo", "Planilla de tiempo extra creada.", "success");
      setForm({ numero: "", fechaInicio: "", fechaFinal: "", fechaPago: "" });
      load();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible crear la planilla.", "error");
    } finally {
      setLoading(false);
    }
  };

  const generar = async (row) => {
    const result = await Swal.fire({
      title: "Generar nómina de tiempo extra",
      text: `Planilla ${row.numero}. Se calcularán HE normales/dobles e IGSS.`,
      icon: "question", showCancelButton: true, confirmButtonText: "Generar", cancelButtonText: "Cancelar", confirmButtonColor: "#1f4e5f"
    });
    if (!result.isConfirmed) return;
    setLoading(true);
    try {
      const { data } = await axiosClient.post(`/nomina-tiempo-extra/${row.id}/generar`);
      Swal.fire("Listo", data.data?.resultado || "Nómina generada.", "success");
      await load();
      await verDetalle(row);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible generar la nómina.", "error");
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (row) => {
    try {
      const [{ data: det }, { data: pl }] = await Promise.all([
        axiosClient.get(`/nomina-tiempo-extra/${row.id}/detalle`),
        axiosClient.get(`/nomina-tiempo-extra/${row.id}`)
      ]);
      setDetalle({ id: row.id, numero: row.numero, estado: pl.data?.estadoProceso || row.estadoProceso, rows: det.data || [] });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar el detalle.", "error");
    }
  };

  const handleCerrar = async () => {
    const confirm = await Swal.fire({
      title: "Cerrar planilla de tiempo extra",
      html: `Planilla <b>${detalle.numero}</b>.<br>Una vez cerrada, sólo podrá consultarse y exportarse.<br>¿Confirma el cierre?`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Sí, cerrar", cancelButtonText: "Cancelar", confirmButtonColor: "#2e7d32"
    });
    if (!confirm.isConfirmed) return;
    try {
      await axiosClient.post(`/nomina-tiempo-extra/${detalle.id}/cerrar`);
      Swal.fire("Éxito", "PLANILLA CERRADA CORRECTAMENTE", "success");
      await load();
      setDetalle((p) => ({ ...p, estado: "CERRADA" }));
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cerrar la planilla.", "error");
    }
  };

  const handleReversar = async () => {
    if (!reversarDialog.motivo.trim()) { Swal.fire("Atención", "El motivo es obligatorio.", "warning"); return; }
    try {
      await axiosClient.post(`/nomina-tiempo-extra/${detalle.id}/reversar`, { motivo: reversarDialog.motivo });
      Swal.fire("Éxito", "PLANILLA REVERSADA CORRECTAMENTE", "success");
      setReversarDialog({ open: false, motivo: "" });
      await load();
      setDetalle({ id: null, numero: null, estado: null, rows: [] });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible reversar la planilla.", "error");
    }
  };

  const download = async (url, filename) => {
    try {
      const response = await axiosClient.get(url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (_) {
      Swal.fire("Error", "No fue posible generar la descarga.", "error");
    }
  };

  const handleExportExcel = () => download(`/nomina-tiempo-extra/${detalle.id}/export/excel`, `nomina_tiempo_extra_${detalle.numero}.xlsx`);
  const handleExportBanco = () => download(`/nomina-tiempo-extra/${detalle.id}/export/banco`, `banco_tiempo_extra_${detalle.numero}.txt`);

  const totales = detalle.rows.reduce((acc, r) => ({
    ingresos: acc.ingresos + Number(r.totalIngresos || 0),
    descuentos: acc.descuentos + Number(r.totalDescuentos || 0),
    neto: acc.neto + Number(r.netoPagar || 0)
  }), { ingresos: 0, descuentos: 0, neto: 0 });

  const esGenerada = detalle.estado === "GENERADA";
  const esCerrada  = detalle.estado === "CERRADA";
  const tieneDetalle = esGenerada || esCerrada;

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Nómina de Tiempo Extra" subtitle="Generación de planilla tipo 3 (horas extra)" />

      {canCreate(user) && (
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Nueva planilla de tiempo extra</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}><TextField label="Número (YYYYMM)" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value.replace(/\D/g, "").slice(0, 6) })} fullWidth /></Grid>
            <Grid item xs={12} md={2}><TextField label="Fecha inicio" type="date" InputLabelProps={{ shrink: true }} value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={2}><TextField label="Fecha final" type="date" InputLabelProps={{ shrink: true }} value={form.fechaFinal} onChange={(e) => setForm({ ...form, fechaFinal: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={2}><TextField label="Fecha pago" type="date" InputLabelProps={{ shrink: true }} value={form.fechaPago} onChange={(e) => setForm({ ...form, fechaPago: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={3}><Button variant="contained" fullWidth onClick={crear} disabled={loading}>Crear planilla</Button></Grid>
          </Grid>
        </Paper>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "rgba(31,78,95,0.08)" }}>
            <TableRow>
              <TableCell>Número</TableCell><TableCell>Inicio</TableCell><TableCell>Final</TableCell><TableCell>Pago</TableCell>
              <TableCell>Estado</TableCell><TableCell align="center">Empleados</TableCell>
              <TableCell align="right">Ingresos</TableCell><TableCell align="right">Descuentos</TableCell><TableCell align="right">Neto</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {planillas.map((p) => (
              <TableRow key={p.id} hover selected={detalle.id === p.id}>
                <TableCell>{p.numero}</TableCell>
                <TableCell>{p.fechaInicio ? String(p.fechaInicio).slice(0, 10) : ""}</TableCell>
                <TableCell>{p.fechaFinal ? String(p.fechaFinal).slice(0, 10) : ""}</TableCell>
                <TableCell>{p.fechaPago ? String(p.fechaPago).slice(0, 10) : ""}</TableCell>
                <TableCell><Chip size="small" label={p.estadoProceso} color={ESTADO_COLOR[p.estadoProceso] || "default"} /></TableCell>
                <TableCell align="center">{p.totalEmpleados}</TableCell>
                <TableCell align="right">{money(p.totalIngresos)}</TableCell>
                <TableCell align="right">{money(p.totalDescuentos)}</TableCell>
                <TableCell align="right">{money(p.netoPagar)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Ver detalle"><IconButton size="small" color="primary" onClick={() => verDetalle(p)}><VisibilityIcon /></IconButton></Tooltip>
                    {canGeneratePayroll(user) && p.estadoProceso === "ABIERTA" && (
                      <Tooltip title="Generar nómina"><IconButton size="small" color="success" onClick={() => generar(p)} disabled={loading}><PlayArrowIcon /></IconButton></Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {planillas.length === 0 && <TableRow><TableCell colSpan={10} align="center">No hay planillas de tiempo extra.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      {detalle.id && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
            Detalle planilla {detalle.numero}
          </Typography>

          {esCerrada && (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              La planilla está <b>CERRADA</b>. Los datos son de sólo consulta; puede exportar reportes.
            </Alert>
          )}

          {tieneDetalle && (
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
              {esGenerada && (
                <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleCerrar}>
                  Cerrar Planilla
                </Button>
              )}
              {esGenerada && (
                <Button variant="outlined" color="error" startIcon={<UndoIcon />}
                  onClick={() => setReversarDialog({ open: true, motivo: "" })}>
                  Reversar Planilla Completa
                </Button>
              )}
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportExcel}>
                Exportar Excel
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportBanco}>
                Archivo Banco
              </Button>
            </Stack>
          )}

          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: "rgba(31,78,95,0.08)" }}>
                <TableRow>
                  <TableCell>Empleado</TableCell><TableCell>DPI</TableCell><TableCell>Puesto</TableCell>
                  <TableCell align="center">Horas</TableCell><TableCell align="right">Ingresos HE</TableCell>
                  <TableCell align="right">IGSS</TableCell><TableCell align="right">Líquido</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detalle.rows.map((r) => (
                  <TableRow key={r.idEmpleado} hover>
                    <TableCell>{r.nombreCompleto}</TableCell>
                    <TableCell>{r.dpi}</TableCell>
                    <TableCell>{r.puesto}</TableCell>
                    <TableCell align="center">{r.horas}</TableCell>
                    <TableCell align="right">{money(r.totalIngresos)}</TableCell>
                    <TableCell align="right">{money(r.totalDescuentos)}</TableCell>
                    <TableCell align="right">{money(r.netoPagar)}</TableCell>
                  </TableRow>
                ))}
                {detalle.rows.length === 0 && <TableRow><TableCell colSpan={7} align="center">Sin registros. Genere la nómina o verifique que haya tiempo extra del mes.</TableCell></TableRow>}
                {detalle.rows.length > 0 && (
                  <TableRow sx={{ "& td": { fontWeight: 800 } }}>
                    <TableCell colSpan={4} align="right">TOTAL</TableCell>
                    <TableCell align="right">{money(totales.ingresos)}</TableCell>
                    <TableCell align="right">{money(totales.descuentos)}</TableCell>
                    <TableCell align="right">{money(totales.neto)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Diálogo de reverso */}
      <Dialog open={reversarDialog.open} onClose={() => setReversarDialog({ open: false, motivo: "" })} maxWidth="sm" fullWidth>
        <DialogTitle>Reversar planilla de tiempo extra {detalle.numero}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Se eliminarán todos los registros de nómina generados y la planilla volverá a estado ABIERTA para poder regenerarla.
          </Alert>
          <TextField
            fullWidth multiline rows={3} label="Motivo del reverso *"
            value={reversarDialog.motivo}
            onChange={(e) => setReversarDialog((p) => ({ ...p, motivo: e.target.value }))}
            placeholder="Describa el motivo del reverso..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReversarDialog({ open: false, motivo: "" })}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleReversar} startIcon={<UndoIcon />}>
            Confirmar Reverso
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default NominaTiempoExtraPage;
