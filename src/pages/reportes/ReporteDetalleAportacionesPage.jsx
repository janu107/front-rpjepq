import SearchIcon from "@mui/icons-material/Search";
import {
  Alert, Autocomplete, Box, Grid, InputAdornment, Paper, TextField, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import ReportePDF from "./ReportePDF";

// Reporte de detalle de aportaciones: es un estado de cuenta INDIVIDUAL.
// Antes traía las ~150 000 aportaciones de todos los empleados en una sola
// tabla, lo que además de ilegible dejaba la pantalla trabada. Ahora se elige
// un empleado por código o nombre y se listan sólo sus aportaciones.

const money = (v) => `Q ${Number(v || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (v) => (v ? String(v).slice(0, 10) : "—");

const COLUMNS = [
  { key: "fechaPago", label: "Fecha de pago", width: 160, render: (r) => fmt(r.fechaPago) },
  { key: "valor", label: "Monto", width: 160, render: (r) => money(r.valor) }
];

// Busca por código, nombre, apellido o DPI; todas las palabras, en cualquier orden.
const filtrarEmpleado = (opciones, { inputValue }) => {
  const terminos = String(inputValue || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terminos.length) return opciones.slice(0, 50);
  return opciones.filter((o) => {
    const texto = `${o.aportanteId || ""} ${o.nombre || ""} ${o.apellido || ""} ${o.dpi || ""}`.toLowerCase();
    return terminos.every((t) => texto.includes(t));
  }).slice(0, 50);
};

const Dato = ({ etiqueta, valor }) => (
  <Grid item xs={6} md={2.4}>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 700 }}>
      {etiqueta}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>{valor ?? "—"}</Typography>
  </Grid>
);

const ReporteDetalleAportacionesPage = () => {
  const [empleados, setEmpleados] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => {
    axiosClient.get("/reportes/regimen/aportaciones")
      .then((res) => setEmpleados(res.data.data || []))
      .catch(() => setEmpleados([]))
      .finally(() => setCargandoLista(false));
  }, []);

  useEffect(() => {
    if (!seleccionado) { setMovimientos([]); return; }
    setCargandoDetalle(true);
    axiosClient.get(`/reportes/regimen/aportaciones/${seleccionado.id}/detalle`)
      .then((res) => setMovimientos(res.data.data || []))
      .catch(() => setMovimientos([]))
      .finally(() => setCargandoDetalle(false));
  }, [seleccionado]);

  // El total y la cantidad se calculan de los movimientos recibidos, no del
  // resumen de la lista, para que cuadren con lo que se está imprimiendo.
  const totalAportado = useMemo(
    () => movimientos.reduce((s, m) => s + Number(m.valor || 0), 0),
    [movimientos]
  );

  // El PDF de este reporte lo genera el backend (carta vertical), igual que el
  // resto de las Impresiones: así no depende de los márgenes ni del encabezado
  // que agrega el diálogo de impresión del navegador.
  const descargarPdf = async () => {
    if (!seleccionado) return;
    try {
      const respuesta = await axiosClient.get(
        `/impresiones/aportaciones/${seleccionado.id}/estado-cuenta/pdf`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([respuesta.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `aportaciones_${seleccionado.aportanteId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      Swal.fire("Error", "No fue posible generar el PDF.", "error");
    }
  };

  const selector = (
    <Paper elevation={0} className="no-print" sx={{ p: 2, border: "1px solid #dde3ea" }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Empleado EPQ</Typography>
      <Autocomplete
        options={empleados}
        loading={cargandoLista}
        value={seleccionado}
        onChange={(_, v) => setSeleccionado(v)}
        isOptionEqualToValue={(o, v) => o.id === v?.id}
        getOptionLabel={(o) => (o ? `${o.aportanteId} - ${o.nombre} ${o.apellido}` : "")}
        filterOptions={filtrarEmpleado}
        noOptionsText="Sin coincidencias"
        sx={{ maxWidth: 620 }}
        renderOption={(props, o) => (
          <li {...props} key={o.id}>
            {o.aportanteId} — {o.nombre} {o.apellido}{o.gerencia ? ` · ${o.gerencia}` : ""}
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Escriba el código o el nombre del empleado"
            InputProps={{
              ...params.InputProps,
              startAdornment: (<><InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>{params.InputProps.startAdornment}</>)
            }}
          />
        )}
      />
    </Paper>
  );

  // Ficha que se imprime arriba del detalle.
  const ficha = seleccionado ? (
    <Paper
      elevation={0}
      sx={{
        p: 2, border: "1px solid #dde3ea", bgcolor: "rgba(31,78,95,0.04)",
        "@media print": { border: "1px solid #bbb", bgcolor: "transparent", p: 1 }
      }}
    >
      <Grid container spacing={1.5}>
        <Dato etiqueta="Código" valor={seleccionado.aportanteId} />
        <Dato etiqueta="Nombre" valor={`${seleccionado.nombre} ${seleccionado.apellido}`} />
        <Dato etiqueta="Área / Gerencia" valor={seleccionado.gerencia} />
        <Dato etiqueta="Total aportado" valor={money(totalAportado)} />
        <Dato etiqueta="Cantidad de aportes" valor={movimientos.length} />
      </Grid>
    </Paper>
  ) : null;

  if (!seleccionado) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={800}>Reporte de Detalle de Aportaciones</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Estado de cuenta de aportaciones por empleado</Typography>
        {selector}
        <Alert severity="info" sx={{ mt: 2 }}>
          Seleccione un empleado por código o nombre para ver e imprimir su detalle de aportaciones.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {selector}
      <Box sx={{ mt: 2 }}>
        <ReportePDF
          titulo="Reporte de Detalle de Aportaciones"
          rows={movimientos}
          loading={cargandoDetalle}
          columns={COLUMNS}
          orientacion="vertical"
          encabezado={ficha}
          anchoTabla={560}
          onImprimir={descargarPdf}
          getTotales={(f) => [
            { label: "Cantidad de aportes", value: f.length },
            { label: "Total aportado", value: money(f.reduce((s, r) => s + Number(r.valor || 0), 0)), main: true }
          ]}
        />
      </Box>
    </Box>
  );
};

export default ReporteDetalleAportacionesPage;
