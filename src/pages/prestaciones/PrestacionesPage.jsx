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

// Las 3 prestaciones comparten pantalla; sólo cambian período, parámetros y textos.
const TIPOS = [
  {
    key: "bono14",
    label: "Bono 14",
    titulo: "GENERAR BONO 14",
    baseLegal: "Decreto 42-92 · Bonificación Anual. Exento de IGSS e ISR.",
    porAnio: true
  },
  {
    key: "aguinaldo",
    label: "Aguinaldo",
    titulo: "GENERAR AGUINALDO",
    baseLegal: "Decreto 76-78 · La asociación paga el 100% en una sola cuota en diciembre.",
    porAnio: true
  },
  {
    key: "vacacional",
    label: "Bono Vacacional",
    titulo: "GENERAR BONO VACACIONAL",
    baseLegal: "Prestación adicional de la asociación. Sólo empleados con 1 año o más de antigüedad.",
    porAnio: false
  }
];

const anioActual = new Date().getFullYear();

// Período legal de cada prestación, para mostrarlo en pantalla antes de generar.
const periodoDe = (tipo, anio) => {
  const y = Number(anio);
  if (!y) return "";
  if (tipo === "bono14") return `01/07/${y - 1} al 30/06/${y}`;
  if (tipo === "aguinaldo") return `01/12/${y - 1} al 30/11/${y}`;
  return "";
};

const formVacio = { numero: "", fechaInicio: "", fechaFinal: "", fechaPago: "" };

