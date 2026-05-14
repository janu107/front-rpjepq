import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import DataTable from "../../components/common/DataTable";
import PageHeader from "../../components/common/PageHeader";
import StatusChip from "../../components/common/StatusChip";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canDelete, canEdit } from "../../utils/permissions";

const formatDate = (value) => (value ? String(value).slice(0, 10) : "");

const buildInitialForm = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.key] = field.defaultValue || "";
    return acc;
  }, {});

const MantenimientoPage = ({ title, subtitle, endpoint, columns, fields, searchFields, dependencies = [] }) => {
  const { user } = useAuth();
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

  const tableColumns = columns.map((column) => ({
    ...column,
    render: column.chip ? (row) => <StatusChip value={row[column.key]} /> : column.render
  }));

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
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={canCreate(user) && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>Nuevo</Button>}
      />

      <DataTable
        columns={tableColumns}
        rows={filteredRows}
        search={search}
        onSearch={setSearch}
        filterKeys={searchFields}
        actions={[
          { label: "Editar", icon: <EditIcon />, onClick: openEditDialog, visible: () => canEdit(user) },
          { label: "Eliminar", icon: <DeleteIcon />, onClick: handleDelete, visible: () => canDelete(user) }
        ]}
      />

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
