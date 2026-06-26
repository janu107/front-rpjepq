import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, IconButton,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canDelete, canEdit } from "../../utils/permissions";

const initialIngreso = { tipoManejo: "", idTipoPlanilla: "", idPlanilla: "", idEmpleado: "", idJubilado: "", tipoIngreso: "", valor: "", diasTrabajados: 30, puesto: "", area: "" };
const initialDescuento = { tipoManejo: "", idTipoPlanilla: "", idPlanilla: "", idEmpleado: "", idJubilado: "", tipoDescuento: "", valor: "", diasTrabajados: 30, puesto: "", area: "" };

const NominaTable = ({ type, rows, config, onNew, onEdit, onDelete, search, setSearch, user }) => {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => [r.empleadoNombre, r.jubiladoNombre, r.puesto, r.area, r.numeroPlanilla].some((v) => String(v || "").toLowerCase().includes(term)));
  }, [rows, search]);

  // CONSULTA NÓMINA: pantalla de solo consulta (sin botón Nuevo ni acciones).
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
        <TextField placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ maxWidth: 420 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
      </Stack>
      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table><TableHead><TableRow><TableCell>Planilla</TableCell><TableCell>Persona</TableCell><TableCell>Tipo</TableCell><TableCell>Valor</TableCell><TableCell>Dias</TableCell><TableCell>Puesto</TableCell><TableCell>Area</TableCell></TableRow></TableHead>
          <TableBody>{filtered.map((row) => <TableRow key={row.id} hover><TableCell>{row.numeroPlanilla}</TableCell><TableCell>{row.empleadoNombre || row.jubiladoNombre}</TableCell><TableCell>{row[config.typeLabel]}</TableCell><TableCell>Q {Number(row.valor).toFixed(2)}</TableCell><TableCell>{row.diasTrabajados}</TableCell><TableCell>{row.puesto}</TableCell><TableCell>{row.area}</TableCell></TableRow>)}</TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

const NominaPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [ingresos, setIngresos] = useState([]);
  const [descuentos, setDescuentos] = useState([]);
  const [options, setOptions] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [mode, setMode] = useState("ingresos");
  const [form, setForm] = useState(initialIngreso);
  const [searchIngresos, setSearchIngresos] = useState("");
  const [searchDescuentos, setSearchDescuentos] = useState("");
  const [resumenPlanilla, setResumenPlanilla] = useState("");
  const [resumen, setResumen] = useState(null);

  const loadOptions = async () => {
    const endpoints = {
      manejos: "/catalogos/manejo-administracion",
      tiposPlanilla: "/catalogos/tipo-planilla",
      planillas: "/catalogos/parametro-planilla",
      tiposIngreso: "/catalogos/tipo-ingreso",
      tiposDescuento: "/catalogos/tipo-descuento",
      empleados: "/empleados",
      jubilados: "/jubilados"
    };
    const entries = await Promise.all(Object.entries(endpoints).map(async ([key, endpoint]) => [key, (await axiosClient.get(endpoint)).data.data || []]));
    setOptions(Object.fromEntries(entries));
  };

  const loadData = async () => {
    const [ing, des] = await Promise.all([axiosClient.get("/nomina/ingresos"), axiosClient.get("/nomina/descuentos")]);
    setIngresos(ing.data.data || []);
    setDescuentos(des.data.data || []);
  };

  useEffect(() => {
    loadOptions().catch(() => {});
    loadData().catch((error) => Swal.fire("Error", error.response?.data?.message || "No fue posible cargar nomina.", "error"));
  }, []);

  const openNew = (nextMode) => {
    setMode(nextMode);
    setEditing(null);
    setForm(nextMode === "ingresos" ? initialIngreso : initialDescuento);
    setDialogOpen(true);
  };

  const openEdit = (nextMode, row) => {
    setMode(nextMode);
    setEditing(row);
    setForm(nextMode === "ingresos" ? { ...initialIngreso, ...row } : { ...initialDescuento, ...row });
    setDialogOpen(true);
  };

  const save = async () => {
    try {
      const payload = { ...form, idEmpleado: form.idEmpleado || null, idJubilado: form.idJubilado || null };
      if (editing) await axiosClient.put(`/nomina/${mode}/${editing.id}`, payload);
      else await axiosClient.post(`/nomina/${mode}`, payload);
      Swal.fire("Listo", "Registro guardado correctamente.", "success");
      setDialogOpen(false);
      loadData();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar.", "error");
    }
  };

  const remove = async (nextMode, row) => {
    const result = await Swal.fire({ title: "Eliminar registro", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", confirmButtonColor: "#1f4e5f" });
    if (!result.isConfirmed) return;
    await axiosClient.delete(`/nomina/${nextMode}/${row.id}`);
    loadData();
  };

  const consultarResumen = async () => {
    if (!resumenPlanilla) return;
    const { data } = await axiosClient.get(`/nomina/resumen/planilla/${resumenPlanilla}`);
    setResumen(data.data);
  };

  const isIngreso = mode === "ingresos";

  return (
    <Stack spacing={2.5}>
      <Box><Typography variant="h5">Consulta Nómina</Typography><Typography color="text.secondary">Consulta de ingresos, descuentos y resumen por planilla</Typography></Box>
      <Paper elevation={0} sx={{ border: "1px solid #dde3ea", overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(event, value) => setTab(value)}
          variant="fullWidth"
          aria-label="Secciones de nomina"
          sx={{
            "& .MuiTab-root": {
              minHeight: { xs: 56, md: 48 },
              px: { xs: 1.5, md: 2 },
              fontWeight: 800
            }
          }}
        >
          <Tab label="Ingresos" id="nomina-tab-0" aria-controls="nomina-panel-0" onClick={() => setTab(0)} />
          <Tab label="Descuentos" id="nomina-tab-1" aria-controls="nomina-panel-1" onClick={() => setTab(1)} />
          <Tab label="Resumen" id="nomina-tab-2" aria-controls="nomina-panel-2" onClick={() => setTab(2)} />
        </Tabs>
      </Paper>
      <Box role="tabpanel" id="nomina-panel-0" aria-labelledby="nomina-tab-0" hidden={tab !== 0}>
        {tab === 0 && <NominaTable user={user} type="ingreso" rows={ingresos} config={{ typeLabel: "tipoIngresoNombre" }} onNew={() => openNew("ingresos")} onEdit={(r) => openEdit("ingresos", r)} onDelete={(r) => remove("ingresos", r)} search={searchIngresos} setSearch={setSearchIngresos} />}
      </Box>
      <Box role="tabpanel" id="nomina-panel-1" aria-labelledby="nomina-tab-1" hidden={tab !== 1}>
        {tab === 1 && <NominaTable user={user} type="descuento" rows={descuentos} config={{ typeLabel: "tipoDescuentoNombre" }} onNew={() => openNew("descuentos")} onEdit={(r) => openEdit("descuentos", r)} onDelete={(r) => remove("descuentos", r)} search={searchDescuentos} setSearch={setSearchDescuentos} />}
      </Box>
      <Box role="tabpanel" id="nomina-panel-2" aria-labelledby="nomina-tab-2" hidden={tab !== 2}>
        {tab === 2 && <Stack spacing={2}><FormControl sx={{ maxWidth: 420 }}><InputLabel>Planilla</InputLabel><Select label="Planilla" value={resumenPlanilla} onChange={(e) => setResumenPlanilla(e.target.value)}>{(options.planillas || []).map((p) => <MenuItem key={p.id} value={p.id}>Planilla {p.numero} - {p.tipoPlanillaNombre}</MenuItem>)}</Select></FormControl><Button variant="contained" onClick={consultarResumen} sx={{ maxWidth: 220 }}>Consultar resumen</Button>{resumen && <Grid container spacing={2}>{[["Total ingresos", resumen.totalIngresos], ["Total descuentos", resumen.totalDescuentos], ["Liquido", resumen.liquido], ["Cantidad ingresos", resumen.cantidadIngresos], ["Cantidad descuentos", resumen.cantidadDescuentos]].map(([label, value]) => <Grid item xs={12} md={4} key={label}><Paper elevation={0} sx={{ p: 3, border: "1px solid #dde3ea" }}><Typography color="text.secondary">{label}</Typography><Typography variant="h6">{typeof value === "number" ? value.toFixed ? value.toFixed(2) : value : value}</Typography></Paper></Grid>)}</Grid>}</Stack>}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md"><DialogTitle>{editing ? "Editar" : "Nuevo"} {isIngreso ? "ingreso" : "descuento"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
        <FormControl fullWidth><InputLabel>Manejo</InputLabel><Select label="Manejo" value={form.tipoManejo} onChange={(e) => setForm({ ...form, tipoManejo: e.target.value })}>{(options.manejos || []).map((o) => <MenuItem key={o.id} value={o.id}>{o.descripcion}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel>Tipo planilla</InputLabel><Select label="Tipo planilla" value={form.idTipoPlanilla} onChange={(e) => setForm({ ...form, idTipoPlanilla: e.target.value })}>{(options.tiposPlanilla || []).map((o) => <MenuItem key={o.id} value={o.id}>{o.tipoPlanilla} - {o.descripcion}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel>Planilla</InputLabel><Select label="Planilla" value={form.idPlanilla} onChange={(e) => setForm({ ...form, idPlanilla: e.target.value })}>{(options.planillas || []).map((o) => <MenuItem key={o.id} value={o.id}>Planilla {o.numero}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel>Empleado</InputLabel><Select label="Empleado" value={form.idEmpleado || ""} onChange={(e) => setForm({ ...form, idEmpleado: e.target.value, idJubilado: "" })}><MenuItem value="">No aplica</MenuItem>{(options.empleados || []).map((o) => <MenuItem key={o.id} value={o.id}>{o.nombres} {o.apellidos}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel>Jubilado</InputLabel><Select label="Jubilado" value={form.idJubilado || ""} onChange={(e) => setForm({ ...form, idJubilado: e.target.value, idEmpleado: "" })}><MenuItem value="">No aplica</MenuItem>{(options.jubilados || []).map((o) => <MenuItem key={o.id} value={o.id}>{o.nombres} {o.apellidos}</MenuItem>)}</Select></FormControl>
        {isIngreso ? <FormControl fullWidth><InputLabel>Tipo ingreso</InputLabel><Select label="Tipo ingreso" value={form.tipoIngreso} onChange={(e) => setForm({ ...form, tipoIngreso: e.target.value })}>{(options.tiposIngreso || []).map((o) => <MenuItem key={o.id} value={o.id}>{o.tipoIngreso} - {o.descripcion}</MenuItem>)}</Select></FormControl> : <FormControl fullWidth><InputLabel>Tipo descuento</InputLabel><Select label="Tipo descuento" value={form.tipoDescuento} onChange={(e) => setForm({ ...form, tipoDescuento: e.target.value })}>{(options.tiposDescuento || []).map((o) => <MenuItem key={o.id} value={o.id}>{o.tipoDescuento} - {o.descripcion}</MenuItem>)}</Select></FormControl>}
        <TextField label="Valor" type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} fullWidth />
        <TextField label="Dias trabajados" type="number" value={form.diasTrabajados} onChange={(e) => setForm({ ...form, diasTrabajados: e.target.value })} fullWidth />
        <TextField label="Puesto" value={form.puesto} onChange={(e) => setForm({ ...form, puesto: e.target.value })} fullWidth />
        <TextField label="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} fullWidth />
      </Stack></DialogContent><DialogActions><Button onClick={() => setDialogOpen(false)}>Cancelar</Button><Button variant="contained" onClick={save}>Guardar</Button></DialogActions></Dialog>
    </Stack>
  );
};

export default NominaPage;
