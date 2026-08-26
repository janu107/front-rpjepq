import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import UndoIcon from "@mui/icons-material/Undo";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Paper,
  Radio, RadioGroup, Select, Stack, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canGeneratePayroll } from "../../utils/permissions";

const money = (v) => `Q ${Number(v || 0).toFixed(2)}`;
const fecha = (v) => (v ? String(v).slice(0, 10) : "");
const ESTADO_COLOR = { ABIERTA: "success", GENERADA: "info", CERRADA: "default", REVERSADA: "error" };
const CATEGORIA_COLOR = { "JUBILADOS NORMALES": "default", BENEFICIARIOS: "info", AMPARISTAS: "warning" };

const TIPOS = [
  { key: "bono14", label: "Bono 14", titulo: "GENERAR BONO 14 JUBILADOS", periodoTxto: (a) => `01/07/${a - 1} al 30/06/${a}` },
  { key: "aguinaldo", label: "Aguinaldo", titulo: "GENERAR AGUINALDO JUBILADOS", periodoTxto: (a) => `01/12/${a - 1} al 30/11/${a}` }
];

const anioActual = new Date().getFullYear();
const formVacio = { numero: "", fechaInicio: "", fechaFinal: "", fechaPago: "" };
const TABS_DETALLE = ["Todos", "Activos", "Beneficiarios", "Amparistas"];
const categoriaDeTab = (tab) => ({ Activos: "JUBILADOS NORMALES", Beneficiarios: "BENEFICIARIOS", Amparistas: "AMPARISTAS" }[tab] || null);