const PrestacionesPage = () => {
  const { user } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);
  const tipo = TIPOS[tabIndex];

  const [planillas, setPlanillas] = useState([]);
  const [form, setForm] = useState(formVacio);
  const [loading, setLoading] = useState(false);

  // Parámetros de generación
  const [anio, setAnio] = useState(anioActual);
  const [porcentajeOpcion, setPorcentajeOpcion] = useState("100");
  const [porcentajeOtro, setPorcentajeOtro] = useState("");
  const [acta, setActa] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [idSeleccionada, setIdSeleccionada] = useState("");

  // Revisión / edición
  const [detalle, setDetalle] = useState({ id: null, numero: null, estado: null, nombre: null, rows: [] });
  const [reversarDialog, setReversarDialog] = useState({ open: false, motivo: "" });
  const [editarDialog, setEditarDialog] = useState({ open: false, linea: null, monto: "" });
  const [agregarDialog, setAgregarDialog] = useState({ open: false, empleados: [], idEmpleado: "", monto: "", dias: "" });

  const porcentaje = porcentajeOpcion === "otro" ? Number(porcentajeOtro) : Number(porcentajeOpcion);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get(`/prestaciones/${tipo.key}`);
      setPlanillas(data.data || []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar las planillas.", "error");
    }
  }, [tipo.key]);

  const loadPreview = useCallback(async () => {
    try {
      const params = tipo.porAnio ? { anio } : { porcentaje: porcentaje || 100 };
      const { data } = await axiosClient.get(`/prestaciones/${tipo.key}/preview`, { params });
      setPreviewData(data.data);
    } catch (_) {
      setPreviewData(null);
    }
  }, [tipo.key, tipo.porAnio, anio, porcentaje]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPreview(); }, [loadPreview]);

  // Al cambiar de prestación se limpia todo lo del tipo anterior.
  useEffect(() => {
    setDetalle({ id: null, numero: null, estado: null, nombre: null, rows: [] });
    setIdSeleccionada("");
    setForm(formVacio);
  }, [tabIndex]);

  const generables = planillas.filter((p) => ["ABIERTA", "REVERSADA"].includes(p.estadoProceso));

  const crear = async () => {
    if (!form.numero || String(form.numero).length !== 6) { Swal.fire("Validación", "El número debe tener formato YYYYMM (6 dígitos).", "warning"); return; }
    if (!form.fechaInicio || !form.fechaFinal || !form.fechaPago) { Swal.fire("Validación", "Complete las fechas.", "warning"); return; }
    setLoading(true);
    try {
      await axiosClient.post(`/prestaciones/${tipo.key}`, form);
      Swal.fire("Listo", `Planilla de ${tipo.label} creada.`, "success");
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
    if (tipo.porAnio && !anio) { Swal.fire("Validación", "Indique el año.", "warning"); return; }
    if (!tipo.porAnio) {
      if (!porcentaje || porcentaje < 0.01 || porcentaje > 100) { Swal.fire("Validación", "El porcentaje debe estar entre 0.01 y 100.", "warning"); return; }
      if (!acta.trim()) { Swal.fire("Validación", "Indique el número de acta que autoriza el pago.", "warning"); return; }
    }

    const confirm = await Swal.fire({
      title: tipo.titulo,
      html: tipo.porAnio
        ? `Se generará el <b>${tipo.label} ${anio}</b> del período ${periodoDe(tipo.key, anio)}.`
        : `Se generará el <b>Bono Vacacional al ${porcentaje}%</b>.<br>Los empleados con menos de 1 año serán excluidos.`,
      icon: "question", showCancelButton: true,
      confirmButtonText: "Generar", cancelButtonText: "Cancelar", confirmButtonColor: "#1f4e5f"
    });
    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const payload = tipo.porAnio
        ? { idPlanilla: idSeleccionada, anio: Number(anio) }
        : { idPlanilla: idSeleccionada, porcentaje, acta };
      const { data } = await axiosClient.post(`/prestaciones/${tipo.key}/generar`, payload);
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
        axiosClient.get(`/prestaciones/planilla/${row.id}/detalle`),
        axiosClient.get(`/prestaciones/planilla/${row.id}`)
      ]);
      setDetalle({
        id: row.id,
        numero: pl.data?.numero,
        estado: pl.data?.estadoProceso,
        nombre: pl.data?.tipoPlanillaNombre,
        rows: det.data || []
      });
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
      const { data } = await axiosClient.post(`/prestaciones/${tipo.key}/revertir/${detalle.id}`, { motivo: reversarDialog.motivo });
      Swal.fire("Éxito", data.data?.resultado || "PLANILLA REVERSADA CORRECTAMENTE", "success");
      setReversarDialog({ open: false, motivo: "" });
      await load();
      setDetalle({ id: null, numero: null, estado: null, nombre: null, rows: [] });
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
      await axiosClient.post(`/prestaciones/planilla/${detalle.id}/cerrar`);
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
      const { data } = await axiosClient.put(`/prestaciones/linea/${editarDialog.linea.idLinea}/monto`, { monto });
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
      input: "text", inputLabel: "Motivo (obligatorio)", inputPlaceholder: "Ej. renunció el mes pasado",
      icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", cancelButtonText: "Cancelar",
      confirmButtonColor: "#c62828",
      inputValidator: (v) => (!v || !v.trim() ? "El motivo es obligatorio" : undefined)
    });
    if (!isConfirmed) return;
    try {
      const { data } = await axiosClient.delete(`/prestaciones/linea/${row.idLinea}`, { data: { motivo } });
      Swal.fire("Éxito", data.data?.resultado || "Renglón eliminado.", "success");
      await refrescarDetalle();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar el renglón.", "error");
    }
  };

  const abrirAgregar = async () => {
    try {
      const { data } = await axiosClient.get(`/prestaciones/planilla/${detalle.id}/empleados-disponibles`);
      const empleados = data.data || [];
      if (!empleados.length) { Swal.fire("Sin empleados", "Todos los empleados activos ya están en esta planilla.", "info"); return; }
      setAgregarDialog({ open: true, empleados, idEmpleado: "", monto: "", dias: "" });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar los empleados.", "error");
    }
  };

  const handleAgregar = async () => {
    const monto = Number(agregarDialog.monto);
    if (!agregarDialog.idEmpleado) { Swal.fire("Atención", "Seleccione un empleado.", "warning"); return; }
    if (!monto || monto <= 0) { Swal.fire("Atención", "El monto debe ser mayor a cero.", "warning"); return; }
    try {
      const { data } = await axiosClient.post(`/prestaciones/planilla/${detalle.id}/empleado`, {
        idEmpleado: Number(agregarDialog.idEmpleado),
        monto,
        dias: Number(agregarDialog.dias || 0)
      });
      Swal.fire("Éxito", data.data?.resultado || "Empleado agregado.", "success");
      setAgregarDialog({ open: false, empleados: [], idEmpleado: "", monto: "", dias: "" });
      await refrescarDetalle();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible agregar el empleado.", "error");
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

  const totalDetalle = detalle.rows.reduce((s, r) => s + Number(r.monto || 0), 0);
  const esGenerada = detalle.estado === "GENERADA";
  const esCerrada = detalle.estado === "CERRADA";
  const puedeEditar = ["ABIERTA", "GENERADA"].includes(detalle.estado);

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Prestaciones"
        subtitle="Bono 14 · Aguinaldo · Bono Vacacional (sin descuentos de IGSS ni ISR)"
      />

      <Paper elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="scrollable" scrollButtons="auto">
          {TIPOS.map((t) => <Tab key={t.key} label={t.label} />)}
        </Tabs>
      </Paper>

      <Alert severity="info">{tipo.baseLegal}</Alert>

      {canCreate(user) && (
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
            Nueva planilla de {tipo.label}
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
                <InputLabel id="lbl-planilla">Planilla</InputLabel>
                <Select labelId="lbl-planilla" label="Planilla" value={idSeleccionada}
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

            {tipo.porAnio ? (
              <>
                <Grid item xs={12} md={2}>
                  <TextField label="Año" type="number" fullWidth value={anio}
                    onChange={(e) => setAnio(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField label="Período (automático)" fullWidth InputProps={{ readOnly: true }}
                    value={periodoDe(tipo.key, anio)} />
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Porcentaje a pagar</Typography>
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
                  <TextField label="Acta de autorización *" fullWidth value={acta}
                    placeholder="ACTA-2026-XXX" onChange={(e) => setActa(e.target.value)} />
                </Grid>
              </>
            )}

            <Grid item xs={12} md={3}>
              <Button variant="contained" color="success" fullWidth startIcon={<PlayArrowIcon />}
                onClick={generar} disabled={loading}>
                Generar {tipo.label}
              </Button>
            </Grid>
          </Grid>

          {previewData && (
            <Alert severity={previewData.totalEmpleados > 0 ? "success" : "warning"} sx={{ mt: 2 }}>
              Empleados que serán procesados: <b>{previewData.totalEmpleados}</b>
              {" · "}Total estimado: <b>{money(previewData.totalEstimado)}</b>
              {!tipo.porAnio && (
                <> {" · "}Excluidos por antigüedad menor a 1 año: <b>{previewData.totalExcluidos}</b></>
              )}
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
              <TableCell align="center">Empleados</TableCell><TableCell align="right">Total</TableCell>
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
                <TableCell align="center">{p.totalEmpleados}</TableCell>
                <TableCell align="right">{money(p.totalPagado)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Ver detalle">
                    <IconButton size="small" color="primary" onClick={() => verDetalle(p)}><VisibilityIcon /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {planillas.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center">No hay planillas de {tipo.label}.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {detalle.id && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
            Revisión planilla {detalle.numero} — {detalle.nombre} ({detalle.estado})
          </Typography>

          {esCerrada && (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              La planilla está <b>CERRADA</b>. Los datos son de sólo consulta; puede exportar reportes.
            </Alert>
          )}

          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
            {puedeEditar && canGeneratePayroll(user) && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={abrirAgregar}>Agregar empleado</Button>
            )}
            {esGenerada && canGeneratePayroll(user) && (
              <Button variant="outlined" color="error" startIcon={<UndoIcon />}
                onClick={() => setReversarDialog({ open: true, motivo: "" })}>
                Reversar planilla
              </Button>
            )}
            {esGenerada && canGeneratePayroll(user) && (
              <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleCerrar}>
                Cerrar planilla y proceder a pago
              </Button>
            )}
            <Button variant="outlined" startIcon={<DownloadIcon />}
              onClick={() => download(`/prestaciones/planilla/${detalle.id}/export/excel`, `prestacion_${detalle.numero}.xlsx`)}>
              Exportar Excel
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />}
              onClick={() => download(`/prestaciones/planilla/${detalle.id}/export/banco`, `banco_prestacion_${detalle.numero}.txt`)}>
              Archivo Banco
            </Button>
          </Stack>

          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: "rgba(31,78,95,0.08)" }}>
                <TableRow>
                  <TableCell>Empleado</TableCell><TableCell>DPI</TableCell><TableCell>Puesto</TableCell>
                  <TableCell align="center">Días</TableCell><TableCell align="right">Salario base</TableCell>
                  <TableCell align="center">%</TableCell><TableCell align="right">Monto</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detalle.rows.map((r) => (
                  <TableRow key={r.idLinea} hover>
                    <TableCell>{r.nombreCompleto}</TableCell>
                    <TableCell>{r.dpi}</TableCell>
                    <TableCell>{r.puesto}</TableCell>
                    <TableCell align="center">{r.dias}</TableCell>
                    <TableCell align="right">{money(r.salarioBase)}</TableCell>
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
                {detalle.rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} align="center">Sin registros. Genere la prestación.</TableCell></TableRow>
                )}
                {detalle.rows.length > 0 && (
                  <TableRow sx={{ "& td": { fontWeight: 800 } }}>
                    <TableCell colSpan={6} align="right">TOTAL ({detalle.rows.length} empleados)</TableCell>
                    <TableCell align="right">{money(totalDetalle)}</TableCell>
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
        <DialogTitle>Reversar planilla {detalle.numero}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Se eliminarán TODOS los renglones de la planilla y quedará en estado REVERSADA para poder regenerarla.
            El cambio queda registrado en la bitácora.
          </Alert>
          <TextField fullWidth multiline rows={3} label="Motivo del reverso *" value={reversarDialog.motivo}
            onChange={(e) => setReversarDialog((p) => ({ ...p, motivo: e.target.value }))}
            placeholder="Ej. error en el cálculo de días" />
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

      {/* Agregar empleado */}
      <Dialog open={agregarDialog.open} onClose={() => setAgregarDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar empleado a la planilla {detalle.numero}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="lbl-emp">Empleado *</InputLabel>
              <Select labelId="lbl-emp" label="Empleado *" value={agregarDialog.idEmpleado}
                onChange={(e) => {
                  const emp = agregarDialog.empleados.find((x) => x.idEmpleado === e.target.value);
                  setAgregarDialog((p) => ({
                    ...p,
                    idEmpleado: e.target.value,
                    monto: p.monto || (emp ? String(emp.salario) : "")
                  }));
                }}>
                {agregarDialog.empleados.map((emp) => (
                  <MenuItem key={emp.idEmpleado} value={emp.idEmpleado}>
                    {emp.nombreCompleto} — ingreso {fecha(emp.fechaIngreso)} — {money(emp.salario)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth type="number" label="Monto a pagar *" value={agregarDialog.monto}
              onChange={(e) => setAgregarDialog((p) => ({ ...p, monto: e.target.value }))} />
            <TextField fullWidth type="number" label="Días trabajados" value={agregarDialog.dias}
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

export default PrestacionesPage;
