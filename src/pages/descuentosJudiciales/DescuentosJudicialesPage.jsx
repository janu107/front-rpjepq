import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputLabel, MenuItem, Select, Stack, TextField
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
const ESTADO_OPTS = ["ACTIVO", "INACTIVO"];
const TIPO_OPTS = ["PENSION ALIMENTICIA", "DESCUENTO JUDICIAL", "OTRO"];

const buildForm = () => ({
  tipoManejo: "", tipoPersona: "", idPersona: "",
  beneficiario: "", tipo: "", valor: "", saldo: "",
  fechaInicio: "", fechaFinal: "", estado: "ACTIVO"
});

const DescuentosJudicialesPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [jubilados, setJubilados] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(buildForm());

  const load = async () => {
    try {
      const { data } = await axiosClient.get("/descuentos-judiciales");
      setRows(data.data || []);
    } catch {
      Swal.fire("Error", "No fue posible cargar los descuentos judiciales.", "error");
    }
  };

  useEffect(() => {
    load();
    Promise.all([axiosClient.get("/empleados"), axiosClient.get("/jubilados")]).then(([e, j]) => {
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
      ["beneficiario", "tipo", "personaNombre", "manejoDescripcion", "estado"].some(
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
      tipoManejo: row.tipoManejo,
      tipoPersona: Number(row.tipoManejo) === MANEJO_JUBILADOS ? "JUBILADO" : "EMPLEADO",
      idPersona: row.idEmpleado,
      beneficiario: row.beneficiario,
      tipo: row.tipo,
      valor: row.valor,
      saldo: row.saldo,
      fechaInicio: row.fechaInicio ? String(row.fechaInicio).slice(0, 10) : "",
      fechaFinal: row.fechaFinal ? String(row.fechaFinal).slice(0, 10) : "",
      estado: row.estado
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.tipoPersona || !form.idPersona || !form.beneficiario || !form.tipo || !form.valor || !form.fechaInicio) {
      Swal.fire("Validacion", "Complete todos los campos obligatorios.", "warning"); return;
    }
    const payload = {
      tipoManejo: form.tipoPersona === "JUBILADO" ? MANEJO_JUBILADOS : MANEJO_EMPLEADOS,
      idEmpleado: form.idPersona,
      beneficiario: form.beneficiario,
      tipo: form.tipo,
      valor: form.valor,
      saldo: form.saldo || 0,
      fechaInicio: form.fechaInicio,
      fechaFinal: form.fechaFinal || null,
      estado: form.estado
    };
    try {
      if (editingRow) {
        await axiosClient.put(`/descuentos-judiciales/${editingRow.id}`, payload);
        Swal.fire("Listo", "Registro actualizado correctamente.", "success");
      } else {
        await axiosClient.post("/descuentos-judiciales", payload);
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
      await axiosClient.delete(`/descuentos-judiciales/${row.id}`);
      Swal.fire("Listo", "Registro eliminado correctamente.", "success");
      load();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar el registro.", "error");
    }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Descuentos Judiciales"
        subtitle="Mantenimiento de descuentos judiciales"
        actions={canCreate(user) && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nuevo</Button>}
      />
      <DataTable
        columns={[
          { key: "id", label: "Codigo" },
          { key: "personaNombre", label: "Persona" },
          { key: "manejoDescripcion", label: "Manejo" },
          { key: "beneficiario", label: "Beneficiario" },
          { key: "tipo", label: "Tipo" },
          { key: "valor", label: "Valor", render: (row) => `Q ${Number(row.valor).toFixed(2)}` },
          { key: "saldo", label: "Saldo", render: (row) => `Q ${Number(row.saldo).toFixed(2)}` },
          { key: "estado", label: "Estado", render: (row) => <StatusChip value={row.estado} /> }
        ]}
        rows={filtered}
        search={search}
        onSearch={setSearch}
        filterKeys={["beneficiario", "tipo", "personaNombre", "manejoDescripcion", "estado"]}
        actions={[
          { label: "Editar", icon: <EditIcon />, onClick: openEdit, visible: () => canEdit(user) },
          { label: "Eliminar", icon: <DeleteIcon />, onClick: handleDelete, visible: () => canDelete(user) }
        ]}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingRow ? "Editar descuento judicial" : "Nuevo descuento judicial"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo persona *</InputLabel>
                <Select label="Tipo persona *" value={form.tipoPersona} onChange={(e) => setForm({ ...form, tipoPersona: e.target.value, idPersona: "" })}>
                  {TIPO_PERSONA_OPTS.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Persona *</InputLabel>
                <Select label="Persona *" value={form.idPersona} onChange={setf("idPersona")} disabled={!form.tipoPersona}>
                  {personas.map((p) => <MenuItem key={p.id} value={p.id}>{`${p.nombres} ${p.apellidos} - ${p.dpi}`}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Beneficiario *" value={form.beneficiario} onChange={setfUpper("beneficiario")} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo *</InputLabel>
                <Select label="Tipo *" value={form.tipo} onChange={setf("tipo")}>
                  {TIPO_OPTS.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Valor *" type="number" value={form.valor} onChange={setf("valor")} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Saldo" type="number" value={form.saldo} onChange={setf("saldo")} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" value={form.estado} onChange={setf("estado")}>
                  {ESTADO_OPTS.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Fecha inicio *" type="date" value={form.fechaInicio} onChange={setf("fechaInicio")} InputLabelProps={{ shrink: true }} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Fecha final (opcional)" type="date" value={form.fechaFinal} onChange={setf("fechaFinal")} InputLabelProps={{ shrink: true }} fullWidth />
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

export default DescuentosJudicialesPage;
