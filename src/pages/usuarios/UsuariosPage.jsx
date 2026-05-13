import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import LockResetIcon from "@mui/icons-material/LockReset";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
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

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return usuarios;

    return usuarios.filter((user) =>
      [user.usuario, user.nombre, user.correo].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [usuarios, search]);

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
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h5">Usuarios</Typography>
          <Typography color="text.secondary">Administracion de accesos del sistema</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Nuevo usuario
        </Button>
      </Stack>

      <Paper elevation={0} sx={{ p: 2, border: "1px solid #dde3ea" }}>
        <TextField
          placeholder="Buscar por usuario, nombre o correo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Fecha inicio</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.usuario}</TableCell>
                <TableCell>{user.nombre}</TableCell>
                <TableCell>{user.correo}</TableCell>
                <TableCell>
                  <Chip label={user.estado} color={user.estado === "ACTIVO" ? "success" : "default"} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={user.rol || "SIN ROL"} color="secondary" size="small" />
                </TableCell>
                <TableCell>{formatDate(user.fechaInicio)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton color="primary" onClick={() => openEditDialog(user)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Activar o inactivar">
                    <IconButton color="primary" onClick={() => handleToggleStatus(user)}>
                      <PowerSettingsNewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cambiar contrasena">
                    <IconButton color="primary" onClick={() => openPasswordDialog(user)}>
                      <LockResetIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay usuarios para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingUser ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Usuario"
              value={form.usuario}
              disabled={Boolean(editingUser)}
              onChange={(event) => setForm({ ...form, usuario: event.target.value })}
              fullWidth
            />
            <TextField label="Nombre" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} fullWidth />
            <TextField label="Correo" value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })} fullWidth />
            <TextField
              label="Fecha de inicio"
              type="date"
              value={form.fechaInicio}
              onChange={(event) => setForm({ ...form, fechaInicio: event.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            {!editingUser && (
              <TextField
                label="Contrasena"
                type="password"
                value={form.contrasena}
                onChange={(event) => setForm({ ...form, contrasena: event.target.value })}
                fullWidth
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select label="Estado" value={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.value })}>
                {estados.map((estado) => (
                  <MenuItem key={estado} value={estado}>
                    {estado}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Rol</InputLabel>
              <Select label="Rol" value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value })}>
                {roles.map((rol) => (
                  <MenuItem key={rol} value={rol}>
                    {rol}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
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
