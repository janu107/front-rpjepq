import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import {
  Alert, Box, Button, CircularProgress, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/common/PageHeader";

// Depósitos de la nómina de jubilados por banco y tipo de jubilación, por planilla
// (AAAAMM). Detalle por banco ("Van / Vienen") y resumen general; PDF y Excel.
const PRIMARIO = "#1F4E79";
const MES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
const fmtQ = (n) => `Q ${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPer = (p) => { const s = String(p || ""); return s.length === 6 ? `${s} — ${MES[Number(s.slice(4, 6)) - 1]} ${s.slice(0, 4)}` : s; };
const FIRMAS = [
  { rol: "Elaborado por", nombre: "", cargo: "" },
  { rol: "Vo.Bo.", nombre: "", cargo: "" },
  { rol: "Autorizado por", nombre: "", cargo: "" }
];
const CLAVE_FIRMAS = "rpj_firmas_depositos";

const DepositosBancoPage = () => {
  const [params] = useSearchParams();
  const [planillas, setPlanillas] = useState([]);
  const [idPlanilla, setIdPlanilla] = useState(params.get("planilla") || "");
  const [banco, setBanco] = useState("");
  const [seccion, setSeccion] = useState("todo");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(null);
  const [firmas, setFirmas] = useState(() => {
    try { const g = JSON.parse(localStorage.getItem(CLAVE_FIRMAS) || "null"); return Array.isArray(g) && g.length ? g : FIRMAS; } catch { return FIRMAS; }
  });

  useEffect(() => {
    axiosClient.get("/impresiones/depositos-banco/planillas").then(({ data }) => {
      const lista = data.data || [];
      setPlanillas(lista);
      setIdPlanilla((actual) => actual || (lista[0] ? String(lista[0].id) : ""));
    }).catch(() => setPlanillas([]));
  }, []);

  useEffect(() => {
    if (!idPlanilla) return;
    setCargando(true);
    axiosClient.get(`/impresiones/depositos-banco/${idPlanilla}`)
      .then(({ data }) => setDatos(data.data))
      .catch((e) => { setDatos(null); Swal.fire("Error", e.response?.data?.message || "No fue posible cargar los depósitos.", "error"); })
      .finally(() => setCargando(false));
  }, [idPlanilla]);

  const setFirma = (i, campo) => (e) => {
    const copia = firmas.map((f, k) => (k === i ? { ...f, [campo]: e.target.value } : f));
    setFirmas(copia);
    try { localStorage.setItem(CLAVE_FIRMAS, JSON.stringify(copia)); } catch { /* sin almacenamiento */ }
  };

  const descargar = async (formato) => {
    const planilla = planillas.find((p) => String(p.id) === String(idPlanilla));
    const q = new URLSearchParams({
      seccion, ...(banco ? { banco } : {}),
      firmas: JSON.stringify(firmas.filter((f) => f.nombre.trim() || f.cargo.trim()))
    });
    try {
      setDescargando(formato);
      const { data } = await axiosClient.get(`/impresiones/depositos-banco/${idPlanilla}/${formato}?${q}`, { responseType: "blob" });
      const tipo = formato === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const url = window.URL.createObjectURL(new Blob([data], { type: tipo }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `depositos_${planilla?.numero || idPlanilla}${banco ? `_${banco.toLowerCase().replace(/\s+/g, "_")}` : ""}.${formato === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      let msg = "No fue posible generar el reporte.";
      try { const t = await error.response?.data?.text?.(); if (t) msg = JSON.parse(t).message || msg; } catch { /* genérico */ }
      Swal.fire("Error", msg, "error");
    } finally { setDescargando(null); }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Depósitos por Banco" subtitle="Nómina de jubilados: depósitos por banco y tipo de jubilación, por planilla (AAAAMM)" />

      <Paper sx={{ p: 2.5 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Planilla (AAAAMM)</InputLabel>
              <Select label="Planilla (AAAAMM)" value={idPlanilla} onChange={(e) => setIdPlanilla(e.target.value)}>
                {planillas.map((p) => <MenuItem key={p.id} value={String(p.id)}>{fmtPer(p.numero)} · {p.estado}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Banco</InputLabel>
              <Select label="Banco" value={banco} onChange={(e) => setBanco(e.target.value)}>
                <MenuItem value="">Todos los bancos</MenuItem>
                {(datos?.bancos || []).map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Contenido</InputLabel>
              <Select label="Contenido" value={seccion} onChange={(e) => setSeccion(e.target.value)}>
                <MenuItem value="todo">Detalle por banco + resumen general</MenuItem>
                <MenuItem value="detalle">Solo detalle por banco</MenuItem>
                <MenuItem value="resumen">Solo resumen general</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Stack direction={{ xs: "row", md: "column" }} spacing={1}>
              <Button variant="contained" startIcon={descargando === "pdf" ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />} disabled={!idPlanilla || !!descargando} onClick={() => descargar("pdf")}>PDF</Button>
              <Button variant="outlined" startIcon={descargando === "excel" ? <CircularProgress size={16} /> : <DownloadIcon />} disabled={!idPlanilla || !!descargando} onClick={() => descargar("excel")}>Excel</Button>
            </Stack>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 2.5 }}>Firmas del reporte</Typography>
        <Typography variant="caption" color="text.secondary">Se recuerdan en este equipo. Déjelas vacías para firmar sobre líneas en blanco.</Typography>
        <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
          {firmas.map((f, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Stack spacing={1}>
                <TextField size="small" label="Rol" value={f.rol} onChange={setFirma(i, "rol")} />
                <TextField size="small" label="Nombre" value={f.nombre} onChange={setFirma(i, "nombre")} />
                <TextField size="small" label="Cargo" value={f.cargo} onChange={setFirma(i, "cargo")} />
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARIO, mb: 1.5 }}>Resumen por banco y tipo de jubilación</Typography>
        {cargando && <CircularProgress size={24} />}
        {!cargando && !datos && <Typography color="text.secondary">Seleccione una planilla.</Typography>}
        {!cargando && datos && (
          <Box sx={{ overflowX: "auto" }}>
            {datos.bancos.includes("SIN DATOS DE PAGO") && (
              <Alert severity="warning" sx={{ mb: 1.5 }}>Hay jubilados o beneficiarios sin datos de pago: aparecen como "SIN DATOS DE PAGO".</Alert>
            )}
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "#F4F6F8" } }}>
                  <TableCell>Tipo de jubilación</TableCell>
                  {datos.bancos.map((b) => <TableCell key={b} align="right">{b}</TableCell>)}
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {datos.matriz.map((m) => (
                  <TableRow key={m.tipo} hover>
                    <TableCell>{m.tipo}</TableCell>
                    {datos.bancos.map((b) => <TableCell key={b} align="right">{m.porBanco[b] ? fmtQ(m.porBanco[b]) : "—"}</TableCell>)}
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtQ(m.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ "& td": { fontWeight: 800, bgcolor: "#EEF2F6" } }}>
                  <TableCell>TOTAL ({datos.depositos} depósitos)</TableCell>
                  {datos.bancos.map((b) => <TableCell key={b} align="right">{fmtQ(datos.totalBanco[b])}</TableCell>)}
                  <TableCell align="right" sx={{ color: PRIMARIO }}>{fmtQ(datos.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Stack>
  );
};

export default DepositosBancoPage;
