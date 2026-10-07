import SaveIcon from "@mui/icons-material/Save";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Paper,
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
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import RoleChip from "../../components/common/RoleChip";

const sameSet = (a = [], b = []) => a.length === b.length && a.every((r) => b.includes(r));

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
          acc[item.usuarioId] = item.roles || [];
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

  const descripcionDe = (rol) => tipos.find((t) => t.rol === rol)?.descripcion || "";

  // El rol heredado (OPERADOR) sólo se ofrece a quien ya lo tiene, para que las cuentas
  // anteriores sigan siendo editables sin proponerlo como rol nuevo.
  const opcionesPara = (row) => tipos
    .filter((t) => !t.heredado || t.rol === "ADMIN" || (row.roles || []).includes(t.rol))
    .map((t) => t.rol);

  const handleSaveRole = async (row) => {
    const nextRoles = selectedRoles[row.usuarioId] || [];
    if (!nextRoles.length) {
      Swal.fire("Validacion", "Debe asignar al menos un rol.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Cambiar roles",
      text: `Desea asignar ${nextRoles.length === 1 ? "el rol" : "los roles"} ${nextRoles.join(", ")} a ${row.usuario}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Si, guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1f4e5f"
    });

    if (!result.isConfirmed) return;

    try {
      await axiosClient.put(`/roles/usuario/${row.usuarioId}`, { roles: nextRoles });
      Swal.fire("Listo", "Roles actualizados correctamente.", "success");
      loadData();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible actualizar los roles.", "error");
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5">Roles</Typography>
        <Typography color="text.secondary">
          Asignacion de roles administrativos. Un usuario puede tener mas de un rol.
        </Typography>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Roles actuales</TableCell>
              <TableCell width={340}>Nuevos roles</TableCell>
              <TableCell align="right">Accion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((row) => {
              const seleccion = selectedRoles[row.usuarioId] || [];
              const sinCambios = sameSet(seleccion, row.roles || []);
              return (
                <TableRow key={row.usuarioId} hover>
                  <TableCell>{row.usuario}</TableCell>
                  <TableCell>{row.nombre}</TableCell>
                  <TableCell>{row.correo}</TableCell>
                  <TableCell>
                    <Chip label={row.estado} color={row.estado === "ACTIVO" ? "success" : "default"} size="small" />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {(row.roles || []).length
                        ? row.roles.map((r) => <RoleChip key={r} value={r} />)
                        : <RoleChip value="SIN ROL" />}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      size="small"
                      options={opcionesPara(row)}
                      value={seleccion}
                      onChange={(_, value) => setSelectedRoles({ ...selectedRoles, [row.usuarioId]: value })}
                      renderOption={(props, option, { selected }) => (
                        <li {...props} key={option}>
                          <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{option}</Typography>
                            <Typography variant="caption" color="text.secondary">{descripcionDe(option)}</Typography>
                          </Box>
                        </li>
                      )}
                      renderTags={(value, getTagProps) => value.map((option, index) => (
                        <Tooltip key={option} title={descripcionDe(option)}>
                          <Chip size="small" label={option} {...getTagProps({ index })} />
                        </Tooltip>
                      ))}
                      renderInput={(params) => (
                        <TextField {...params} placeholder={seleccion.length ? "" : "Seleccione roles"}
                          inputProps={{ ...params.inputProps, "aria-label": `Nuevos roles para ${row.usuario}` }} />
                      )}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      startIcon={<SaveIcon />}
                      onClick={() => handleSaveRole(row)}
                      disabled={sinCambios || !seleccion.length}
                      title={sinCambios ? "Modifique la seleccion de roles para guardar" : "Guardar roles"}
                    >
                      Guardar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
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
