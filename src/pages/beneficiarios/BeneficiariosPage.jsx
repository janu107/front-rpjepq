import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaidIcon from "@mui/icons-material/Paid";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
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

// Cobran el cónyuge (ESPOSA o ESPOSO: viuda o viudo), HIJO e HIJO_INVALIDEZ; los demás
// solo se registran.
const PARENTESCOS_PAGO = ["ESPOSA", "ESPOSO", "HIJO", "HIJO_INVALIDEZ"];
const esConyuge = (p) => p === "ESPOSA" || p === "ESPOSO";
const PARENTESCOS = [...PARENTESCOS_PAGO, "CONVIVIENTE", "HERMANO", "HERMANA", "SOBRINO", "SOBRINA",
  "TIO", "TIA", "PRIMO", "PRIMA", "ABUELO", "ABUELA", "NIETO", "NIETA", "AMIGO", "VECINO", "OTRO"];
const PARENTESCOS_TUTOR = ["MADRE", "PADRE", "ABUELA", "ABUELO", "TIA", "TIO", "HERMANA", "HERMANO", "PRIMA", "PRIMO",
  "SOBRINA", "SOBRINO", "MADRINA", "PADRINO", "AMIGA", "AMIGO", "VECINA", "VECINO", "OTRO"];
const opcionParentesco = (p, ocupadaEsposa) => (
  <MenuItem key={p} value={p} disabled={esConyuge(p) && ocupadaEsposa}>
    {p}{esConyuge(p) && ocupadaEsposa ? " (ya hay cónyuge)" : ""}
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
const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const esHijo = (p) => p === "HIJO" || p === "HIJO_INVALIDEZ";

// Reparto que manda la ley: el cónyuge hasta el 50% de la pensión y los hijos,
// entre todos, hasta el otro 50%. Los montos los dicta el juez; aquí se proponen.
const resumenReparto = (lista, pension) => {
  const mitad = r2(pension / 2);
  const esposa = r2(lista.filter((b) => esConyuge(b.tipoParentesco)).reduce((a, b) => a + Number(b.monto || 0), 0));
  const hijos = r2(lista.filter((b) => esHijo(b.tipoParentesco)).reduce((a, b) => a + Number(b.monto || 0), 0));
  const sinMonto = lista.find((b) => PARENTESCOS_PAGO.includes(b.tipoParentesco) && !(Number(b.monto) > 0));
  let error = null;
  if (!(pension > 0)) error = "El jubilado no tiene pensión registrada";
  else if (esposa > mitad) error = `El cónyuge puede recibir hasta ${fmtQ(mitad)} (50% de la pensión)`;
  else if (hijos > mitad) error = `Los hijos, entre todos, pueden recibir hasta ${fmtQ(mitad)} (50% de la pensión)`;
  else if (sinMonto) error = `Falta el monto de ${sinMonto.apellidos || sinMonto.tipoParentesco}`;
  return { mitad, esposa, hijos, error };
};
// Propuesta: cónyuge 50%; los hijos se reparten el otro 50% en partes iguales.
const proponerMontos = (lista, pension) => {
  const mitad = r2(pension / 2);
  const hijos = lista.filter((b) => esHijo(b.tipoParentesco));
  const parte = hijos.length ? Math.floor((mitad / hijos.length) * 100) / 100 : 0;
  let resto = r2(mitad - parte * hijos.length);
  return lista.map((b) => {
    if (esConyuge(b.tipoParentesco)) return { ...b, monto: mitad };
    if (esHijo(b.tipoParentesco)) { const m = r2(parte + resto); resto = 0; return { ...b, monto: m }; }
    return b;
  });
};
// Monto y % de la pensión enlazados: se escribe cualquiera de los dos y el otro se calcula.
const MontoPct = ({ monto, pension, onChange, ancho = 112 }) => {
  const pct = pension > 0 && monto !== "" && monto !== null && monto !== undefined ? r2((Number(monto) / pension) * 100) : "";
  return (
    <Stack direction="row" spacing={0.75} justifyContent="flex-end">
      <TextField size="small" type="number" label="Q" value={monto ?? ""} sx={{ width: ancho }}
        inputProps={{ min: 0, step: "0.01", style: { textAlign: "right" } }}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
      <TextField size="small" type="number" label="%" value={pct} sx={{ width: 84 }} disabled={!(pension > 0)}
        inputProps={{ min: 0, max: 50, step: "0.01", style: { textAlign: "right" } }}
        onChange={(e) => onChange(e.target.value === "" ? "" : r2((pension * Number(e.target.value)) / 100))} />
    </Stack>
  );
};
const ChipReparto = ({ r }) => (
  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
    <Chip size="small" label={`Cónyuge: ${fmtQ(r.esposa)} de ${fmtQ(r.mitad)}`} color={r.esposa > r.mitad ? "error" : "default"} />
    <Chip size="small" label={`Hijos: ${fmtQ(r.hijos)} de ${fmtQ(r.mitad)}`} color={r.hijos > r.mitad ? "error" : "default"} />
    {r.error ? <Chip size="small" color="error" label={r.error} /> : <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Reparto correcto" />}
  </Stack>
);

const pagoVacio = { formaPago: "", idBanco: "", tipoCuenta: "", cuenta: "" };
const nuevoForm = () => ({ tipoParentesco: "", nombres: "", apellidos: "", dpi: "", fechaNacimiento: "", monto: "", telefono: "", correo: "", ...pagoVacio });
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
  // --- Ajuste de montos (los dicta el juez; se validan entre todos) ---
  const [pctEdit, setPctEdit] = useState(null); // { [id]: "2500" } mientras se edita
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

  // --- Reparto de los nuevos (montos) ---
  const pension = Number(jubilado?.pension || 0);
  const reparto = useMemo(() => resumenReparto(nuevos, pension), [nuevos, pension]);
  const hayEsposa = useMemo(() => nuevos.some((b) => esConyuge(b.tipoParentesco)), [nuevos]);
  const pctOk = !reparto.error;

  // --- Modal beneficiario ---
  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setFUpper = (k) => (e) => setForm({ ...form, [k]: e.target.value.toUpperCase() });

  const errModal = useMemo(() => {
    const err = {};
    if (!form.apellidos.trim()) err.apellidos = "Obligatorio";
    if (form.dpi && !esDpi(form.dpi)) err.dpi = "Debe tener 13 dígitos";
    if (form.dpi && nuevos.some((b) => b.dpi === form.dpi.trim())) err.dpi = "DPI repetido en la lista";
    if (form.fechaNacimiento && new Date(form.fechaNacimiento) > new Date()) err.fechaNacimiento = "No puede ser futura";
    const m = Number(form.monto);
    if (form.monto !== "" && (Number.isNaN(m) || m < 0)) err.monto = "Monto no válido";
    else if (form.monto !== "" && pension > 0 && m > pension / 2) err.monto = `Hasta ${fmtQ(pension / 2)} (50% de la pensión)`;
    if (!esCorreo(form.correo)) err.correo = "Correo inválido";
    return err;
  }, [form, nuevos, pension]);

  const abrirModalBen = () => { setForm(nuevoForm()); setModalBen(true); };

  const agregarBeneficiario = () => {
    if (!form.tipoParentesco) { Swal.fire("Validación", "Seleccione el parentesco.", "warning"); return; }
    if (!form.apellidos.trim() || !esDpi(form.dpi) || !form.fechaNacimiento) {
      Swal.fire("Validación", "Complete apellidos, DPI (13 dígitos) y fecha de nacimiento.", "warning"); return;
    }
    if (Object.keys(errModal).length) { Swal.fire("Validación", "Corrija los campos marcados.", "warning"); return; }
    const m = r2(form.monto);
    if (PARENTESCOS_PAGO.includes(form.tipoParentesco) && !(m > 0)) { Swal.fire("Validación", "Indique el monto mensual (lo que dictó el juez).", "warning"); return; }
    if (errorPago(form)) { Swal.fire("Validación", errorPago(form), "warning"); return; }
    setNuevos((prev) => [...prev, {
      ...pagoDe(form),
      tipoParentesco: form.tipoParentesco,
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      dpi: form.dpi.trim(),
      fechaNacimiento: form.fechaNacimiento,
      monto: m,
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
      Swal.fire("Validación", "El tutor requiere apellidos y DPI de 13 dígitos.", "warning"); return;
    }
    if (errorPago(tutoraForm)) { Swal.fire("Validación", `Tutora: ${errorPago(tutoraForm)}`, "warning"); return; }
    setNuevos((prev) => prev.map((b, i) => (i === tutoraIdx ? { ...b, tutora: { ...tutoraForm } } : b)));
    setModalTutora(false);
  };

  // --- Guardar todo (lote) ---
  const guardarTodo = async () => {
    if (!jubilado) return;
    if (!nuevos.length) { Swal.fire("Validación", "Agregue al menos un beneficiario.", "warning"); return; }
    if (reparto.error) { Swal.fire("Validación", reparto.error, "warning"); return; }
    if (nuevos.filter((b) => esConyuge(b.tipoParentesco)).length > 1) { Swal.fire("Validación", "Solo se permite un cónyuge (esposa o esposo).", "warning"); return; }
    const menorSinTutora = nuevos.find((b) => edad(b.fechaNacimiento) < 18 && !b.tutora);
    if (menorSinTutora) { Swal.fire("Validación", `El beneficiario menor ${menorSinTutora.apellidos} requiere un tutor (mayor de edad).`, "warning"); return; }

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
      fechaNacimiento: soloFecha(b.fechaNacimiento), monto: b.monto ?? "", telefono: b.telefono || "", correo: b.correo || "",
      ...pagoDe(b)
    });
    const t = (b.tutores || []).filter((x) => !x.estado || x.estado === "VIGENTE").slice(-1)[0];
    setEditTutora(t ? { nombres: t.nombres || "", apellidos: t.apellidos || "", dpi: t.dpi || "", parentesco: t.parentesco || "", telefono: t.telefono || "", ...pagoDe(t) } : nuevaTutora());
  };
  const setE = (k, upper) => (e) => setEditForm({ ...editForm, [k]: upper ? e.target.value.toUpperCase() : e.target.value });
  const setET = (k, upper) => (e) => setEditTutora({ ...editTutora, [k]: upper ? e.target.value.toUpperCase() : e.target.value });
  const editMenor = editForm.fechaNacimiento ? edad(editForm.fechaNacimiento) < 18 : false;
  const editTieneTutora = Boolean(editTutora.apellidos || editTutora.dpi);
  const otraEsposa = existentes.some((b) => b.id !== editId && esConyuge(b.tipoParentesco));
  const errEdit = useMemo(() => {
    const err = {};
    if (!editForm.apellidos.trim()) err.apellidos = "Obligatorio";
    if (!esDpi(editForm.dpi)) err.dpi = "Debe tener 13 dígitos";
    else if (existentes.some((b) => b.id !== editId && b.dpi === editForm.dpi.trim())) err.dpi = "DPI de otro beneficiario";
    if (!editForm.fechaNacimiento) err.fechaNacimiento = "Obligatoria";
    else if (new Date(editForm.fechaNacimiento) > new Date()) err.fechaNacimiento = "No puede ser futura";
    if (!esCorreo(editForm.correo)) err.correo = "Correo inválido";
    if (editMenor && (!editTutora.apellidos.trim() || !esDpi(editTutora.dpi))) err.tutora = "Es menor: el tutor requiere apellidos y DPI de 13 dígitos";
    if (!editMenor && editTieneTutora && (!editTutora.apellidos.trim() || !esDpi(editTutora.dpi))) err.tutora = "Complete apellidos y DPI del tutor (o deje sus datos vacíos)";
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

  // ---- Ajustar montos (los vigentes; los INACTIVOS ya no cobran) ----
  const cobrando = existentes.some((b) => ["ACTIVO", "SUSPENDIDO"].includes(String(b.estado).toUpperCase()));
  const vigentes = existentes.filter((b) => String(b.estado).toUpperCase() !== "INACTIVO");
  const repartoEdit = useMemo(
    () => (pctEdit ? resumenReparto(vigentes.map((b) => ({ ...b, monto: pctEdit[b.id] })), pension) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pctEdit, existentes, pension]
  );
  const iniciarPct = () => setPctEdit(Object.fromEntries(vigentes.map((b) => [b.id, b.monto ?? r2((pension * Number(b.porcentaje)) / 100)])));
  const proponerEdit = () => setPctEdit(Object.fromEntries(proponerMontos(vigentes, pension).map((b) => [b.id, b.monto ?? ""])));
  const guardarPct = async () => {
    if (repartoEdit?.error) { Swal.fire("Validación", repartoEdit.error, "warning"); return; }
    if (cobrando) {
      const r = await Swal.fire({
        title: "Cambiar montos", icon: "question", showCancelButton: true, confirmButtonText: "Sí, cambiar", cancelButtonText: "Cancelar",
        text: "Ya están cobrando: los meses ya pagados o generados conservan su monto; el nuevo se aplica desde la próxima planilla que se genere."
      });
      if (!r.isConfirmed) return;
    }
    try {
      const { data } = await axiosClient.put(`/beneficiarios/jubilado/${jubilado.id}/montos`, {
        montos: Object.entries(pctEdit).map(([id, monto]) => ({ id: Number(id), monto: Number(monto || 0) }))
      });
      setExistentes(data.data || []);
      setPctEdit(null);
      Swal.fire("Listo", "Montos actualizados.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible actualizar los montos.", "error");
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
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Pensión{jubilado.enServicio ? " de referencia" : ""}: <b>{fmtQ(pension)}</b> · por ley el cónyuge (viuda o viudo) recibe hasta <b>{fmtQ(pension / 2)}</b> (50%) y los hijos,
                entre todos, hasta <b>{fmtQ(pension / 2)}</b> (el otro 50%). Los montos los dicta el juez.
              </Typography>
            </Grid>
          </Grid>
        )}
        {bloqueadoPorJubilado && existentes.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Este jubilado está en estado <b>{jubilado.estadoPago}</b>: no se agregan beneficiarios nuevos. Sí se pueden editar sus datos
            y <b>ajustar los montos</b> (por ejemplo, por una nueva resolución del juez).
          </Alert>
        )}
      </Paper>

      {/* Beneficiarios existentes */}
      {jubilado && (
        <Paper sx={{ p: 2.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="h6" sx={{ color: PRIMARIO }}>Beneficiarios registrados</Typography>
            {canEdit(user) && vigentes.length > 0 && (
              pctEdit ? (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button size="small" startIcon={<AutoFixHighIcon />} onClick={proponerEdit}>Proponer 50% / 50%</Button>
                  <Button onClick={() => setPctEdit(null)}>Cancelar</Button>
                  <Button variant="contained" startIcon={<SaveIcon />} disabled={Boolean(repartoEdit?.error)} onClick={guardarPct}>Guardar montos</Button>
                </Stack>
              ) : (
                <Button variant="outlined" startIcon={<PaidIcon />} onClick={iniciarPct}>Ajustar montos</Button>
              )
            )}
          </Stack>
          {pctEdit && repartoEdit && <Box sx={{ mb: 1.5 }}><ChipReparto r={repartoEdit} /></Box>}
          {cargando ? <CircularProgress size={22} /> : existentes.length === 0 ? (
            <Typography color="text.secondary">Este jubilado aún no tiene beneficiarios registrados.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Parentesco</TableCell><TableCell>Nombre</TableCell><TableCell>DPI</TableCell>
                  <TableCell align="right">Monto mensual</TableCell><TableCell>Estado</TableCell><TableCell>Tutor</TableCell>
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
                      {pctEdit && pctEdit[b.id] !== undefined ? (
                        <MontoPct monto={pctEdit[b.id]} pension={pension} onChange={(v) => setPctEdit((p) => ({ ...p, [b.id]: v }))} />
                      ) : (
                        <>
                          <b>{b.monto !== null && b.monto !== undefined ? fmtQ(b.monto) : "—"}</b>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{Number(b.porcentaje).toFixed(2)}% de la pensión</Typography>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={b.estado} />
                      {(() => {
                        const t = (b.tutores || []).slice(-1)[0];
                        const p = b.esMenor && t ? t : b;
                        const txt = p.formaPago === "ABONO CUENTA" ? `${p.bancoNombre || ""} ${p.cuenta || ""}`.trim() : p.formaPago;
                        return (
                          <Typography variant="caption" sx={{ display: "block" }} color={txt ? "text.secondary" : "error"}>
                            {txt ? `${b.esMenor && t ? "Tutor: " : ""}${txt}` : "Sin datos de pago"}
                          </Typography>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(b.tutores || []).length
                        ? <Chip size="small" icon={<CheckCircleIcon />} label={`${b.tutores[b.tutores.length - 1].nombres || ""} ${b.tutores[b.tutores.length - 1].apellidos || ""}`.trim() || "Sí"} color="success" />
                        : (b.esMenor ? <Chip size="small" color="error" label="Falta tutor" /> : "N/A")}
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
      {jubilado && !soloLectura && (!bloqueadoPorJubilado || jubilado.estadoPago === "FALLECIDO") && existentes.length === 0 && (
        <Paper sx={{ p: 2.5 }}>
          {jubilado.estadoPago === "FALLECIDO" && (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              {jubilado.enServicio ? "Falleció en servicio" : "Ya está registrado como fallecido"}: los beneficiarios que guarde quedan
              <b> ACTIVOS</b> de una vez y cobran desde la próxima planilla{jubilado.enServicio ? ", sin deuda ni meses atrasados" : ""}.
            </Alert>
          )}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h6" sx={{ color: PRIMARIO }}>Agregar beneficiarios</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirModalBen}>Agregar</Button>
          </Stack>

          {nuevos.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Parentesco</TableCell><TableCell>Nombre</TableCell><TableCell>DPI</TableCell>
                  <TableCell align="right">Monto mensual</TableCell><TableCell>Menor / Tutor</TableCell><TableCell align="center">Quitar</TableCell>
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
                      <TableCell align="right">
                        <MontoPct monto={b.monto} pension={pension}
                          onChange={(v) => setNuevos((prev) => prev.map((x, i) => (i === idx ? { ...x, monto: v } : x)))} />
                      </TableCell>
                      <TableCell>
                        {menor ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" icon={<ChildCareIcon />} label="MENOR" color="warning" />
                            {b.tutora
                              ? <Chip size="small" icon={<CheckCircleIcon />} label="Tiene tutor" color="success" />
                              : <Button size="small" variant="outlined" onClick={() => abrirModalTutora(idx)}>Tutor</Button>}
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

          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.5} sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {nuevos.length > 0 && <ChipReparto r={reparto} />}
              {nuevos.length > 0 && (
                <Button size="small" startIcon={<AutoFixHighIcon />} onClick={() => setNuevos((prev) => proponerMontos(prev, pension))}>
                  Proponer 50% / 50%
                </Button>
              )}
            </Stack>
            <Button variant="contained" color="success" startIcon={guardando ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              disabled={guardando || !nuevos.length || !pctOk} onClick={guardarTodo}>
              Guardar todo
            </Button>
          </Stack>
        </Paper>
      )}

      {jubilado && existentes.length > 0 && !soloLectura && (
        <Alert severity="info">
          Este jubilado ya tiene beneficiarios. Use <b>Editar</b> para corregir los datos de un beneficiario o de su tutor, y
          <b> Ajustar montos</b> para anotar lo que dictó el juez, en quetzales o en % (cónyuge hasta 50% de la pensión; hijos, entre todos, hasta 50%).
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
            <Grid item xs={7} md={2.5}>
              <TextField label={PARENTESCOS_PAGO.includes(form.tipoParentesco) ? "Monto mensual (Q) *" : "Monto mensual (Q)"} type="number" value={form.monto} onChange={setF("monto")}
                error={!!errModal.monto} helperText={errModal.monto || "Lo que dictó el juez"}
                fullWidth inputProps={{ min: 0, step: "0.01" }} />
            </Grid>
            <Grid item xs={5} md={1.5}>
              <TextField label="% pensión" type="number" disabled={!(pension > 0)}
                value={pension > 0 && form.monto !== "" ? r2((Number(form.monto) / pension) * 100) : ""}
                onChange={(e) => setForm({ ...form, monto: e.target.value === "" ? "" : String(r2((pension * Number(e.target.value)) / 100)) })}
                helperText={pension > 0 ? `de ${fmtQ(pension)}` : ""} fullWidth inputProps={{ min: 0, max: 50, step: "0.01" }} />
            </Grid>
            <Grid item xs={12} md={6}><TextField label="Teléfono" value={form.telefono} onChange={setF("telefono")} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Correo" value={form.correo} onChange={setF("correo")} error={!!errModal.correo} helperText={errModal.correo} fullWidth /></Grid>
            {!(form.fechaNacimiento && edad(form.fechaNacimiento) < 18) && (
              <CamposPago titulo="Datos de pago (cuenta del beneficiario)" valor={pagoDe(form)} bancos={bancos} onChange={(v) => setForm({ ...form, ...v })} />
            )}
            {form.fechaNacimiento && edad(form.fechaNacimiento) < 18 && (
              <Grid item xs={12}><Alert severity="warning">Es menor de edad: después de agregarlo deberá asignarle un tutor (madre, tío, tía u otro mayor de edad) antes de guardar. Su pago se deposita en la cuenta de la tutora.</Alert></Grid>
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
            <Grid item xs={12} md={4}><TextField label="Monto mensual" value={editForm.monto === "" ? "" : fmtQ(editForm.monto)} fullWidth disabled helperText="Se cambia con «Ajustar montos»" /></Grid>
            <Grid item xs={12} md={6}><TextField label="Teléfono" value={editForm.telefono} onChange={setE("telefono")} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Correo" value={editForm.correo} onChange={setE("correo")} error={!!errEdit.correo} helperText={errEdit.correo} fullWidth /></Grid>
            {!editMenor && (
              <CamposPago titulo="Datos de pago (cuenta del beneficiario)" valor={pagoDe(editForm)} bancos={bancos} onChange={(v) => setEditForm({ ...editForm, ...v })} />
            )}
            {(editMenor || editTieneTutora) && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARIO, mt: 1 }}>
                    Tutor {editMenor ? "(obligatorio: es menor de edad)" : ""}
                  </Typography>
                  {errEdit.tutora && <Typography variant="caption" color="error">{errEdit.tutora}</Typography>}
                </Grid>
                <Grid item xs={12} md={6}><TextField label="Nombres" value={editTutora.nombres} onChange={setET("nombres", true)} fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField label="Apellidos *" value={editTutora.apellidos} onChange={setET("apellidos", true)} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField label="DPI *" value={editTutora.dpi} onChange={setET("dpi")} error={!!editTutora.dpi && !esDpi(editTutora.dpi)} helperText="13 dígitos" fullWidth /></Grid>
                <CampoParentescoTutor md={4} value={editTutora.parentesco} onChange={(v) => setEditTutora((t) => ({ ...t, parentesco: v }))} />
                <Grid item xs={12} md={4}><TextField label="Teléfono" value={editTutora.telefono} onChange={setET("telefono")} fullWidth /></Grid>
                <CamposPago titulo="Datos de pago del tutor (aquí se deposita lo del menor)" valor={pagoDe(editTutora)} bancos={bancos} onChange={(v) => setEditTutora({ ...editTutora, ...v })} />
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
        <DialogTitle>Tutor del menor</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}><TextField label="Nombres" value={tutoraForm.nombres} onChange={setTUpper("nombres")} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Apellidos *" value={tutoraForm.apellidos} onChange={setTUpper("apellidos")} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="DPI *" value={tutoraForm.dpi} onChange={setT("dpi")} error={!!tutoraForm.dpi && !esDpi(tutoraForm.dpi)} helperText="13 dígitos" fullWidth /></Grid>
            <CampoParentescoTutor value={tutoraForm.parentesco} onChange={(v) => setTutoraForm((t) => ({ ...t, parentesco: v }))} />
            <Grid item xs={12} md={6}><TextField label="Teléfono" value={tutoraForm.telefono} onChange={setT("telefono")} fullWidth /></Grid>
            <CamposPago titulo="Datos de pago (cuenta del tutor: aquí se deposita lo del menor)" valor={pagoDe(tutoraForm)} bancos={bancos} onChange={(v) => setTutoraForm({ ...tutoraForm, ...v })} />
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalTutora(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarTutora}>Guardar tutor</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default BeneficiariosPage;
