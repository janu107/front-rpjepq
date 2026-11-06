import AddIcon from "@mui/icons-material/Add";
import CalculateIcon from "@mui/icons-material/Calculate";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ListAltIcon from "@mui/icons-material/ListAlt";
import PaymentsIcon from "@mui/icons-material/Payments";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, IconButton,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canDelete, canEdit } from "../../utils/permissions";

const estados = ["ACTIVO", "CANCELADO", "MORA", "ANULADO"];
const MANEJO_EPQ_ID = 4;
const formatDate = (value) => (value ? String(value).slice(0, 10) : "");
// Montos con separador de millares (es-GT): 12,823.36
const money = (v) => `Q ${Number(v || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fechaDMY = (v) => (v ? String(v).slice(0, 10).split("-").reverse().join("/") : "");
// Montos con separador de miles mientras no se está escribiendo en el campo.
const sinComas = (v) => String(v ?? "").replace(/,/g, "");
const conMiles = (v) => (String(v ?? "").trim() === "" || Number.isNaN(Number(sinComas(v)))
  ? String(v ?? "") : Number(sinComas(v)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const CampoMonto = ({ label, value, onChange }) => {
  const [enfocado, setEnfocado] = useState(false);
  return (
    <TextField size="small" label={label} fullWidth value={enfocado ? sinComas(value) : conMiles(value)}
      inputProps={{ inputMode: "decimal", style: { textAlign: "right" } }}
      onFocus={() => setEnfocado(true)} onBlur={() => setEnfocado(false)}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.-]/g, ""))} />
  );
};
const initialForm = { idAportacion: "", noContrato: "", montoAutorizado: "", cuotaNivelada: "", plazoMeses: "", fechaInicio: "", fechaFin: "", totalPagar: "", tasaInteres: "", estado: "ACTIVO" };
const initialDetalle = { fechaPago: "", descuentoNominaAportacion: 0, cuotaNivelada: "", amortizacion: "", intereses: "", saldo: "", mora: 0, seguro: 0 };

// Filtro del buscador editable: acepta código, número de contrato, nombre o DPI.
// Busca todas las palabras escritas en cualquier orden.
const filtrarPrestamo = (opciones, { inputValue }) => {
  const terminos = String(inputValue || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terminos.length) return opciones;
  return opciones.filter((o) => {
    const texto = `${o.id || ""} ${o.aportacionCodigo || ""} ${o.noContrato || ""} ${o.aportacionNombre || ""} ${o.aportacionDpi || ""}`.toLowerCase();
    return terminos.every((t) => texto.includes(t));
  });
};

// Código visible del empleado EPQ (el mismo de la carga masiva).
const codigoApo = (a) => a?.idAportacion ?? a?.codigo ?? "";
const nombreApo = (a) => `${a?.nombre || ""} ${a?.apellido || ""}`.trim();
// Buscador de aportante: código, nombre o DPI; el código exacto va primero.
const filtrarAportante = (opts, { inputValue }) => {
  const t = String(inputValue || "").trim().toLowerCase();
  if (!t) return opts.slice(0, 50);
  const palabras = t.split(/\s+/);
  const lista = opts.filter((a) => palabras.every((w) => `${codigoApo(a)} ${nombreApo(a)} ${a.dpi || ""}`.toLowerCase().includes(w)));
  const exacto = lista.filter((a) => String(codigoApo(a)).toLowerCase() === t);
  return [...exacto, ...lista.filter((a) => String(codigoApo(a)).toLowerCase() !== t)].slice(0, 50);
};
const ESTADOS_SIN_PAGO = ["CANCELADO", "ANULADO"];

const PrestamosPage = ({ detailOnly = false }) => {
  const { user } = useAuth();
  const [prestamos, setPrestamos] = useState([]);
  const [aportaciones, setAportaciones] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [detalle, setDetalle] = useState([]);
  const [detalleForm, setDetalleForm] = useState(initialDetalle);
  const [editingDetalle, setEditingDetalle] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [totalPagado, setTotalPagado] = useState(0);

  // ---- Carga masiva de pagos (Excel): código empleado, fecha pago, monto descontado ----
  const archivoRef = useRef(null);
  const [ayudaCarga, setAyudaCarga] = useState(false);
  const descargarPlantilla = async () => {
    try {
      const resp = await axiosClient.get("/prestamos/carga-masiva/plantilla", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url; a.download = "plantilla_pagos_prestamos.xlsx";
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch { Swal.fire("Error", "No fue posible descargar la plantilla.", "error"); }
  };
  const subirExcel = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.append("archivo", file);
    try {
      const { data } = await axiosClient.post("/prestamos/carga-masiva", fd);
      const r = data.data || {};
      const errores = r.errores || [];
      await Swal.fire({
        title: "Carga de pagos procesada", icon: errores.length ? "warning" : "success", width: 640,
        html: `Filas leídas: <b>${r.totalFilas ?? 0}</b><br>Pagos grabados: <b>${r.grabados ?? 0}</b><br>Con error: <b>${errores.length}</b>`
          + (r.prestamosSaldados?.length ? `<br>Préstamos saldados (quedan CANCELADOS): <b>${r.prestamosSaldados.join(", ")}</b>` : "")
          + (errores.length ? `<hr style="margin:8px 0"><div style="text-align:left;max-height:240px;overflow:auto">${errores.slice(0, 40).map((e) => `Fila ${e.fila}${e.codigo ? ` (${e.codigo})` : ""}: ${e.error}`).join("<br>")}</div>` : "")
      });
      loadPrestamos();
      if (selected && detailOpen) loadDetalle(selected);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible procesar el archivo.", "error");
    }
  };

  const loadPrestamos = async () => {
    const { data } = await axiosClient.get("/prestamos");
    const list = data.data || [];
    setPrestamos(list);
    return list;
  };

  const loadAportaciones = async (prestamosActuales) => {
    const { data } = await axiosClient.get("/aportaciones");
    const activeLoanIds = new Set(
      (prestamosActuales || [])
        .filter((p) => ["ACTIVO", "MORA"].includes(p.estado))
        .map((p) => Number(p.idAportacion))
    );
    setAportaciones(
      (data.data || []).filter(
        (item) =>
          item.estado === "ACTIVO" &&
          Number(item.tipoManejo) === MANEJO_EPQ_ID &&
          item.tienePrestamo &&
          !activeLoanIds.has(Number(item.id))
      )
    );
  };

  useEffect(() => {
    loadPrestamos()
      .then((loaded) => loadAportaciones(loaded).catch(() => {}))
      .catch((error) => Swal.fire("Error", error.response?.data?.message || "No fue posible cargar prestamos.", "error"));
  }, []);

  // Universo de préstamos EPQ sin filtrar: alimenta las opciones del buscador editable.
  const prestamosEpq = useMemo(
    () => prestamos.filter((item) => Number(item.tipoManejo) === MANEJO_EPQ_ID),
    [prestamos]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const scoped = prestamosEpq;
    if (!term) return scoped;
    return scoped.filter((item) => [item.id, item.aportacionCodigo, item.noContrato, item.aportacionNombre, item.aportacionDpi].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [prestamosEpq, search]);

  // Paginación del listado de préstamos: 15 registros.
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  useEffect(() => { setPage(0); }, [search, filtered.length]);
  const ultimaPagina = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);
  const paginaActual = Math.min(page, ultimaPagina);
  const paginados = useMemo(
    () => filtered.slice(paginaActual * rowsPerPage, paginaActual * rowsPerPage + rowsPerPage),
    [filtered, paginaActual, rowsPerPage]
  );

  // Paginación de las cuotas del préstamo: 15 registros. Un préstamo a 120
  // meses trae 120 renglones y el diálogo se volvía interminable.
  const [pageDet, setPageDet] = useState(0);
  const [rppDet, setRppDet] = useState(15);
  useEffect(() => { setPageDet(0); }, [selected, detalle.length]);
  const ultimaPaginaDet = Math.max(0, Math.ceil(detalle.length / rppDet) - 1);
  const paginaDet = Math.min(pageDet, ultimaPaginaDet);
  const desplazamientoDet = paginaDet * rppDet;
  // Del pago más reciente al más viejo; el No. de cuota sigue contando desde el primero.
  const detalleOrdenado = useMemo(() => {
    const asc = [...detalle].sort((a, b) => String(a.fechaPago).localeCompare(String(b.fechaPago)) || Number(a.id) - Number(b.id))
      .map((d, i) => ({ ...d, _num: i + 1 }));
    return asc.reverse();
  }, [detalle]);
  const detallePaginadoPrestamo = useMemo(
    () => detalleOrdenado.slice(desplazamientoDet, desplazamientoDet + rppDet),
    [detalleOrdenado, desplazamientoDet, rppDet]
  );

  // En modo edición incluir el aportante actual aunque ya tenga préstamo activo
  const aportacionesParaSelect = useMemo(() => {
    if (!editing) return aportaciones;
    const yaIncluido = aportaciones.some((a) => Number(a.id) === Number(editing.idAportacion));
    if (yaIncluido) return aportaciones;
    const currentApo = { id: editing.idAportacion, idAportacion: editing.aportacionCodigo, nombre: editing.aportacionNombre?.split(" ")[0] || "", apellido: editing.aportacionNombre?.split(" ").slice(1).join(" ") || "", dpi: editing.aportacionDpi, tienePrestamo: true };
    return [currentApo, ...aportaciones];
  }, [aportaciones, editing]);

  const selectedAportacion = useMemo(
    () => aportacionesParaSelect.find((item) => Number(item.id) === Number(form.idAportacion)),
    [aportacionesParaSelect, form.idAportacion]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ ...item, fechaInicio: formatDate(item.fechaInicio), fechaFin: formatDate(item.fechaFin) });
    setDialogOpen(true);
  };

  const calculate = async () => {
    try {
      const { data } = await axiosClient.post("/prestamos/calcular-cuota", form);
      setForm({ ...form, cuotaNivelada: data.data.cuotaNivelada, totalPagar: data.data.totalPagar });
      Swal.fire("Listo", `Interes estimado: Q ${Number(data.data.interesTotalEstimado).toFixed(2)}`, "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible calcular la cuota.", "error");
    }
  };

  const savePrestamo = async () => {
    try {
      if (editing) {
        await axiosClient.put(`/prestamos/${editing.id}`, form);
        Swal.fire("Listo", "Prestamo actualizado correctamente.", "success");
      } else {
        await axiosClient.post("/prestamos", form);
        Swal.fire("Listo", "Prestamo creado correctamente.", "success");
      }
      setDialogOpen(false);
      loadPrestamos().then((loaded) => loadAportaciones(loaded).catch(() => {})).catch(() => {});
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar el prestamo.", "error");
    }
  };

  const changeStatus = async (item) => {
    const { value } = await Swal.fire({ title: "Cambiar estado", input: "select", inputOptions: Object.fromEntries(estados.map((e) => [e, e])), inputValue: item.estado, showCancelButton: true, confirmButtonText: "Guardar", confirmButtonColor: "#1f4e5f" });
    if (!value) return;
    await axiosClient.patch(`/prestamos/${item.id}/estado`, { estado: value });
    loadPrestamos();
  };

  const deletePrestamo = async (item) => {
    const result = await Swal.fire({ title: "Eliminar prestamo", text: "Si tiene detalle no podra eliminarse.", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", confirmButtonColor: "#1f4e5f" });
    if (!result.isConfirmed) return;
    try {
      await axiosClient.delete(`/prestamos/${item.id}`);
      Swal.fire("Listo", "Prestamo eliminado correctamente.", "success");
      loadPrestamos();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar.", "error");
    }
  };

  const loadDetalle = async (item) => {
    const [detalleResponse, saldoResponse, totalResponse] = await Promise.all([
      axiosClient.get(`/prestamos/${item.id}/detalle`),
      axiosClient.get(`/prestamos/${item.id}/saldo`),
      axiosClient.get(`/prestamos/${item.id}/total-pagado`)
    ]);
    setDetalle(detalleResponse.data.data || []);
    setSaldo(saldoResponse.data.data?.saldoActual || 0);
    setTotalPagado(totalResponse.data.data?.totalPagado || 0);
  };

  const openDetalle = async (item) => {
    setSelected(item);
    setDetalleForm(initialDetalle);
    setEditingDetalle(null);
    setDetailOpen(true);
    await loadDetalle(item);
  };

  const [montoDesc, setMontoDesc] = useState("");

  // ---- Pago individual (como una fila de la carga masiva) ----
  const [pagoInd, setPagoInd] = useState(null); // { prestamo, fechaPago, monto, vista, grabando }
  const abrirPagoInd = (item) => setPagoInd({ prestamo: item, fechaPago: "", monto: "", vista: null, grabando: false });
  const cambiarPagoInd = (campos) => setPagoInd((p) => ({ ...p, ...campos, vista: null }));
  const verPagoInd = async () => {
    try {
      const { data } = await axiosClient.post(`/prestamos/${pagoInd.prestamo.id}/detalle/calcular`, { fechaPago: pagoInd.fechaPago, monto: sinComas(pagoInd.monto) });
      setPagoInd((p) => ({ ...p, vista: data.data }));
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "No fue posible calcular el pago.", "error"); }
  };
  const grabarPagoInd = async () => {
    setPagoInd((p) => ({ ...p, grabando: true }));
    try {
      const { data } = await axiosClient.post(`/prestamos/${pagoInd.prestamo.id}/pago-individual`, { fechaPago: pagoInd.fechaPago, monto: sinComas(pagoInd.monto) });
      const r = data.data || {};
      setPagoInd(null);
      Swal.fire({ icon: "success", title: "Pago registrado",
        html: `Contrato <b>${r.contrato}</b> · ${fechaDMY(r.fechaPago)}<br>Saldo: <b>${money(r.saldo)}</b>${Number(r.mora) > 0 ? `<br>Mora del mes: <b>${money(r.mora)}</b>` : ""}${r.saldado ? "<br><b>El préstamo quedó saldado (CANCELADO).</b>" : ""}` });
      loadPrestamos();
    } catch (e) {
      setPagoInd((p) => (p ? { ...p, grabando: false } : p));
      Swal.fire("Error", e.response?.data?.message || "No fue posible registrar el pago.", "error");
    }
  };
  const calcularPagoForm = async () => {
    try {
      const { data } = await axiosClient.post(`/prestamos/${selected.id}/detalle/calcular`, { fechaPago: detalleForm.fechaPago, monto: sinComas(montoDesc) });
      const p = data.data;
      setDetalleForm((f) => ({ ...f, descuentoNominaAportacion: p.descuentoNominaAportacion, cuotaNivelada: p.cuotaNivelada, amortizacion: p.amortizacion,
        intereses: p.intereses, saldo: p.saldo, mora: p.mora, seguro: p.seguro }));
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "No fue posible calcular el pago.", "error"); }
  };

  const saveDetalle = async () => {
    try {
      // Los montos se envían sin separador de miles.
      const datos = Object.fromEntries(Object.entries(detalleForm).map(([k, v]) => [k, k === "fechaPago" ? v : sinComas(v)]));
      if (editingDetalle) {
        await axiosClient.put(`/prestamos/detalle/${editingDetalle.id}`, datos);
        Swal.fire("Listo", "Pago actualizado correctamente.", "success");
      } else {
        await axiosClient.post(`/prestamos/${selected.id}/detalle`, datos);
        Swal.fire("Listo", "Pago agregado correctamente.", "success");
      }
      setDetalleForm(initialDetalle);
      setEditingDetalle(null);
      setMontoDesc("");
      loadDetalle(selected);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar el pago.", "error");
    }
  };

  const openEditDetalle = (row) => {
    setEditingDetalle(row);
    setDetalleForm({
      fechaPago: formatDate(row.fechaPago),
      descuentoNominaAportacion: row.descuentoNominaAportacion,
      cuotaNivelada: row.cuotaNivelada,
      amortizacion: row.amortizacion,
      intereses: row.intereses,
      saldo: row.saldo,
      mora: row.mora,
      seguro: row.seguro || 0
    });
  };

  const deleteDetalle = async (row) => {
    const result = await Swal.fire({ title: "Eliminar pago", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", confirmButtonColor: "#1f4e5f" });
    if (!result.isConfirmed) return;
    await axiosClient.delete(`/prestamos/detalle/${row.id}`);
    loadDetalle(selected);
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Box>
          <Typography variant="h5">{detailOnly ? "Detalle Prestamos" : "Prestamos"}</Typography>
          <Typography color="text.secondary">Control de prestamos y pagos</Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          {canCreate(user) && <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setAyudaCarga(true)}>Carga masiva de pagos (Excel)</Button>}
          {!detailOnly && canCreate(user) && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nuevo prestamo</Button>}
        </Stack>
        <input ref={archivoRef} type="file" accept=".xlsx" hidden onChange={subirExcel} />
      </Stack>

      <Dialog open={ayudaCarga} onClose={() => setAyudaCarga(false)} fullWidth maxWidth="md">
        <DialogTitle>Carga masiva de pagos de préstamos (Excel)</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Condiciones del archivo</Typography>
          <Box component="ol" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5 } }}>
            <li>Excel <b>.xlsx</b> de máximo <b>5 MB</b>; se lee la <b>primera hoja</b>. Fila 1 con los encabezados <b>CODIGO EMPLEADO</b>, <b>FECHA PAGO</b> y <b>MONTO DESCONTADO</b>.</li>
            <li><b>CODIGO EMPLEADO</b>: código del empleado EPQ. Debe tener <b>un</b> préstamo VIGENTE o ATRASADO.</li>
            <li><b>FECHA PAGO</b>: fecha del descuento (30/11/2026). Puede haber varias fechas; <b>un pago por préstamo por mes</b>.</li>
            <li><b>MONTO DESCONTADO</b>: lo que realmente se descontó (cuota + seguro), aunque sea <b>menor o mayor que la cuota</b>. Puede ser 0.</li>
            <li>Se rechazan las filas de un mes que el préstamo ya tiene o anteriores a su último pago; las demás sí se graban.</li>
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 2, mb: 0.5 }}>Lo que calcula el sistema en cada pago</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5 } }}>
            <li><b>Seguro</b>: el del último pago del préstamo (se cobra primero). Cuota pagada = monto descontado − seguro.</li>
            <li><b>Intereses</b> = saldo anterior × tasa anual ÷ 12. <b>Amortización</b> = cuota pagada − intereses (si no alcanza queda negativa y el saldo sube).</li>
            <li><b>Saldo</b> = saldo anterior − amortización. Si llega a 0, el préstamo queda CANCELADO.</li>
            <li><b>Mora</b> = (cuota nivelada − cuota pagada) × 2% × días del mes, anotada aparte. Si paga de más, mora 0 y el extra abona a capital.</li>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Ejemplo: cuota Q2,000.00, seguro Q185.00 y se descontaron <b>Q1,685.00</b> → cuota pagada Q1,500.00; faltaron Q500.00 →
            mora del mes (30 días) = 500 × 2% × 30 = <b>Q300.00</b>.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<DownloadIcon />} onClick={descargarPlantilla}>Descargar plantilla</Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setAyudaCarga(false)}>Cancelar</Button>
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => { setAyudaCarga(false); archivoRef.current?.click(); }}>Elegir archivo</Button>
        </DialogActions>
      </Dialog>

      <Autocomplete
        freeSolo
        options={prestamosEpq}
        inputValue={search}
        onInputChange={(_, valor, motivo) => { if (motivo !== "reset") setSearch(valor); }}
        onChange={(_, item) => setSearch(item && typeof item === "object" ? item.noContrato : "")}
        filterOptions={filtrarPrestamo}
        getOptionLabel={(o) => (typeof o === "object" ? o.noContrato || "" : String(o || ""))}
        noOptionsText="Sin coincidencias"
        sx={{ maxWidth: { md: 560 } }}
        renderOption={(props, o) => (
          <li {...props} key={o.id}>
            {o.id} — {o.noContrato} — {o.aportacionNombre}{o.aportacionDpi ? ` (${o.aportacionDpi})` : ""}
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Buscar por contrato, código, nombre o DPI"
            InputProps={{ ...params.InputProps, startAdornment: (<><InputAdornment position="start"><SearchIcon /></InputAdornment>{params.InputProps.startAdornment}</>) }}
          />
        )}
      />

      <TableContainer component={Paper} elevation={0} sx={{ border: (t) => `1px solid ${t.palette.borde}`, overflow: "hidden" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}>
            <TableRow><TableCell>Codigo</TableCell><TableCell>Codigo empleado</TableCell><TableCell>Contrato</TableCell><TableCell>Aportacion</TableCell><TableCell>Monto</TableCell><TableCell>Cuota</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell></TableRow>
          </TableHead>
          <TableBody>{paginados.map((item) => <TableRow key={item.id} hover><TableCell>{item.id}</TableCell><TableCell>{item.aportacionCodigo}</TableCell><TableCell>{item.noContrato}</TableCell><TableCell>{item.aportacionNombre}</TableCell><TableCell>{money(item.montoAutorizado)}</TableCell><TableCell>{money(item.cuotaNivelada)}</TableCell><TableCell><Chip label={item.estado} color={item.estado === "ACTIVO" ? "success" : "default"} size="small" /></TableCell><TableCell align="right"><Stack direction="row" spacing={0.5} justifyContent="flex-end">{!detailOnly && canEdit(user) && <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => openEdit(item)}><EditIcon /></IconButton></Tooltip>}{canCreate(user) && !ESTADOS_SIN_PAGO.includes(String(item.estado).toUpperCase()) && <Tooltip title="Registrar pago"><IconButton size="small" color="primary" onClick={() => abrirPagoInd(item)}><PaymentsIcon /></IconButton></Tooltip>}<Tooltip title="Detalle"><IconButton size="small" color="primary" onClick={() => openDetalle(item)}><ListAltIcon /></IconButton></Tooltip>{!detailOnly && canEdit(user) && <Tooltip title="Estado"><IconButton size="small" color="primary" onClick={() => changeStatus(item)}><PowerSettingsNewIcon /></IconButton></Tooltip>}{!detailOnly && canDelete(user) && <Tooltip title="Eliminar"><IconButton size="small" color="primary" onClick={() => deletePrestamo(item)}><DeleteIcon /></IconButton></Tooltip>}</Stack></TableCell></TableRow>)}</TableBody>
        </Table>
        {filtered.length > rowsPerPage && (
          <TablePagination
            component="div"
            count={filtered.length}
            page={paginaActual}
            onPageChange={(_, nueva) => setPage(nueva)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[15, 30, 60]}
            labelRowsPerPage="Registros por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            sx={{ borderTop: (t) => `1px solid ${t.palette.borde}` }}
          />
        )}
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { width: "min(980px, calc(100% - 24px))" } }}
      >
        <DialogTitle>{editing ? "Editar prestamo" : "Nuevo prestamo"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              {/* Buscador por código, nombre o DPI. Con el código exacto + Tab (o Enter) se elige y se ve el nombre completo. */}
              <Autocomplete
                options={aportacionesParaSelect}
                value={selectedAportacion || null}
                onChange={(_, a) => setForm({ ...form, idAportacion: a ? a.id : "" })}
                autoHighlight
                autoSelect
                isOptionEqualToValue={(o, v) => Number(o.id) === Number(v.id)}
                getOptionLabel={(a) => `${codigoApo(a)} — ${nombreApo(a)}`}
                filterOptions={filtrarAportante}
                renderOption={(props, a) => (
                  <li {...props} key={a.id}>
                    <b style={{ minWidth: 56, display: "inline-block" }}>{codigoApo(a)}</b>&nbsp;{nombreApo(a)}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>{a.dpi}</Typography>
                  </li>
                )}
                noOptionsText="No se encontró ese código, nombre o DPI (solo aparecen empleados EPQ activos, con préstamo autorizado y sin otro préstamo activo)"
                renderInput={(params) => (
                  <TextField {...params} label="Aportante (código, nombre o DPI)" placeholder="Escriba el código y presione Tab o Enter" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}><TextField label="No. contrato" value={form.noContrato} onChange={(e) => setForm({ ...form, noContrato: e.target.value })} fullWidth /></Grid>
            {selectedAportacion && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "rgba(31, 78, 95, 0.03)" }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={4}><Typography variant="caption" color="text.secondary">Nombre</Typography><Typography>{codigoApo(selectedAportacion)} — {nombreApo(selectedAportacion)}</Typography></Grid>
                    <Grid item xs={12} md={4}><Typography variant="caption" color="text.secondary">DPI</Typography><Typography>{selectedAportacion.dpi}</Typography></Grid>
                    <Grid item xs={12} md={4}><Typography variant="caption" color="text.secondary">Gerencia</Typography><Typography>{selectedAportacion.gerencia}</Typography></Grid>
                    <Grid item xs={12} md={4}><Typography variant="caption" color="text.secondary">Estado</Typography><Typography>{selectedAportacion.estado}</Typography></Grid>
                    <Grid item xs={12} md={4}><Typography variant="caption" color="text.secondary">Prestamo activo</Typography><Typography>{selectedAportacion.tienePrestamo ? "SI" : "NO"}</Typography></Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
            <Grid item xs={12} md={6}><TextField label="Monto autorizado" type="number" value={form.montoAutorizado} onChange={(e) => setForm({ ...form, montoAutorizado: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Tasa interes" type="number" value={form.tasaInteres} onChange={(e) => setForm({ ...form, tasaInteres: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Plazo meses" type="number" value={form.plazoMeses} onChange={(e) => setForm({ ...form, plazoMeses: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><Button variant="outlined" startIcon={<CalculateIcon />} onClick={calculate} fullWidth sx={{ minHeight: 56 }}>Calcular cuota</Button></Grid>
            <Grid item xs={12} md={6}><TextField label="Cuota nivelada" type="number" value={form.cuotaNivelada} onChange={(e) => setForm({ ...form, cuotaNivelada: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Total pagar" type="number" value={form.totalPagar} onChange={(e) => setForm({ ...form, totalPagar: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Fecha inicio" type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Fecha fin" type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
            <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Estado</InputLabel><Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>{estados.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}</Select></FormControl></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Cancelar</Button><Button variant="contained" onClick={savePrestamo}>Guardar</Button></DialogActions>
      </Dialog>

      <Dialog open={!!pagoInd} onClose={() => setPagoInd(null)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar pago</DialogTitle>
        <DialogContent dividers>
          {pagoInd && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Contrato <b>{pagoInd.prestamo.noContrato}</b> · Código empleado <b>{pagoInd.prestamo.aportacionCodigo}</b><br />
                <b>{pagoInd.prestamo.aportacionNombre}</b> · Cuota {money(pagoInd.prestamo.cuotaNivelada)}
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <TextField size="small" label="Fecha pago" type="date" value={pagoInd.fechaPago} onChange={(e) => cambiarPagoInd({ fechaPago: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
                <CampoMonto label="Monto descontado" value={pagoInd.monto} onChange={(v) => cambiarPagoInd({ monto: v })} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Igual que la carga masiva: lo descontado (cuota + seguro), aunque sea menor o mayor que la cuota. El sistema calcula seguro, intereses, amortización, saldo y mora.
              </Typography>
              {pagoInd.vista && (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                    {[["Seguro", pagoInd.vista.seguro], ["Cuota pagada", pagoInd.vista.cuotaNivelada], ["Intereses", pagoInd.vista.intereses],
                      ["Amortización", pagoInd.vista.amortizacion], ["Saldo", pagoInd.vista.saldo], ["Mora", pagoInd.vista.mora]].map(([l, v]) => (
                      <Box key={l}><Typography variant="caption" color="text.secondary">{l}</Typography><Typography fontWeight={700}>{money(v)}</Typography></Box>
                    ))}
                  </Box>
                  {Number(pagoInd.vista.saldo) <= 0 && <Alert severity="success" sx={{ mt: 1 }}>Con este pago el préstamo queda saldado (CANCELADO).</Alert>}
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPagoInd(null)}>Cancelar</Button>
          <Button variant="outlined" startIcon={<CalculateIcon />} onClick={verPagoInd} disabled={!pagoInd?.fechaPago || pagoInd?.monto === ""}>Calcular</Button>
          <Button variant="contained" onClick={grabarPagoInd} disabled={!pagoInd?.vista || pagoInd?.grabando}>Grabar pago</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="lg" PaperProps={{ sx: { height: "90vh" } }}>
        <DialogTitle>Detalle de prestamo</DialogTitle>
        {/* Alto fijo: la tabla se desplaza por dentro y la ventana no cambia de tamaño. */}
        <DialogContent sx={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Stack spacing={2} sx={{ mt: 1, flex: 1, minHeight: 0 }}>
            <Box>
              <Typography variant="h6">
                Total pagado: {money(totalPagado)} &nbsp;|&nbsp; Saldo actual: {money(saldo)}
              </Typography>
              {/* Contrato y aportante viven aquí arriba: son los mismos en todos los
                  renglones, así que repetirlos en cada fila sólo robaba ancho. */}
              <Typography variant="body2" color="text.secondary">
                Código préstamo <b>{selected?.id}</b> &nbsp;·&nbsp; Contrato <b>{selected?.noContrato}</b>
                &nbsp;·&nbsp; Aportante <b>{selected?.aportacionNombre}</b>
                {selected?.aportacionCodigo ? <> &nbsp;·&nbsp; Código empleado <b>{selected.aportacionCodigo}</b></> : null}
                &nbsp;·&nbsp; Cuotas registradas <b>{detalle.length}</b>
              </Typography>
            </Box>
            {canCreate(user) && (
              <Box>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 220 }}>
                    <CampoMonto label="Monto descontado" value={montoDesc} onChange={setMontoDesc} />
                  </Box>
                  <Button variant="outlined" startIcon={<CalculateIcon />} onClick={calcularPagoForm} disabled={!!editingDetalle || !detalleForm.fechaPago || montoDesc === ""}>
                    Calcular el pago
                  </Button>
                  <Typography variant="caption" color="text.secondary">Con la fecha y lo descontado, calcula seguro, intereses, amortización, saldo y mora (puede ajustarlos antes de guardar).</Typography>
                </Stack>
                {/* Los 7 campos en una sola línea. */}
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "1.2fr repeat(6, 1fr)" }, gap: 1.5 }}>
                  <TextField size="small" label="Fecha pago" type="date" value={detalleForm.fechaPago} onChange={(e) => setDetalleForm({ ...detalleForm, fechaPago: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
                  <CampoMonto label="Cuota" value={detalleForm.cuotaNivelada} onChange={(v) => setDetalleForm({ ...detalleForm, cuotaNivelada: v })} />
                  <CampoMonto label="Amortización" value={detalleForm.amortizacion} onChange={(v) => setDetalleForm({ ...detalleForm, amortizacion: v })} />
                  <CampoMonto label="Intereses" value={detalleForm.intereses} onChange={(v) => setDetalleForm({ ...detalleForm, intereses: v })} />
                  <CampoMonto label="Saldo" value={detalleForm.saldo} onChange={(v) => setDetalleForm({ ...detalleForm, saldo: v })} />
                  <CampoMonto label="Mora" value={detalleForm.mora} onChange={(v) => setDetalleForm({ ...detalleForm, mora: v })} />
                  <CampoMonto label="Seguro" value={detalleForm.seguro} onChange={(v) => setDetalleForm({ ...detalleForm, seguro: v })} />
                </Box>
                <Box sx={{ mt: 1.5 }}>
                  <Button variant="contained" onClick={saveDetalle}>{editingDetalle ? "Actualizar pago" : "Agregar pago"}</Button>
                  {editingDetalle && <Button sx={{ ml: 1 }} onClick={() => { setEditingDetalle(null); setDetalleForm(initialDetalle); }}>Cancelar edicion</Button>}
                </Box>
              </Box>
            )}
            <TableContainer component={Paper} elevation={0} sx={{ border: (t) => `1px solid ${t.palette.borde}`, flex: 1, minHeight: 0, overflow: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead sx={{ "& th": { bgcolor: "fondo.suave" } }}>
                  <TableRow>
                    <TableCell>No. cuota</TableCell><TableCell>Fecha pago</TableCell><TableCell align="right">Cuota nivelada</TableCell>
                    <TableCell align="right">Amortizacion</TableCell><TableCell align="right">Intereses</TableCell>
                    <TableCell align="right">Saldo</TableCell><TableCell align="right">Mora</TableCell>
                    <TableCell align="right">Seguro</TableCell><TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detallePaginadoPrestamo.map((d, i) => (
                    <TableRow key={d.id} hover>
                      <TableCell>{d._num}</TableCell>
                      <TableCell>{fechaDMY(d.fechaPago)}</TableCell>
                      <TableCell align="right">{money(d.cuotaNivelada)}</TableCell>
                      <TableCell align="right">{money(d.amortizacion)}</TableCell>
                      <TableCell align="right">{money(d.intereses)}</TableCell>
                      <TableCell align="right">{money(d.saldo)}</TableCell>
                      <TableCell align="right">{money(d.mora)}</TableCell>
                      <TableCell align="right">{money(d.seguro || 0)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {canEdit(user) && <IconButton size="small" color="primary" onClick={() => openEditDetalle(d)}><EditIcon /></IconButton>}
                          {canDelete(user) && <IconButton size="small" color="primary" onClick={() => deleteDetalle(d)}><DeleteIcon /></IconButton>}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {detalle.length === 0 && (
                    <TableRow><TableCell colSpan={9} align="center">Este préstamo no tiene cuotas registradas.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {detalle.length > rppDet && (
                <TablePagination
                  component="div"
                  count={detalle.length}
                  page={paginaDet}
                  onPageChange={(_, nueva) => setPageDet(nueva)}
                  rowsPerPage={rppDet}
                  onRowsPerPageChange={(e) => { setRppDet(Number(e.target.value)); setPageDet(0); }}
                  rowsPerPageOptions={[15, 30, 60]}
                  labelRowsPerPage="Registros por página"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                  sx={{ borderTop: (t) => `1px solid ${t.palette.borde}` }}
                />
              )}
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailOpen(false)}>Cerrar</Button></DialogActions>
      </Dialog>
    </Stack>
  );
};

export default PrestamosPage;
