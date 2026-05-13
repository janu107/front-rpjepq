import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";

const formatDate = (value) => (value ? String(value).slice(0, 10) : "");

const buildInitialForm = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.key] = field.defaultValue || "";
    return acc;
  }, {});

const MantenimientoPage = ({ title, subtitle, endpoint, columns, fields, searchFields, dependencies = [] }) => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(buildInitialForm(fields));
  const [options, setOptions] = useState({});

  const loadRows = async () => {
    try {
      const { data } = await axiosClient.get(endpoint);
      setRows(data.data || []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar registros.", "error");
    }
  };

  const loadDependencies = async () => {
    const entries = await Promise.all(
      dependencies.map(async (dependency) => {
        const { data } = await axiosClient.get(dependency.endpoint);
        return [dependency.key, data.data || []];
      })
    );
    setOptions(Object.fromEntries(entries));
  };

  useEffect(() => {
    loadRows();
    if (dependencies.length > 0) {
      loadDependencies();
    }
  }, [endpoint]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => searchFields.some((field) => String(row[field] || "").toLowerCase().includes(term)));
  }, [rows, search, searchFields]);

  const openCreateDialog = () => {
    setEditingRow(null);
    setForm(buildInitialForm(fields));
    setDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setEditingRow(row);
    setForm(
      fields.reduce((acc, field) => {
        acc[field.key] = field.type === "date" ? formatDate(row[field.key]) : row[field.key] ?? "";
        return acc;
      }, {})
    );
    setDialogOpen(true);
  };

  const validateForm = () => {
    const missing = fields.find((field) => field.required && String(form[field.key] ?? "").trim() === "");
    if (missing) return `El campo ${missing.label} es obligatorio.`;
    return null;
  };

  const handleSave = async () => {
    const validation = validateForm();
    if (validation) {
      Swal.fire("Validacion", validation, "warning");
      return;
    }

    try {
      if (editingRow) {
        await axiosClient.put(`${endpoint}/${editingRow.id}`, form);
        Swal.fire("Listo", "Registro actualizado correctamente.", "success");
      } else {
        await axiosClient.post(endpoint, form);
        Swal.fire("Listo", "Registro creado correctamente.", "success");
      }
      setDialogOpen(false);
      loadRows();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar el registro.", "error");
    }
  };

  const handleDelete = async (row) => {
    const result = await Swal.fire({
      title: "Eliminar registro",
      text: "Esta accion no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1f4e5f"
    });

    if (!result.isConfirmed) return;

    try {
      await axiosClient.delete(`${endpoint}/${row.id}`);
      Swal.fire("Listo", "Registro eliminado correctamente.", "success");
      loadRows();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar el registro.", "error");
    }
  };

  const renderField = (field) => {
    if (field.type === "select") {
      const items = field.options || options[field.source] || [];
      return (
        <FormControl key={field.key} fullWidth>
          <InputLabel>{field.label}</InputLabel>
          <Select label={field.label} value={form[field.key] ?? ""} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}>
            {items.map((item) => (
              <MenuItem key={field.getValue ? field.getValue(item) : item.value} value={field.getValue ? field.getValue(item) : item.value}>
                {field.getLabel ? field.getLabel(item) : item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        key={field.key}
        label={field.label}
        type={field.type || "text"}
        value={form[field.key] ?? ""}
        onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
        InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
        fullWidth
      />
    );
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h5">{title}</Typography>
          <Typography color="text.secondary">{subtitle}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Nuevo
        </Button>
      </Stack>

      <TextField
        placeholder="Buscar"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ maxWidth: { md: 460 } }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => <TableCell key={column.key}>{column.label}</TableCell>)}
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.id} hover>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.chip ? <Chip label={row[column.key]} color={row[column.key] === "ACTIVO" ? "success" : "default"} size="small" /> : row[column.key]}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Tooltip title="Editar"><IconButton color="primary" onClick={() => openEditDialog(row)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Eliminar"><IconButton color="primary" onClick={() => handleDelete(row)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredRows.length === 0 && (
              <TableRow><TableCell colSpan={columns.length + 1} align="center">No hay registros para mostrar.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingRow ? "Editar registro" : "Nuevo registro"}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>{fields.map(renderField)}</Stack></DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default MantenimientoPage;
