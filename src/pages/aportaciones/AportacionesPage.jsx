import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ListAltIcon from "@mui/icons-material/ListAlt";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, IconButton,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
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
  sexo: "",
  ubicacion: ""
};

const estados = ["ACTIVO", "INACTIVO", "RETIRADO"];
const sexoOptions = [{ value: "M", label: "Masculino" }, { value: "F", label: "Femenino" }];
const formatDate = (value) => (value ? String(value).slice(0, 10) : "");
const MANEJO_EPQ_ID = 4;
const findManejoById = (items = [], id) => items.find((item) => Number(item.id) === Number(id));
const up = (value) => String(value || "").toUpperCase();

// Filtro del buscador editable: acepta código (idAportacion), nombre, apellido o DPI.
// Se buscan todas las palabras escritas, en cualquier orden ("perez juan" encuentra "Juan Perez").
const filtrarEmpleadoEpq = (opciones, { inputValue }) => {
  const terminos = String(inputValue || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terminos.length) return opciones;
  return opciones.filter((o) => {
    const texto = `${o.idAportacion || ""} ${o.nombre || ""} ${o.apellido || ""} ${o.dpi || ""}`.toLowerCase();
    return terminos.every((t) => texto.includes(t));
  });
};

const AportacionesPage = ({ detailOnly = false }) => {
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
  const [detalleDialogOpen, setDetalleDialogOpen] = useState(false);
  const [editingDetalle, setEditingDetalle] = useState(null);
  const [total, setTotal] = useState(0);
  const fileInputRef = useRef(null);

  const handleExcelSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("archivo", file);
    try {
      const { data } = await axiosClient.post("/aportaciones/carga-masiva", formData);
      const resumen = data.data || {};
      const errores = resumen.errores || [];
      const erroresHtml = errores.slice(0, 12).map((e) => `Fila ${e.fila}: ${e.error}`).join("<br>");
      await Swal.fire({
        title: "Carga masiva procesada",
        icon: errores.length > 0 ? "warning" : "success",
        html: `Filas leidas: <b>${resumen.totalFilas ?? 0}</b><br>`
          + `Registros insertados: <b>${resumen.insertados ?? 0}</b><br>`
          + `Omitidos (duplicados): <b>${resumen.omitidos ?? 0}</b><br>`
          + `Errores: <b>${errores.length}</b>`
          + (erroresHtml ? `<hr style="margin:8px 0">${erroresHtml}` : "")
      });
      await loadAportaciones();
      if (selected) await loadDetalle(selected);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible procesar el archivo Excel.", "error");
    }
  };

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

  // Universo de empleados EPQ sin filtrar: alimenta el buscador editable del detalle.
  const empleadosEpq = useMemo(
    () => aportaciones.filter((item) => Number(item.tipoManejo) === MANEJO_EPQ_ID),
    [aportaciones]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const scoped = empleadosEpq;
    if (!term) return scoped;
    return scoped.filter((item) =>
      [item.nombre, item.apellido, item.dpi, item.gerencia, item.idAportacion].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [empleadosEpq, search]);

  // Paginación del maestro de empleados EPQ: 20 registros por página.
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  useEffect(() => { setPage(0); }, [search, filtered.length]);
  const ultimaPagina = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);
  const paginaActual = Math.min(page, ultimaPagina);
  const paginados = useMemo(
    () => filtered.slice(paginaActual * rowsPerPage, paginaActual * rowsPerPage + rowsPerPage),
    [filtered, paginaActual, rowsPerPage]
  );

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
      fechaNacimiento: formatDate(item.fechaNacimiento),
      sexo: item.sexo || ""
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    const required = ["tipoManejo", "idAportacion", "nombre", "apellido", "dpi", "gerencia", "fechaInicioAportacion", "estado", "fechaNacimiento", "ubicacion"];
    const missing = required.find((key) => String(form[key] ?? "").trim() === "");
    if (missing) return "Complete los campos obligatorios.";
    const current = String(form.idAportacion ?? "").trim();
    const duplicated = aportaciones.some(
      (item) => Number(item.id) !== Number(editing?.id) && String(item.idAportacion ?? "").trim() === current
    );
    if (current !== "" && duplicated) return "EL ID DE APORTACION YA EXISTE. INGRESE UN ID DIFERENTE.";
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
    setEditingDetalle(null);
    setDetailOpen(true);
    await loadDetalle(item);
  };

  const saveDetalle = async () => {
    if (!selected) {
      Swal.fire("Validacion", "Seleccione un empleado EPQ.", "warning");
      return;
    }
    if (!detalleForm.fechaPago || Number(detalleForm.valor) <= 0) {
      Swal.fire("Validacion", "Ingrese fecha de pago y valor mayor a 0.", "warning");
      return;
    }
    if (editingDetalle) {
      await axiosClient.put(`/aportaciones/detalle/${editingDetalle.id}`, detalleForm);
      Swal.fire("Listo", "Aportacion actualizada correctamente.", "success");
    } else {
      await axiosClient.post(`/aportaciones/${selected.id}/detalle`, detalleForm);
      Swal.fire("Listo", "Aportacion agregada correctamente.", "success");
    }
    setDetalleForm({ fechaPago: "", valor: "" });
    setEditingDetalle(null);
    setDetalleDialogOpen(false);
    loadDetalle(selected);
  };

  const openEditDetalle = (row) => {
    setEditingDetalle(row);
    setDetalleForm({ fechaPago: formatDate(row.fechaPago), valor: row.valor });
    setDetalleDialogOpen(true);
  };

  const editDetalleInline = (row) => {
    setEditingDetalle(row);
    setDetalleForm({ fechaPago: formatDate(row.fechaPago), valor: row.valor });
  };

  const deleteDetalle = async (row) => {
    const result = await Swal.fire({ title: "Eliminar pago", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", confirmButtonColor: "#1f4e5f" });
    if (!result.isConfirmed) return;
    await axiosClient.delete(`/aportaciones/detalle/${row.id}`);
    loadDetalle(selected);
  };

  // Recibe el empleado ya seleccionado en el buscador (o null al limpiarlo).
  const selectDetalleEmpleado = async (item) => {
    if (!item) {
      setSelected(null);
      setDetalle([]);
      setTotal(0);
      return;
    }
    setSelected(item);
    setDetalleForm({ fechaPago: "", valor: "" });
    setEditingDetalle(null);
    await loadDetalle(item);
  };

  const detalleFiltered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return detalle;
    return detalle.filter((row) =>
      [row.id, row.idAportacion, row.fechaPago, row.valor, row.fechaCreacion, row.usuarioCreacion].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [detalle, search]);

  const sexoLabel = (v) => (v === "M" ? "Masculino" : v === "F" ? "Femenino" : v || "");

  if (detailOnly) {
    return (
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box>
            <Typography variant="h5">Aportaciones</Typography>
            <Typography color="text.secondary">Detalles de aportaciones de empleados EPQ</Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            {canCreate(user) && (
              <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
                Carga masiva (Excel)
              </Button>
            )}
            {canCreate(user) && <Button variant="contained" startIcon={<AddIcon />} disabled={!selected} onClick={() => { setEditingDetalle(null); setDetalleForm({ fechaPago: "", valor: "" }); setDetalleDialogOpen(true); }}>Nueva aportacion</Button>}
          </Stack>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleExcelSelected} />
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Autocomplete
            sx={{ minWidth: { md: 420 } }}
            options={empleadosEpq}
            value={selected}
            onChange={(_, item) => selectDetalleEmpleado(item)}
            isOptionEqualToValue={(o, v) => o.id === v?.id}
            getOptionLabel={(o) => (o ? `${o.idAportacion} - ${o.nombre} ${o.apellido}` : "")}
            filterOptions={filtrarEmpleadoEpq}
            noOptionsText="Sin coincidencias"
            renderOption={(props, o) => (
              <li {...props} key={o.id}>{o.idAportacion} - {o.nombre} {o.apellido}{o.dpi ? ` — ${o.dpi}` : ""}</li>
            )}
            renderInput={(params) => (
              <TextField {...params} label="Empleado EPQ" placeholder="Escriba código, nombre o DPI" />
            )}
          />
          <TextField
            placeholder="Buscar en aportaciones"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: { md: 360 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          />
        </Stack>

        {selected && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: "rgba(31, 78, 95, 0.03)" }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={3}><Typography variant="caption" color="text.secondary">Codigo empleado</Typography><Typography>{selected.idAportacion}</Typography></Grid>
              <Grid item xs={12} md={3}><Typography variant="caption" color="text.secondary">Nombre</Typography><Typography>{selected.nombre} {selected.apellido}</Typography></Grid>
              <Grid item xs={12} md={3}><Typography variant="caption" color="text.secondary">DPI</Typography><Typography>{selected.dpi}</Typography></Grid>
              <Grid item xs={12} md={3}><Typography variant="caption" color="text.secondary">Total aportado</Typography><Typography>Q {Number(total).toFixed(2)}</Typography></Grid>
            </Grid>
          </Paper>
        )}

        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea", overflow: "hidden" }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Aportacion</TableCell>
                <TableCell>Fecha Pago</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Fecha Creacion</TableCell>
                <TableCell>Usuario Creacion</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detalleFiltered.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{row.idAportacion}</TableCell>
                  <TableCell>{formatDate(row.fechaPago)}</TableCell>
                  <TableCell>Q {Number(row.valor).toFixed(2)}</TableCell>
                  <TableCell>{formatDate(row.fechaCreacion)}</TableCell>
                  <TableCell>{row.usuarioCreacion}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {canEdit(user) && <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => openEditDetalle(row)}><EditIcon /></IconButton></Tooltip>}
                      {canDelete(user) && <Tooltip title="Eliminar"><IconButton size="small" color="primary" onClick={() => deleteDetalle(row)}><DeleteIcon /></IconButton></Tooltip>}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {detalleFiltered.length === 0 && <TableRow><TableCell colSpan={7} align="center">{selected ? "No hay aportaciones para mostrar." : "Seleccione un empleado EPQ."}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={detalleDialogOpen} onClose={() => { setDetalleDialogOpen(false); setEditingDetalle(null); }} fullWidth maxWidth="sm">
          <DialogTitle>{editingDetalle ? "Editar aportacion" : "Nueva aportacion"}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField label="Empleado EPQ" value={selected ? `${selected.idAportacion} - ${selected.nombre} ${selected.apellido}` : ""} disabled fullWidth />
              <TextField label="Fecha pago" type="date" value={detalleForm.fechaPago} onChange={(e) => setDetalleForm({ ...detalleForm, fechaPago: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Valor" type="number" value={detalleForm.valor} onChange={(e) => setDetalleForm({ ...detalleForm, valor: e.target.value })} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setDetalleDialogOpen(false); setEditingDetalle(null); }}>Cancelar</Button>
            <Button variant="contained" onClick={saveDetalle}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h5">Empleados EPQ</Typography>
          <Typography color="text.secondary">Maestro de empleados EPQ para aportaciones y prestamos</Typography>
        </Box>
        {canCreate(user) && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nuevo empleado EPQ</Button>}
      </Stack>

      <TextField
        placeholder="Buscar por nombre, apellido, DPI, gerencia o ID"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ maxWidth: { md: 520 } }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea", overflow: "hidden" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}>
            <TableRow>
              <TableCell>ID</TableCell><TableCell>Nombre</TableCell><TableCell>DPI</TableCell><TableCell>Gerencia</TableCell><TableCell>Sexo</TableCell><TableCell>Estado</TableCell><TableCell>Prestamo</TableCell><TableCell>Manejo</TableCell><TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginados.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.idAportacion}</TableCell>
                <TableCell>{item.nombre} {item.apellido}</TableCell>
                <TableCell>{item.dpi}</TableCell>
                <TableCell>{item.gerencia}</TableCell>
                <TableCell>{sexoLabel(item.sexo)}</TableCell>
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
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} align="center">No hay aportaciones para mostrar.</TableCell></TableRow>}
          </TableBody>
        </Table>
        {filtered.length > 0 && (
          <TablePagination
            component="div"
            count={filtered.length}
            page={paginaActual}
            onPageChange={(_, nueva) => setPage(nueva)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }}
            rowsPerPageOptions={[20, 50, 100]}
            labelRowsPerPage="Registros por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            sx={{ borderTop: "1px solid #dde3ea" }}
          />
        )}
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Editar empleado EPQ" : "Nuevo empleado EPQ"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo manejo</InputLabel>
                <Select label="Tipo manejo" value={form.tipoManejo} onChange={(e) => setForm({ ...form, tipoManejo: e.target.value })} disabled>
                  {manejos.map((m) => <MenuItem key={m.id} value={m.id}>{m.descripcion}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}><TextField label="ID aportacion" type="number" value={form.idAportacion} onChange={(e) => setForm({ ...form, idAportacion: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: up(e.target.value) })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: up(e.target.value) })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="DPI" value={form.dpi} onChange={(e) => setForm({ ...form, dpi: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Gerencia" value={form.gerencia} onChange={(e) => setForm({ ...form, gerencia: up(e.target.value) })} fullWidth /></Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Sexo</InputLabel>
                <Select label="Sexo" value={form.sexo || ""} onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
                  <MenuItem value=""><em>Sin especificar</em></MenuItem>
                  {sexoOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}><TextField label="Fecha nacimiento" type="date" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Fecha inicio aportacion" type="date" value={form.fechaInicioAportacion} onChange={(e) => setForm({ ...form, fechaInicioAportacion: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Fecha fin aportacion (opcional)" type="date" value={form.fechaFinAportacion || ""} onChange={(e) => setForm({ ...form, fechaFinAportacion: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  {estados.map((estado) => <MenuItem key={estado} value={estado}>{estado}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tiene prestamo</InputLabel>
                <Select label="Tiene prestamo" value={form.tienePrestamo ? "1" : "0"} onChange={(e) => setForm({ ...form, tienePrestamo: e.target.value === "1" })}>
                  <MenuItem value="0">NO</MenuItem>
                  <MenuItem value="1">SI</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}><TextField label="Ubicacion" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: up(e.target.value) })} fullWidth /></Grid>
            <Grid item xs={12}><TextField label="Motivo retiro" value={form.motivoRetiro || ""} onChange={(e) => setForm({ ...form, motivoRetiro: up(e.target.value) })} fullWidth /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveAportacion}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Aportaciones de empleado EPQ</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selected && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "rgba(31, 78, 95, 0.03)" }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={3}><Typography variant="caption" color="text.secondary">Codigo empleado</Typography><Typography>{selected.idAportacion}</Typography></Grid>
                  <Grid item xs={12} md={3}><Typography variant="caption" color="text.secondary">Nombre</Typography><Typography>{selected.nombre} {selected.apellido}</Typography></Grid>
                  <Grid item xs={12} md={3}><Typography variant="caption" color="text.secondary">DPI</Typography><Typography>{selected.dpi}</Typography></Grid>
                  <Grid item xs={12} md={3}><Typography variant="caption" color="text.secondary">Prestamo</Typography><Typography>{selected.tienePrestamo ? "SI" : "NO"}</Typography></Grid>
                </Grid>
              </Paper>
            )}
            <Typography variant="h6">Total aportado: Q {Number(total).toFixed(2)}</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Fecha pago" type="date" value={detalleForm.fechaPago} onChange={(e) => setDetalleForm({ ...detalleForm, fechaPago: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Valor" type="number" value={detalleForm.valor} onChange={(e) => setDetalleForm({ ...detalleForm, valor: e.target.value })} fullWidth />
              {((editingDetalle && canEdit(user)) || (!editingDetalle && canCreate(user))) && (
                <Button variant="contained" onClick={saveDetalle}>{editingDetalle ? "Actualizar aportacion" : "Agregar aportacion"}</Button>
              )}
              {editingDetalle && <Button onClick={() => { setEditingDetalle(null); setDetalleForm({ fechaPago: "", valor: "" }); }}>Cancelar edicion</Button>}
            </Stack>
            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}>
                  <TableRow><TableCell>Codigo empleado</TableCell><TableCell>Nombre</TableCell><TableCell>Valor</TableCell><TableCell>Fecha</TableCell><TableCell align="right">Acciones</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {detalle.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.codigoEmpleado || selected?.idAportacion}</TableCell>
                      <TableCell>{row.nombre || `${selected?.nombre || ""} ${selected?.apellido || ""}`}</TableCell>
                      <TableCell>Q {Number(row.valor).toFixed(2)}</TableCell>
                      <TableCell>{formatDate(row.fechaPago)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {canEdit(user) && <IconButton size="small" color="primary" onClick={() => editDetalleInline(row)}><EditIcon /></IconButton>}
                          {canDelete(user) && <IconButton size="small" color="primary" onClick={() => deleteDetalle(row)}><DeleteIcon /></IconButton>}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
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
