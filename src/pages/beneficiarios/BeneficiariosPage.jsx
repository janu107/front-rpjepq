import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, Grid, InputLabel, MenuItem, Paper, Select,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canDelete } from "../../utils/permissions";

const PARENTESCOS = ["ESPOSA", "HIJO", "HIJO_INVALIDEZ"];
const PRIMARIO = "#1F4E79";

const edad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const n = new Date(fechaNac);
  let e = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) e -= 1;
  return e;
};
const esDpi = (v) => /^[0-9]{13}$/.test(String(v || "").trim());
const esCorreo = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

const nuevoForm = () => ({ tipoParentesco: "", nombres: "", apellidos: "", dpi: "", fechaNacimiento: "", porcentaje: "", telefono: "", correo: "" });
const nuevaTutora = () => ({ nombres: "", apellidos: "", dpi: "", parentesco: "", telefono: "" });

const BeneficiariosPage = () => {
  const { user } = useAuth();

  // --- Autocomplete de jubilado ---
  const [jubInput, setJubInput] = useState("");
  const [jubOpts, setJubOpts] = useState([]);
  const [jubLoading, setJubLoading] = useState(false);
  const [jubilado, setJubilado] = useState(null);
  const debounceRef = useRef(null);

  // --- Beneficiarios existentes (guardados) ---
  const [existentes, setExistentes] = useState([]);
  const [cargando, setCargando] = useState(false);

  // --- Beneficiarios nuevos (locales, no guardados) ---
  const [nuevos, setNuevos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  // --- Modales ---
  const [modalBen, setModalBen] = useState(false);
  const [form, setForm] = useState(nuevoForm());
  const [modalTutora, setModalTutora] = useState(false);
  const [tutoraIdx, setTutoraIdx] = useState(null);
  const [tutoraForm, setTutoraForm] = useState(nuevaTutora());

  const soloLectura = !canCreate(user);

  // Autocomplete con debounce. Un término numérico (código) se acepta desde 1 carácter.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = jubInput.trim();
    const minimo = /^\d+$/.test(term) ? 1 : 3;
    if (term.length < minimo) { setJubOpts([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        setJubLoading(true);
        const { data } = await axiosClient.get("/beneficiarios/jubilados/buscar", { params: { q: term } });
        setJubOpts(data.data || []);
      } catch { setJubOpts([]); } finally { setJubLoading(false); }
    }, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [jubInput]);

  const cargarExistentes = async (idJubilado) => {
    try {
      setCargando(true);
      const { data } = await axiosClient.get(`/beneficiarios/jubilado/${idJubilado}`);
      setExistentes(data.data || []);
    } catch { setExistentes([]); } finally { setCargando(false); }
  };

  const seleccionarJubilado = (jub) => {
    setJubilado(jub);
    setNuevos([]);
    setExistentes([]);
    if (jub) cargarExistentes(jub.id);
  };

  // --- % total y reglas de los nuevos ---
  const totalPct = useMemo(
    () => Math.round(nuevos.reduce((s, b) => s + Number(b.porcentaje || 0), 0) * 100) / 100,
    [nuevos]
  );
  const hayEsposa = useMemo(() => nuevos.some((b) => b.tipoParentesco === "ESPOSA"), [nuevos]);
  const pctOk = totalPct === 100;

  // --- Modal beneficiario ---
  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setFUpper = (k) => (e) => setForm({ ...form, [k]: e.target.value.toUpperCase() });

  const errModal = useMemo(() => {
    const err = {};
    if (!form.apellidos.trim()) err.apellidos = "Obligatorio";
    if (form.dpi && !esDpi(form.dpi)) err.dpi = "Debe tener 13 dígitos";
    if (form.dpi && nuevos.some((b) => b.dpi === form.dpi.trim())) err.dpi = "DPI repetido en la lista";
    if (form.fechaNacimiento && new Date(form.fechaNacimiento) > new Date()) err.fechaNacimiento = "No puede ser futura";
    const p = Number(form.porcentaje);
    if (form.porcentaje !== "" && (Number.isNaN(p) || p <= 0 || p > 100)) err.porcentaje = "Entre 0.01 y 100";
    if (!esCorreo(form.correo)) err.correo = "Correo inválido";
    return err;
  }, [form, nuevos]);

  const abrirModalBen = () => { setForm(nuevoForm()); setModalBen(true); };

  const agregarBeneficiario = () => {
    if (!form.tipoParentesco) { Swal.fire("Validación", "Seleccione el parentesco.", "warning"); return; }
    if (!form.apellidos.trim() || !esDpi(form.dpi) || !form.fechaNacimiento) {
      Swal.fire("Validación", "Complete apellidos, DPI (13 dígitos) y fecha de nacimiento.", "warning"); return;
    }
    if (Object.keys(errModal).length) { Swal.fire("Validación", "Corrija los campos marcados.", "warning"); return; }
    const p = Number(form.porcentaje);
    if (Number.isNaN(p) || p <= 0 || p > 100) { Swal.fire("Validación", "Porcentaje entre 0.01 y 100.", "warning"); return; }
    setNuevos((prev) => [...prev, {
      tipoParentesco: form.tipoParentesco,
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      dpi: form.dpi.trim(),
      fechaNacimiento: form.fechaNacimiento,
      porcentaje: p,
      telefono: form.telefono.trim(),
      correo: form.correo.trim(),
      tutora: null
    }]);
    setModalBen(false);
  };

  const quitarNuevo = (idx) => setNuevos((prev) => prev.filter((_, i) => i !== idx));

  // --- Modal tutora ---
  const abrirModalTutora = (idx) => {
    setTutoraIdx(idx);
    setTutoraForm(nuevos[idx].tutora ? { ...nuevos[idx].tutora } : nuevaTutora());
    setModalTutora(true);
  };
  const setT = (k) => (e) => setTutoraForm({ ...tutoraForm, [k]: e.target.value });
  const setTUpper = (k) => (e) => setTutoraForm({ ...tutoraForm, [k]: e.target.value.toUpperCase() });
  const guardarTutora = () => {
    if (!tutoraForm.apellidos.trim() || !esDpi(tutoraForm.dpi)) {
      Swal.fire("Validación", "La tutora requiere apellidos y DPI de 13 dígitos.", "warning"); return;
    }
    setNuevos((prev) => prev.map((b, i) => (i === tutoraIdx ? { ...b, tutora: { ...tutoraForm } } : b)));
    setModalTutora(false);
  };

  // --- Guardar todo (lote) ---
  const guardarTodo = async () => {
    if (!jubilado) return;
    if (!nuevos.length) { Swal.fire("Validación", "Agregue al menos un beneficiario.", "warning"); return; }
    if (!pctOk) { Swal.fire("Validación", `La suma de porcentajes debe ser 100.00 (actual: ${totalPct.toFixed(2)}).`, "warning"); return; }
    if (nuevos.filter((b) => b.tipoParentesco === "ESPOSA").length > 1) { Swal.fire("Validación", "Solo se permite una ESPOSA.", "warning"); return; }
    const menorSinTutora = nuevos.find((b) => edad(b.fechaNacimiento) < 18 && !b.tutora);
    if (menorSinTutora) { Swal.fire("Validación", `El beneficiario menor ${menorSinTutora.apellidos} requiere tutora.`, "warning"); return; }

    try {
      setGuardando(true);
      await axiosClient.post("/beneficiarios/registrar", { idJubilado: jubilado.id, beneficiarios: nuevos });
      Swal.fire("Beneficiarios guardados", "El registro se guardó correctamente.", "success");
      setNuevos([]);
      cargarExistentes(jubilado.id);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar los beneficiarios.", "error");
    } finally { setGuardando(false); }
  };

  const eliminarExistente = async (row) => {
    const r = await Swal.fire({ title: "Eliminar beneficiario", text: `${row.nombres || ""} ${row.apellidos}`.trim(), icon: "warning", showCancelButton: true, confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar", confirmButtonColor: PRIMARIO });
    if (!r.isConfirmed) return;
    try {
      await axiosClient.delete(`/beneficiarios/${row.id}`);
      Swal.fire("Listo", "Beneficiario eliminado.", "success");
      cargarExistentes(jubilado.id);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar.", "error");
    }
  };

  const bloqueadoPorJubilado = jubilado && jubilado.estadoPago && jubilado.estadoPago !== "ACTIVO";

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Beneficiarios" subtitle="Registro de beneficiarios de jubilados (Jubilados y Pensiones)" />

      {/* Selección de jubilado */}
      <Paper sx={{ p: 2.5 }}>
        <Autocomplete
          options={jubOpts}
          loading={jubLoading}
          value={jubilado}
          onChange={(_, val) => seleccionarJubilado(val)}
          onInputChange={(_, val, reason) => { if (reason === "input") setJubInput(val); }}
          getOptionLabel={(o) => (o ? `${o.idJubilado} - ${o.nombreCompleto} — ${o.dpi}` : "")}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          noOptionsText={jubInput.trim().length < (/^\d+$/.test(jubInput.trim()) ? 1 : 3) ? "Escriba al menos 3 caracteres (o el código)" : "Sin resultados"}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Buscar jubilado por código, nombre o DPI"
              placeholder="Código, nombre o DPI"
              InputProps={{ ...params.InputProps, endAdornment: (<>{jubLoading ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>) }}
            />
          )}
        />

        {jubilado && (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={5}><TextField label="Jubilado" value={jubilado.nombreCompleto} fullWidth InputProps={{ readOnly: true }} variant="filled" /></Grid>
            <Grid item xs={6} md={3}><TextField label="DPI" value={jubilado.dpi || ""} fullWidth InputProps={{ readOnly: true }} variant="filled" /></Grid>
            <Grid item xs={6} md={2}><TextField label="Estado" value={jubilado.estado || ""} fullWidth InputProps={{ readOnly: true }} variant="filled" /></Grid>
            <Grid item xs={6} md={2}><TextField label="Estado de pago" value={jubilado.estadoPago || ""} fullWidth InputProps={{ readOnly: true }} variant="filled" /></Grid>
          </Grid>
        )}
        {bloqueadoPorJubilado && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Este jubilado está en estado <b>{jubilado.estadoPago}</b>. Solo consulta de beneficiarios.
          </Alert>
        )}
      </Paper>

      {/* Beneficiarios existentes */}
      {jubilado && (
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 1.5, color: PRIMARIO }}>Beneficiarios registrados</Typography>
          {cargando ? <CircularProgress size={22} /> : existentes.length === 0 ? (
            <Typography color="text.secondary">Este jubilado aún no tiene beneficiarios registrados.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Parentesco</TableCell><TableCell>Nombre</TableCell><TableCell>DPI</TableCell>
                  <TableCell align="right">%</TableCell><TableCell>Estado</TableCell><TableCell>Tutora</TableCell>
                  {canDelete(user) && <TableCell align="center">Acción</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {existentes.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.tipoParentesco}</TableCell>
                    <TableCell>{`${b.nombres || ""} ${b.apellidos}`.trim()}{b.esMenor && <Chip size="small" label="MENOR" color="warning" sx={{ ml: 1 }} />}</TableCell>
                    <TableCell>{b.dpi}</TableCell>
                    <TableCell align="right">{Number(b.porcentaje).toFixed(2)}</TableCell>
                    <TableCell><Chip size="small" label={b.estado} /></TableCell>
                    <TableCell>{(b.tutores || []).length ? <Chip size="small" icon={<CheckCircleIcon />} label="Sí" color="success" /> : (b.esMenor ? "—" : "N/A")}</TableCell>
                    {canDelete(user) && <TableCell align="center"><Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => eliminarExistente(b)}>Eliminar</Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}

      {/* Alta de nuevos beneficiarios (solo si no hay existentes) */}
      {jubilado && !soloLectura && !bloqueadoPorJubilado && existentes.length === 0 && (
        <Paper sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h6" sx={{ color: PRIMARIO }}>Agregar beneficiarios</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirModalBen}>Agregar</Button>
          </Stack>

          {nuevos.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Parentesco</TableCell><TableCell>Nombre</TableCell><TableCell>DPI</TableCell>
                  <TableCell align="right">%</TableCell><TableCell>Menor / Tutora</TableCell><TableCell align="center">Quitar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nuevos.map((b, idx) => {
                  const menor = edad(b.fechaNacimiento) < 18;
                  return (
                    <TableRow key={`${b.dpi}-${idx}`}>
                      <TableCell>{b.tipoParentesco}</TableCell>
                      <TableCell>{`${b.nombres} ${b.apellidos}`.trim()}</TableCell>
                      <TableCell>{b.dpi}</TableCell>
                      <TableCell align="right">{Number(b.porcentaje).toFixed(2)}</TableCell>
                      <TableCell>
                        {menor ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" icon={<ChildCareIcon />} label="MENOR" color="warning" />
                            {b.tutora
                              ? <Chip size="small" icon={<CheckCircleIcon />} label="Tiene tutora" color="success" />
                              : <Button size="small" variant="outlined" onClick={() => abrirModalTutora(idx)}>Tutora</Button>}
                          </Stack>
                        ) : "N/A"}
                      </TableCell>
                      <TableCell align="center"><Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => quitarNuevo(idx)} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
            <Chip
              label={`Total: ${totalPct.toFixed(2)}%`}
              color={pctOk ? "success" : "error"}
              icon={pctOk ? <CheckCircleIcon /> : undefined}
              sx={{ fontWeight: 700, fontSize: 14, py: 2 }}
            />
            <Button variant="contained" color="success" startIcon={guardando ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              disabled={guardando || !nuevos.length} onClick={guardarTodo}>
              Guardar todo
            </Button>
          </Stack>
        </Paper>
      )}

      {jubilado && existentes.length > 0 && !soloLectura && (
        <Alert severity="info">
          Este jubilado ya tiene beneficiarios. Para cambiar la distribución, elimine los actuales y vuelva a registrarlos.
        </Alert>
      )}

      {/* Modal: nuevo beneficiario */}
      <Dialog open={modalBen} onClose={() => setModalBen(false)} fullWidth maxWidth="md">
        <DialogTitle>Nuevo beneficiario</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Parentesco *</InputLabel>
                <Select label="Parentesco *" value={form.tipoParentesco} onChange={setF("tipoParentesco")}>
                  {PARENTESCOS.map((p) => <MenuItem key={p} value={p} disabled={p === "ESPOSA" && hayEsposa}>{p}{p === "ESPOSA" && hayEsposa ? " (ya existe)" : ""}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}><TextField label="Nombres" value={form.nombres} onChange={setFUpper("nombres")} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="Apellidos *" value={form.apellidos} onChange={setFUpper("apellidos")} error={!!errModal.apellidos} helperText={errModal.apellidos} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="DPI *" value={form.dpi} onChange={setF("dpi")} error={!!errModal.dpi} helperText={errModal.dpi || "13 dígitos"} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="Fecha nacimiento *" type="date" value={form.fechaNacimiento} onChange={setF("fechaNacimiento")} error={!!errModal.fechaNacimiento} helperText={errModal.fechaNacimiento || (form.fechaNacimiento ? `Edad: ${edad(form.fechaNacimiento)} años` : "")} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="Porcentaje *" type="number" value={form.porcentaje} onChange={setF("porcentaje")} error={!!errModal.porcentaje} helperText={errModal.porcentaje} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Teléfono" value={form.telefono} onChange={setF("telefono")} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Correo" value={form.correo} onChange={setF("correo")} error={!!errModal.correo} helperText={errModal.correo} fullWidth /></Grid>
            {form.fechaNacimiento && edad(form.fechaNacimiento) < 18 && (
              <Grid item xs={12}><Alert severity="warning">Es menor de edad: después de agregarlo deberá asignarle una tutora antes de guardar.</Alert></Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalBen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={agregarBeneficiario}>Agregar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal: tutora */}
      <Dialog open={modalTutora} onClose={() => setModalTutora(false)} fullWidth maxWidth="sm">
        <DialogTitle>Tutora del menor</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}><TextField label="Nombres" value={tutoraForm.nombres} onChange={setTUpper("nombres")} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Apellidos *" value={tutoraForm.apellidos} onChange={setTUpper("apellidos")} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="DPI *" value={tutoraForm.dpi} onChange={setT("dpi")} error={!!tutoraForm.dpi && !esDpi(tutoraForm.dpi)} helperText="13 dígitos" fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Parentesco" value={tutoraForm.parentesco} onChange={setTUpper("parentesco")} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Teléfono" value={tutoraForm.telefono} onChange={setT("telefono")} fullWidth /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalTutora(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarTutora}>Guardar tutora</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default BeneficiariosPage;
