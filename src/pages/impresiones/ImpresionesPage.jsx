import PrintIcon from "@mui/icons-material/Print";
import {
  Alert, Autocomplete, Box, Button, Divider, FormControl, FormControlLabel, Grid, InputLabel,
  MenuItem, Paper, Select, Stack, Switch, Tab, Tabs, TextField, Typography
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/common/PageHeader";

// Impresiones formales (mejoras 14-18). Cada pestaña arma los parámetros y pide
// el PDF al backend, que es quien maqueta el formato oficio / carta.

const hoy = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const primerDiaMes = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
const ultimoDiaMes = iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
const primerDiaAnio = iso(new Date(hoy.getFullYear(), 0, 1));

const fecha = (v) => (v ? String(v).slice(0, 10) : "");
const money = (v) => `Q ${Number(v || 0).toFixed(2)}`;

// Los nombres de quienes firman NO viven en el sistema: se envían con cada
// impresión, y aquí quedan precargados para no retecleárlos cada vez.
const FIRMAS_INICIALES = [
  { nombre: "", cargo: "", rol: "Elaborado por" },
  { nombre: "", cargo: "", rol: "Revisado por" },
  { nombre: "", cargo: "", rol: "Autorizado por" },
  { nombre: "", cargo: "", rol: "Autorizado por" }
];

const TIPO_EMPLEADOS = 1;
const TIPO_TIEMPO_EXTRA = 3;

const ImpresionesPage = () => {
  const [tab, setTab] = useState(0);
  const [planillas, setPlanillas] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [descargando, setDescargando] = useState(false);

  const [firmas, setFirmas] = useState(FIRMAS_INICIALES);

  const [idSueldos, setIdSueldos] = useState("");
  const [porAreaSueldos, setPorAreaSueldos] = useState(true);
  const [idExtra, setIdExtra] = useState("");
  const [porAreaExtra, setPorAreaExtra] = useState(true);
  const [prestamoSel, setPrestamoSel] = useState(null);
  const [resumen, setResumen] = useState({ tipoManejo: 1, desde: primerDiaAnio, hasta: ultimoDiaMes });
  const [rangoPrestamos, setRangoPrestamos] = useState({ desde: primerDiaMes, hasta: ultimoDiaMes });

  const cargar = useCallback(async () => {
    try {
      const [{ data: pl }, { data: pr }] = await Promise.all([
        axiosClient.get("/reportes/nomina/planillas"),
        axiosClient.get("/prestamos")
      ]);
      setPlanillas(pl.data || []);
      setPrestamos(pr.data || []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar los catálogos.", "error");
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const planillasDe = (tipo) => planillas.filter((p) => Number(p.idTipoPlanilla) === tipo);
  const firmasParam = useMemo(
    () => encodeURIComponent(JSON.stringify(firmas.filter((f) => f.nombre?.trim() || f.cargo?.trim()))),
    [firmas]
  );

  const descargar = async (url, filename) => {
    setDescargando(true);
    try {
      const respuesta = await axiosClient.get(url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([respuesta.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // El backend responde JSON en los errores; al pedir blob hay que leerlo.
      let mensaje = "No fue posible generar la impresión.";
      try {
        const texto = await error.response?.data?.text?.();
        if (texto) mensaje = JSON.parse(texto).message || mensaje;
      } catch { /* se queda el mensaje genérico */ }
      Swal.fire("Error", mensaje, "error");
    } finally {
      setDescargando(false);
    }
  };

  const setFirma = (i, campo) => (e) => {
    const copia = [...firmas];
    copia[i] = { ...copia[i], [campo]: e.target.value };
    setFirmas(copia);
  };

  const editorFirmas = (
    <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Firmas del documento</Typography>
      <Typography variant="caption" color="text.secondary">
        Se imprimen al pie de las nóminas. Déjelas vacías si prefiere firmar sobre líneas en blanco.
      </Typography>
      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
        {firmas.map((f, i) => (
          <Grid item xs={12} md={3} key={f.rol + i}>
            <Stack spacing={1}>
              <TextField size="small" label="Rol" value={f.rol} onChange={setFirma(i, "rol")} />
              <TextField size="small" label="Nombre" value={f.nombre} onChange={setFirma(i, "nombre")} />
              <TextField size="small" label="Cargo" value={f.cargo} onChange={setFirma(i, "cargo")} />
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );

  const selectorPlanilla = (tipo, valor, onChange, etiqueta) => (
    <FormControl fullWidth>
      <InputLabel>{etiqueta}</InputLabel>
      <Select label={etiqueta} value={valor} onChange={(e) => onChange(e.target.value)}>
        {planillasDe(tipo).map((p) => (
          <MenuItem key={p.idPlanilla} value={p.idPlanilla}>
            {p.numeroPlanilla} — {fecha(p.fechaInicio)} al {fecha(p.fechaFinal)} — pago {fecha(p.fechaPago)}
          </MenuItem>
        ))}
        {planillasDe(tipo).length === 0 && <MenuItem value="" disabled>No hay planillas de este tipo</MenuItem>}
      </Select>
    </FormControl>
  );

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Impresiones"
        subtitle="Nóminas en formato oficio, estados de cuenta y resúmenes en carta"
      />

      <Paper elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Nómina de sueldos" />
          <Tab label="Nómina tiempo extra" />
          <Tab label="Estado de cuenta préstamo" />
          <Tab label="Resumen" />
          <Tab label="Nómina de préstamos" />
        </Tabs>
      </Paper>

      {/* 14. Nómina de sueldos */}
      {tab === 0 && (
        <Stack spacing={2}>
          <Alert severity="info">
            Formato oficio. El área se toma del puesto de cada empleado; quien no tenga puesto o área
            asignada aparece agrupado como <b>SIN AREA</b>.
          </Alert>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={7}>
                {selectorPlanilla(TIPO_EMPLEADOS, idSueldos, setIdSueldos, "Planilla de empleados de régimen")}
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Switch checked={porAreaSueldos} onChange={(e) => setPorAreaSueldos(e.target.checked)} />}
                  label="Agrupar por área"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" startIcon={<PrintIcon />} disabled={!idSueldos || descargando}
                  onClick={() => descargar(
                    `/impresiones/nomina-sueldos/${idSueldos}/pdf?porArea=${porAreaSueldos}&firmas=${firmasParam}`,
                    `nomina_sueldos_${idSueldos}.pdf`
                  )}>
                  Imprimir
                </Button>
              </Grid>
            </Grid>
          </Paper>
          {editorFirmas}
        </Stack>
      )}

      {/* 15. Nómina de tiempo extra */}
      {tab === 1 && (
        <Stack spacing={2}>
          <Alert severity="info">Formato oficio, agrupado por área, con horas normales y dobles.</Alert>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={7}>
                {selectorPlanilla(TIPO_TIEMPO_EXTRA, idExtra, setIdExtra, "Planilla de tiempo extraordinario")}
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Switch checked={porAreaExtra} onChange={(e) => setPorAreaExtra(e.target.checked)} />}
                  label="Agrupar por área"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" startIcon={<PrintIcon />} disabled={!idExtra || descargando}
                  onClick={() => descargar(
                    `/impresiones/nomina-tiempo-extra/${idExtra}/pdf?porArea=${porAreaExtra}&firmas=${firmasParam}`,
                    `nomina_tiempo_extra_${idExtra}.pdf`
                  )}>
                  Imprimir
                </Button>
              </Grid>
            </Grid>
          </Paper>
          {editorFirmas}
        </Stack>
      )}

      {/* 16. Estado de cuenta de préstamo EPQ */}
      {tab === 2 && (
        <Stack spacing={2}>
          <Alert severity="info">Tamaño carta, vertical. Incluye la tabla de amortización del préstamo.</Alert>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={9}>
                <Autocomplete
                  options={prestamos}
                  value={prestamoSel}
                  onChange={(_, v) => setPrestamoSel(v)}
                  isOptionEqualToValue={(o, v) => o.id === v?.id}
                  getOptionLabel={(o) => (o ? `${o.id} - ${o.noContrato} - ${o.aportacionNombre}` : "")}
                  filterOptions={(opciones, { inputValue }) => {
                    const terminos = String(inputValue || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
                    if (!terminos.length) return opciones;
                    return opciones.filter((o) => {
                      const texto = `${o.id} ${o.noContrato || ""} ${o.aportacionNombre || ""} ${o.aportacionDpi || ""}`.toLowerCase();
                      return terminos.every((t) => texto.includes(t));
                    });
                  }}
                  renderOption={(props, o) => (
                    <li {...props} key={o.id}>
                      {o.id} — {o.noContrato} — {o.aportacionNombre} ({money(o.montoAutorizado)})
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label="Préstamo" placeholder="Escriba contrato, código, nombre o DPI" />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button fullWidth variant="contained" startIcon={<PrintIcon />} disabled={!prestamoSel || descargando}
                  onClick={() => descargar(
                    `/impresiones/prestamo/${prestamoSel.id}/estado-cuenta/pdf`,
                    `estado_cuenta_${prestamoSel.noContrato || prestamoSel.id}.pdf`
                  )}>
                  Imprimir
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Stack>
      )}

      {/* 17. Resumen */}
      {tab === 3 && (
        <Stack spacing={2}>
          <Alert severity="info">
            Tamaño carta, vertical. Muestra el total por área y el desglose por concepto
            (sueldos, tiempo extra, bono 14, aguinaldo y bono vacacional) según la fecha de pago de cada planilla.
          </Alert>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de manejo</InputLabel>
                  <Select label="Tipo de manejo" value={resumen.tipoManejo}
                    onChange={(e) => setResumen({ ...resumen, tipoManejo: e.target.value })}>
                    <MenuItem value={1}>Empleados de régimen</MenuItem>
                    <MenuItem value={2}>Jubilados</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth type="date" label="Pagos desde" InputLabelProps={{ shrink: true }}
                  value={resumen.desde} onChange={(e) => setResumen({ ...resumen, desde: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth type="date" label="Pagos hasta" InputLabelProps={{ shrink: true }}
                  value={resumen.hasta} onChange={(e) => setResumen({ ...resumen, hasta: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" startIcon={<PrintIcon />} disabled={descargando}
                  onClick={() => descargar(
                    `/impresiones/resumen/pdf?tipoManejo=${resumen.tipoManejo}&desde=${resumen.desde}&hasta=${resumen.hasta}`,
                    `resumen_${resumen.desde}_${resumen.hasta}.pdf`
                  )}>
                  Imprimir
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Stack>
      )}

      {/* 18. Nómina mensual de préstamos EPQ */}
      {tab === 4 && (
        <Stack spacing={2}>
          <Alert severity="info">
            Formato oficio. Es un corte <b>mensual</b>: si amplía el rango a varios meses, un mismo
            préstamo aparecerá una vez por cada cuota del período.
          </Alert>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="date" label="Desde" InputLabelProps={{ shrink: true }}
                  value={rangoPrestamos.desde} onChange={(e) => setRangoPrestamos({ ...rangoPrestamos, desde: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="date" label="Hasta" InputLabelProps={{ shrink: true }}
                  value={rangoPrestamos.hasta} onChange={(e) => setRangoPrestamos({ ...rangoPrestamos, hasta: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button fullWidth variant="contained" startIcon={<PrintIcon />} disabled={descargando}
                  onClick={() => descargar(
                    `/impresiones/nomina-prestamos/pdf?desde=${rangoPrestamos.desde}&hasta=${rangoPrestamos.hasta}&firmas=${firmasParam}`,
                    `nomina_prestamos_${rangoPrestamos.desde}.pdf`
                  )}>
                  Imprimir
                </Button>
              </Grid>
            </Grid>
          </Paper>
          {editorFirmas}
        </Stack>
      )}

      <Box>
        <Divider sx={{ mb: 1 }} />
        <Typography variant="caption" color="text.secondary">
          Los PDF se descargan directamente. Si una planilla no tiene renglones generados, la impresión se rechaza.
        </Typography>
      </Box>
    </Stack>
  );
};

export default ImpresionesPage;
