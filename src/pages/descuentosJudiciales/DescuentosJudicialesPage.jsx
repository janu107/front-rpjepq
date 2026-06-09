import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, Grid, InputLabel, MenuItem, Select, Stack, TextField, Typography
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

const buildForm = () => ({ tipoManejo: "", tipoPersona: "", idPersona: "", expediente: "", juzgado: "", monto: "", descripcion: "", estado: "ACTIVO" });

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
    Promise.all([
      axiosClient.get("/empleados"),
      axiosClient.get("/jubilados")
    ]).then(([e, j]) => {
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
      ["expediente", "juzgado", "personaNombre", "manejoDescripcion", "estado"].some(
        (k) => String(r[k] || "").toLowerCase().includes(term)
      )
    );
  }, [rows, search]);

  const openCreate = () => { setEditingRow(null); setForm(buildForm()); setDialogOpen(true); };
  const openEdit = (row) => {
    setEditingRow(row);
    setForm({ tipoManejo: row.tipoManejo, tipoPersona: row.tipoPersona, idPersona: row.idPersona, expediente: row.expediente, juzgado: row.juzgado, monto: row.monto, descripcion: row.descripcion || "", estado: row.estado });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.tipoManejo || !form.tipoPersona || !form.idPersona || !form.expediente || !form.juzgado || !form.monto) {
      Swal.fire("Validacion", "Complete todos los campos obligatorios.", "warning"); return;
    }
    try {
      if (editingRow) {
        await axiosClient.put(`/descuentos-judiciales/${editingRow.id}`, form);
        Swal.fire("Listo", "Registro actualizado correctamente.", "success");
      } else {
        await axiosClient.post("/descuentos-judiciales", form);
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

  const f = (key, label) => (
    <TextField label={label} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value.toUpperCase() })} fullWidth />
  );

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
          { key: "expediente", label: "Expediente" },
          { key: "juzgado", label: "Juzgado" },
          { key: "personaNombre", label: "Persona" },
          { key: "manejoDescripcion", label: "Manejo" },
          { key: "monto", label: "Monto", render: (row) => `Q ${Number(row.monto).toFixed(2)}` },
          { key: "estado", label: "Estado", render: (row) => <StatusChip value={row.estado} /> }
        ]}
        rows={filtered}
        search={search}
        onSearch={setSearch}
        filterKeys={["expediente", "juzgado", "personaNombre", "manejoDescripcion", "estado"]}
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
                <InputLabel>Tipo persona</InputLabel>
                <Select label="Tipo persona" value={form.tipoPersona} onChange={(e) => setForm({ ...form, tipoPersona: e.target.value, tipoManejo: e.target.value === "EMPLEADO" ? MANEJO_EMPLEADOS : e.target.value === "JUBILADO" ? MANEJO_JUBILADOS : "", idPersona: "" })}>
                  {TIPO_PERSONA_OPTS.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Persona</InputLabel>
                <Select label="Persona" value={form.idPersona} onChange={(e) => setForm({ ...form, idPersona: e.target.value })} disabled={!form.tipoPersona}>
                  {personas.map((p) => <MenuItem key={p.id} value={p.id}>{form.tipoPersona === "EMPLEADO" ? `${p.nombres} ${p.apellidos} - ${p.dpi}` : `${p.nombres} ${p.apellidos} - ${p.dpi}`}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>{f("expediente", "Expediente *")}</Grid>
            <Grid item xs={12} md={6}>{f("juzgado", "Juzgado *")}</Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Monto *" type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  {ESTADO_OPTS.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descripcion" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value.toUpperCase() })} fullWidth />
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
