import SecurityIcon from "@mui/icons-material/Security";
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  Paper, Radio, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/common/PageHeader";

// Permisos por ventana: en cada ventana del menú el usuario tiene un nivel
// (Sin acceso / Consulta / Opera / Total). ADMIN es el superusuario.
const COLOR_NIVEL = { 1: "default", 2: "info", 3: "success" };

const RolesPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [pantallas, setPantallas] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [editar, setEditar] = useState(null); // { usuario, admin, permisos, rolesAnteriores }
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const [u, m] = await Promise.all([axiosClient.get("/roles"), axiosClient.get("/roles/modulos")]);
      setUsuarios(u.data.data || []);
      setPantallas(m.data.data?.pantallas || []);
      setNiveles(m.data.data?.niveles || []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar los permisos.", "error");
    }
  };
  useEffect(() => { cargar(); }, []);

  const nombreNivel = (n) => niveles.find((x) => x.nivel === n)?.nombre || "";

  const abrir = (row) => setEditar({
    usuario: row,
    admin: !!row.admin,
    permisos: { ...(row.permisos || {}) },
    // Roles del esquema anterior (se convierten a la matriz al guardar).
    rolesAnteriores: (row.roles || []).filter((r) => !String(r).includes(":") && r !== "ADMIN")
  });
  const setNivel = (modulo, n) => setEditar((e) => ({ ...e, permisos: { ...e.permisos, [modulo]: n } }));
  const todos = (n) => setEditar((e) => ({ ...e, permisos: Object.fromEntries(pantallas.map((m) => [m.clave, n])) }));
  const grupoA = (grupo, n) => setEditar((e) => ({ ...e, permisos: { ...e.permisos, ...Object.fromEntries(pantallas.filter((p) => p.grupo === grupo).map((p) => [p.clave, n])) } }));
  const grupos = [...new Set(pantallas.map((p) => p.grupo))];
  // Resumen de la fila: por grupo, cuántas ventanas y con qué nivel.
  const resumen = (row) => grupos.map((g) => {
    const vs = pantallas.filter((p) => p.grupo === g);
    const con = vs.filter((p) => Number(row.permisos?.[p.clave] || 0) > 0);
    if (!con.length) return null;
    const max = Math.max(...con.map((p) => Number(row.permisos[p.clave])));
    return { grupo: g, texto: con.length === vs.length ? `${g}: ${nombreNivel(max)}` : `${g}: ${con.length} de ${vs.length} ventanas`, max,
      detalle: con.map((p) => `${p.nombre}: ${nombreNivel(Number(row.permisos[p.clave]))}`).join(" · ") };
  }).filter(Boolean);

  const guardar = async () => {
    const algo = editar.admin || pantallas.some((m) => Number(editar.permisos[m.clave] || 0) > 0);
    if (!algo) { Swal.fire("Validación", "Asigne al menos una ventana o el superusuario.", "warning"); return; }
    setGuardando(true);
    try {
      await axiosClient.put(`/roles/usuario/${editar.usuario.usuarioId}/permisos`, { admin: editar.admin, permisos: editar.permisos });
      setEditar(null);
      cargar();
      Swal.fire({ icon: "success", title: "Permisos guardados", text: "El usuario los tiene desde su siguiente acción en el sistema.", timer: 2200, showConfirmButton: false });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar.", "error");
    } finally { setGuardando(false); }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Roles y permisos" subtitle="Qué puede hacer cada usuario en cada módulo del sistema" />

      <Alert severity="info">
        Por cada <b>ventana</b> del menú elija el nivel: <b>Sin acceso</b> (no la ve), <b>Consulta</b> (ver e imprimir), <b>Opera</b> (ver, crear y modificar)
        o <b>Total</b> (además eliminar y revertir). El usuario solo ve en el menú sus ventanas y solo puede modificar en ellas.
        El <b>superusuario</b> tiene todo, incluidos usuarios, roles, auditoría y respaldos.
      </Alert>

      <TableContainer component={Paper} elevation={0} sx={{ border: (t) => `1px solid ${t.palette.borde}` }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Permisos</TableCell>
              <TableCell align="right">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((row) => (
              <TableRow key={row.usuarioId} hover>
                <TableCell sx={{ fontWeight: 700 }}>{row.usuario}</TableCell>
                <TableCell>{row.nombre}</TableCell>
                <TableCell><Chip size="small" label={row.estado} color={row.estado === "ACTIVO" ? "success" : "default"} /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {row.admin && <Chip size="small" color="primary" label="SUPERUSUARIO" />}
                    {!row.admin && resumen(row).map((r) => (
                      <Tooltip key={r.grupo} title={r.detalle} arrow>
                        <Chip size="small" variant="outlined" color={COLOR_NIVEL[r.max]} label={r.texto} />
                      </Tooltip>
                    ))}
                    {!row.admin && !resumen(row).length && <Chip size="small" label="SIN ACCESO" />}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Button size="small" variant="outlined" startIcon={<SecurityIcon />} onClick={() => abrir(row)}>Permisos</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!editar} onClose={() => setEditar(null)} fullWidth maxWidth="md">
        <DialogTitle>Permisos de {editar?.usuario?.usuario} — {editar?.usuario?.nombre}</DialogTitle>
        <DialogContent dividers>
          {editar && (
            <Stack spacing={1.5}>
              <FormControlLabel
                control={<Checkbox checked={editar.admin} onChange={(e) => setEditar((x) => ({ ...x, admin: e.target.checked }))} />}
                label={<span><b>Superusuario (ADMIN)</b> — todo el sistema, incluidos usuarios, roles, auditoría y respaldos</span>}
              />
              <Box sx={{ opacity: editar.admin ? 0.45 : 1, pointerEvents: editar.admin ? "none" : "auto" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ventana</TableCell>
                      {niveles.map((n) => (
                        <TableCell key={n.nivel} align="center">
                          <Tooltip title={n.detalle} arrow><span style={{ borderBottom: "1px dotted #999" }}>{n.nombre}</span></Tooltip>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grupos.map((g) => {
                      const vs = pantallas.filter((p) => p.grupo === g);
                      const iguales = vs.every((p) => Number(editar.permisos[p.clave] || 0) === Number(editar.permisos[vs[0].clave] || 0));
                      return [
                        <TableRow key={`g-${g}`} sx={{ bgcolor: "fondo.suave" }}>
                          <TableCell sx={{ fontWeight: 800, color: "marca.main" }}>{g} <Typography component="span" variant="caption" color="text.secondary">(todo el grupo)</Typography></TableCell>
                          {niveles.map((n) => (
                            <TableCell key={n.nivel} align="center">
                              <Radio size="small" checked={iguales && Number(editar.permisos[vs[0].clave] || 0) === n.nivel} onChange={() => grupoA(g, n.nivel)} />
                            </TableCell>
                          ))}
                        </TableRow>,
                        ...vs.map((m) => (
                          <TableRow key={m.clave} hover>
                            <TableCell sx={{ pl: 4 }}>
                              <Typography variant="body2" fontWeight={700}>{m.nombre}</Typography>
                              <Typography variant="caption" color="text.secondary">{m.detalle}</Typography>
                            </TableCell>
                            {niveles.map((n) => (
                              <TableCell key={n.nivel} align="center">
                                <Radio size="small" checked={Number(editar.permisos[m.clave] || 0) === n.nivel} onChange={() => setNivel(m.clave, n.nivel)} />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ];
                    })}
                  </TableBody>
                </Table>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" onClick={() => todos(1)}>Todo en Consulta</Button>
                  <Button size="small" onClick={() => todos(2)}>Todo en Opera</Button>
                  <Button size="small" color="inherit" onClick={() => todos(0)}>Quitar todo</Button>
                </Stack>
              </Box>
              {editar.rolesAnteriores.length > 0 && (
                <Alert severity="warning" variant="outlined">
                  Tiene roles del esquema anterior ({editar.rolesAnteriores.join(", ")}); arriba se muestran convertidos a la matriz.
                  Al guardar quedan reemplazados por lo que elija aquí.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditar(null)}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={guardando}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default RolesPage;
