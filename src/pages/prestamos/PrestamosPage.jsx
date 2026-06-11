import AddIcon from "@mui/icons-material/Add";
import CalculateIcon from "@mui/icons-material/Calculate";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ListAltIcon from "@mui/icons-material/ListAlt";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, IconButton,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canDelete, canEdit } from "../../utils/permissions";

const estados = ["ACTIVO", "CANCELADO", "MORA", "ANULADO"];
const MANEJO_EPQ_ID = 4;
const formatDate = (value) => (value ? String(value).slice(0, 10) : "");
const initialForm = { idAportacion: "", noContrato: "", montoAutorizado: "", cuotaNivelada: "", plazoMeses: "", fechaInicio: "", fechaFin: "", totalPagar: "", tasaInteres: "", estado: "ACTIVO" };
const initialDetalle = { fechaPago: "", descuentoNominaAportacion: 0, cuotaNivelada: "", amortizacion: "", intereses: "", saldo: "", mora: 0, seguro: 0 };

const PrestamosPage = ({ detailOnly = false }) => {
  const { user } = useAuth();
  const [prestamos, setPrestamos] = useState([]);
  const [aportaciones, setAportaciones] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [detalle, setDetalle] = useState([]);
  const [detalleForm, setDetalleForm] = useState(initialDetalle);
  const [editingDetalle, setEditingDetalle] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [totalPagado, setTotalPagado] = useState(0);

  const loadPrestamos = async () => {
    const { data } = await axiosClient.get("/prestamos");
    setPrestamos(data.data || []);
  };

  const loadAportaciones = async () => {
    const { data } = await axiosClient.get("/aportaciones");
    setAportaciones((data.data || []).filter((item) => item.estado === "ACTIVO" && Number(item.tipoManejo) === MANEJO_EPQ_ID && item.tienePrestamo));
  };

  useEffect(() => {
    loadPrestamos().catch((error) => Swal.fire("Error", error.response?.data?.message || "No fue posible cargar prestamos.", "error"));
    loadAportaciones().catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const scoped = prestamos.filter((item) => Number(item.tipoManejo) === MANEJO_EPQ_ID);
    if (!term) return scoped;
    return scoped.filter((item) => [item.noContrato, item.aportacionNombre, item.aportacionDpi].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [prestamos, search]);

  const selectedAportacion = useMemo(
    () => aportaciones.find((item) => Number(item.id) === Number(form.idAportacion)),
    [aportaciones, form.idAportacion]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ ...item, fechaInicio: formatDate(item.fechaInicio), fechaFin: formatDate(item.fechaFin) });
    setDialogOpen(true);
  };

  const calculate = async () => {
    try {
      const { data } = await axiosClient.post("/prestamos/calcular-cuota", form);
      setForm({ ...form, cuotaNivelada: data.data.cuotaNivelada, totalPagar: data.data.totalPagar });
      Swal.fire("Listo", `Interes estimado: Q ${Number(data.data.interesTotalEstimado).toFixed(2)}`, "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible calcular la cuota.", "error");
    }
  };

  const savePrestamo = async () => {
    try {
      if (editing) {
        await axiosClient.put(`/prestamos/${editing.id}`, form);
        Swal.fire("Listo", "Prestamo actualizado correctamente.", "success");
      } else {
        await axiosClient.post("/prestamos", form);
        Swal.fire("Listo", "Prestamo creado correctamente.", "success");
      }
      setDialogOpen(false);
      loadPrestamos();
      loadAportaciones();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar el prestamo.", "error");
    }
  };

  const changeStatus = async (item) => {
    const { value } = await Swal.fire({ title: "Cambiar estado", input: "select", inputOptions: Object.fromEntries(estados.map((e) => [e, e])), inputValue: item.estado, showCancelButton: true, confirmButtonText: "Guardar", confirmButtonColor: "#1f4e5f" });
    if (!value) return;
    await axiosClient.patch(`/prestamos/${item.id}/estado`, { estado: value });
    loadPrestamos();
  };

  const deletePrestamo = async (item) => {
    const result = await Swal.fire({ title: "Eliminar prestamo", text: "Si tiene detalle no podra eliminarse.", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", confirmButtonColor: "#1f4e5f" });
    if (!result.isConfirmed) return;
    try {
      await axiosClient.delete(`/prestamos/${item.id}`);
      Swal.fire("Listo", "Prestamo eliminado correctamente.", "success");
      loadPrestamos();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar.", "error");
    }
  };

  const loadDetalle = async (item) => {
    const [detalleResponse, saldoResponse, totalResponse] = await Promise.all([
      axiosClient.get(`/prestamos/${item.id}/detalle`),
      axiosClient.get(`/prestamos/${item.id}/saldo`),
      axiosClient.get(`/prestamos/${item.id}/total-pagado`)
    ]);
    setDetalle(detalleResponse.data.data || []);
    setSaldo(saldoResponse.data.data?.saldoActual || 0);
    setTotalPagado(totalResponse.data.data?.totalPagado || 0);
  };

  const openDetalle = async (item) => {
    setSelected(item);
    setDetalleForm(initialDetalle);
    setEditingDetalle(null);
    setDetailOpen(true);
    await loadDetalle(item);
  };

  const saveDetalle = async () => {
    try {
      if (editingDetalle) {
        await axiosClient.put(`/prestamos/detalle/${editingDetalle.id}`, detalleForm);
        Swal.fire("Listo", "Pago actualizado correctamente.", "success");
      } else {
        await axiosClient.post(`/prestamos/${selected.id}/detalle`, detalleForm);
        Swal.fire("Listo", "Pago agregado correctamente.", "success");
      }
      setDetalleForm(initialDetalle);
      setEditingDetalle(null);
      loadDetalle(selected);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar el pago.", "error");
    }
  };

  const openEditDetalle = (row) => {
    setEditingDetalle(row);
    setDetalleForm({
      fechaPago: formatDate(row.fechaPago),
      descuentoNominaAportacion: row.descuentoNominaAportacion,
      cuotaNivelada: row.cuotaNivelada,
      amortizacion: row.amortizacion,
      intereses: row.intereses,
      saldo: row.saldo,
      mora: row.mora,
      seguro: row.seguro || 0
    });
  };

  const deleteDetalle = async (row) => {
    const result = await Swal.fire({ title: "Eliminar pago", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", confirmButtonColor: "#1f4e5f" });
    if (!result.isConfirmed) return;
    await axiosClient.delete(`/prestamos/detalle/${row.id}`);
    loadDetalle(selected);
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h5">{detailOnly ? "Detalle Prestamos" : "Prestamos"}</Typography>
          <Typography color="text.secondary">Control de prestamos y pagos</Typography>
        </Box>
        {!detailOnly && canCreate(user) && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nuevo prestamo</Button>}
      </Stack>

      <TextField placeholder="Buscar por contrato, nombre o DPI" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ maxWidth: { md: 520 } }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea", overflow: "hidden" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}>
            <TableRow><TableCell>Codigo</TableCell><TableCell>Contrato</TableCell><TableCell>Aportacion</TableCell><TableCell>DPI</TableCell><TableCell>Monto</TableCell><TableCell>Cuota</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell></TableRow>
          </TableHead>
          <TableBody>{filtered.map((item) => <TableRow key={item.id} hover><TableCell>{item.id}</TableCell><TableCell>{item.noContrato}</TableCell><TableCell>{item.aportacionNombre}</TableCell><TableCell>{item.aportacionDpi}</TableCell><TableCell>Q {Number(item.montoAutorizado).toFixed(2)}</TableCell><TableCell>Q {Number(item.cuotaNivelada).toFixed(2)}</TableCell><TableCell><Chip label={item.estado} color={item.estado === "ACTIVO" ? "success" : "default"} size="small" /></TableCell><TableCell align="right"><Stack direction="row" spacing={0.5} justifyContent="flex-end">{!detailOnly && canEdit(user) && <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => openEdit(item)}><EditIcon /></IconButton></Tooltip>}<Tooltip title="Detalle"><IconButton size="small" color="primary" onClick={() => openDetalle(item)}><ListAltIcon /></IconButton></Tooltip>{!detailOnly && canEdit(user) && <Tooltip title="Estado"><IconButton size="small" color="primary" onClick={() => changeStatus(item)}><PowerSettingsNewIcon /></IconButton></Tooltip>}{!detailOnly && canDelete(user) && <Tooltip title="Eliminar"><IconButton size="small" color="primary" onClick={() => deletePrestamo(item)}><DeleteIcon /></IconButton></Tooltip>}</Stack></TableCell></TableRow>)}</TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { width: "min(980px, calc(100% - 24px))" } }}
      >
        <DialogTitle>{editing ? "Editar prestamo" : "Nuevo prestamo"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth><InputLabel>Aportante</InputLabel><Select label="Aportante" value={form.idAportacion} onChange={(e) => setForm({ ...form, idAportacion: e.target.value })}>{aportaciones.map((a) => <MenuItem key={a.id} value={a.id}>{a.nombre} {a.apellido} - {a.dpi}</MenuItem>)}</Select></FormControl>
            </Grid>
            <Grid item xs={12} md={6}><TextField label="No. contrato" value={form.noContrato} onChange={(e) => setForm({ ...form, noContrato: e.target.value })} fullWidth /></Grid>
            {selectedAportacion && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "rgba(31, 78, 95, 0.03)" }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={4}><Typography variant="caption" color="text.secondary">Nombre</Typography><Typography>{selectedAportacion.nombre} {selectedAportacion.apellido}</Typography></Grid>
                    <Grid item xs={12} md={4}><Typography variant="caption" color="text.secondary">DPI</Typography><Typography>{selectedAportacion.dpi}</Typography></Grid>
                    <Grid item xs={12} md={4}><Typography variant="caption" color="text.secondary">Gerencia</Typography><Typography>{selectedAportacion.gerencia}</Typography></Grid>
                    <Grid item xs={12} md={4}><Typography variant="caption" color="text.secondary">Estado</Typography><Typography>{selectedAportacion.estado}</Typography></Grid>
                    <Grid item xs={12} md={4}><Typography variant="caption" color="text.secondary">Prestamo activo</Typography><Typography>{selectedAportacion.tienePrestamo ? "SI" : "NO"}</Typography></Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
            <Grid item xs={12} md={6}><TextField label="Monto autorizado" type="number" value={form.montoAutorizado} onChange={(e) => setForm({ ...form, montoAutorizado: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Tasa interes" type="number" value={form.tasaInteres} onChange={(e) => setForm({ ...form, tasaInteres: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Plazo meses" type="number" value={form.plazoMeses} onChange={(e) => setForm({ ...form, plazoMeses: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><Button variant="outlined" startIcon={<CalculateIcon />} onClick={calculate} fullWidth sx={{ minHeight: 56 }}>Calcular cuota</Button></Grid>
            <Grid item xs={12} md={6}><TextField label="Cuota nivelada" type="number" value={form.cuotaNivelada} onChange={(e) => setForm({ ...form, cuotaNivelada: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Total pagar" type="number" value={form.totalPagar} onChange={(e) => setForm({ ...form, totalPagar: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Fecha inicio" type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Fecha fin" type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Estado</InputLabel><Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>{estados.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}</Select></FormControl></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Cancelar</Button><Button variant="contained" onClick={savePrestamo}>Guardar</Button></DialogActions>
      </Dialog>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Detalle de prestamo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="h6">Total pagado: Q {Number(totalPagado).toFixed(2)} | Saldo actual: Q {Number(saldo).toFixed(2)}</Typography>
            {canCreate(user) && <Grid container spacing={2}><Grid item xs={12} md={2}><TextField label="Fecha pago" type="date" value={detalleForm.fechaPago} onChange={(e) => setDetalleForm({ ...detalleForm, fechaPago: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth /></Grid><Grid item xs={12} md={2}><TextField label="Cuota" type="number" value={detalleForm.cuotaNivelada} onChange={(e) => setDetalleForm({ ...detalleForm, cuotaNivelada: e.target.value })} fullWidth /></Grid><Grid item xs={12} md={2}><TextField label="Amortizacion" type="number" value={detalleForm.amortizacion} onChange={(e) => setDetalleForm({ ...detalleForm, amortizacion: e.target.value })} fullWidth /></Grid><Grid item xs={12} md={2}><TextField label="Intereses" type="number" value={detalleForm.intereses} onChange={(e) => setDetalleForm({ ...detalleForm, intereses: e.target.value })} fullWidth /></Grid><Grid item xs={12} md={2}><TextField label="Saldo" type="number" value={detalleForm.saldo} onChange={(e) => setDetalleForm({ ...detalleForm, saldo: e.target.value })} fullWidth /></Grid><Grid item xs={12} md={2}><TextField label="Mora" type="number" value={detalleForm.mora} onChange={(e) => setDetalleForm({ ...detalleForm, mora: e.target.value })} fullWidth /></Grid><Grid item xs={12} md={2}><TextField label="Seguro" type="number" value={detalleForm.seguro} onChange={(e) => setDetalleForm({ ...detalleForm, seguro: e.target.value })} fullWidth /></Grid><Grid item xs={12}><Button variant="contained" onClick={saveDetalle}>{editingDetalle ? "Actualizar pago" : "Agregar pago"}</Button>{editingDetalle && <Button sx={{ ml: 1 }} onClick={() => { setEditingDetalle(null); setDetalleForm(initialDetalle); }}>Cancelar edicion</Button>}</Grid></Grid>}
            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea", overflow: "hidden" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}><TableRow><TableCell>Codigo prestamo</TableCell><TableCell>No. contrato</TableCell><TableCell>Nombre aportante</TableCell><TableCell>Fecha pago</TableCell><TableCell>Cuota nivelada</TableCell><TableCell>Amortizacion</TableCell><TableCell>Intereses</TableCell><TableCell>Saldo</TableCell><TableCell>Mora</TableCell><TableCell>Seguro</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
                <TableBody>{detalle.map((d) => <TableRow key={d.id}><TableCell>{selected?.id}</TableCell><TableCell>{selected?.noContrato}</TableCell><TableCell>{selected?.aportacionNombre}</TableCell><TableCell>{formatDate(d.fechaPago)}</TableCell><TableCell>Q {Number(d.cuotaNivelada).toFixed(2)}</TableCell><TableCell>Q {Number(d.amortizacion).toFixed(2)}</TableCell><TableCell>Q {Number(d.intereses).toFixed(2)}</TableCell><TableCell>Q {Number(d.saldo).toFixed(2)}</TableCell><TableCell>Q {Number(d.mora).toFixed(2)}</TableCell><TableCell>Q {Number(d.seguro || 0).toFixed(2)}</TableCell><TableCell align="right"><Stack direction="row" spacing={0.5} justifyContent="flex-end">{canEdit(user) && <IconButton size="small" color="primary" onClick={() => openEditDetalle(d)}><EditIcon /></IconButton>}{canDelete(user) && <IconButton size="small" color="primary" onClick={() => deleteDetalle(d)}><DeleteIcon /></IconButton>}</Stack></TableCell></TableRow>)}</TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailOpen(false)}>Cerrar</Button></DialogActions>
      </Dialog>
    </Stack>
  );
};

export default PrestamosPage;
