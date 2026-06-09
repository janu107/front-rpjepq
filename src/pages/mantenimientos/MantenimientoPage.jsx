import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
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
import DataTable from "../../components/common/DataTable";
import PageHeader from "../../components/common/PageHeader";
import StatusChip from "../../components/common/StatusChip";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canDelete, canEdit } from "../../utils/permissions";

const formatDate = (value) => (value ? String(value).slice(0, 10) : "");
const normalizeText = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const findManejoById = (items = [], id) => items.find((item) => Number(item.id) === Number(id));
const findManejoByDescription = (items = [], description) =>
  items.find((item) => normalizeText(item.descripcion) === normalizeText(description));
const findFixedManejo = (items = [], fixedManejoId, fixedManejoDescription) => {
  if (fixedManejoId !== undefined && fixedManejoId !== null && fixedManejoId !== "") {
    return findManejoById(items, fixedManejoId);
  }
  if (fixedManejoDescription) {
    return findManejoByDescription(items, fixedManejoDescription);
  }
  return null;
};
const shrinkLabelTypes = ["date", "datetime-local", "time", "month"];

const buildInitialForm = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.key] = field.defaultValue || "";
    return acc;
  }, {});

const FORMAS_PAGO_PLANILLA = ["ABONO CUENTA", "CHEQUE"];
const TIPOS_CUENTA_PLANILLA = ["AHORRO", "MONETARIA"];
const buildPlanillaForm = () => ({
  idBanco: "", formaPago: "", cuenta: "", tipoCuenta: "",
  aplicaDescIgss: false, aplicaDescIsr: false, aplicaSeguro: false,
  noProbidad: "", noSobrevivencia: ""
});

