import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PercentIcon from "@mui/icons-material/Percent";
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
import EstadoCuentaBeneficiario from "./EstadoCuentaBeneficiario";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canDelete, canEdit } from "../../utils/permissions";

// Solo ESPOSA, HIJO e HIJO_INVALIDEZ cobran por ahora; los demás se registran
// hasta que se defina su regla de pago.
const PARENTESCOS_PAGO = ["ESPOSA", "HIJO", "HIJO_INVALIDEZ"];
const PARENTESCOS = [...PARENTESCOS_PAGO, "ESPOSO", "CONVIVIENTE", "HERMANO", "HERMANA", "SOBRINO", "SOBRINA",
  "TIO", "TIA", "PRIMO", "PRIMA", "ABUELO", "ABUELA", "NIETO", "NIETA", "AMIGO", "VECINO", "OTRO"];
const PARENTESCOS_TUTOR = ["MADRE", "PADRE", "ABUELA", "ABUELO", "TIA", "TIO", "HERMANA", "HERMANO", "PRIMA", "PRIMO",
  "SOBRINA", "SOBRINO", "MADRINA", "PADRINO", "AMIGA", "AMIGO", "VECINA", "VECINO", "OTRO"];
const opcionParentesco = (p, ocupadaEsposa) => (
  <MenuItem key={p} value={p} disabled={p === "ESPOSA" && ocupadaEsposa}>
    {p}{p === "ESPOSA" && ocupadaEsposa ? " (ya existe)" : ""}
    {!PARENTESCOS_PAGO.includes(p) && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>solo registro</Typography>}
  </MenuItem>
);
// Parentesco del tutor: se elige de la lista o se escribe otro.
const CampoParentescoTutor = ({ value, onChange, md = 6 }) => (
  <Grid item xs={12} md={md}>
    <Autocomplete
      freeSolo autoSelect options={PARENTESCOS_TUTOR} value={value || ""}
      onChange={(_, v) => onChange(String(v || "").toUpperCase())}
      onInputChange={(_, v, reason) => { if (reason === "input") onChange(String(v || "").toUpperCase()); }}
      renderInput={(p) => <TextField {...p} label="Parentesco con el menor" />}
    />
  </Grid>
);
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

const pagoVacio = { formaPago: "", idBanco: "", tipoCuenta: "", cuenta: "" };
const nuevoForm = () => ({ tipoParentesco: "", nombres: "", apellidos: "", dpi: "", fechaNacimiento: "", porcentaje: "", telefono: "", correo: "", ...pagoVacio });
const nuevaTutora = () => ({ nombres: "", apellidos: "", dpi: "", parentesco: "", telefono: "", ...pagoVacio });
const FORMAS_PAGO = ["ABONO CUENTA", "CHEQUE"];
const TIPOS_CUENTA = ["AHORRO", "MONETARIA"];
// Mensaje si faltan datos de la cuenta (solo con ABONO CUENTA).
const errorPago = (o) => (o.formaPago === "ABONO CUENTA" && (!o.idBanco || !o.tipoCuenta || !String(o.cuenta || "").trim())
  ? "Con ABONO CUENTA indique banco, tipo y número de cuenta" : null);

