import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputLabel, MenuItem, Select, Stack,
  TextField
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import DataTable from "../../components/common/DataTable";
import PageHeader from "../../components/common/PageHeader";
import StatusChip from "../../components/common/StatusChip";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canDelete, canEdit } from "../../utils/permissions";

const MANEJO_EMPLEADOS = 1;
const MANEJO_JUBILADOS = 2;
const TIPO_PERSONA_OPTS = ["EMPLEADO", "JUBILADO"];
const ESTADO_OPTS = ["ACTIVO", "INACTIVO", "CANCELADO"];

const buildForm = () => ({
  tipoManejo: "", tipoPersona: "", idPersona: "", idBanco: "",
  noContrato: "", monto: "", cuota: "", plazoMeses: "",
  fechaInicio: "", fechaFin: "", tasaInteres: "", estado: "ACTIVO", observaciones: ""
});

const PrestamosRegimenPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [jubilados, setJubilados] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(buildForm());

  const load = async () => {
    try {
      const { data } = await axiosClient.get("/prestamos-regimen");
      setRows(data.data || []);
    } catch {
      Swal.fire("Error", "No fue posible cargar los préstamos.", "error");
    }
  };

  useEffect(() => {
    load();
    Promise.all([
      axiosClient.get("/catalogos/bancos"),
      axiosClient.get("/empleados"),
      axiosClient.get("/jubilados")
    ]).then(([b, e, j]) => {
      setBancos(b.data.data || []);
      setEmpleados((e.data.data || []).filter((item) => Number(item.tipoManejo) === MANEJO_EMPLEADOS));
      setJubilados((j.data.data || []).filter((item) => Number(item.tipoManejo) === MANEJO_JUBILADOS));
    });
  }, []);

  const personas = useMemo(() => {
    if (form.tipoPersona === "EMPLEADO") return empleados;
    if (form.tipoPersona === "JUBILADO") return jubilados;
    return [];
  }, [form.tipoPersona, empleados, jubilados]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      ["noContrato", "personaNombre", "bancoNombre", "estado"].some(
        (k) => String(r[k] || "").toLowerCase().includes(term)
      )
    );
  }, [rows, search]);

  const setf = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setfUpper = (key) => (e) => setForm({ ...form, [key]: e.target.value.toUpperCase() });

  const openCreate = () => { setEditingRow(null); setForm(buildForm()); setDialogOpen(true); };
  const openEdit = (row) => {
    setEditingRow(row);
    setForm({
      tipoManejo: row.tipoManejo, tipoPersona: row.tipoPersona, idPersona: row.idPersona,
      idBanco: row.idBanco, noContrato: row.noContrato, monto: row.monto, cuota: row.cuota,
      plazoMeses: row.plazoMeses, fechaInicio: row.fechaInicio ? String(row.fechaInicio).slice(0, 10) : "",
      fechaFin: row.fechaFin ? String(row.fechaFin).slice(0, 10) : "",
      tasaInteres: row.tasaInteres, estado: row.estado, observaciones: row.observaciones || ""
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.tipoPersona || !form.idPersona || !form.idBanco || !form.noContrato || !form.monto || !form.cuota || !form.plazoMeses || !form.fechaInicio || !form.fechaFin) {
      Swal.fire("Validacion", "Complete todos los campos obligatorios.", "warning"); return;
    }
    try {
      if (editingRow) {
        await axiosClient.put(`/prestamos-regimen/${editingRow.id}`, form);
        Swal.fire("Listo", "Registro actualizado correctamente.", "success");
      } else {
        await axiosClient.post("/prestamos-regimen", form);
        Swal.fire("Listo", "Registro creado correctamente.", "success");
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar el registro.", "error");
    }
  };

  const handleDelete = async (row) => {
    const result = await Swal.fire({ title: "Eliminar registro", text: "Esta accion no se puede deshacer.", icon: "warning", showCancelButton: true, confirmButtonText: "Si, eliminar", cancelButtonText: "Cancelar", confirmButtonColor: "#1f4e5f" });
    if (!result.isConfirmed) return;
    try {
      await axiosClient.delete(`/prestamos-regimen/${row.id}`);
      Swal.fire("Listo", "Registro eliminado correctamente.", "success");
      load();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar el registro.", "error");
    }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Préstamos Régimen"
        subtitle="Mantenimiento de préstamos régimen"
        actions={canCreate(user) && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nuevo</Button>}
      />
      <DataTable
        columns={[
          { key: "noContrato", label: "No. Contrato" },
          { key: "personaNombre", label: "Persona" },
          { key: "bancoNombre", label: "Banco" },
          { key: "monto", label: "Monto", render: (row) => `Q ${Number(row.monto).toFixed(2)}` },
          { key: "cuota", label: "Cuota", render: (row) => `Q ${Number(row.cuota).toFixed(2)}` },
          { key: "plazoMeses", label: "Plazo" },
          { key: "estado", label: "Estado", render: (row) => <StatusChip value={row.estado} /> }
        ]}
        rows={filtered}
        search={search}
        onSearch={setSearch}
        filterKeys={["noContrato", "personaNombre", "bancoNombre", "estado"]}
        actions={[
          { label: "Editar", icon: <EditIcon />, onClick: openEdit, visible: () => canEdit(user) },
          { label: "Eliminar", icon: <DeleteIcon />, onClick: handleDelete, visible: () => canDelete(user) }
        ]}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>{editingRow ? "Editar préstamo régimen" : "Nuevo préstamo régimen"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo persona *</InputLabel>
                <Select label="Tipo persona *" value={form.tipoPersona} onChange={(e) => setForm({ ...form, tipoPersona: e.target.value, tipoManejo: e.target.value === "EMPLEADO" ? MANEJO_EMPLEADOS : e.target.value === "JUBILADO" ? MANEJO_JUBILADOS : "", idPersona: "" })}>
                  {TIPO_PERSONA_OPTS.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Persona *</InputLabel>
                <Select label="Persona *" value={form.idPersona} onChange={(e) => setForm({ ...form, idPersona: e.target.value })} disabled={!form.tipoPersona}>
                  {personas.map((p) => <MenuItem key={p.id} value={p.id}>{`${p.nombres} ${p.apellidos} - ${p.dpi}`}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Banco *</InputLabel>
                <Select label="Banco *" value={form.idBanco} onChange={setf("idBanco")}>
                  {bancos.map((b) => <MenuItem key={b.id} value={b.id}>{b.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="No. contrato *" value={form.noContrato} onChange={setfUpper("noContrato")} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Monto *" type="number" value={form.monto} onChange={setf("monto")} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Cuota *" type="number" value={form.cuota} onChange={setf("cuota")} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Plazo (meses) *" type="number" value={form.plazoMeses} onChange={setf("plazoMeses")} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Fecha inicio *" type="date" value={form.fechaInicio} onChange={setf("fechaInicio")} InputLabelProps={{ shrink: true }} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Fecha fin *" type="date" value={form.fechaFin} onChange={setf("fechaFin")} InputLabelProps={{ shrink: true }} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Tasa interes %" type="number" value={form.tasaInteres} onChange={setf("tasaInteres")} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" value={form.estado} onChange={setf("estado")}>
                  {ESTADO_OPTS.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Observaciones" value={form.observaciones} onChange={setfUpper("observaciones")} fullWidth />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default PrestamosRegimenPage;
