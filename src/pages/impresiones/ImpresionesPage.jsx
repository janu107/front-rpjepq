import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import {
  Alert, Autocomplete, Box, Button, Divider, FormControl, Grid, InputLabel,
  MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Typography
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
// Planillas de nómina de jubilados: pensionados (2) y amparistas (4).
const TIPOS_JUBILADOS = [2, 4];
const TIPO_PENSIONADOS = 2;
const EXCEL = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Pestañas por grupo: "general" (Impresiones) y "jubilacion" (Impresión Jubilación).
const PESTANAS = [
  "Nómina de sueldos", "Nómina tiempo extra", "Estado de cuenta préstamo", "Resumen", "Nómina de préstamos",
  "Nómina jubilados", "Resumen jubilados", "Depósitos por banco", "Resumen de depósitos"
];
const GRUPOS = { general: [0, 1, 2, 3, 4], jubilacion: [5, 6, 7, 8] };

const ImpresionesPage = ({ grupo = "general" }) => {
  const visibles = GRUPOS[grupo] || GRUPOS.general;
  const [posicion, setPosicion] = useState(0);
  const tab = visibles[Math.min(posicion, visibles.length - 1)];
  useEffect(() => { setPosicion(0); }, [grupo]);
  const [planillas, setPlanillas] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [descargando, setDescargando] = useState(false);

  const [firmas, setFirmas] = useState(FIRMAS_INICIALES);

  const [opciones, setOpciones] = useState({ areas: [], tiposJubilacion: [] });
  const [idSueldos, setIdSueldos] = useState("");
  const [areaSueldos, setAreaSueldos] = useState("");
  const [idNomJub, setIdNomJub] = useState("");
  const [tipoNomJub, setTipoNomJub] = useState("");
  const [idResJub, setIdResJub] = useState("");
  const [tipoResJub, setTipoResJub] = useState("");
  const [idExtra, setIdExtra] = useState("");
  const [areaExtra, setAreaExtra] = useState("");
  const [prestamoSel, setPrestamoSel] = useState(null);
  const [resumen, setResumen] = useState({ tipoManejo: 1, desde: primerDiaAnio, hasta: ultimoDiaMes });
  const [rangoPrestamos, setRangoPrestamos] = useState({ desde: primerDiaMes, hasta: ultimoDiaMes });
  // Depósitos por banco y su resumen (planilla de jubilados).
  const [dep, setDep] = useState({ id: "", banco: "", tipo: "" });
  const [resDep, setResDep] = useState({ id: "", banco: "", tipo: "" });
  const [bancosPlanilla, setBancosPlanilla] = useState({});
  const cargarBancos = async (id) => {
    if (!id || bancosPlanilla[id]) return;
    try {
      const { data } = await axiosClient.get(`/impresiones/depositos-banco/${id}`);
      setBancosPlanilla((b) => ({ ...b, [id]: data.data?.bancos || [] }));
    } catch { /* sin lista, se imprimen todos */ }
  };

  const cargar = useCallback(async () => {
    try {
      const [{ data: pl }, { data: pr }, { data: op }] = await Promise.all([
        axiosClient.get("/reportes/nomina/planillas"),
        axiosClient.get("/prestamos"),
        axiosClient.get("/impresiones/opciones")
      ]);
      setPlanillas(pl.data || []);
      setPrestamos(pr.data || []);
      setOpciones(op.data || { areas: [], tiposJubilacion: [] });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar los catálogos.", "error");
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const planillasDe = (tipo) => planillas.filter((p) => (Array.isArray(tipo) ? tipo : [tipo]).includes(Number(p.idTipoPlanilla)));
  const firmasParam = useMemo(
    () => encodeURIComponent(JSON.stringify(firmas.filter((f) => f.nombre?.trim() || f.cargo?.trim()))),
    [firmas]
  );

  const descargar = async (url, filename, tipo = "application/pdf") => {
    setDescargando(true);
    try {
      const respuesta = await axiosClient.get(url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([respuesta.data], { type: tipo }));
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

  // Selector de planilla editable: se puede escribir (número, tipo o fecha) y la
  // lista se va filtrando, además de desplegarla como antes.
  const etiquetaPlanilla = (p) => `${p.numeroPlanilla} — ${p.tipoPlanillaNombre ? `${p.tipoPlanillaNombre} — ` : ""}${fecha(p.fechaInicio)} al ${fecha(p.fechaFinal)} — pago ${fecha(p.fechaPago)}`;
  const selectorPlanilla = (tipo, valor, onChange, etiqueta) => {
    // La más reciente primero (202610, 202609, …).
    const opcionesPlanilla = [...planillasDe(tipo)].sort((a, b) => Number(b.numeroPlanilla) - Number(a.numeroPlanilla));
    return (
      <Autocomplete
        options={opcionesPlanilla}
        value={opcionesPlanilla.find((p) => p.idPlanilla === valor) || null}
        // Al escribir "202609" + Tab (o Enter) toma la planilla resaltada y no borra lo escrito.
        autoHighlight
        autoSelect
        filterOptions={(opciones, { inputValue }) => {
          const t = String(inputValue || "").trim().toLowerCase();
          if (!t) return opciones;
          const palabras = t.split(/\s+/);
          const lista = opciones.filter((o) => palabras.every((w) => etiquetaPlanilla(o).toLowerCase().includes(w)));
          // Las que empiezan con lo escrito (el número de planilla) van primero.
          return [...lista.filter((o) => String(o.numeroPlanilla).startsWith(t)), ...lista.filter((o) => !String(o.numeroPlanilla).startsWith(t))];
        }}
        onChange={(_, v) => onChange(v ? v.idPlanilla : "")}
        isOptionEqualToValue={(o, v) => o.idPlanilla === v?.idPlanilla}
        getOptionLabel={(o) => (o ? etiquetaPlanilla(o) : "")}
        noOptionsText="No hay planillas de este tipo"
        renderOption={(props, o) => <li {...props} key={o.idPlanilla}>{etiquetaPlanilla(o)}</li>}
        renderInput={(params) => <TextField {...params} label={etiqueta} placeholder="Escriba el número o la fecha" />}
      />
    );
  };

  const selectorArea = (valor, onChange) => (
    <FormControl fullWidth>
      <InputLabel>Área</InputLabel>
      <Select label="Área" value={valor} onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="">Todas (agrupadas por área)</MenuItem>
        {opciones.areas.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
      </Select>
    </FormControl>
  );

  const selectorTipoJubilacion = (valor, onChange) => (
    <FormControl fullWidth>
      <InputLabel>Tipo de jubilación</InputLabel>
      <Select label="Tipo de jubilación" value={valor} onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="">Todos (separado por tipo)</MenuItem>
        {opciones.tiposJubilacion.map((t) => (
          <MenuItem key={t.id} value={t.nombre}>{t.nombre}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title={grupo === "jubilacion" ? "Impresión Jubilación" : "Impresiones"}
        subtitle={grupo === "jubilacion"
          ? "Nómina y resumen de jubilados, depósitos por banco y resumen de depósitos"
          : "Nóminas en formato oficio, estados de cuenta y resúmenes en carta"}
      />

      <Paper elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Tabs value={Math.min(posicion, visibles.length - 1)} onChange={(_, v) => setPosicion(v)} variant="scrollable" scrollButtons="auto">
          {visibles.map((i) => <Tab key={i} label={PESTANAS[i]} />)}
        </Tabs>
      </Paper>

      {/* 14. Nómina de sueldos */}
      {tab === 0 && (
        <Stack spacing={2}>
          <Alert severity="info">
            Formato oficio. El área se toma del puesto de cada empleado; quien no tenga puesto o área
            asignada aparece como <b>SIN AREA</b>. Elija un área para imprimir solo esa (su nombre sale al
            centro del encabezado) o deje <b>Todas</b> para ver cada área por separado.
          </Alert>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                {selectorPlanilla(TIPO_EMPLEADOS, idSueldos, setIdSueldos, "Planilla de empleados de régimen")}
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Área</InputLabel>
                  <Select label="Área" value={areaSueldos} onChange={(e) => setAreaSueldos(e.target.value)}>
                    <MenuItem value="">Todas (agrupadas por área)</MenuItem>
                    {opciones.areas.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" startIcon={<PrintIcon />} disabled={!idSueldos || descargando}
                  onClick={() => descargar(
                    `/impresiones/nomina-sueldos/${idSueldos}/pdf?area=${encodeURIComponent(areaSueldos)}&firmas=${firmasParam}`,
                    `nomina_sueldos_${idSueldos}.pdf`
                  )}>
                  Imprimir
                </Button>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="outlined" disabled={!idSueldos || descargando}
                  onClick={() => descargar(
                    `/impresiones/nomina-sueldos/${idSueldos}/excel?area=${encodeURIComponent(areaSueldos)}`,
                    `nomina_sueldos_${idSueldos}.xlsx`, EXCEL
                  )}>
                  Excel
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
          <Alert severity="info">Formato oficio, con horas normales y dobles. Elija un área para imprimir solo esa, o Todas para verlas agrupadas.</Alert>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={7}>
                {selectorPlanilla(TIPO_TIEMPO_EXTRA, idExtra, setIdExtra, "Planilla de tiempo extraordinario")}
              </Grid>
              <Grid item xs={12} md={3}>
                {selectorArea(areaExtra, setAreaExtra)}
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" startIcon={<PrintIcon />} disabled={!idExtra || descargando}
                  onClick={() => descargar(
                    `/impresiones/nomina-tiempo-extra/${idExtra}/pdf?area=${encodeURIComponent(areaExtra)}&firmas=${firmasParam}`,
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

      {/* Nómina de jubilados */}
      {tab === 5 && (
        <Stack spacing={2}>
          <Alert severity="info">
            Formato oficio. Sin elegir tipo, la nómina sale separada por tipo de jubilación (retiro voluntario,
            vejez, viudez…) con su subtotal; al elegir uno, sale solo ese tipo.
          </Alert>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                {selectorPlanilla(TIPOS_JUBILADOS, idNomJub, setIdNomJub, "Planilla de jubilados")}
              </Grid>
              <Grid item xs={12} md={4}>{selectorTipoJubilacion(tipoNomJub, setTipoNomJub)}</Grid>
              <Grid item xs={12} md={3}>
                <Button fullWidth variant="contained" startIcon={<PrintIcon />} disabled={!idNomJub || descargando}
                  onClick={() => descargar(
                    `/impresiones/nomina-jubilados/${idNomJub}/pdf?tipoJubilacion=${encodeURIComponent(tipoNomJub)}&firmas=${firmasParam}`,
                    `nomina_jubilados_${idNomJub}.pdf`
                  )}>
                  Imprimir nómina
                </Button>
              </Grid>
            </Grid>
          </Paper>
          {editorFirmas}
        </Stack>
      )}

      {/* Resumen de nómina de jubilados */}
      {tab === 6 && (
        <Stack spacing={2}>
          <Alert severity="info">
            Tamaño carta. Pensiones por tipo de jubilación y remesas por destino (bancos, judicial, asociación…).
            Con un tipo elegido, el resumen cubre solo esos jubilados.
          </Alert>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                {selectorPlanilla(TIPOS_JUBILADOS, idResJub, setIdResJub, "Planilla de jubilados")}
              </Grid>
              <Grid item xs={12} md={4}>{selectorTipoJubilacion(tipoResJub, setTipoResJub)}</Grid>
              <Grid item xs={12} md={3}>
                <Button fullWidth variant="contained" startIcon={<PrintIcon />} disabled={!idResJub || descargando}
                  onClick={() => descargar(
                    `/impresiones/resumen-jubilados/${idResJub}/pdf?tipoJubilacion=${encodeURIComponent(tipoResJub)}&firmas=${firmasParam}`,
                    `resumen_jubilados_${idResJub}.pdf`
                  )}>
                  Imprimir resumen
                </Button>
              </Grid>
            </Grid>
          </Paper>
          {editorFirmas}
        </Stack>
      )}

      {/* Depósitos por banco (detalle) y resumen de depósitos */}
      {(tab === 7 || tab === 8) && (() => {
        const esResumen = tab === 8;
        const v = esResumen ? resDep : dep;
        const setV = esResumen ? setResDep : setDep;
        const bancos = bancosPlanilla[v.id] || [];
        const query = () => `seccion=${esResumen ? "resumen" : "detalle"}&banco=${encodeURIComponent(v.banco)}&tipoJubilacion=${encodeURIComponent(v.tipo)}&firmas=${firmasParam}`;
        const nombre = `${esResumen ? "resumen_depositos" : "depositos"}_${v.id}`;
        return (
          <Stack spacing={2}>
            <Alert severity="info">
              {esResumen
                ? "Tamaño carta. Totales a depositar por tipo de jubilación y por banco, con el total general."
                : "Tamaño carta. Listado de depósitos por banco y tipo de jubilación (código, nombre, cuenta y monto), con \"Van / Vienen\" entre hojas y totales. A los menores se les deposita a la tutora."}
            </Alert>
            <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  {selectorPlanilla(TIPO_PENSIONADOS, v.id, (id) => { setV({ ...v, id, banco: "" }); cargarBancos(id); }, "Planilla de jubilados (AAAAMM)")}
                </Grid>
                <Grid item xs={12} md={3}>{selectorTipoJubilacion(v.tipo, (tipo) => setV({ ...v, tipo }))}</Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Banco</InputLabel>
                    <Select label="Banco" value={v.banco} onChange={(e) => setV({ ...v, banco: e.target.value })}>
                      <MenuItem value="">Todos</MenuItem>
                      {bancos.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={1.5}>
                  <Button fullWidth variant="contained" startIcon={<PrintIcon />} disabled={!v.id || descargando}
                    onClick={() => descargar(`/impresiones/depositos-banco/${v.id}/pdf?${query()}`, `${nombre}.pdf`)}>
                    PDF
                  </Button>
                </Grid>
                <Grid item xs={6} md={1.5}>
                  <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} disabled={!v.id || descargando}
                    onClick={() => descargar(`/impresiones/depositos-banco/${v.id}/excel?${query()}`, `${nombre}.xlsx`, EXCEL)}>
                    Excel
                  </Button>
                </Grid>
              </Grid>
            </Paper>
            {editorFirmas}
          </Stack>
        );
      })()}

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
