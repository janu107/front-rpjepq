import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import UndoIcon from "@mui/icons-material/Undo";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Grid, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import {
  ESTADO_COLORS, puedeGenerar, puedeReversar, puedeCerrar, puedeEditarMontos,
  esConsulta, tieneDetalle, textoBotonGenerar
} from "../../utils/planillaEstado";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const formatPeriodo = (p) => { if (!p) return "-"; const s = String(p); return `${MESES[parseInt(s.slice(4,6))-1]||""} ${s.slice(0,4)}`; };
const money = (v) => `Q ${Number(v||0).toLocaleString("es-GT",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtDate = (d) => d ? String(d).slice(0,10) : "-";

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

const DetallePlanillaPensionadosPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [planilla, setPlanilla] = useState(null);
  const [preview, setPreview] = useState(null);
  const [detalle, setDetalle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [reversarDialog, setReversarDialog] = useState({ open: false, tipo: null, idJubilado: null, nombre: "" });
  const [motivo, setMotivo] = useState("");
  const [estadoCuentaDialog, setEstadoCuentaDialog] = useState({ open: false, data: null });
  const [montosDialog, setMontosDialog] = useState({ open: false, idJubilado: null, nombre: "", ingresos: [], descuentos: [], loading: false, saving: false });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        axiosClient.get(`/planillas-pensionados/${id}`),
        axiosClient.get(`/planillas-pensionados/${id}/preview`)
      ]);
      setPlanilla(r1.data.data);
      setPreview(r2.data.data);

      if (tieneDetalle(r1.data.data?.estadoProceso)) {
        const r3 = await axiosClient.get(`/planillas-pensionados/${id}/detalle`);
        setDetalle(r3.data.data || []);
      } else {
        setDetalle([]);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [id]);

  const handleGenerar = async () => {
    const confirmResult = await Swal.fire({
      title: textoBotonGenerar(planilla?.estadoProceso),
      html: preview ? `<b>${preview.conDatosPlanilla}</b> jubilados serán procesados.<br>${preview.excluidos} excluidos.<br>Porcentaje: <b>${preview.porcentajePago}%</b>` : "¿Confirma generar la nómina?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, generar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1565c0"
    });
    if (!confirmResult.isConfirmed) return;

    setGenerating(true);
    try {
      const res = await axiosClient.post(`/planillas-pensionados/${id}/generar`, {});
      const d = res.data.data;
      Swal.fire("¡Éxito!", `Procesados: ${d.procesados} | Excluidos: ${d.excluidos}<br>Total pagado: ${money(d.totalPagado)}<br>Total descuentos: ${money(d.totalDescuentos)}`, "success");
      loadAll();
    } catch (_) {}
    finally { setGenerating(false); }
  };

  const handleCerrar = async () => {
    const confirmResult = await Swal.fire({
      title: "Cerrar planilla",
      html: `<b>Total ingresos:</b> ${money(planilla?.totalIngresos)}<br><b>Total descuentos:</b> ${money(planilla?.totalDescuentos)}<br><b>Neto a pagar:</b> ${money(planilla?.netoPagar)}<br><br>Una vez cerrada, la planilla sólo podrá consultarse.<br>¿Confirma el cierre definitivo?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, cerrar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2e7d32"
    });
    if (!confirmResult.isConfirmed) return;
    try {
      await axiosClient.post(`/planillas-pensionados/${id}/cerrar`);
      Swal.fire("Éxito", "PLANILLA CERRADA CORRECTAMENTE", "success");
      loadAll();
    } catch (_) {}
  };

  const openReversarDialog = (tipo, idJubilado = null, nombre = "") => {
    setMotivo("");
    setReversarDialog({ open: true, tipo, idJubilado, nombre });
  };

  const handleReversar = async () => {
    if (!motivo.trim()) { Swal.fire("Atención", "El motivo es obligatorio", "warning"); return; }
    const { tipo, idJubilado } = reversarDialog;
    try {
      if (tipo === "jubilado") {
        await axiosClient.post(`/planillas-pensionados/${id}/jubilados/${idJubilado}/reversar`, { motivo });
        Swal.fire("Éxito", "PAGO DE PENSIONADO REVERSADO CORRECTAMENTE", "success");
        const r = await axiosClient.get(`/planillas-pensionados/${id}/detalle`);
        setDetalle(r.data.data || []);
      } else {
        await axiosClient.post(`/planillas-pensionados/${id}/reversar`, { motivo });
        Swal.fire("Éxito", "PLANILLA REVERSADA CORRECTAMENTE", "success");
        loadAll();
      }
    } catch (_) {}
    finally { setReversarDialog({ open: false, tipo: null, idJubilado: null, nombre: "" }); }
  };

  const handleEstadoCuenta = async (idJubilado) => {
    try {
      const res = await axiosClient.get(`/planillas-pensionados/jubilados/${idJubilado}/estado-cuenta`);
      setEstadoCuentaDialog({ open: true, data: res.data.data });
    } catch (_) {}
  };

  // ---- Edición de montos ----
  const openMontosDialog = async (idJubilado, nombre) => {
    setMontosDialog({ open: true, idJubilado, nombre, ingresos: [], descuentos: [], loading: true, saving: false });
    try {
      const r = await axiosClient.get(`/planillas-pensionados/${id}/jubilados/${idJubilado}/montos`);
      const lineas = r.data.data || [];
      setMontosDialog((p) => ({
        ...p,
        loading: false,
        ingresos: lineas.filter((l) => l.clase === "INGRESO"),
        descuentos: lineas.filter((l) => l.clase === "DESCUENTO")
      }));
    } catch (_) {
      setMontosDialog((p) => ({ ...p, open: false }));
    }
  };

  const setLineaValor = (clase, lid, valor) => {
    setMontosDialog((p) => ({ ...p, [clase]: p[clase].map((l) => (l.id === lid ? { ...l, valor } : l)) }));
  };

  const handleGuardarMontos = async () => {
    const { idJubilado, ingresos, descuentos } = montosDialog;
    const invalida = [...ingresos, ...descuentos].some((l) => l.valor === "" || Number.isNaN(Number(l.valor)) || Number(l.valor) < 0);
    if (invalida) { Swal.fire("Atención", "Los montos deben ser números mayores o iguales a 0", "warning"); return; }
    setMontosDialog((p) => ({ ...p, saving: true }));
    try {
      const r = await axiosClient.put(`/planillas-pensionados/${id}/jubilados/${idJubilado}/montos`, {
        ingresos: ingresos.map((l) => ({ id: l.id, valor: Number(l.valor) })),
        descuentos: descuentos.map((l) => ({ id: l.id, valor: Number(l.valor) }))
      });
      setDetalle(r.data.data || []);
      setMontosDialog({ open: false, idJubilado: null, nombre: "", ingresos: [], descuentos: [], loading: false, saving: false });
      Swal.fire("Éxito", "MONTOS ACTUALIZADOS CORRECTAMENTE", "success");
      loadAll();
    } catch (_) {
      setMontosDialog((p) => ({ ...p, saving: false }));
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

  const handleExportExcel = () => download(`/planillas-pensionados/${id}/export/excel`, `nomina_pensionados_${planilla?.numero || id}.xlsx`);
  const handleExportBanco = () => download(`/planillas-pensionados/${id}/export/banco`, `banco_pensionados_${planilla?.numero || id}.txt`);

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>;
  }

  if (!planilla) {
    return <Box sx={{ p: 3 }}><Alert severity="error">Planilla no encontrada</Alert></Box>;
  }

  const estado = planilla.estadoProceso;
  const mostrarGeneracion = puedeGenerar(estado);
  const mostrarDetalle    = tieneDetalle(estado);
  const consulta          = esConsulta(estado);
  const aptos = preview?.jubiladosAptos || [];
  const excluidos = preview?.jubiladosExcluidos || [];
  const listaPreview = [...aptos, ...excluidos];

  const totIngresos    = detalle.reduce((s,r) => s + r.totalIngreso, 0);
  const totDescuentos  = detalle.reduce((s,r) => s + r.totalDescuentos, 0);
  const totNeto        = detalle.reduce((s,r) => s + r.netoPagar, 0);
  const totCorriente   = detalle.reduce((s,r) => s + r.pagoCorriente, 0);
  const totHistorico   = detalle.reduce((s,r) => s + r.abonoHistorico, 0);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="flex-start" mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/planillas-pensionados")} sx={{ mt: 0.5 }}>
          Volver
        </Button>
        <Box flex={1}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              Planilla de Pensionados — {formatPeriodo(planilla.numero)}
            </Typography>
            <EstadoBadge estado={estado} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {planilla.tipoPlanillaNombre || planilla.tipoPlanillaDescripcion} &nbsp;|&nbsp;
            Inicio: {fmtDate(planilla.fechaInicio)} &nbsp;|&nbsp;
            Final: {fmtDate(planilla.fechaFinal)} &nbsp;|&nbsp;
            Pago: {fmtDate(planilla.fechaPago)} &nbsp;|&nbsp;
            {planilla.porcentajePago}%
          </Typography>
        </Box>
      </Stack>

      {/* ABIERTA / REVERSADA: Preview con lista de jubilados y botón Generar / Volver a Generar */}
      {mostrarGeneracion && (
        <Box>
          {estado === "REVERSADA" && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Esta planilla fue <b>reversada</b>. Puede volver a generar la nómina cuando esté listo.
            </Alert>
          )}
          <Typography variant="h6" mb={2}>Vista previa de generación</Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}><InfoCard label="Jubilados Activos" value={preview?.totalActivos ?? "-"} /></Grid>
            <Grid item xs={6} sm={3}><InfoCard label="Aptos para generar" value={preview?.conDatosPlanilla ?? "-"} highlight /></Grid>
            <Grid item xs={6} sm={3}><InfoCard label="Serán excluidos" value={preview?.excluidos ?? "-"} /></Grid>
            <Grid item xs={6} sm={3}><InfoCard label="Porcentaje de pago" value={`${preview?.porcentajePago ?? 0}%`} /></Grid>
          </Grid>

          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea", mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                  <TableCell>Jubilado</TableCell>
                  <TableCell>Fecha jubilación</TableCell>
                  <TableCell align="right">Pensión base</TableCell>
                  <TableCell align="center">Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listaPreview.map((j) => (
                  <TableRow key={j.idJubilado} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{j.nombreCompleto}</Typography>
                      <Typography variant="caption" color="text.secondary">DPI: {j.dpi}</Typography>
                    </TableCell>
                    <TableCell>{fmtDate(j.fechaJubilacion)}</TableCell>
                    <TableCell align="right">{money(j.salarioBase)}</TableCell>
                    <TableCell align="center">
                      {j.apto
                        ? <Chip size="small" color="success" label="APTO" />
                        : <Tooltip title={j.motivo || "Excluido"}><Chip size="small" color="warning" variant="outlined" label="EXCLUIDO" /></Tooltip>
                      }
                    </TableCell>
                  </TableRow>
                ))}
                {!listaPreview.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No hay jubilados activos. Verifique que existan jubilados ACTIVOS con datos de planilla y pensión configurada.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {excluidos.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {excluidos.length} jubilado(s) serán excluidos. Pase el cursor sobre "EXCLUIDO" para ver el motivo.
            </Alert>
          )}

          <Button
            variant="contained" size="large"
            startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <PlayCircleIcon />}
            onClick={handleGenerar} disabled={generating || (preview?.conDatosPlanilla ?? 0) === 0}
            sx={{ px: 4 }}
          >
            {generating ? "Generando nómina..." : textoBotonGenerar(estado)}
          </Button>
          {(preview?.conDatosPlanilla ?? 0) === 0 && (
            <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
              No hay jubilados aptos para generar.
            </Typography>
          )}
        </Box>
      )}

      {/* GENERADA / CERRADA: Detalle + acciones */}
      {mostrarDetalle && (
        <Box>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={2}><InfoCard label="Procesados" value={detalle.length} /></Grid>
            <Grid item xs={6} sm={2}><InfoCard label="Pago corriente" value={totCorriente} currency /></Grid>
            <Grid item xs={6} sm={2}><InfoCard label="Abono histórico" value={totHistorico} currency /></Grid>
            <Grid item xs={6} sm={2}><InfoCard label="Total ingresos" value={totIngresos} currency /></Grid>
            <Grid item xs={6} sm={2}><InfoCard label="Total descuentos" value={totDescuentos} currency /></Grid>
            <Grid item xs={6} sm={2}><InfoCard label="Neto a pagar" value={totNeto} currency highlight /></Grid>
          </Grid>

          {consulta && (
            <Alert severity="info" sx={{ mb: 2 }}>
              La planilla está <b>CERRADA</b>. Los datos son de sólo consulta; puede exportar reportes.
            </Alert>
          )}

          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
            {puedeCerrar(estado) && (
              <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleCerrar}>
                Cerrar Planilla
              </Button>
            )}
            {puedeReversar(estado) && (
              <Button variant="outlined" color="error" startIcon={<UndoIcon />} onClick={() => openReversarDialog("planilla")}>
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

          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                  <TableCell>Jubilado</TableCell>
                  <TableCell align="right">Pensión teórica</TableCell>
                  <TableCell align="right">Pago corriente</TableCell>
                  <TableCell align="right">Abono histórico</TableCell>
                  <TableCell>Período aplicado</TableCell>
                  <TableCell align="right">Total ingreso</TableCell>
                  <TableCell align="right" sx={{ color: "error.main" }}>Descuentos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Neto a pagar</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detalle.map((r) => (
                  <TableRow key={r.idJubilado} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{r.nombreCompleto}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        DPI: {r.dpi} &nbsp;|&nbsp; Jub: {fmtDate(r.fechaJubilacion)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{money(r.pensionTeorica)}</TableCell>
                    <TableCell align="right">{money(r.pagoCorriente)}</TableCell>
                    <TableCell align="right">{r.abonoHistorico > 0 ? money(r.abonoHistorico) : <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                    <TableCell>
                      {r.periodoAplicado
                        ? <Chip size="small" label={formatPeriodo(r.periodoAplicado)} color="secondary" variant="outlined" />
                        : <Typography variant="caption" color="text.disabled">Sin deuda</Typography>
                      }
                    </TableCell>
                    <TableCell align="right">{money(r.totalIngreso)}</TableCell>
                    <TableCell align="right" sx={{ color: "error.main" }}>{r.totalDescuentos > 0 ? money(r.totalDescuentos) : "—"}</TableCell>
                    <TableCell align="right"><b>{money(r.netoPagar)}</b></TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Estado de cuenta">
                          <Button size="small" variant="text" onClick={() => handleEstadoCuenta(r.idJubilado)}>
                            <AccountCircleIcon fontSize="small" />
                          </Button>
                        </Tooltip>
                        {puedeEditarMontos(estado) && (
                          <Tooltip title="Editar montos">
                            <Button size="small" variant="text" onClick={() => openMontosDialog(r.idJubilado, r.nombreCompleto)}>
                              <EditIcon fontSize="small" />
                            </Button>
                          </Tooltip>
                        )}
                        {puedeReversar(estado) && (
                          <Tooltip title="Reversar pago">
                            <Button size="small" variant="text" color="error" onClick={() => openReversarDialog("jubilado", r.idJubilado, r.nombreCompleto)}>
                              <UndoIcon fontSize="small" />
                            </Button>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!detalle.length && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
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
          {reversarDialog.tipo === "jubilado" ? `Reversar pago — ${reversarDialog.nombre}` : "Reversar planilla completa"}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {reversarDialog.tipo === "jubilado"
              ? "Se restaurará la deuda histórica y los saldos de préstamos y judiciales de este pensionado."
              : "Se reversarán TODOS los pagos de esta planilla y se restaurarán todas las deudas y saldos. Luego podrá volver a generar."
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

      {/* Dialog: Editar montos */}
      <Dialog open={montosDialog.open} onClose={() => setMontosDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Editar montos — {montosDialog.nombre}</DialogTitle>
        <DialogContent>
          {montosDialog.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={28} /></Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>Ingresos</Typography>
              {montosDialog.ingresos.map((l) => (
                <Stack key={l.id} direction="row" spacing={2} alignItems="center" mb={1}>
                  <Typography sx={{ flex: 1 }}>{l.concepto}</Typography>
                  <TextField size="small" type="number" value={l.valor}
                    onChange={(e) => setLineaValor("ingresos", l.id, e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }} sx={{ width: 140 }} />
                </Stack>
              ))}
              {!montosDialog.ingresos.length && <Typography variant="caption" color="text.secondary">Sin ingresos.</Typography>}

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: "error.main" }}>Descuentos</Typography>
              {montosDialog.descuentos.map((l) => (
                <Stack key={l.id} direction="row" spacing={2} alignItems="center" mb={1}>
                  <Typography sx={{ flex: 1 }}>{l.concepto}</Typography>
                  <TextField size="small" type="number" value={l.valor}
                    onChange={(e) => setLineaValor("descuentos", l.id, e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }} sx={{ width: 140 }} />
                </Stack>
              ))}
              {!montosDialog.descuentos.length && <Typography variant="caption" color="text.secondary">Sin descuentos.</Typography>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMontosDialog((p) => ({ ...p, open: false }))}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardarMontos} disabled={montosDialog.saving || montosDialog.loading}>
            {montosDialog.saving ? "Guardando..." : "Guardar montos"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Estado de cuenta */}
      <Dialog
        open={estadoCuentaDialog.open}
        onClose={() => setEstadoCuentaDialog({ open: false, data: null })}
        maxWidth="md" fullWidth
      >
        <DialogTitle>Estado de Cuenta — {estadoCuentaDialog.data?.nombreCompleto}</DialogTitle>
        <DialogContent>
          {estadoCuentaDialog.data && (
            <Box>
              <Grid container spacing={2} mb={2}>
                <Grid item xs={6} sm={3}><InfoCard label="Meses totales" value={estadoCuentaDialog.data.mesesTotales} /></Grid>
                <Grid item xs={6} sm={3}><InfoCard label="Meses pagados" value={estadoCuentaDialog.data.mesesPagados} /></Grid>
                <Grid item xs={6} sm={3}><InfoCard label="Meses pendientes" value={estadoCuentaDialog.data.mesesPendientes} /></Grid>
                <Grid item xs={6} sm={3}><InfoCard label="Deuda pendiente" value={estadoCuentaDialog.data.deudaPendienteTotal} currency highlight /></Grid>
              </Grid>
              <Divider sx={{ mb: 2 }} />
              <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f5f7fa" }}>
                      <TableCell>Período</TableCell>
                      <TableCell align="right">Original</TableCell>
                      <TableCell align="right">Pagado</TableCell>
                      <TableCell align="right">Pendiente</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(estadoCuentaDialog.data.deudas || []).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{formatPeriodo(d.periodo)}</TableCell>
                        <TableCell align="right">{money(d.montoOriginal)}</TableCell>
                        <TableCell align="right">{money(d.montoPagado)}</TableCell>
                        <TableCell align="right">{money(d.montoPendiente)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={d.estado}
                            color={d.estado === "PAGADA" ? "success" : d.estado === "PARCIAL" ? "warning" : "error"}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEstadoCuentaDialog({ open: false, data: null })}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DetallePlanillaPensionadosPage;
