import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import LockResetIcon from "@mui/icons-material/LockReset";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
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
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import DataTable from "../../components/common/DataTable";
import PageHeader from "../../components/common/PageHeader";
import RoleChip from "../../components/common/RoleChip";
import StatusChip from "../../components/common/StatusChip";

const initialForm = {
  usuario: "",
  nombre: "",
  correo: "",
  estado: "ACTIVO",
  fechaInicio: "",
  contrasena: "",
  rol: "OPERADOR"
};

const roles = ["ADMIN", "OPERADOR", "CONSULTA"];
const estados = ["ACTIVO", "INACTIVO"];

const formatDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [newPassword, setNewPassword] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/usuarios");
      setUsuarios(data.data || []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar usuarios.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const columns = [
    { key: "usuario", label: "Usuario" },
    { key: "nombre", label: "Nombre" },
    { key: "correo", label: "Correo" },
    { key: "estado", label: "Estado", render: (user) => <StatusChip value={user.estado} /> },
    { key: "rol", label: "Rol", render: (user) => <RoleChip value={user.rol} /> },
    { key: "fechaInicio", label: "Fecha inicio", render: (user) => formatDate(user.fechaInicio) }
  ];

  const openCreateDialog = () => {
    setEditingUser(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    setForm({
      usuario: user.usuario,
      nombre: user.nombre,
      correo: user.correo,
      estado: user.estado,
      fechaInicio: formatDate(user.fechaInicio),
      contrasena: "",
      rol: user.rol || "OPERADOR"
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    if (!editingUser && (!form.usuario.trim() || form.usuario.length < 3 || /\s/.test(form.usuario))) {
      return "El usuario debe tener minimo 3 caracteres y no contener espacios.";
    }
    if (!form.nombre.trim()) return "El nombre es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) return "Ingrese un correo valido.";
    if (!form.fechaInicio) return "La fecha de inicio es obligatoria.";
    if (!estados.includes(form.estado)) return "Estado no permitido.";
    if (!roles.includes(form.rol)) return "Rol no permitido.";
    if (!editingUser && form.contrasena.length < 8) return "La contrasena debe tener al menos 8 caracteres.";
    return null;
  };

  const handleSubmit = async () => {
    const validationMessage = validateForm();
    if (validationMessage) {
      Swal.fire("Validacion", validationMessage, "warning");
      return;
    }

    try {
      if (editingUser) {
        await axiosClient.put(`/usuarios/${editingUser.id}`, {
          nombre: form.nombre,
          correo: form.correo,
          estado: form.estado,
          fechaInicio: form.fechaInicio,
          rol: form.rol
        });
        Swal.fire("Listo", "Usuario actualizado correctamente.", "success");
      } else {
        await axiosClient.post("/usuarios", form);
        Swal.fire("Listo", "Usuario creado correctamente.", "success");
      }

      setDialogOpen(false);
      loadUsers();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar el usuario.", "error");
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const result = await Swal.fire({
      title: "Cambiar estado",
      text: `Desea cambiar el estado de ${user.usuario} a ${nextStatus}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Si, cambiar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1f4e5f"
    });

    if (!result.isConfirmed) return;

    try {
      await axiosClient.patch(`/usuarios/${user.id}/estado`, { estado: nextStatus });
      Swal.fire("Listo", "Estado actualizado correctamente.", "success");
      loadUsers();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cambiar el estado.", "error");
    }
  };

  const openPasswordDialog = (user) => {
    setPasswordUser(user);
    setNewPassword("");
    setPasswordDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      Swal.fire("Validacion", "La contrasena debe tener al menos 8 caracteres.", "warning");
      return;
    }

    try {
      await axiosClient.patch(`/usuarios/${passwordUser.id}/password`, { contrasena: newPassword });
      setPasswordDialogOpen(false);
      Swal.fire("Listo", "Contrasena actualizada correctamente.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cambiar la contrasena.", "error");
    }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Usuarios"
        subtitle="Administracion de accesos del sistema"
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>Nuevo usuario</Button>}
      />

      <DataTable
        loading={loading}
        columns={columns}
        rows={usuarios}
        search={search}
        onSearch={setSearch}
        emptyMessage="No hay usuarios para mostrar."
        actions={[
          { label: "Editar", icon: <EditIcon />, onClick: openEditDialog },
          { label: "Activar o inactivar", icon: <PowerSettingsNewIcon />, onClick: handleToggleStatus },
          { label: "Cambiar contrasena", icon: <LockResetIcon />, onClick: openPasswordDialog }
        ]}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { width: "min(860px, calc(100% - 24px))" } }}
      >
        <DialogTitle>{editingUser ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField label="Usuario" value={form.usuario} disabled={Boolean(editingUser)} onChange={(event) => setForm({ ...form, usuario: event.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Nombre" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Correo" value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Fecha de inicio" type="date" value={form.fechaInicio} onChange={(event) => setForm({ ...form, fechaInicio: event.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
            </Grid>
            {!editingUser && (
              <Grid item xs={12} md={6}>
                <TextField label="Contrasena" type="password" value={form.contrasena} onChange={(event) => setForm({ ...form, contrasena: event.target.value })} fullWidth />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select label="Estado" value={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.value })}>
                  {estados.map((estado) => <MenuItem key={estado} value={estado}>{estado}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Rol</InputLabel>
                <Select label="Rol" value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value })}>
                  {roles.map((rol) => <MenuItem key={rol} value={rol}>{rol}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cambiar contrasena</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography color="text.secondary">{passwordUser?.usuario}</Typography>
            <TextField
              label="Nueva contrasena"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleChangePassword}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default UsuariosPage;
