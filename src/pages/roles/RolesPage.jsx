import SaveIcon from "@mui/icons-material/Save";
import {
  Box,
  Button,
  Chip,
  FormControl,
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
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";

const RolesPage = () => {
  const [roles, setRoles] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});

  const loadData = async () => {
    try {
      const [rolesResponse, tiposResponse] = await Promise.all([
        axiosClient.get("/roles"),
        axiosClient.get("/roles/tipos")
      ]);

      const roleRows = rolesResponse.data.data || [];
      setRoles(roleRows);
      setTipos(tiposResponse.data.data || []);
      setSelectedRoles(
        roleRows.reduce((acc, item) => {
          acc[item.usuarioId] = item.rol;
          return acc;
        }, {})
      );
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar roles.", "error");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRole = async (row) => {
    const nextRole = selectedRoles[row.usuarioId];
    const result = await Swal.fire({
      title: "Cambiar rol",
      text: `Desea asignar el rol ${nextRole} a ${row.usuario}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Si, guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1f4e5f"
    });

    if (!result.isConfirmed) return;

    try {
      await axiosClient.put(`/roles/usuario/${row.usuarioId}`, { rol: nextRole });
      Swal.fire("Listo", "Rol actualizado correctamente.", "success");
      loadData();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible actualizar el rol.", "error");
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5">Roles</Typography>
        <Typography color="text.secondary">Asignacion de roles administrativos</Typography>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Rol actual</TableCell>
              <TableCell width={220}>Nuevo rol</TableCell>
              <TableCell align="right">Accion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.usuario}</TableCell>
                <TableCell>{row.nombre}</TableCell>
                <TableCell>{row.correo}</TableCell>
                <TableCell>
                  <Chip label={row.estado} color={row.estado === "ACTIVO" ? "success" : "default"} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={row.rol} color="secondary" size="small" />
                </TableCell>
                <TableCell>
                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedRoles[row.usuarioId] || row.rol}
                      onChange={(event) => setSelectedRoles({ ...selectedRoles, [row.usuarioId]: event.target.value })}
                    >
                      {tipos.map((tipo) => (
                        <MenuItem key={tipo} value={tipo}>
                          {tipo}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell align="right">
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={() => handleSaveRole(row)}
                    disabled={(selectedRoles[row.usuarioId] || row.rol) === row.rol}
                  >
                    Guardar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {roles.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay roles para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default RolesPage;