const MantenimientoPage = ({
  title,
  subtitle,
  endpoint,
  columns,
  fields,
  searchFields,
  dependencies = [],
  salaryConfig,
  formSections = [],
  fixedManejoId,
  fixedManejoDescription,
  uniqueIdField,
  uniqueIdMessage,
  customValidate,
  planillaConfig,
  addMode
}) => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [planillaDialogOpen, setPlanillaDialogOpen] = useState(false);
  const [planillaTargetRow, setPlanillaTargetRow] = useState(null);
  const [planillaForm, setPlanillaForm] = useState(buildPlanillaForm());
  const [planillaExistingId, setPlanillaExistingId] = useState(null);
  const [pendingPlanillaForm, setPendingPlanillaForm] = useState(null);
  const [bancos, setBancos] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(buildInitialForm(fields));
  const [salaryForm, setSalaryForm] = useState({ tipoIngreso: "", salario: "" });
  const [salaryRows, setSalaryRows] = useState([]);
  const [editingSalaryIndex, setEditingSalaryIndex] = useState(null);
  const [options, setOptions] = useState({});

  const loadSalariesForManejo = async (tipoManejo) => {
    if (!salaryConfig || !tipoManejo) return;
    try {
      const { data } = await axiosClient.get("/salarios");
      setSalaryRows((data.data || []).filter((row) => Number(row.tipoManejo) === Number(tipoManejo)));
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar salarios.", "error");
    }
  };

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
    const loaded = Object.fromEntries(entries);
    setOptions(loaded);
    if (loaded.manejos && (fixedManejoId || fixedManejoDescription) && !findFixedManejo(loaded.manejos, fixedManejoId, fixedManejoDescription)) {
      console.warn(`No existe manejo ${fixedManejoDescription || fixedManejoId}`);
    }
  };

  const loadBancos = async () => {
    try {
      const { data } = await axiosClient.get("/catalogos/bancos");
      setBancos(data.data || []);
    } catch {
      setBancos([]);
    }
  };

  const openPlanillaDialog = async (row) => {
    setPlanillaTargetRow(row);
    setPlanillaForm(buildPlanillaForm());
    setPlanillaExistingId(null);
    const idPersona = row ? row[planillaConfig.idPersonaField || "id"] : null;
    if (idPersona) {
      try {
        const { data } = await axiosClient.get(`/datos-planilla/buscar?tipoManejo=${row.tipoManejo}&idEmpleado=${idPersona}`);
        if (data.data) {
          const existing = data.data;
          setPlanillaForm({
            idBanco: existing.idBanco || "",
            formaPago: existing.formaPago || "",
            cuenta: existing.cuenta || "",
            tipoCuenta: existing.tipoCuenta || "",
            aplicaDescIgss: Boolean(existing.aplicaDescIgss),
            aplicaDescIsr: Boolean(existing.aplicaDescIsr),
            aplicaSeguro: Boolean(existing.aplicaSeguro),
            noProbidad: existing.noProbidad || "",
            noSobrevivencia: existing.noSobrevivencia || ""
          });
          setPlanillaExistingId(existing.id);
        }
      } catch {
        /* no existing record */
      }
    } else if (pendingPlanillaForm) {
      setPlanillaForm(pendingPlanillaForm);
    }
    if (bancos.length === 0) await loadBancos();
    setPlanillaDialogOpen(true);
  };

  const savePlanilla = async () => {
    if (!planillaForm.formaPago) { Swal.fire("Validacion", "El campo Forma de pago es obligatorio.", "warning"); return; }
    if (!planillaForm.idBanco) { Swal.fire("Validacion", "El campo Banco es obligatorio.", "warning"); return; }
    const row = planillaTargetRow;
    const idPersona = row ? row[planillaConfig.idPersonaField || "id"] : null;
    if (!idPersona) {
      setPendingPlanillaForm({ ...planillaForm });
      Swal.fire("Listo", "Datos de planilla registrados. Se guardarán junto con el empleado.", "success");
      setPlanillaDialogOpen(false);
      return;
    }
    const payload = {
      tipoManejo: row.tipoManejo,
      idEmpleado: idPersona,
      idBanco: planillaForm.idBanco,
      formaPago: planillaForm.formaPago,
      cuenta: planillaForm.cuenta,
      tipoCuenta: planillaForm.tipoCuenta,
      aplicaDescIgss: planillaForm.aplicaDescIgss,
      aplicaDescIsr: planillaForm.aplicaDescIsr,
      aplicaSeguro: planillaForm.aplicaSeguro,
      noProbidad: planillaForm.noProbidad || null,
      noSobrevivencia: planillaForm.noSobrevivencia || null
    };
    try {
      if (planillaExistingId) {
        await axiosClient.put(`/datos-planilla/${planillaExistingId}`, payload);
      } else {
        await axiosClient.post("/datos-planilla", payload);
      }
      Swal.fire("Listo", "Datos de planilla guardados correctamente.", "success");
      setPlanillaDialogOpen(false);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar datos de planilla.", "error");
    }
  };

  useEffect(() => {
    loadRows();
    if (dependencies.length > 0) {
      loadDependencies();
    }
    if (planillaConfig) {
      loadBancos();
    }
  }, [endpoint]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const scopedRows = fixedManejoId ? rows.filter((row) => Number(row.tipoManejo) === Number(fixedManejoId)) : rows;
    if (!term) return scopedRows;
    return scopedRows.filter((row) => searchFields.some((field) => String(row[field] || "").toLowerCase().includes(term)));
  }, [rows, search, searchFields, fixedManejoId]);

  const tableColumns = columns.map((column) => ({
    ...column,
    render: column.chip ? (row) => <StatusChip value={row[column.key]} /> : column.render
  }));

  const openCreateDialog = () => {
    setEditingRow(null);
    const initial = buildInitialForm(fields);
    const fixedManejo = findFixedManejo(options.manejos, fixedManejoId, fixedManejoDescription);
    setForm({ ...initial, tipoManejo: fixedManejo?.id || fixedManejoId || initial.tipoManejo || "" });
    setSalaryForm({ tipoIngreso: "", salario: "" });
    setSalaryRows([]);
    setEditingSalaryIndex(null);
    setDialogOpen(true);
  };

  const openViewDialog = async (row) => {
    setViewOnly(true);
    setEditingRow(row);
    setForm(
      fields.reduce((acc, field) => {
        acc[field.key] = field.type === "date" ? formatDate(row[field.key]) : row[field.key] ?? "";
        return acc;
      }, {})
    );
    setSalaryRows([]);
    setEditingSalaryIndex(null);
    if (salaryConfig) await loadSalariesForManejo(row.tipoManejo);
    setDialogOpen(true);
  };

  const openEditDialog = async (row) => {
    setViewOnly(false);
    setEditingRow(row);
    setForm(
      fields.reduce((acc, field) => {
        acc[field.key] = field.type === "date" ? formatDate(row[field.key]) : row[field.key] ?? "";
        return acc;
      }, {})
    );
    setSalaryForm({ tipoIngreso: "", salario: "" });
    setSalaryRows([]);
    setEditingSalaryIndex(null);
    if (salaryConfig) {
      await loadSalariesForManejo(row.tipoManejo);
    }
    setDialogOpen(true);
  };

  const validateForm = () => {
    const missing = fields.find((field) => field.required && String(form[field.key] ?? "").trim() === "");
    if (missing) return `El campo ${missing.label} es obligatorio.`;
    // Version IV: validacion de ID visible unico antes de enviar al backend.
    if (uniqueIdField) {
      const current = String(form[uniqueIdField] ?? "").trim();
      const duplicated = rows.some(
        (row) => Number(row.id) !== Number(editingRow?.id) && String(row[uniqueIdField] ?? "").trim() === current
      );
      if (current !== "" && duplicated) return uniqueIdMessage || "EL ID YA EXISTE. INGRESE UN ID DIFERENTE.";
    }
    if (customValidate) {
      const customMessage = customValidate(form);
      if (customMessage) return customMessage;
    }
    if (salaryConfig?.requiredOnCreate && !editingRow && salaryRows.length === 0) return "Debe agregar la informacion de salario antes de guardar el empleado.";
    return null;
  };

  const validateSalaryForm = () => {
    if (!form.tipoManejo) return "Seleccione el manejo de administracion del empleado antes de agregar salario.";
    const missing = (salaryConfig?.fields || []).find((field) => field.required && String(salaryForm[field.key] ?? "").trim() === "");
    if (missing) return `El campo ${missing.label} es obligatorio.`;
    if (Number(salaryForm.salario) < 0) return "El salario debe ser mayor o igual a 0.";
    if (salaryRows.some((row, index) => index !== editingSalaryIndex && Number(row.tipoIngreso) === Number(salaryForm.tipoIngreso))) {
      return "El tipo de ingreso no se puede repetir para este empleado.";
    }
    return null;
  };

  const getTipoIngresoLabel = (id) => {
    const item = options.tiposIngreso?.find((tipo) => Number(tipo.id) === Number(id));
    return item ? `${item.tipoIngreso} - ${item.descripcion}` : id;
  };

  const confirmSalary = async () => {
    const validation = validateSalaryForm();
    if (validation) {
      Swal.fire("Validacion", validation, "warning");
      return;
    }

    const payload = { tipoManejo: form.tipoManejo, tipoIngreso: salaryForm.tipoIngreso, salario: salaryForm.salario };
    if (editingSalaryIndex !== null) {
      const currentRow = salaryRows[editingSalaryIndex];
      if (currentRow?.id) {
        try {
          await axiosClient.put(`/salarios/${currentRow.id}`, payload);
          await loadSalariesForManejo(form.tipoManejo);
          Swal.fire("Listo", "Salario actualizado correctamente.", "success");
        } catch (error) {
          Swal.fire("Error", error.response?.data?.message || "No fue posible actualizar salario.", "error");
          return;
        }
      } else {
        setSalaryRows((current) => current.map((row, index) => (index === editingSalaryIndex ? { ...salaryForm } : row)));
      }
    } else if (editingRow) {
      try {
        await axiosClient.post("/salarios", payload);
        await loadSalariesForManejo(form.tipoManejo);
        Swal.fire("Listo", "Salario agregado correctamente.", "success");
      } catch (error) {
        Swal.fire("Error", error.response?.data?.message || "No fue posible agregar salario.", "error");
        return;
      }
    } else {
      setSalaryRows((current) => [...current, { ...salaryForm }]);
    }
    setSalaryForm({ tipoIngreso: "", salario: "" });
    setEditingSalaryIndex(null);
  };

  const editSalary = (index) => {
    setSalaryForm({ ...salaryRows[index] });
    setEditingSalaryIndex(index);
  };

  const removeSalary = async (index) => {
    const currentRow = salaryRows[index];
    if (currentRow?.id) {
      const result = await Swal.fire({ title: "Eliminar salario", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", confirmButtonColor: "#1f4e5f" });
      if (!result.isConfirmed) return;
      try {
        await axiosClient.delete(`/salarios/${currentRow.id}`);
        await loadSalariesForManejo(form.tipoManejo);
        Swal.fire("Listo", "Salario eliminado correctamente.", "success");
      } catch (error) {
        Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar salario.", "error");
      }
      return;
    }
    setSalaryRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    if (editingSalaryIndex === index) {
      setSalaryForm({ tipoIngreso: "", salario: "" });
      setEditingSalaryIndex(null);
    }
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
        const pendingSalaries = salaryRows.filter((row) => !row.id);
        if (salaryConfig && pendingSalaries.length > 0) {
          await axiosClient.post("/salarios/bulk", {
            salarios: pendingSalaries.map((row) => ({ tipoManejo: form.tipoManejo, ...row }))
          });
        }
        Swal.fire("Listo", "Registro actualizado correctamente.", "success");
      } else {
        const createResponse = await axiosClient.post(endpoint, form);
        if (salaryConfig && salaryRows.length > 0) {
          await axiosClient.post("/salarios/bulk", {
            salarios: salaryRows.map((row) => ({ tipoManejo: form.tipoManejo, ...row }))
          });
        }
        if (planillaConfig && pendingPlanillaForm) {
          const newId = createResponse.data?.data?.id;
          if (newId) {
            await axiosClient.post("/datos-planilla", {
              tipoManejo: form.tipoManejo,
              idEmpleado: newId,
              ...pendingPlanillaForm
            });
            setPendingPlanillaForm(null);
          }
        }
        Swal.fire("Listo", "Registro creado correctamente.", "success");
      }
      setDialogOpen(false);
      loadRows();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar el registro.", "error");
    }
  };

  const handleAgregar = async () => {
    const validation = validateForm();
    if (validation) { Swal.fire("Validacion", validation, "warning"); return; }
    try {
      await axiosClient.post(endpoint, form);
      if (salaryConfig && salaryRows.length > 0) {
        await axiosClient.post("/salarios/bulk", { salarios: salaryRows.map((row) => ({ tipoManejo: form.tipoManejo, ...row })) });
      }
      const fixedManejo = findFixedManejo(options.manejos, fixedManejoId, fixedManejoDescription);
      setForm({ ...buildInitialForm(fields), tipoManejo: fixedManejo?.id || fixedManejoId || "" });
      setSalaryRows([]);
      setEditingSalaryIndex(null);
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
    // Version IV: campo calculado de solo lectura (ej. horas de tiempo extra, montos de dieta).
    if (typeof field.compute === "function") {
      return (
        <TextField
          key={field.key}
          label={field.label}
          value={field.compute(form, options) ?? ""}
          InputProps={{ readOnly: true }}
          InputLabelProps={{ shrink: true }}
          fullWidth
          disabled
        />
      );
    }
    if (field.type === "select") {
      const sourceItems = field.options || options[field.source] || [];
      const manejoFilter = form.tipoManejo || fixedManejoId;
      let items = field.filterByFixedManejo && manejoFilter
        ? sourceItems.filter((item) => Number(item.tipoManejo) === Number(manejoFilter))
        : sourceItems;
      // Version IV (Empleados Regimen): mostrar unicamente puestos ocupados, es decir,
      // los que ya estan asignados a algun empleado (RPJ_MNT_EMPLEADO.emp_id_puesto).
      if (field.onlyOccupied) {
        const occupiedIds = new Set(rows.map((row) => Number(row.idPuesto)).filter((value) => !Number.isNaN(value)));
        // Conservar el puesto del registro en edicion aunque cambiara su estado de ocupacion.
        if (editingRow && editingRow.idPuesto !== undefined && editingRow.idPuesto !== null) {
          occupiedIds.add(Number(editingRow.idPuesto));
        }
        items = items.filter((item) => occupiedIds.has(Number(field.getValue ? field.getValue(item) : item.value)));
      }
      return (
        <FormControl key={field.key} fullWidth>
          <InputLabel>{field.label}</InputLabel>
          <Select label={field.label} value={form[field.key] ?? ""} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} disabled={field.disabled || viewOnly}>
            {items.map((item) => (
              <MenuItem key={field.getValue ? field.getValue(item) : item.value} value={field.getValue ? field.getValue(item) : item.value}>
                {field.getLabel ? field.getLabel(item) : item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    // Version IV: los campos de texto libre se escriben en MAYUSCULAS.
    const isText = !field.type || field.type === "text";
    const handleChange = (event) => {
      const raw = event.target.value;
      const value = isText && !field.noUpper ? raw.toUpperCase() : raw;
      setForm({ ...form, [field.key]: value });
    };
    return (
      <TextField
        key={field.key}
        label={field.label}
        type={field.type || "text"}
        value={form[field.key] ?? ""}
        onChange={handleChange}
        InputLabelProps={shrinkLabelTypes.includes(field.type) ? { shrink: true } : undefined}
        disabled={field.disabled || viewOnly}
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
          { label: "Ver", icon: <VisibilityIcon />, onClick: openViewDialog, visible: () => true },
          { label: "Planilla", icon: <AssignmentIcon />, onClick: openPlanillaDialog, visible: () => !!planillaConfig && canEdit(user) },
          { label: "Editar", icon: <EditIcon />, onClick: openEditDialog, visible: () => canEdit(user) },
          { label: "Eliminar", icon: <DeleteIcon />, onClick: handleDelete, visible: () => canDelete(user) }
        ]}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setViewOnly(false); setPendingPlanillaForm(null); }}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { width: "min(1120px, calc(100% - 24px))" } }}
      >
        <DialogTitle>{viewOnly ? "Ver registro" : editingRow ? "Editar registro" : "Nuevo registro"}</DialogTitle>
        <DialogContent dividers>
          {formSections.length > 0 ? (
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              {formSections.map((section) => (
                <Stack key={section.title} spacing={1.5}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{section.title}</Typography>
                  <Grid container spacing={2}>
                    {fields.filter((field) => section.fields.includes(field.key)).map((field) => (
                      <Grid item xs={12} md={field.fullWidth ? 12 : 6} key={field.key}>
                        {renderField(field)}
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {fields.map((field) => (
                <Grid item xs={12} md={field.fullWidth ? 12 : 6} key={field.key}>
                  {renderField(field)}
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {planillaConfig && !viewOnly && (
            <Button
              type="button"
              variant={pendingPlanillaForm && !editingRow ? "contained" : "outlined"}
              color={pendingPlanillaForm && !editingRow ? "success" : "primary"}
              onClick={() => openPlanillaDialog(editingRow || null)}
            >
              {pendingPlanillaForm && !editingRow ? "Planilla (1)" : "Planilla"}
            </Button>
          )}
          {salaryConfig && !viewOnly && (
            <Button
              type="button"
              variant={salaryRows.length > 0 ? "contained" : "outlined"}
              color={salaryRows.length > 0 ? "success" : "primary"}
              onClick={() => setSalaryDialogOpen(true)}
            >
              {salaryRows.length > 0 ? `Salarios (${salaryRows.length})` : "Salario"}
            </Button>
          )}
          <Button onClick={() => { setDialogOpen(false); setViewOnly(false); setPendingPlanillaForm(null); }}>{viewOnly ? "Cerrar" : "Cancelar"}</Button>
          {!viewOnly && addMode && !editingRow && <Button variant="outlined" onClick={handleAgregar}>Agregar</Button>}
          {!viewOnly && <Button variant="contained" onClick={handleSave}>Guardar</Button>}
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
              <Grid item xs={12} md={4}>
                <TextField label="Manejo administracion" size="small" value={options.manejos?.find((item) => Number(item.id) === Number(form.tipoManejo))?.descripcion || form.tipoManejo || ""} fullWidth disabled />
              </Grid>
              {(salaryConfig.fields || []).map((field) => (
                <Grid item xs={12} md={4} key={field.key}>
                  {field.type === "select" ? (
                    <FormControl fullWidth size="small">
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
                      size="small"
                      value={salaryForm[field.key] ?? ""}
                      onChange={(event) => setSalaryForm({ ...salaryForm, [field.key]: event.target.value })}
                      fullWidth
                    />
                  )}
                </Grid>
              ))}
              <Grid item xs={12}>
                <Button variant="contained" onClick={confirmSalary}>
                  {editingSalaryIndex !== null ? "Actualizar salario" : "Agregar salario"}
                </Button>
                {editingSalaryIndex !== null && <Button sx={{ ml: 1 }} onClick={() => { setEditingSalaryIndex(null); setSalaryForm({ tipoIngreso: "", salario: "" }); }}>Cancelar edicion</Button>}
              </Grid>
              <Grid item xs={12}>
                <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}>
                      <TableRow><TableCell>Codigo</TableCell><TableCell>Tipo ingreso</TableCell><TableCell>Salario</TableCell><TableCell align="right">Acciones</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {salaryRows.map((row, index) => (
                        <TableRow key={`${row.tipoIngreso}-${index}`}>
                          <TableCell>{row.id || "Nuevo"}</TableCell>
                          <TableCell>{getTipoIngresoLabel(row.tipoIngreso)}</TableCell>
                          <TableCell>Q {Number(row.salario).toFixed(2)}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => editSalary(index)}><EditIcon /></IconButton></Tooltip>
                              {canDelete(user) && <Tooltip title="Eliminar"><IconButton size="small" color="primary" onClick={() => removeSalary(index)}><DeleteIcon /></IconButton></Tooltip>}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                      {salaryRows.length === 0 && <TableRow><TableCell colSpan={4} align="center">No hay salarios agregados.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSalaryDialogOpen(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      )}

      {planillaConfig && (
        <Dialog open={planillaDialogOpen} onClose={() => setPlanillaDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>
            Datos de planilla — {planillaTargetRow ? `${planillaTargetRow.nombres || ""} ${planillaTargetRow.apellidos || ""}`.trim() : ""}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Banco *</InputLabel>
                  <Select label="Banco *" value={planillaForm.idBanco} onChange={(e) => setPlanillaForm({ ...planillaForm, idBanco: e.target.value })}>
                    {bancos.map((b) => <MenuItem key={b.id} value={b.id}>{b.descripcion}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Forma de pago *</InputLabel>
                  <Select label="Forma de pago *" value={planillaForm.formaPago} onChange={(e) => setPlanillaForm({ ...planillaForm, formaPago: e.target.value, tipoCuenta: "" })}>
                    {FORMAS_PAGO_PLANILLA.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de cuenta</InputLabel>
                  <Select label="Tipo de cuenta" value={planillaForm.tipoCuenta} onChange={(e) => setPlanillaForm({ ...planillaForm, tipoCuenta: e.target.value })}>
                    {TIPOS_CUENTA_PLANILLA.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField label="No. de cuenta" value={planillaForm.cuenta} onChange={(e) => setPlanillaForm({ ...planillaForm, cuenta: e.target.value.toUpperCase() })} fullWidth />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Aplica IGSS</InputLabel>
                  <Select label="Aplica IGSS" value={planillaForm.aplicaDescIgss ? "SI" : "NO"} onChange={(e) => setPlanillaForm({ ...planillaForm, aplicaDescIgss: e.target.value === "SI" })}>
                    <MenuItem value="SI">SI</MenuItem>
                    <MenuItem value="NO">NO</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Aplica ISR</InputLabel>
                  <Select label="Aplica ISR" value={planillaForm.aplicaDescIsr ? "SI" : "NO"} onChange={(e) => setPlanillaForm({ ...planillaForm, aplicaDescIsr: e.target.value === "SI" })}>
                    <MenuItem value="SI">SI</MenuItem>
                    <MenuItem value="NO">NO</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Aplica seguro</InputLabel>
                  <Select label="Aplica seguro" value={planillaForm.aplicaSeguro ? "SI" : "NO"} onChange={(e) => setPlanillaForm({ ...planillaForm, aplicaSeguro: e.target.value === "SI" })}>
                    <MenuItem value="SI">SI</MenuItem>
                    <MenuItem value="NO">NO</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="No. probidad" value={planillaForm.noProbidad} onChange={(e) => setPlanillaForm({ ...planillaForm, noProbidad: e.target.value.toUpperCase() })} fullWidth />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="No. sobrevivencia" value={planillaForm.noSobrevivencia} onChange={(e) => setPlanillaForm({ ...planillaForm, noSobrevivencia: e.target.value.toUpperCase() })} fullWidth />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPlanillaDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={savePlanilla}>Guardar</Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
};

export default MantenimientoPage;
