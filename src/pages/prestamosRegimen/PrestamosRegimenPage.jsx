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
const ESTADO_OPTS = ["ACTIVO", "INACTIVO", "CANCELADO"];

const buildForm = () => ({
  tipoPersona: "", idPersona: "", idBanco: "",
  noReferencia: "", monto: "", valorMes: "", saldo: "", noCuotas: "",
  fechaInicio: "", fechaFin: "", uso: "", estado: "ACTIVO"
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
      ["noReferencia", "personaNombre", "bancoNombre", "uso", "estado"].some(
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
      tipoPersona: Number(row.tipoManejo) === MANEJO_JUBILADOS ? "JUBILADO" : "EMPLEADO",
      // id unificado: empleados usan idEmpleado, jubilados idJubilado
      idPersona: row.idPersona ?? row.idEmpleado ?? row.idJubilado,
      idBanco: row.idBanco,
      noReferencia: row.noReferencia,
      monto: row.monto,
      valorMes: row.valorMes,
      saldo: row.saldo,
      noCuotas: row.noCuotas,
      fechaInicio: row.fechaInicio ? String(row.fechaInicio).slice(0, 10) : "",
      fechaFin: row.fechaFin ? String(row.fechaFin).slice(0, 10) : "",
      uso: row.uso || "",
      estado: row.estado
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.tipoPersona || !form.idPersona || !form.idBanco || !form.noReferencia || !form.monto || !form.valorMes || !form.noCuotas || !form.fechaInicio || !form.fechaFin) {
      Swal.fire("Validacion", "Complete todos los campos obligatorios.", "warning"); return;
    }
    const payload = {
      tipoManejo: form.tipoPersona === "JUBILADO" ? MANEJO_JUBILADOS : MANEJO_EMPLEADOS,
      idEmpleado: form.idPersona,
      idBanco: form.idBanco,
      noReferencia: form.noReferencia,
      monto: form.monto,
      valorMes: form.valorMes,
      saldo: form.saldo || 0,
      noCuotas: form.noCuotas,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      uso: form.uso || null,
      estado: form.estado
    };
    try {
      if (editingRow) {
        await axiosClient.put(`/prestamos-regimen/${editingRow.id}`, payload);
        Swal.fire("Listo", "Registro actualizado correctamente.", "success");
      } else {
        await axiosClient.post("/prestamos-regimen", payload);
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
          { key: "noReferencia", label: "No. Referencia" },
          { key: "personaNombre", label: "Persona" },
          { key: "bancoNombre", label: "Banco" },
          { key: "monto", label: "Monto", render: (row) => `Q ${Number(row.monto).toFixed(2)}` },
          { key: "valorMes", label: "Valor mes", render: (row) => `Q ${Number(row.valorMes).toFixed(2)}` },
          { key: "saldo", label: "Saldo", render: (row) => `Q ${Number(row.saldo).toFixed(2)}` },
          { key: "noCuotas", label: "Cuotas" },
          { key: "estado", label: "Estado", render: (row) => <StatusChip value={row.estado} /> }
        ]}
        rows={filtered}
        search={search}
        onSearch={setSearch}
        filterKeys={["noReferencia", "personaNombre", "bancoNombre", "estado"]}
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
              <FormControl fullWidth>
                <InputLabel>Banco *</InputLabel>
                <Select label="Banco *" value={form.idBanco} onChange={setf("idBanco")}>
                  {bancos.map((b) => <MenuItem key={b.id} value={b.id}>{b.descripcion}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="No. referencia *" value={form.noReferencia} onChange={setfUpper("noReferencia")} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Monto *" type="number" value={form.monto} onChange={setf("monto")} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Valor mes *" type="number" value={form.valorMes} onChange={setf("valorMes")} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Saldo" type="number" value={form.saldo} onChange={setf("saldo")} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="No. cuotas *" type="number" value={form.noCuotas} onChange={setf("noCuotas")} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Fecha inicio *" type="date" value={form.fechaInicio} onChange={setf("fechaInicio")} InputLabelProps={{ shrink: true }} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Fecha fin *" type="date" value={form.fechaFin} onChange={setf("fechaFin")} InputLabelProps={{ shrink: true }} fullWidth />
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
              <TextField label="Uso" value={form.uso} onChange={setfUpper("uso")} fullWidth />
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
