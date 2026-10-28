import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid,
  InputLabel, MenuItem, Paper, Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import DataTable from "../../components/common/DataTable";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canDelete, canEdit } from "../../utils/permissions";

// Otros descuentos (extraordinarios o de última hora): a quién, en qué planilla
// y cuánto. Se agregan solos cada vez que se genera esa planilla (también al
// reversar y generar de nuevo). Con la planilla CERRADA ya no se pueden cambiar.

const APLICA = [
  { valor: 1, texto: "Empleados régimen", planilla: "Nómina régimen" },
  { valor: 2, texto: "Jubilados", planilla: "Nómina de jubilados" }
];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const COLOR_PLANILLA = { "SIN CREAR": "default", ABIERTA: "info", GENERADA: "warning", REVERSADA: "warning", CERRADA: "success" };
const money = (v) => `Q ${Number(v || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const hoy = new Date();
const periodoHoy = hoy.getFullYear() * 100 + hoy.getMonth() + 1;
const vacio = () => ({
  tipoManejo: 2, idPersona: null, periodo: String(periodoHoy), tipoDescuento: "", valor: "", motivo: "", estado: "ACTIVO"
});
// "202610" -> "Octubre 2026" ("" si no es un período válido).
const nombrePeriodo = (p) => {
  const s = String(p || "");
  const mes = Number(s.slice(4, 6));
  return /^\d{6}$/.test(s) && mes >= 1 && mes <= 12 ? `${MESES[mes - 1]} ${s.slice(0, 4)}` : "";
};

const OtrosDescuentosPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [search, setSearch] = useState("");
  const [empleados, setEmpleados] = useState([]);
  const [jubilados, setJubilados] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [dialogo, setDialogo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vacio());
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      setCargando(true);
      const { data } = await axiosClient.get("/otros-descuentos");
      setRows(data.data || []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar los descuentos.", "error");
    } finally { setCargando(false); }
  };

  useEffect(() => {
    cargar();
    Promise.all([
      axiosClient.get("/empleados").catch(() => ({ data: { data: [] } })),
      axiosClient.get("/jubilados").catch(() => ({ data: { data: [] } })),
      axiosClient.get("/catalogos/tipo-descuento").catch(() => ({ data: { data: [] } }))
    ]).then(([e, j, t]) => {
      setEmpleados((e.data.data || []).filter((x) => Number(x.tipoManejo) === 1).map((x) => ({ id: x.id, codigo: x.idEmpleado, nombre: `${x.nombres || ""} ${x.apellidos || ""}`.trim(), estado: x.estado })));
      setJubilados((j.data.data || []).filter((x) => Number(x.tipoManejo) === 2).map((x) => ({ id: x.id, codigo: x.idJubilado, nombre: `${x.nombres || ""} ${x.apellidos || ""}`.trim(), estado: x.estado })));
      setTipos(t.data.data || []);
    });
  }, []);

  const personas = form.tipoManejo === 1 ? empleados : jubilados;
  const personaSel = personas.find((p) => Number(p.id) === Number(form.idPersona)) || null;
  const tipoOtros = tipos.find((t) => /OTROS/i.test(t.descripcion || ""));

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ ...vacio(), tipoDescuento: tipoOtros ? tipoOtros.id : "" });
    setDialogo(true);
  };
  const abrirEditar = (row) => {
    setEditando(row);
    setForm({
      tipoManejo: Number(row.tipoManejo), idPersona: row.idPersona, periodo: String(row.periodo),
      tipoDescuento: row.tipoDescuento, valor: String(row.valor), motivo: row.motivo || "", estado: row.estado || "ACTIVO"
    });
    setDialogo(true);
  };

  const faltan = !form.idPersona || !nombrePeriodo(form.periodo) || !form.tipoDescuento || !(Number(form.valor) > 0) || !String(form.motivo).trim();

  const guardar = async () => {
    const payload = { ...form };
    try {
      setGuardando(true);
      const { data } = editando
        ? await axiosClient.put(`/otros-descuentos/${editando.id}`, payload)
        : await axiosClient.post("/otros-descuentos", payload);
      setDialogo(false);
      cargar();
      const avisoTxt = data.data?.aviso;
      Swal.fire({ icon: avisoTxt ? "warning" : "success", title: editando ? "Descuento actualizado" : "Descuento registrado", text: avisoTxt || "Se aplicará al generar la planilla." });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar el descuento.", "error");
    } finally { setGuardando(false); }
  };

  const eliminar = async (row) => {
    const r = await Swal.fire({
      title: "Eliminar descuento", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", cancelButtonText: "Cancelar", confirmButtonColor: "#c62828",
      html: `${row.personaCodigo} — ${row.personaNombre}<br>${money(row.valor)} · planilla ${row.periodoTexto}`
    });
    if (!r.isConfirmed) return;
    try {
      const { data } = await axiosClient.delete(`/otros-descuentos/${row.id}`);
      cargar();
      Swal.fire({ icon: data.data?.aviso ? "warning" : "success", title: "Descuento eliminado", text: data.data?.aviso || "" });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar.", "error");
    }
  };

  const filas = useMemo(() => rows.map((r) => ({
    ...r,
    aplicaTexto: APLICA.find((a) => a.valor === Number(r.tipoManejo))?.texto || r.manejoDescripcion,
    tipoTexto: r.tipoDescuentoDescripcion || r.tipoDescuentoNombre
  })), [rows]);

  const columns = [
    { key: "periodoTexto", label: "Planilla", render: (r) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{r.periodoTexto}</Typography> },
    { key: "aplicaTexto", label: "Aplica a" },
    { key: "personaCodigo", label: "Código" },
    { key: "personaNombre", label: "Nombre" },
    { key: "tipoTexto", label: "Tipo descuento" },
    { key: "valor", label: "Valor", align: "right", render: (r) => money(r.valor) },
    { key: "motivo", label: "Motivo" },
    { key: "estado", label: "Estado", render: (r) => <Chip size="small" label={r.estado} color={r.estado === "ACTIVO" ? "success" : "default"} variant={r.estado === "ACTIVO" ? "filled" : "outlined"} /> },
    { key: "planillaEstado", label: "Planilla", render: (r) => <Chip size="small" variant="outlined" label={r.planillaEstado} color={COLOR_PLANILLA[r.planillaEstado] || "default"} /> }
  ];

  const editable = (r) => r.planillaEstado !== "CERRADA";

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Otros descuentos"
        subtitle="Descuentos extraordinarios o de última hora para la nómina de empleados régimen o de jubilados"
        actions={canCreate(user) ? <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNuevo}>Nuevo</Button> : null}
      />
      <Alert severity="info">
        Cada descuento se aplica a la <b>planilla del mes elegido</b>. Se agrega solo cada vez que se genera esa planilla
        (también al reversar y generar de nuevo). Si la planilla ya está <b>GENERADA</b>, revérsela y genérela otra vez para que tome los cambios.
        Con la planilla <b>CERRADA</b> el descuento ya no se puede modificar.
      </Alert>
      <Paper sx={{ p: 2 }}>
        <DataTable
          loading={cargando}
          columns={columns}
          rows={filas}
          search={search}
          onSearch={setSearch}
          filterKeys={["personaCodigo", "personaNombre", "periodoTexto", "periodo", "aplicaTexto", "tipoTexto", "motivo", "estado"]}
          codeKey="personaCodigo"
          searchPlaceholder="Buscar por código, nombre, planilla (ej. NOV 2026) o motivo"
          emptyMessage="No hay otros descuentos registrados."
          actions={[
            { label: "Editar", icon: <EditIcon />, onClick: abrirEditar, visible: (r) => canEdit(user) && editable(r) },
            { label: "Eliminar", icon: <DeleteIcon />, onClick: eliminar, visible: (r) => canDelete(user) && editable(r) }
          ]}
        />
      </Paper>

      <Dialog open={dialogo} onClose={() => setDialogo(false)} fullWidth maxWidth="md">
        <DialogTitle>{editando ? "Editar descuento" : "Nuevo descuento"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Aplica a *</Typography>
              <ToggleButtonGroup exclusive color="primary" value={form.tipoManejo}
                onChange={(_, v) => v && setForm((f) => ({ ...f, tipoManejo: v, idPersona: null }))}>
                {APLICA.map((a) => <ToggleButton key={a.valor} value={a.valor} sx={{ px: 3 }}>{a.texto}</ToggleButton>)}
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={personas}
                value={personaSel}
                onChange={(_, v) => setForm((f) => ({ ...f, idPersona: v ? v.id : null }))}
                getOptionLabel={(o) => `${o.codigo} — ${o.nombre}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                autoHighlight
                autoSelect
                filterOptions={(opts, { inputValue }) => {
                  const t = inputValue.trim().toLowerCase();
                  if (!t) return opts.slice(0, 50);
                  const palabras = t.split(/\s+/);
                  const lista = opts.filter((o) => palabras.every((w) => `${o.codigo} ${o.nombre}`.toLowerCase().includes(w)));
                  return [...lista.filter((o) => String(o.codigo) === t), ...lista.filter((o) => String(o.codigo) !== t)].slice(0, 50);
                }}
                renderInput={(p) => <TextField {...p} label={form.tipoManejo === 1 ? "Empleado (código o nombre) *" : "Jubilado (código o nombre) *"} />}
                noOptionsText="Sin resultados"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Planilla a aplicar *" placeholder="AAAAMM" value={form.periodo} fullWidth
                inputProps={{ inputMode: "numeric", maxLength: 6 }}
                onChange={(e) => setForm((f) => ({ ...f, periodo: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                error={form.periodo.length === 6 && !nombrePeriodo(form.periodo)}
                helperText={nombrePeriodo(form.periodo) || (form.periodo.length === 6 ? "Período no válido" : "Ej. 202610")}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de descuento *</InputLabel>
                <Select label="Tipo de descuento *" value={form.tipoDescuento} onChange={(e) => setForm((f) => ({ ...f, tipoDescuento: e.target.value }))}>
                  {tipos.map((t) => <MenuItem key={t.id} value={t.id}>{t.tipoDescuento} - {t.descripcion}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={editando ? 3 : 6}>
              <TextField label="Valor *" type="number" inputProps={{ min: 0, step: "0.01" }} value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} fullWidth />
            </Grid>
            {editando && (
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select label="Estado" value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}>
                    <MenuItem value="ACTIVO">ACTIVO</MenuItem>
                    <MenuItem value="ANULADO">ANULADO (no se aplica)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField label="Motivo *" value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value.toUpperCase() }))} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ p: 1.5, bgcolor: "#F4F6F8", borderRadius: 1 }}>
                <Typography variant="body2">
                  Se descontará <b>{money(form.valor)}</b> a <b>{personaSel ? `${personaSel.codigo} — ${personaSel.nombre}` : "—"}</b> en la
                  <b> {APLICA.find((a) => a.valor === form.tipoManejo)?.planilla} {form.periodo}{nombrePeriodo(form.periodo) ? ` (${nombrePeriodo(form.periodo)})` : ""}</b>.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          {faltan && <Typography variant="caption" color="text.secondary" sx={{ mr: "auto", pl: 1 }}>Complete los campos obligatorios para guardar</Typography>}
          <Button onClick={() => setDialogo(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={faltan || guardando}>{guardando ? "Guardando..." : "Guardar"}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default OtrosDescuentosPage;
