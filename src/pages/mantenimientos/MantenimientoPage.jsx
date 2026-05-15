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
  Grid,
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

const MantenimientoPage = ({ title, subtitle, endpoint, columns, fields, searchFields, dependencies = [], salaryConfig }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(buildInitialForm(fields));
  const [salaryForm, setSalaryForm] = useState({ tipoIngreso: "", salario: "" });
  const [salaryReady, setSalaryReady] = useState(false);
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
    setSalaryForm({ tipoIngreso: "", salario: "" });
    setSalaryReady(false);
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
    setSalaryForm({ tipoIngreso: "", salario: "" });
    setSalaryReady(false);
    setDialogOpen(true);
  };

  const validateForm = () => {
    const missing = fields.find((field) => field.required && String(form[field.key] ?? "").trim() === "");
    if (missing) return `El campo ${missing.label} es obligatorio.`;
    if (salaryConfig?.requiredOnCreate && !editingRow && !salaryReady) return "Debe agregar la informacion de salario antes de guardar el empleado.";
    return null;
  };

  const validateSalaryForm = () => {
    if (!form.tipoManejo) return "Seleccione el manejo de administracion del empleado antes de agregar salario.";
    const missing = (salaryConfig?.fields || []).find((field) => field.required && String(salaryForm[field.key] ?? "").trim() === "");
    if (missing) return `El campo ${missing.label} es obligatorio.`;
    if (Number(salaryForm.salario) < 0) return "El salario debe ser mayor o igual a 0.";
    return null;
  };

  const confirmSalary = () => {
    const validation = validateSalaryForm();
    if (validation) {
      Swal.fire("Validacion", validation, "warning");
      return;
    }

    setSalaryReady(true);
    setSalaryDialogOpen(false);
    Swal.fire("Listo", "Salario agregado al registro.", "success");
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
        if (salaryConfig && salaryReady) {
          await axiosClient.post("/salarios", {
            tipoManejo: form.tipoManejo,
            tipoIngreso: salaryForm.tipoIngreso,
            salario: salaryForm.salario
          });
        }
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
        actions={canCreate(user) && <Button type="button" variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>Nuevo</Button>}
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

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { width: "min(1120px, calc(100% - 24px))" } }}
      >
        <DialogTitle>{editingRow ? "Editar registro" : "Nuevo registro"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {fields.map((field) => (
              <Grid item xs={12} md={field.fullWidth ? 12 : 6} key={field.key}>
                {renderField(field)}
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          {salaryConfig && (
            <Button
              type="button"
              variant={salaryReady ? "contained" : "outlined"}
              color={salaryReady ? "success" : "primary"}
              onClick={() => setSalaryDialogOpen(true)}
            >
              {salaryReady ? "Salario agregado" : "Salario"}
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {salaryConfig && (
        <Dialog
          open={salaryDialogOpen}
          onClose={() => setSalaryDialogOpen(false)}
          fullWidth
          maxWidth="md"
          PaperProps={{ sx: { width: "min(820px, calc(100% - 24px))" } }}
        >
          <DialogTitle>Salario del empleado</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={6}>
                <TextField label="Manejo administracion" value={options.manejos?.find((item) => item.id === form.tipoManejo)?.descripcion || form.tipoManejo || ""} fullWidth disabled />
              </Grid>
              {(salaryConfig.fields || []).map((field) => (
                <Grid item xs={12} md={6} key={field.key}>
                  {field.type === "select" ? (
                    <FormControl fullWidth>
                      <InputLabel>{field.label}</InputLabel>
                      <Select label={field.label} value={salaryForm[field.key] ?? ""} onChange={(event) => setSalaryForm({ ...salaryForm, [field.key]: event.target.value })}>
                        {(options[field.source] || []).map((item) => (
                          <MenuItem key={field.getValue ? field.getValue(item) : item.value} value={field.getValue ? field.getValue(item) : item.value}>
                            {field.getLabel ? field.getLabel(item) : item.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      label={field.label}
                      type={field.type || "text"}
                      value={salaryForm[field.key] ?? ""}
                      onChange={(event) => setSalaryForm({ ...salaryForm, [field.key]: event.target.value })}
                      fullWidth
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSalaryDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={confirmSalary}>Agregar salario</Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
};

export default MantenimientoPage;
