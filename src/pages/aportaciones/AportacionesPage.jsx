import AddIcon from "@mui/icons-material/Add";
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

const initialForm = {
  tipoManejo: "",
  idAportacion: "",
  nombre: "",
  apellido: "",
  dpi: "",
  gerencia: "",
  fechaInicioAportacion: "",
  fechaFinAportacion: "",
  estado: "ACTIVO",
  tienePrestamo: false,
  motivoRetiro: "",
  fechaNacimiento: "",
  ubicacion: ""
};

const estados = ["ACTIVO", "INACTIVO", "RETIRADO"];
const formatDate = (value) => (value ? String(value).slice(0, 10) : "");
const MANEJO_EPQ_ID = 4;
const findManejoById = (items = [], id) => items.find((item) => Number(item.id) === Number(id));

const AportacionesPage = () => {
  const { user } = useAuth();
  const [aportaciones, setAportaciones] = useState([]);
  const [manejos, setManejos] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [detalle, setDetalle] = useState([]);
  const [detalleForm, setDetalleForm] = useState({ fechaPago: "", valor: "" });
  const [total, setTotal] = useState(0);

  const loadAportaciones = async () => {
    const { data } = await axiosClient.get("/aportaciones");
    setAportaciones(data.data || []);
  };

  const loadManejos = async () => {
    const { data } = await axiosClient.get("/catalogos/manejo-administracion");
    const items = data.data || [];
    setManejos(items);
    if (!findManejoById(items, MANEJO_EPQ_ID)) {
      console.warn(`No existe manejo ${MANEJO_EPQ_ID}`);
    }
  };

  useEffect(() => {
    loadAportaciones().catch((error) => Swal.fire("Error", error.response?.data?.message || "No fue posible cargar aportaciones.", "error"));
    loadManejos().catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const scoped = aportaciones.filter((item) => Number(item.tipoManejo) === MANEJO_EPQ_ID);
    if (!term) return scoped;
    return scoped.filter((item) =>
      [item.nombre, item.apellido, item.dpi, item.gerencia].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [aportaciones, search]);

  const openCreate = () => {
    setEditing(null);
    const manejoEpq = findManejoById(manejos, MANEJO_EPQ_ID);
    setForm({ ...initialForm, tipoManejo: manejoEpq?.id || MANEJO_EPQ_ID });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      ...item,
      fechaInicioAportacion: formatDate(item.fechaInicioAportacion),
      fechaFinAportacion: formatDate(item.fechaFinAportacion),
      fechaNacimiento: formatDate(item.fechaNacimiento)
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    const required = ["tipoManejo", "idAportacion", "nombre", "apellido", "dpi", "gerencia", "fechaInicioAportacion", "estado", "fechaNacimiento", "ubicacion"];
    const missing = required.find((key) => String(form[key] ?? "").trim() === "");
    if (missing) return "Complete los campos obligatorios.";
    return null;
  };

  const saveAportacion = async () => {
    const validation = validateForm();
    if (validation) {
      Swal.fire("Validacion", validation, "warning");
      return;
    }

    try {
      if (editing) {
        await axiosClient.put(`/aportaciones/${editing.id}`, form);
        Swal.fire("Listo", "Aportacion actualizada correctamente.", "success");
      } else {
        await axiosClient.post("/aportaciones", form);
        Swal.fire("Listo", "Aportacion creada correctamente.", "success");
      }
      setDialogOpen(false);
      loadAportaciones();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar la aportacion.", "error");
    }
  };

  const changeStatus = async (item) => {
    const { value } = await Swal.fire({
      title: "Cambiar estado",
      input: "select",
      inputOptions: Object.fromEntries(estados.map((estado) => [estado, estado])),
      inputValue: item.estado,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      confirmButtonColor: "#1f4e5f"
    });
    if (!value) return;
    await axiosClient.patch(`/aportaciones/${item.id}/estado`, { estado: value });
    Swal.fire("Listo", "Estado actualizado correctamente.", "success");
    loadAportaciones();
  };

  const deleteAportacion = async (item) => {
    const result = await Swal.fire({
      title: "Eliminar aportacion",
      text: "Si tiene detalle o prestamo relacionado no podra eliminarse.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1f4e5f"
    });
    if (!result.isConfirmed) return;
    try {
      await axiosClient.delete(`/aportaciones/${item.id}`);
      Swal.fire("Listo", "Aportacion eliminada correctamente.", "success");
      loadAportaciones();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar.", "error");
    }
  };

  const loadDetalle = async (item) => {
    const [detalleResponse, totalResponse] = await Promise.all([
      axiosClient.get(`/aportaciones/${item.id}/detalle`),
      axiosClient.get(`/aportaciones/${item.id}/total`)
    ]);
    setDetalle(detalleResponse.data.data || []);
    setTotal(totalResponse.data.data?.totalAportado || 0);
  };

  const openDetalle = async (item) => {
    setSelected(item);
    setDetalleForm({ fechaPago: "", valor: "" });
    setDetailOpen(true);
    await loadDetalle(item);
  };

  const saveDetalle = async () => {
    if (!detalleForm.fechaPago || Number(detalleForm.valor) <= 0) {
      Swal.fire("Validacion", "Ingrese fecha de pago y valor mayor a 0.", "warning");
      return;
    }
    await axiosClient.post(`/aportaciones/${selected.id}/detalle`, detalleForm);
    Swal.fire("Listo", "Pago agregado correctamente.", "success");
    setDetalleForm({ fechaPago: "", valor: "" });
    loadDetalle(selected);
  };

  const deleteDetalle = async (row) => {
    const result = await Swal.fire({ title: "Eliminar pago", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", confirmButtonColor: "#1f4e5f" });
    if (!result.isConfirmed) return;
    await axiosClient.delete(`/aportaciones/detalle/${row.id}`);
    loadDetalle(selected);
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h5">Aportaciones EPQ</Typography>
          <Typography color="text.secondary">Control de aportaciones y pagos realizados</Typography>
        </Box>
        {canCreate(user) && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nueva aportacion</Button>}
      </Stack>

      <TextField
        placeholder="Buscar por nombre, apellido, DPI o gerencia"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ maxWidth: { md: 520 } }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea", overflow: "hidden" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}>
            <TableRow>
              <TableCell>ID</TableCell><TableCell>Nombre</TableCell><TableCell>DPI</TableCell><TableCell>Gerencia</TableCell><TableCell>Estado</TableCell><TableCell>Prestamo</TableCell><TableCell>Manejo</TableCell><TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.idAportacion}</TableCell>
                <TableCell>{item.nombre} {item.apellido}</TableCell>
                <TableCell>{item.dpi}</TableCell>
                <TableCell>{item.gerencia}</TableCell>
                <TableCell><Chip label={item.estado} color={item.estado === "ACTIVO" ? "success" : "default"} size="small" /></TableCell>
                <TableCell><Chip label={item.tienePrestamo ? "SI" : "NO"} color={item.tienePrestamo ? "warning" : "default"} size="small" /></TableCell>
                <TableCell>{item.manejoDescripcion}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  {canEdit(user) && <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => openEdit(item)}><EditIcon /></IconButton></Tooltip>}
                  <Tooltip title="Ver detalle"><IconButton size="small" color="primary" onClick={() => openDetalle(item)}><ListAltIcon /></IconButton></Tooltip>
                  {canEdit(user) && <Tooltip title="Cambiar estado"><IconButton size="small" color="primary" onClick={() => changeStatus(item)}><PowerSettingsNewIcon /></IconButton></Tooltip>}
                  {canDelete(user) && <Tooltip title="Eliminar"><IconButton size="small" color="primary" onClick={() => deleteAportacion(item)}><DeleteIcon /></IconButton></Tooltip>}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} align="center">No hay aportaciones para mostrar.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Editar aportacion" : "Nueva aportacion"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Tipo manejo</InputLabel><Select label="Tipo manejo" value={form.tipoManejo} onChange={(e) => setForm({ ...form, tipoManejo: e.target.value })} disabled>{manejos.map((m) => <MenuItem key={m.id} value={m.id}>{m.descripcion}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={12} md={6}><TextField label="ID aportacion" type="number" value={form.idAportacion} onChange={(e) => setForm({ ...form, idAportacion: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="DPI" value={form.dpi} onChange={(e) => setForm({ ...form, dpi: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Gerencia" value={form.gerencia} onChange={(e) => setForm({ ...form, gerencia: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Fecha inicio aportacion" type="date" value={form.fechaInicioAportacion} onChange={(e) => setForm({ ...form, fechaInicioAportacion: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Fecha fin aportacion" type="date" value={form.fechaFinAportacion || ""} onChange={(e) => setForm({ ...form, fechaFinAportacion: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Estado</InputLabel><Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>{estados.map((estado) => <MenuItem key={estado} value={estado}>{estado}</MenuItem>)}</Select></FormControl></Grid>
            <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Tiene prestamo</InputLabel><Select label="Tiene prestamo" value={form.tienePrestamo ? "1" : "0"} onChange={(e) => setForm({ ...form, tienePrestamo: e.target.value === "1" })}><MenuItem value="0">NO</MenuItem><MenuItem value="1">SI</MenuItem></Select></FormControl></Grid>
            <Grid item xs={12} md={6}><TextField label="Fecha nacimiento" type="date" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Ubicacion" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12}><TextField label="Motivo retiro" value={form.motivoRetiro || ""} onChange={(e) => setForm({ ...form, motivoRetiro: e.target.value })} fullWidth /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Cancelar</Button><Button variant="contained" onClick={saveAportacion}>Guardar</Button></DialogActions>
      </Dialog>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Detalle de aportaciones</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="h6">Total aportado: Q {Number(total).toFixed(2)}</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Fecha pago" type="date" value={detalleForm.fechaPago} onChange={(e) => setDetalleForm({ ...detalleForm, fechaPago: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Valor" type="number" value={detalleForm.valor} onChange={(e) => setDetalleForm({ ...detalleForm, valor: e.target.value })} fullWidth />
              {canCreate(user) && <Button variant="contained" onClick={saveDetalle}>Agregar pago</Button>}
            </Stack>
            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
              <Table size="small"><TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}><TableRow><TableCell>Codigo empleado</TableCell><TableCell>Nombre</TableCell><TableCell>Valor</TableCell><TableCell>Fecha</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
                <TableBody>{detalle.map((row) => <TableRow key={row.id}><TableCell>{row.codigoEmpleado || selected?.idAportacion}</TableCell><TableCell>{row.nombre || `${selected?.nombre || ""} ${selected?.apellido || ""}`}</TableCell><TableCell>Q {Number(row.valor).toFixed(2)}</TableCell><TableCell>{formatDate(row.fechaPago)}</TableCell><TableCell align="right">{canDelete(user) && <IconButton size="small" color="primary" onClick={() => deleteDetalle(row)}><DeleteIcon /></IconButton>}</TableCell></TableRow>)}</TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailOpen(false)}>Cerrar</Button></DialogActions>
      </Dialog>
    </Stack>
  );
};

export default AportacionesPage;