const PrestacionesJubiladosPage = () => {
  const { user } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);
  const tipo = TIPOS[tabIndex];

  const [planillas, setPlanillas] = useState([]);
  const [form, setForm] = useState(formVacio);
  const [loading, setLoading] = useState(false);

  const [anio, setAnio] = useState(anioActual);
  const [porcentajeOpcion, setPorcentajeOpcion] = useState("100");
  const [porcentajeOtro, setPorcentajeOtro] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [idSeleccionada, setIdSeleccionada] = useState("");

  const [detalle, setDetalle] = useState({ id: null, numero: null, estado: null, rows: [] });
  const [tabDetalle, setTabDetalle] = useState("Todos");
  const [reversarDialog, setReversarDialog] = useState({ open: false, motivo: "" });
  const [editarDialog, setEditarDialog] = useState({ open: false, linea: null, monto: "" });
  const [agregarDialog, setAgregarDialog] = useState({ open: false, modo: "jubilado", jubilados: [], beneficiarios: [], idJubilado: "", idBeneficiario: "", monto: "", dias: "" });

  const porcentaje = porcentajeOpcion === "otro" ? Number(porcentajeOtro) : Number(porcentajeOpcion);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get(`/prestaciones-jubilados/${tipo.key}`);
      setPlanillas(data.data || []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar las planillas.", "error");
    }
  }, [tipo.key]);

  const loadPreview = useCallback(async () => {
    try {
      const { data } = await axiosClient.get(`/prestaciones-jubilados/${tipo.key}/preview`, { params: { anio, porcentaje: porcentaje || 100 } });
      setPreviewData(data.data);
    } catch (_) {
      setPreviewData(null);
    }
  }, [tipo.key, anio, porcentaje]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPreview(); }, [loadPreview]);

  useEffect(() => {
    setDetalle({ id: null, numero: null, estado: null, rows: [] });
    setIdSeleccionada("");
    setForm(formVacio);
    setTabDetalle("Todos");
  }, [tabIndex]);

  const generables = planillas.filter((p) => ["ABIERTA", "REVERSADA"].includes(p.estadoProceso));

  const crear = async () => {
    if (!form.numero || String(form.numero).length !== 6) { Swal.fire("Validación", "El número debe tener formato YYYYMM (6 dígitos).", "warning"); return; }
    if (!form.fechaInicio || !form.fechaFinal || !form.fechaPago) { Swal.fire("Validación", "Complete las fechas.", "warning"); return; }
    setLoading(true);
    try {
      await axiosClient.post(`/prestaciones-jubilados/${tipo.key}`, form);
      Swal.fire("Listo", `Planilla de ${tipo.label} (jubilados) creada.`, "success");
      setForm(formVacio);
      load();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible crear la planilla.", "error");
    } finally {
      setLoading(false);
    }
  };

  const generar = async () => {
    if (!idSeleccionada) { Swal.fire("Validación", "Seleccione la planilla a generar.", "warning"); return; }
    if (!anio) { Swal.fire("Validación", "Indique el año.", "warning"); return; }
    if (!porcentaje || porcentaje < 0.01 || porcentaje > 100) { Swal.fire("Validación", "El porcentaje debe estar entre 0.01 y 100.", "warning"); return; }

    const confirm = await Swal.fire({
      title: tipo.titulo,
      html: `Se procesarán los <b>3 grupos</b> (activos, beneficiarios, amparistas) al <b>${porcentaje}%</b>
             para el período ${tipo.periodoTxto(anio)}.<br>Los amparistas siempre reciben 100% por sentencia judicial.`,
      icon: "question", showCancelButton: true,
      confirmButtonText: "Procesar los 3 grupos", cancelButtonText: "Cancelar", confirmButtonColor: "#1f4e5f"
    });
    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const { data } = await axiosClient.post(`/prestaciones-jubilados/${tipo.key}/generar`, { idPlanilla: idSeleccionada, anio: Number(anio), porcentaje });
      Swal.fire("Listo", data.data?.resultado || "Prestación generada.", "success");
      await load();
      await verDetalle({ id: Number(idSeleccionada) });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible generar la prestación.", "error");
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (row) => {
    try {
      const [{ data: det }, { data: pl }] = await Promise.all([
        axiosClient.get(`/prestaciones-jubilados/planilla/${row.id}/detalle`),
        axiosClient.get(`/prestaciones-jubilados/planilla/${row.id}`)
      ]);
      setDetalle({ id: row.id, numero: pl.data?.numero, estado: pl.data?.estadoProceso, rows: det.data || [] });
      setTabDetalle("Todos");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar el detalle.", "error");
    }
  };

  const refrescarDetalle = async () => {
    await load();
    if (detalle.id) await verDetalle({ id: detalle.id });
  };

  const handleReversar = async () => {
    if (!reversarDialog.motivo.trim()) { Swal.fire("Atención", "El motivo es obligatorio.", "warning"); return; }
    try {
      const { data } = await axiosClient.post(`/prestaciones-jubilados/${tipo.key}/revertir/${detalle.id}`, { motivo: reversarDialog.motivo });
      Swal.fire("Éxito", data.data?.resultado || "PLANILLA REVERSADA CORRECTAMENTE", "success");
      setReversarDialog({ open: false, motivo: "" });
      await load();
      setDetalle({ id: null, numero: null, estado: null, rows: [] });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible reversar la planilla.", "error");
    }
  };

  const handleCerrar = async () => {
    const confirm = await Swal.fire({
      title: "Cerrar planilla",
      html: `Planilla <b>${detalle.numero}</b>.<br>Una vez cerrada, sólo podrá consultarse y exportarse.<br>¿Confirma el cierre?`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Sí, cerrar", cancelButtonText: "Cancelar", confirmButtonColor: "#2e7d32"
    });
    if (!confirm.isConfirmed) return;
    try {
      await axiosClient.post(`/prestaciones-jubilados/planilla/${detalle.id}/cerrar`);
      Swal.fire("Éxito", "PLANILLA CERRADA CORRECTAMENTE", "success");
      await refrescarDetalle();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cerrar la planilla.", "error");
    }
  };

  const handleEditarMonto = async () => {
    const monto = Number(editarDialog.monto);
    if (!monto || monto <= 0) { Swal.fire("Atención", "El monto debe ser mayor a cero.", "warning"); return; }
    try {
      const { data } = await axiosClient.put(`/prestaciones-jubilados/linea/${editarDialog.linea.idLinea}/monto`, { monto });
      Swal.fire("Éxito", data.data?.resultado || "Monto actualizado.", "success");
      setEditarDialog({ open: false, linea: null, monto: "" });
      await refrescarDetalle();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible actualizar el monto.", "error");
    }
  };

  const handleEliminarLinea = async (row) => {
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: "Eliminar renglón",
      html: `Se eliminará a <b>${row.nombreCompleto}</b> (${money(row.monto)}) de la planilla.`,
      input: "text", inputLabel: "Motivo (obligatorio)", inputPlaceholder: "Ej. se ajustó la fecha de jubilación",
      icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", cancelButtonText: "Cancelar",
      confirmButtonColor: "#c62828",
      inputValidator: (v) => (!v || !v.trim() ? "El motivo es obligatorio" : undefined)
    });
    if (!isConfirmed) return;
    try {
      const { data } = await axiosClient.delete(`/prestaciones-jubilados/linea/${row.idLinea}`, { data: { motivo } });
      Swal.fire("Éxito", data.data?.resultado || "Renglón eliminado.", "success");
      await refrescarDetalle();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar el renglón.", "error");
    }
  };

  const abrirAgregar = async () => {
    try {
      const [{ data: jub }, { data: ben }] = await Promise.all([
        axiosClient.get(`/prestaciones-jubilados/planilla/${detalle.id}/candidatos-jubilados`),
        axiosClient.get(`/prestaciones-jubilados/planilla/${detalle.id}/candidatos-beneficiarios`)
      ]);
      setAgregarDialog({
        open: true, modo: "jubilado",
        jubilados: jub.data || [], beneficiarios: ben.data || [],
        idJubilado: "", idBeneficiario: "", monto: "", dias: ""
      });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar los candidatos.", "error");
    }
  };

  const handleAgregar = async () => {
    const monto = Number(agregarDialog.monto);
    if (!monto || monto <= 0) { Swal.fire("Atención", "El monto debe ser mayor a cero.", "warning"); return; }

    let idJubilado; let idBeneficiario = null;
    if (agregarDialog.modo === "jubilado") {
      if (!agregarDialog.idJubilado) { Swal.fire("Atención", "Seleccione un jubilado.", "warning"); return; }
      idJubilado = Number(agregarDialog.idJubilado);
    } else {
      if (!agregarDialog.idBeneficiario) { Swal.fire("Atención", "Seleccione un beneficiario.", "warning"); return; }
      const ben = agregarDialog.beneficiarios.find((b) => b.idBeneficiario === Number(agregarDialog.idBeneficiario));
      idJubilado = ben?.idJubilado;
      idBeneficiario = Number(agregarDialog.idBeneficiario);
    }

    try {
      const { data } = await axiosClient.post(`/prestaciones-jubilados/planilla/${detalle.id}/agregar`, {
        idJubilado, idBeneficiario, monto, dias: Number(agregarDialog.dias || 0)
      });
      Swal.fire("Éxito", data.data?.resultado || "Registro agregado.", "success");
      setAgregarDialog((p) => ({ ...p, open: false }));
      await refrescarDetalle();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible agregar el registro.", "error");
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

  const categoriaFiltro = categoriaDeTab(tabDetalle);
  const rowsFiltradas = categoriaFiltro ? detalle.rows.filter((r) => r.categoria === categoriaFiltro) : detalle.rows;
  const totalFiltrado = rowsFiltradas.reduce((s, r) => s + Number(r.monto || 0), 0);
  const esGenerada = detalle.estado === "GENERADA";
  const esCerrada = detalle.estado === "CERRADA";
  const puedeEditar = ["ABIERTA", "GENERADA"].includes(detalle.estado);

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Prestaciones para Jubilados"
        subtitle="Bono 14 y Aguinaldo — jubilados normales, beneficiarios y amparistas, sin descuentos ni deuda histórica"
      />

      <Paper elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
          {TIPOS.map((t) => <Tab key={t.key} label={t.label} />)}
        </Tabs>
      </Paper>

      <Alert severity="info">
        Se procesan 3 grupos por planilla: jubilados NORMALES (según % decidido por junta), beneficiarios de
        fallecidos (según su % de reparto) y amparistas (siempre 100% por sentencia judicial).
      </Alert>

      {canCreate(user) && (
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
            Nueva planilla de {tipo.label} — Jubilados
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField label="Número (YYYYMM)" value={form.numero} fullWidth
                onChange={(e) => setForm({ ...form, numero: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField label="Fecha inicio" type="date" InputLabelProps={{ shrink: true }} fullWidth
                value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField label="Fecha final" type="date" InputLabelProps={{ shrink: true }} fullWidth
                value={form.fechaFinal} onChange={(e) => setForm({ ...form, fechaFinal: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField label="Fecha pago" type="date" InputLabelProps={{ shrink: true }} fullWidth
                value={form.fechaPago} onChange={(e) => setForm({ ...form, fechaPago: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button variant="contained" fullWidth onClick={crear} disabled={loading}>Crear planilla</Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {canGeneratePayroll(user) && (
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>{tipo.titulo}</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="lbl-planilla-jub">Planilla</InputLabel>
                <Select labelId="lbl-planilla-jub" label="Planilla" value={idSeleccionada}
                  onChange={(e) => setIdSeleccionada(e.target.value)}>
                  {generables.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.numero} — {p.estadoProceso} (pago {fecha(p.fechaPago)})
                    </MenuItem>
                  ))}
                  {generables.length === 0 && <MenuItem value="" disabled>No hay planillas ABIERTAS o REVERSADAS</MenuItem>}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField label="Año" type="number" fullWidth value={anio}
                onChange={(e) => setAnio(e.target.value.replace(/\D/g, "").slice(0, 4))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Porcentaje (activos y beneficiarios)</Typography>
              <RadioGroup row value={porcentajeOpcion} onChange={(e) => setPorcentajeOpcion(e.target.value)}>
                <FormControlLabel value="50" control={<Radio size="small" />} label="50%" />
                <FormControlLabel value="100" control={<Radio size="small" />} label="100%" />
                <FormControlLabel value="otro" control={<Radio size="small" />} label="Otro" />
              </RadioGroup>
            </Grid>
            {porcentajeOpcion === "otro" && (
              <Grid item xs={12} md={2}>
                <TextField label="% (0.01 a 100)" type="number" fullWidth value={porcentajeOtro}
                  onChange={(e) => setPorcentajeOtro(e.target.value)} />
              </Grid>
            )}
            <Grid item xs={12} md={3}>
              <Button variant="contained" color="success" fullWidth startIcon={<PlayArrowIcon />}
                onClick={generar} disabled={loading}>
                Procesar los 3 grupos
              </Button>
            </Grid>
          </Grid>

          {previewData && (
            <Alert severity={previewData.totalPersonas > 0 ? "success" : "warning"} sx={{ mt: 2 }}>
              Período {tipo.periodoTxto(anio)} ·
              {" "}Jubilados activos: <b>{previewData.activos.total}</b> ({money(previewData.activos.estimado)})
              {" · "}Beneficiarios: <b>{previewData.beneficiarios.total}</b> ({money(previewData.beneficiarios.estimado)})
              {" · "}Amparistas: <b>{previewData.amparistas.total}</b> ({money(previewData.amparistas.estimado)}, siempre 100%)
              {" · "}Total estimado: <b>{money(previewData.totalEstimado)}</b>
            </Alert>
          )}
        </Paper>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "rgba(31,78,95,0.08)" }}>
            <TableRow>
              <TableCell>Número</TableCell><TableCell>Inicio</TableCell><TableCell>Final</TableCell>
              <TableCell>Pago</TableCell><TableCell>Estado</TableCell>
              <TableCell align="center">Registros</TableCell><TableCell align="right">Total</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {planillas.map((p) => (
              <TableRow key={p.id} hover selected={detalle.id === p.id}>
                <TableCell>{p.numero}</TableCell>
                <TableCell>{fecha(p.fechaInicio)}</TableCell>
                <TableCell>{fecha(p.fechaFinal)}</TableCell>
                <TableCell>{fecha(p.fechaPago)}</TableCell>
                <TableCell><Chip size="small" label={p.estadoProceso} color={ESTADO_COLOR[p.estadoProceso] || "default"} /></TableCell>
                <TableCell align="center">{p.totalRegistros}</TableCell>
                <TableCell align="right">{money(p.totalPagado)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Ver detalle">
                    <IconButton size="small" color="primary" onClick={() => verDetalle(p)}><VisibilityIcon /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {planillas.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center">No hay planillas de {tipo.label} para jubilados.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {detalle.id && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
            Revisión planilla {detalle.numero} — {tipo.label} Jubilados ({detalle.estado})
          </Typography>

          {esCerrada && (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              La planilla está <b>CERRADA</b>. Los datos son de sólo consulta; puede exportar reportes.
            </Alert>
          )}

          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
            {puedeEditar && canGeneratePayroll(user) && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={abrirAgregar}>Agregar</Button>
            )}
            {esGenerada && canGeneratePayroll(user) && (
              <Button variant="outlined" color="error" startIcon={<UndoIcon />}
                onClick={() => setReversarDialog({ open: true, motivo: "" })}>
                Revertir planilla completa
              </Button>
            )}
            {esGenerada && canGeneratePayroll(user) && (
              <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleCerrar}>
                Cerrar y proceder al pago
              </Button>
            )}
            <Button variant="outlined" startIcon={<DownloadIcon />}
              onClick={() => download(`/prestaciones-jubilados/planilla/${detalle.id}/export/excel`, `prestacion_jubilados_${detalle.numero}.xlsx`)}>
              Exportar Excel
            </Button>
          </Stack>

          <Tabs value={tabDetalle} onChange={(_, v) => setTabDetalle(v)} sx={{ mb: 1 }}>
            {TABS_DETALLE.map((t) => <Tab key={t} value={t} label={t} />)}
          </Tabs>

          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: "rgba(31,78,95,0.08)" }}>
                <TableRow>
                  <TableCell>Nombre</TableCell><TableCell>DPI</TableCell><TableCell>Categoría</TableCell>
                  <TableCell>Titular</TableCell><TableCell>Tipo Jubilación</TableCell>
                  <TableCell align="center">Días</TableCell><TableCell align="right">Pensión base</TableCell>
                  <TableCell align="center">%</TableCell><TableCell align="right">Monto</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rowsFiltradas.map((r) => (
                  <TableRow key={r.idLinea} hover>
                    <TableCell>{r.nombreCompleto}</TableCell>
                    <TableCell>{r.dpi}</TableCell>
                    <TableCell><Chip size="small" label={r.categoria} color={CATEGORIA_COLOR[r.categoria] || "default"} /></TableCell>
                    <TableCell>{r.categoria === "BENEFICIARIOS" ? r.jubiladoTitular : "—"}</TableCell>
                    <TableCell>{r.tipoJubilacion || "—"}</TableCell>
                    <TableCell align="center">{r.dias}</TableCell>
                    <TableCell align="right">{money(r.pensionBase)}</TableCell>
                    <TableCell align="center">{Number(r.porcentaje || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{money(r.monto)}</TableCell>
                    <TableCell align="right">
                      {puedeEditar && canGeneratePayroll(user) && (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Editar monto">
                            <IconButton size="small" color="primary"
                              onClick={() => setEditarDialog({ open: true, linea: r, monto: String(r.monto) })}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar renglón">
                            <IconButton size="small" color="error" onClick={() => handleEliminarLinea(r)}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rowsFiltradas.length === 0 && (
                  <TableRow><TableCell colSpan={10} align="center">Sin registros en esta categoría.</TableCell></TableRow>
                )}
                {rowsFiltradas.length > 0 && (
                  <TableRow sx={{ "& td": { fontWeight: 800 } }}>
                    <TableCell colSpan={8} align="right">TOTAL ({rowsFiltradas.length} registros)</TableCell>
                    <TableCell align="right">{money(totalFiltrado)}</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Reverso */}
      <Dialog open={reversarDialog.open} onClose={() => setReversarDialog({ open: false, motivo: "" })} maxWidth="sm" fullWidth>
        <DialogTitle>Revertir planilla {detalle.numero}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Se eliminarán TODOS los renglones (activos + beneficiarios + amparistas) y la planilla quedará
            en estado REVERSADA para poder regenerarla. El cambio queda registrado en la bitácora.
          </Alert>
          <TextField fullWidth multiline rows={3} label="Motivo del reverso *" value={reversarDialog.motivo}
            onChange={(e) => setReversarDialog((p) => ({ ...p, motivo: e.target.value }))}
            placeholder="Ej. error en el cálculo - se ajustará la fecha de jubilación" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReversarDialog({ open: false, motivo: "" })}>Cancelar</Button>
          <Button variant="contained" color="error" startIcon={<UndoIcon />} onClick={handleReversar}>
            Confirmar reverso
          </Button>
        </DialogActions>
      </Dialog>

      {/* Editar monto */}
      <Dialog open={editarDialog.open} onClose={() => setEditarDialog({ open: false, linea: null, monto: "" })} maxWidth="xs" fullWidth>
        <DialogTitle>Editar monto</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {editarDialog.linea?.nombreCompleto} — monto actual {money(editarDialog.linea?.monto)}
          </Typography>
          <TextField fullWidth type="number" label="Nuevo monto *" value={editarDialog.monto}
            onChange={(e) => setEditarDialog((p) => ({ ...p, monto: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditarDialog({ open: false, linea: null, monto: "" })}>Cancelar</Button>
          <Button variant="contained" onClick={handleEditarMonto}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Agregar */}
      <Dialog open={agregarDialog.open} onClose={() => setAgregarDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar a la planilla {detalle.numero}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RadioGroup row value={agregarDialog.modo} onChange={(e) => setAgregarDialog((p) => ({ ...p, modo: e.target.value }))}>
              <FormControlLabel value="jubilado" control={<Radio size="small" />} label="Jubilado (normal / amparista)" />
              <FormControlLabel value="beneficiario" control={<Radio size="small" />} label="Beneficiario" />
            </RadioGroup>

            {agregarDialog.modo === "jubilado" ? (
              <FormControl fullWidth>
                <InputLabel id="lbl-jub-add">Jubilado *</InputLabel>
                <Select labelId="lbl-jub-add" label="Jubilado *" value={agregarDialog.idJubilado}
                  onChange={(e) => {
                    const j = agregarDialog.jubilados.find((x) => x.idJubilado === e.target.value);
                    setAgregarDialog((p) => ({ ...p, idJubilado: e.target.value, monto: p.monto || (j ? String(j.pension) : "") }));
                  }}>
                  {agregarDialog.jubilados.map((j) => (
                    <MenuItem key={j.idJubilado} value={j.idJubilado}>
                      {j.nombreCompleto} — {j.tipoPago} — pensión {money(j.pension)}
                    </MenuItem>
                  ))}
                  {agregarDialog.jubilados.length === 0 && <MenuItem value="" disabled>No hay jubilados disponibles</MenuItem>}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth>
                <InputLabel id="lbl-ben-add">Beneficiario *</InputLabel>
                <Select labelId="lbl-ben-add" label="Beneficiario *" value={agregarDialog.idBeneficiario}
                  onChange={(e) => {
                    const b = agregarDialog.beneficiarios.find((x) => x.idBeneficiario === e.target.value);
                    const estim = b ? Number(b.pension) * Number(b.porcentaje) / 100 : "";
                    setAgregarDialog((p) => ({ ...p, idBeneficiario: e.target.value, monto: p.monto || (estim ? String(estim.toFixed(2)) : "") }));
                  }}>
                  {agregarDialog.beneficiarios.map((b) => (
                    <MenuItem key={b.idBeneficiario} value={b.idBeneficiario}>
                      {b.nombreCompleto} ({b.parentesco} {b.porcentaje}%) — titular: {b.jubiladoTitular}
                    </MenuItem>
                  ))}
                  {agregarDialog.beneficiarios.length === 0 && <MenuItem value="" disabled>No hay beneficiarios disponibles</MenuItem>}
                </Select>
              </FormControl>
            )}

            <TextField fullWidth type="number" label="Monto a pagar *" value={agregarDialog.monto}
              onChange={(e) => setAgregarDialog((p) => ({ ...p, monto: e.target.value }))} />
            <TextField fullWidth type="number" label="Días" value={agregarDialog.dias}
              onChange={(e) => setAgregarDialog((p) => ({ ...p, dias: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAgregarDialog((p) => ({ ...p, open: false }))}>Cancelar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAgregar}>Agregar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default PrestacionesJubiladosPage;