// Datos de pago (dónde se deposita). Se usa para el beneficiario y para la tutora.
const CamposPago = ({ valor, onChange, bancos, titulo }) => {
  const set = (k) => (e) => onChange({ ...valor, [k]: k === "cuenta" ? e.target.value.toUpperCase() : e.target.value });
  const cuenta = valor.formaPago === "ABONO CUENTA";
  return (
    <>
      <Grid item xs={12}><Typography variant="subtitle2" sx={{ fontWeight: 700, color: PRIMARIO, mt: 0.5 }}>{titulo}</Typography></Grid>
      <Grid item xs={12} md={3}>
        <FormControl fullWidth>
          <InputLabel>Forma de pago</InputLabel>
          <Select label="Forma de pago" value={valor.formaPago || ""} onChange={(e) => onChange({ ...valor, formaPago: e.target.value })}>
            <MenuItem value="">(pendiente)</MenuItem>
            {FORMAS_PAGO.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={3}>
        <FormControl fullWidth disabled={!cuenta}>
          <InputLabel>{cuenta ? "Banco *" : "Banco"}</InputLabel>
          <Select label={cuenta ? "Banco *" : "Banco"} value={valor.idBanco || ""} onChange={set("idBanco")}>
            {(bancos || []).map((b) => <MenuItem key={b.id} value={b.id}>{b.descripcion}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={3}>
        <FormControl fullWidth disabled={!cuenta}>
          <InputLabel>{cuenta ? "Tipo de cuenta *" : "Tipo de cuenta"}</InputLabel>
          <Select label={cuenta ? "Tipo de cuenta *" : "Tipo de cuenta"} value={valor.tipoCuenta || ""} onChange={set("tipoCuenta")}>
            {TIPOS_CUENTA.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={3}><TextField label={cuenta ? "No. de cuenta *" : "No. de cuenta"} value={valor.cuenta || ""} onChange={set("cuenta")} disabled={!cuenta} fullWidth /></Grid>
    </>
  );
};
const pagoDe = (o) => ({ formaPago: o?.formaPago || "", idBanco: o?.idBanco || "", tipoCuenta: o?.tipoCuenta || "", cuenta: o?.cuenta || "" });
const soloFecha = (v) => (v ? String(v).slice(0, 10) : "");

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
  const [bancos, setBancos] = useState([]);
  useEffect(() => {
    axiosClient.get("/catalogos/bancos").then(({ data }) => setBancos(data.data || [])).catch(() => setBancos([]));
  }, []);

  // --- Edición de un beneficiario ya registrado ---
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(nuevoForm());
  const [editTutora, setEditTutora] = useState(nuevaTutora());
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  // --- Ajuste de porcentajes (todos juntos, deben sumar 100) ---
  const [pctEdit, setPctEdit] = useState(null); // { [id]: "50" } mientras se edita
  const [estadoCuentaId, setEstadoCuentaId] = useState(null);

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
    setPctEdit(null);
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
    if (errorPago(form)) { Swal.fire("Validación", errorPago(form), "warning"); return; }
    setNuevos((prev) => [...prev, {
      ...pagoDe(form),
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
    if (errorPago(tutoraForm)) { Swal.fire("Validación", `Tutora: ${errorPago(tutoraForm)}`, "warning"); return; }
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

  // ---- Editar beneficiario registrado ----
  const abrirEditar = (b) => {
    setEditId(b.id);
    setEditForm({
      tipoParentesco: b.tipoParentesco || "", nombres: b.nombres || "", apellidos: b.apellidos || "", dpi: b.dpi || "",
      fechaNacimiento: soloFecha(b.fechaNacimiento), porcentaje: String(b.porcentaje ?? ""), telefono: b.telefono || "", correo: b.correo || "",
      ...pagoDe(b)
    });
    const t = (b.tutores || []).filter((x) => !x.estado || x.estado === "VIGENTE").slice(-1)[0];
    setEditTutora(t ? { nombres: t.nombres || "", apellidos: t.apellidos || "", dpi: t.dpi || "", parentesco: t.parentesco || "", telefono: t.telefono || "", ...pagoDe(t) } : nuevaTutora());
  };
  const setE = (k, upper) => (e) => setEditForm({ ...editForm, [k]: upper ? e.target.value.toUpperCase() : e.target.value });
  const setET = (k, upper) => (e) => setEditTutora({ ...editTutora, [k]: upper ? e.target.value.toUpperCase() : e.target.value });
  const editMenor = editForm.fechaNacimiento ? edad(editForm.fechaNacimiento) < 18 : false;
  const editTieneTutora = Boolean(editTutora.apellidos || editTutora.dpi);
  const otraEsposa = existentes.some((b) => b.id !== editId && b.tipoParentesco === "ESPOSA");
  const errEdit = useMemo(() => {
    const err = {};
    if (!editForm.apellidos.trim()) err.apellidos = "Obligatorio";
    if (!esDpi(editForm.dpi)) err.dpi = "Debe tener 13 dígitos";
    else if (existentes.some((b) => b.id !== editId && b.dpi === editForm.dpi.trim())) err.dpi = "DPI de otro beneficiario";
    if (!editForm.fechaNacimiento) err.fechaNacimiento = "Obligatoria";
    else if (new Date(editForm.fechaNacimiento) > new Date()) err.fechaNacimiento = "No puede ser futura";
    if (!esCorreo(editForm.correo)) err.correo = "Correo inválido";
    if (editMenor && (!editTutora.apellidos.trim() || !esDpi(editTutora.dpi))) err.tutora = "Es menor: la tutora requiere apellidos y DPI de 13 dígitos";
    if (!editMenor && editTieneTutora && (!editTutora.apellidos.trim() || !esDpi(editTutora.dpi))) err.tutora = "Complete apellidos y DPI de la tutora (o deje sus datos vacíos)";
    if (errorPago(editForm)) err.pago = errorPago(editForm);
    if ((editMenor || editTieneTutora) && errorPago(editTutora)) err.pagoTutora = `Tutora: ${errorPago(editTutora)}`;
    return err;
  }, [editForm, editTutora, editMenor, editTieneTutora, existentes, editId]);

  const guardarEdicion = async () => {
    if (!editForm.tipoParentesco) { Swal.fire("Validación", "Seleccione el parentesco.", "warning"); return; }
    if (Object.keys(errEdit).length) { Swal.fire("Validación", Object.values(errEdit)[0], "warning"); return; }
    try {
      setGuardandoEdit(true);
      const { data } = await axiosClient.put(`/beneficiarios/${editId}`, {
        ...editForm, tutora: editMenor || editTieneTutora ? editTutora : null
      });
      setExistentes(data.data || []);
      setEditId(null);
      Swal.fire("Listo", "Beneficiario actualizado.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible actualizar el beneficiario.", "error");
    } finally { setGuardandoEdit(false); }
  };

  // ---- Ajustar porcentajes ----
  const cobrando = existentes.some((b) => ["ACTIVO", "SUSPENDIDO"].includes(String(b.estado).toUpperCase()));
  const totalPctEdit = pctEdit ? Math.round(Object.values(pctEdit).reduce((s, v) => s + Number(v || 0), 0) * 100) / 100 : 0;
  const iniciarPct = () => setPctEdit(Object.fromEntries(existentes.map((b) => [b.id, String(Number(b.porcentaje))])));
  const guardarPct = async () => {
    if (totalPctEdit !== 100) { Swal.fire("Validación", `La suma debe ser 100.00 (actual: ${totalPctEdit.toFixed(2)}).`, "warning"); return; }
    try {
      const { data } = await axiosClient.put(`/beneficiarios/jubilado/${jubilado.id}/porcentajes`, {
        porcentajes: Object.entries(pctEdit).map(([id, porcentaje]) => ({ id: Number(id), porcentaje: Number(porcentaje) }))
      });
      setExistentes(data.data || []);
      setPctEdit(null);
      Swal.fire("Listo", "Porcentajes actualizados.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible actualizar los porcentajes.", "error");
    }
  };

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
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="h6" sx={{ color: PRIMARIO }}>Beneficiarios registrados</Typography>
            {canEdit(user) && existentes.length > 0 && !cobrando && (
              pctEdit ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={`Total: ${totalPctEdit.toFixed(2)}%`} color={totalPctEdit === 100 ? "success" : "error"} sx={{ fontWeight: 700 }} />
                  <Button onClick={() => setPctEdit(null)}>Cancelar</Button>
                  <Button variant="contained" startIcon={<SaveIcon />} disabled={totalPctEdit !== 100} onClick={guardarPct}>Guardar porcentajes</Button>
                </Stack>
              ) : (
                <Button variant="outlined" startIcon={<PercentIcon />} onClick={iniciarPct}>Ajustar porcentajes</Button>
              )
            )}
          </Stack>
          {cargando ? <CircularProgress size={22} /> : existentes.length === 0 ? (
            <Typography color="text.secondary">Este jubilado aún no tiene beneficiarios registrados.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Parentesco</TableCell><TableCell>Nombre</TableCell><TableCell>DPI</TableCell>
                  <TableCell align="right">%</TableCell><TableCell>Estado</TableCell><TableCell>Tutora</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {existentes.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.tipoParentesco}</TableCell>
                    <TableCell>{`${b.nombres || ""} ${b.apellidos}`.trim()}{b.esMenor && <Chip size="small" label="MENOR" color="warning" sx={{ ml: 1 }} />}</TableCell>
                    <TableCell>{b.dpi}</TableCell>
                    <TableCell align="right">
                      {pctEdit ? (
                        <TextField size="small" type="number" value={pctEdit[b.id] ?? ""} sx={{ width: 100 }}
                          inputProps={{ min: 0, max: 100, step: "0.01", style: { textAlign: "right" } }}
                          onChange={(e) => setPctEdit((p) => ({ ...p, [b.id]: e.target.value }))} />
                      ) : Number(b.porcentaje).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={b.estado} />
                      {(() => {
                        const t = (b.tutores || []).slice(-1)[0];
                        const p = b.esMenor && t ? t : b;
                        const txt = p.formaPago === "ABONO CUENTA" ? `${p.bancoNombre || ""} ${p.cuenta || ""}`.trim() : p.formaPago;
                        return (
                          <Typography variant="caption" sx={{ display: "block" }} color={txt ? "text.secondary" : "error"}>
                            {txt ? `${b.esMenor && t ? "Tutora: " : ""}${txt}` : "Sin datos de pago"}
                          </Typography>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(b.tutores || []).length
                        ? <Chip size="small" icon={<CheckCircleIcon />} label={`${b.tutores[b.tutores.length - 1].nombres || ""} ${b.tutores[b.tutores.length - 1].apellidos || ""}`.trim() || "Sí"} color="success" />
                        : (b.esMenor ? <Chip size="small" color="error" label="Falta tutora" /> : "N/A")}
                    </TableCell>
                    {(
                      <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                        <Button size="small" startIcon={<ReceiptLongIcon />} onClick={() => setEstadoCuentaId(b.id)}>Estado de cuenta</Button>
                        {canEdit(user) && <Button size="small" startIcon={<EditIcon />} onClick={() => abrirEditar(b)} disabled={Boolean(pctEdit)}>Editar</Button>}
                        {canDelete(user) && <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => eliminarExistente(b)} disabled={Boolean(pctEdit)}>Eliminar</Button>}
                      </TableCell>
                    )}
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
          Este jubilado ya tiene beneficiarios. Use <b>Editar</b> para corregir los datos de un beneficiario o de su tutora, y
          <b> Ajustar porcentajes</b> para cambiar el reparto (deben sumar 100%).
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
                  {PARENTESCOS.map((p) => opcionParentesco(p, hayEsposa))}
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
            {!(form.fechaNacimiento && edad(form.fechaNacimiento) < 18) && (
              <CamposPago titulo="Datos de pago (cuenta del beneficiario)" valor={pagoDe(form)} bancos={bancos} onChange={(v) => setForm({ ...form, ...v })} />
            )}
            {form.fechaNacimiento && edad(form.fechaNacimiento) < 18 && (
              <Grid item xs={12}><Alert severity="warning">Es menor de edad: después de agregarlo deberá asignarle una tutora antes de guardar. Su pago se deposita en la cuenta de la tutora.</Alert></Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalBen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={agregarBeneficiario}>Agregar</Button>
        </DialogActions>
      </Dialog>

      <EstadoCuentaBeneficiario idBeneficiario={estadoCuentaId} onClose={() => setEstadoCuentaId(null)} />

      {/* Modal: editar beneficiario registrado (y su tutora) */}
      <Dialog open={editId !== null} onClose={() => setEditId(null)} fullWidth maxWidth="md">
        <DialogTitle>Editar beneficiario</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Parentesco *</InputLabel>
                <Select label="Parentesco *" value={editForm.tipoParentesco} onChange={setE("tipoParentesco")}>
                  {PARENTESCOS.map((p) => opcionParentesco(p, otraEsposa))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}><TextField label="Nombres" value={editForm.nombres} onChange={setE("nombres", true)} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="Apellidos *" value={editForm.apellidos} onChange={setE("apellidos", true)} error={!!errEdit.apellidos} helperText={errEdit.apellidos} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="DPI *" value={editForm.dpi} onChange={setE("dpi")} error={!!errEdit.dpi} helperText={errEdit.dpi || "13 dígitos"} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="Fecha nacimiento *" type="date" value={editForm.fechaNacimiento} onChange={setE("fechaNacimiento")} error={!!errEdit.fechaNacimiento} helperText={errEdit.fechaNacimiento || (editForm.fechaNacimiento ? `Edad: ${edad(editForm.fechaNacimiento)} años` : "")} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={4}><TextField label="Porcentaje" value={editForm.porcentaje} fullWidth disabled helperText="Se cambia con «Ajustar porcentajes»" /></Grid>
            <Grid item xs={12} md={6}><TextField label="Teléfono" value={editForm.telefono} onChange={setE("telefono")} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Correo" value={editForm.correo} onChange={setE("correo")} error={!!errEdit.correo} helperText={errEdit.correo} fullWidth /></Grid>
            {!editMenor && (
              <CamposPago titulo="Datos de pago (cuenta del beneficiario)" valor={pagoDe(editForm)} bancos={bancos} onChange={(v) => setEditForm({ ...editForm, ...v })} />
            )}
            {(editMenor || editTieneTutora) && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARIO, mt: 1 }}>
                    Tutora {editMenor ? "(obligatoria: es menor de edad)" : ""}
                  </Typography>
                  {errEdit.tutora && <Typography variant="caption" color="error">{errEdit.tutora}</Typography>}
                </Grid>
                <Grid item xs={12} md={6}><TextField label="Nombres" value={editTutora.nombres} onChange={setET("nombres", true)} fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField label="Apellidos *" value={editTutora.apellidos} onChange={setET("apellidos", true)} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="DPI *" value={editTutora.dpi} onChange={setET("dpi")} error={!!editTutora.dpi && !esDpi(editTutora.dpi)} helperText="13 dígitos" fullWidth /></Grid>
                <CampoParentescoTutor md={4} value={editTutora.parentesco} onChange={(v) => setEditTutora((t) => ({ ...t, parentesco: v }))} />
                <Grid item xs={12} md={4}><TextField label="Teléfono" value={editTutora.telefono} onChange={setET("telefono")} fullWidth /></Grid>
                <CamposPago titulo="Datos de pago de la tutora (aquí se deposita lo del menor)" valor={pagoDe(editTutora)} bancos={bancos} onChange={(v) => setEditTutora({ ...editTutora, ...v })} />
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Cancelar</Button>
          <Button variant="contained" startIcon={guardandoEdit ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} disabled={guardandoEdit} onClick={guardarEdicion}>Guardar cambios</Button>
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
            <CampoParentescoTutor value={tutoraForm.parentesco} onChange={(v) => setTutoraForm((t) => ({ ...t, parentesco: v }))} />
            <Grid item xs={12} md={6}><TextField label="Teléfono" value={tutoraForm.telefono} onChange={setT("telefono")} fullWidth /></Grid>
            <CamposPago titulo="Datos de pago (cuenta de la tutora: aquí se deposita lo del menor)" valor={pagoDe(tutoraForm)} bancos={bancos} onChange={(v) => setTutoraForm({ ...tutoraForm, ...v })} />
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
