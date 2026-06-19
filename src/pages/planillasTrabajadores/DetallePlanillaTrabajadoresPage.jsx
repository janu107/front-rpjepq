import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import UndoIcon from "@mui/icons-material/Undo";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const formatPeriodo = (p) => { if (!p) return "-"; const s = String(p); return `${MESES[parseInt(s.slice(4,6))-1]||""} ${s.slice(0,4)}`; };
const money = (v) => `Q ${Number(v||0).toLocaleString("es-GT",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = (d) => d ? String(d).slice(0,10) : "-";

const ESTADO_COLORS = {
  ABIERTA:  { bg: "#e8f5e9", txt: "#2e7d32" },
  GENERADA: { bg: "#e3f2fd", txt: "#1565c0" },
  CERRADA:  { bg: "#f5f5f5", txt: "#616161" },
  REVERSADA:{ bg: "#ffebee", txt: "#c62828" }
};

const EstadoBadge = ({ estado }) => {
  const cfg = ESTADO_COLORS[estado] || { bg: "#f5f5f5", txt: "#333" };
  return <Chip label={estado || "-"} sx={{ bgcolor: cfg.bg, color: cfg.txt, fontWeight: 700, fontSize: "0.85rem", px: 1 }} />;
};

const InfoCard = ({ label, value, currency = false, highlight = false }) => (
  <Paper elevation={0} sx={{ p: 2, border: "1px solid #dde3ea", textAlign: "center", bgcolor: highlight ? "#e3f2fd" : "white" }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="h6" fontWeight={highlight ? 700 : 400} color={highlight ? "primary.main" : "text.primary"}>
      {currency ? money(value) : (value ?? "-")}
    </Typography>
  </Paper>
);

const DetallePlanillaTrabajadoresPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [planilla, setPlanilla] = useState(null);
  const [preview, setPreview] = useState(null);
  const [detalle, setDetalle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [reversarDialog, setReversarDialog] = useState({ open: false, tipo: null, idEmpleado: null, nombre: "" });
  const [motivo, setMotivo] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        axiosClient.get(`/planillas-trabajadores/${id}`),
        axiosClient.get(`/planillas-trabajadores/${id}/preview`)
      ]);
      setPlanilla(r1.data.data);
      setPreview(r2.data.data);

      if (["GENERADA","CERRADA","REVERSADA"].includes(r1.data.data?.estadoProceso)) {
        const r3 = await axiosClient.get(`/planillas-trabajadores/${id}/detalle`);
        setDetalle(r3.data.data || []);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [id]);

  const handleGenerar = async () => {
    const confirmResult = await Swal.fire({
      title: "Generar nómina de empleados",
      html: preview ? `<b>${preview.conDatosPlanilla}</b> empleados serán procesados.<br>${preview.excluidos} excluidos.<br>Porcentaje: <b>${preview.porcentajePago}%</b>` : "¿Confirma generar la nómina?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, generar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1565c0"
    });
    if (!confirmResult.isConfirmed) return;

    setGenerating(true);
    try {
      const res = await axiosClient.post(`/planillas-trabajadores/${id}/generar`, {});
      const d = res.data.data;
      Swal.fire("¡Éxito!", `Procesados: ${d.procesados} | Excluidos: ${d.excluidos}<br>Total pagado: ${money(d.totalPagado)}<br>Total descuentos: ${money(d.totalDescuentos)}`, "success");
      loadAll();
    } catch (_) {}
    finally { setGenerating(false); }
  };

  const handleCerrar = async () => {
    const confirmResult = await Swal.fire({
      title: "Cerrar planilla",
      html: `<b>Total ingresos:</b> ${money(planilla?.totalIngresos)}<br><b>Total descuentos:</b> ${money(planilla?.totalDescuentos)}<br><b>Neto a pagar:</b> ${money(planilla?.netoPagar)}<br><br>¿Confirma el cierre definitivo?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, cerrar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2e7d32"
    });
    if (!confirmResult.isConfirmed) return;
    try {
      await axiosClient.post(`/planillas-trabajadores/${id}/cerrar`);
      Swal.fire("Éxito", "PLANILLA CERRADA CORRECTAMENTE", "success");
      loadAll();
    } catch (_) {}
  };

  const openReversarDialog = (tipo, idEmpleado = null, nombre = "") => {
    setMotivo("");
    setReversarDialog({ open: true, tipo, idEmpleado, nombre });
  };

  const handleReversar = async () => {
    if (!motivo.trim()) { Swal.fire("Atención", "El motivo es obligatorio", "warning"); return; }
    const { tipo, idEmpleado } = reversarDialog;
    try {
      if (tipo === "empleado") {
        await axiosClient.post(`/planillas-trabajadores/${id}/empleados/${idEmpleado}/reversar`, { motivo });
        Swal.fire("Éxito", "PAGO DE EMPLEADO REVERSADO CORRECTAMENTE", "success");
        const r = await axiosClient.get(`/planillas-trabajadores/${id}/detalle`);
        setDetalle(r.data.data || []);
      } else {
        await axiosClient.post(`/planillas-trabajadores/${id}/reversar`, { motivo });
        Swal.fire("Éxito", "PLANILLA REVERSADA CORRECTAMENTE", "success");
        loadAll();
      }
    } catch (_) {}
    finally { setReversarDialog({ open: false, tipo: null, idEmpleado: null, nombre: "" }); }
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

  const handleExportExcel = () => download(`/planillas-trabajadores/${id}/export/excel`, `nomina_empleados_${planilla?.numero || id}.xlsx`);
  const handleExportBanco = () => download(`/planillas-trabajadores/${id}/export/banco`, `banco_empleados_${planilla?.numero || id}.txt`);

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;
  }

  if (!planilla) {
    return <Box sx={{ p: 3 }}><Alert severity="error">Planilla no encontrada</Alert></Box>;
  }

  const estado = planilla.estadoProceso;
  const isAbierta  = estado === "ABIERTA";
  const isGenerada = estado === "GENERADA";
  const isCerrada  = estado === "CERRADA";
  const isReversada = estado === "REVERSADA";

  const totIngresos    = detalle.reduce((s,r) => s + r.totalIngresos, 0);
  const totDescuentos  = detalle.reduce((s,r) => s + r.totalDescuentos, 0);
  const totNeto        = detalle.reduce((s,r) => s + r.netoPagar, 0);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="flex-start" mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/planillas-trabajadores")} sx={{ mt: 0.5 }}>
          Volver
        </Button>
        <Box flex={1}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              Planilla de Empleados — {formatPeriodo(planilla.numero)}
            </Typography>
            <EstadoBadge estado={estado} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Inicio: {fmtDate(planilla.fechaInicio)} &nbsp;|&nbsp;
            Final: {fmtDate(planilla.fechaFinal)} &nbsp;|&nbsp;
            Pago: {fmtDate(planilla.fechaPago)} &nbsp;|&nbsp;
            {planilla.porcentajePago}%
          </Typography>
        </Box>
      </Stack>

      {/* ABIERTA: Preview y Generar */}
      {isAbierta && (
        <Box>
          <Typography variant="h6" mb={2}>Vista previa de generación</Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}><InfoCard label="Empleados Activos Régimen" value={preview?.totalActivos ?? "-"} /></Grid>
            <Grid item xs={6} sm={3}><InfoCard label="Con datos planilla activos" value={preview?.conDatosPlanilla ?? "-"} /></Grid>
            <Grid item xs={6} sm={3}><InfoCard label="Serán excluidos" value={preview?.excluidos ?? "-"} /></Grid>
            <Grid item xs={6} sm={3}><InfoCard label="Porcentaje de pago" value={`${preview?.porcentajePago ?? 0}%`} highlight /></Grid>
          </Grid>
          <Button
            variant="contained" size="large" startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <PlayCircleIcon />}
            onClick={handleGenerar} disabled={generating}
            sx={{ px: 4 }}
          >
            {generating ? "Generando nómina..." : "Generar Nómina de Empleados"}
          </Button>
        </Box>
      )}

      {/* GENERADA/CERRADA/REVERSADA: Detalle + acciones */}
      {(isGenerada || isCerrada || isReversada) && (
        <Box>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}><InfoCard label="Procesados" value={detalle.length} /></Grid>
            <Grid item xs={6} sm={3}><InfoCard label="Total ingresos" value={totIngresos} currency /></Grid>
            <Grid item xs={6} sm={3}><InfoCard label="Total descuentos" value={totDescuentos} currency /></Grid>
            <Grid item xs={6} sm={3}><InfoCard label="Neto a pagar" value={totNeto} currency highlight /></Grid>
          </Grid>

          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
            {isGenerada && (
              <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleCerrar}>
                Cerrar Planilla
              </Button>
            )}
            {(isGenerada || isCerrada) && (
              <Button variant="outlined" color="error" startIcon={<UndoIcon />} onClick={() => openReversarDialog("planilla")}>
                Reversar Planilla Completa
              </Button>
            )}
            {(isGenerada || isCerrada) && (
              <>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportExcel}>
                  Exportar Excel
                </Button>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportBanco}>
                  Archivo Banco
                </Button>
              </>
            )}
          </Stack>

          {isReversada && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Esta planilla fue reversada. Los datos mostrados son de solo consulta histórica.
            </Alert>
          )}

          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                  <TableCell>Empleado</TableCell>
                  <TableCell>Puesto</TableCell>
                  <TableCell align="center">Días</TableCell>
                  <TableCell align="right">Total ingresos</TableCell>
                  <TableCell align="right" sx={{ color: "error.main" }}>Descuentos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Neto a pagar</TableCell>
                  {isGenerada && <TableCell align="center">Acciones</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {detalle.map((r) => (
                  <TableRow key={r.idEmpleado} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{r.nombreCompleto}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        DPI: {r.dpi} &nbsp;|&nbsp; Ingreso: {fmtDate(r.fechaIngreso)}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.puesto || "-"}</TableCell>
                    <TableCell align="center">{r.diasTrabajados}</TableCell>
                    <TableCell align="right">{money(r.totalIngresos)}</TableCell>
                    <TableCell align="right" sx={{ color: "error.main" }}>{r.totalDescuentos > 0 ? money(r.totalDescuentos) : "—"}</TableCell>
                    <TableCell align="right"><b>{money(r.netoPagar)}</b></TableCell>
                    {isGenerada && (
                      <TableCell align="center">
                        <Tooltip title="Reversar pago">
                          <Button
                            size="small" variant="text" color="error"
                            onClick={() => openReversarDialog("empleado", r.idEmpleado, r.nombreCompleto)}
                          >
                            <UndoIcon fontSize="small" />
                          </Button>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {!detalle.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No hay registros de nómina para esta planilla</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Dialog: Reverso */}
      <Dialog open={reversarDialog.open} onClose={() => setReversarDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reversarDialog.tipo === "empleado"
            ? `Reversar pago — ${reversarDialog.nombre}`
            : "Reversar planilla completa"
          }
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {reversarDialog.tipo === "empleado"
              ? "Se restaurarán los saldos de préstamos y judiciales de este empleado."
              : "Se reversarán TODOS los pagos de esta planilla y se restaurarán todos los saldos."
            }
          </Alert>
          <TextField
            fullWidth multiline rows={3} label="Motivo del reverso *" value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describa el motivo del reverso..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReversarDialog((p) => ({ ...p, open: false }))}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleReversar} startIcon={<UndoIcon />}>
            Confirmar Reverso
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DetallePlanillaTrabajadoresPage;
