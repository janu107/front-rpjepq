import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import {
  Button, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canDelete, canEdit } from "../../utils/permissions";

const emptyDraft = { tipoManejo: "", tipoIngreso: "", salario: "" };
const normalizeText = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const findEmpleadoRegimen = (items = []) => items.find((item) => normalizeText(item.descripcion) === "EMPLEADO REGIMEN");

const SalariosPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyDraft);
  const [manejos, setManejos] = useState([]);
  const [tiposIngreso, setTiposIngreso] = useState([]);
  const [search, setSearch] = useState("");

  const defaultManejo = useMemo(() => findEmpleadoRegimen(manejos), [manejos]);

  const load = async () => {
    const [salarios, manejosRes, tiposRes] = await Promise.all([
      axiosClient.get("/salarios"),
      axiosClient.get("/catalogos/manejo-administracion"),
      axiosClient.get("/catalogos/tipo-ingreso")
    ]);
    setRows(salarios.data.data || []);
    setManejos(manejosRes.data.data || []);
    setTiposIngreso(tiposRes.data.data || []);
    if (!findEmpleadoRegimen(manejosRes.data.data || [])) {
      console.warn("No existe manejo EMPLEADO REGIMEN");
    }
  };

  useEffect(() => {
    load().catch((error) => Swal.fire("Error", error.response?.data?.message || "No fue posible cargar salarios.", "error"));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => [row.id, row.manejoDescripcion, row.tipoIngresoNombre, row.tipoIngresoDescripcion].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [rows, search]);

  const addDraft = () => {
    setDrafts((current) => [...current, { ...emptyDraft, tipoManejo: defaultManejo?.id || "" }]);
  };

  const updateDraft = (index, patch) => {
    setDrafts((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const validateSalary = (row) => row.tipoManejo && row.tipoIngreso && Number(row.salario) >= 0;

  const saveDrafts = async () => {
    if (drafts.length === 0) return;
    if (drafts.some((row) => !validateSalary(row))) {
      Swal.fire("Validacion", "Complete tipo manejo, tipo ingreso y salario mayor o igual a 0.", "warning");
      return;
    }
    await axiosClient.post("/salarios/bulk", { salarios: drafts });
    Swal.fire("Listo", "Salarios guardados correctamente.", "success");
    setDrafts([]);
    load();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditing({ tipoManejo: row.tipoManejo, tipoIngreso: row.tipoIngreso, salario: row.salario });
  };

  const saveEdit = async (row) => {
    if (!validateSalary(editing)) {
      Swal.fire("Validacion", "Complete tipo manejo, tipo ingreso y salario mayor o igual a 0.", "warning");
      return;
    }
    await axiosClient.put(`/salarios/${row.id}`, editing);
    Swal.fire("Listo", "Salario actualizado correctamente.", "success");
    setEditingId(null);
    load();
  };

  const remove = async (row) => {
    const result = await Swal.fire({ title: "Eliminar salario", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", confirmButtonColor: "#1f4e5f" });
    if (!result.isConfirmed) return;
    await axiosClient.delete(`/salarios/${row.id}`);
    Swal.fire("Listo", "Salario eliminado correctamente.", "success");
    load();
  };

  const ManejoSelect = ({ value, onChange }) => (
    <FormControl fullWidth size="small">
      <InputLabel>Manejo</InputLabel>
      <Select label="Manejo" value={value || ""} onChange={(event) => onChange(event.target.value)} disabled>
        {manejos.map((item) => <MenuItem key={item.id} value={item.id}>{item.descripcion}</MenuItem>)}
      </Select>
    </FormControl>
  );

  const TipoIngresoSelect = ({ value, onChange }) => (
    <FormControl fullWidth size="small">
      <InputLabel>Tipo ingreso</InputLabel>
      <Select label="Tipo ingreso" value={value || ""} onChange={(event) => onChange(event.target.value)}>
        {tiposIngreso.map((item) => <MenuItem key={item.id} value={item.id}>{item.tipoIngreso} - {item.descripcion}</MenuItem>)}
      </Select>
    </FormControl>
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Stack>
          <Typography variant="h5">Salarios</Typography>
          <Typography color="text.secondary">Ingreso y edicion de salarios en lista</Typography>
        </Stack>
        {canCreate(user) && <Button variant="contained" startIcon={<AddIcon />} onClick={addDraft}>Agregar salario</Button>}
      </Stack>

      <TextField placeholder="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ maxWidth: { md: 460 } }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea", overflow: "hidden" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}>
            <TableRow><TableCell>Codigo</TableCell><TableCell>Tipo manejo</TableCell><TableCell>Tipo ingreso</TableCell><TableCell>Salario</TableCell><TableCell align="right">Acciones</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {drafts.map((draft, index) => (
              <TableRow key={`draft-${index}`}>
                <TableCell>Nuevo</TableCell>
                <TableCell><ManejoSelect value={draft.tipoManejo} onChange={(value) => updateDraft(index, { tipoManejo: value })} /></TableCell>
                <TableCell><TipoIngresoSelect value={draft.tipoIngreso} onChange={(value) => updateDraft(index, { tipoIngreso: value })} /></TableCell>
                <TableCell><TextField size="small" type="number" value={draft.salario} onChange={(event) => updateDraft(index, { salario: event.target.value })} /></TableCell>
                <TableCell align="right"><IconButton size="small" color="primary" onClick={() => setDrafts((current) => current.filter((_, rowIndex) => rowIndex !== index))}><DeleteIcon /></IconButton></TableCell>
              </TableRow>
            ))}
            {filtered.map((row) => {
              const isEditing = editingId === row.id;
              return (
                <TableRow key={row.id} hover>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{isEditing ? <ManejoSelect value={editing.tipoManejo} onChange={(value) => setEditing({ ...editing, tipoManejo: value })} /> : row.manejoDescripcion}</TableCell>
                  <TableCell>{isEditing ? <TipoIngresoSelect value={editing.tipoIngreso} onChange={(value) => setEditing({ ...editing, tipoIngreso: value })} /> : `${row.tipoIngresoNombre} - ${row.tipoIngresoDescripcion}`}</TableCell>
                  <TableCell>{isEditing ? <TextField size="small" type="number" value={editing.salario} onChange={(event) => setEditing({ ...editing, salario: event.target.value })} /> : `Q ${Number(row.salario).toFixed(2)}`}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {isEditing ? <Tooltip title="Guardar"><IconButton size="small" color="primary" onClick={() => saveEdit(row)}><SaveIcon /></IconButton></Tooltip> : canEdit(user) && <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => startEdit(row)}><EditIcon /></IconButton></Tooltip>}
                      {canDelete(user) && <Tooltip title="Eliminar"><IconButton size="small" color="primary" onClick={() => remove(row)}><DeleteIcon /></IconButton></Tooltip>}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {drafts.length > 0 && canCreate(user) && <Button variant="contained" startIcon={<SaveIcon />} onClick={saveDrafts} sx={{ alignSelf: "flex-start" }}>Guardar cambios</Button>}
    </Stack>
  );
};

export default SalariosPage;
