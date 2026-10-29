import PrintIcon from "@mui/icons-material/Print";
import {
  Alert, Box, Button, CircularProgress, FormControl, Grid, InputLabel, MenuItem, Paper, Select,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from "@mui/material";
import { useEffect, useState } from "react";

import axiosClient from "../../api/axiosClient";
import CampoFecha from "../../components/common/CampoFecha";

// Oficios al banco: una carta por banco y tipo de jubilación autorizando el débito
// de la cuenta del régimen y el crédito a las cuentas de los jubilados. El monto
// sale del listado de depósitos de la planilla.
const LLAVE_BANCOS = "rpj_oficios_bancos";
const LLAVE_FIRMAS = "rpj_oficios_firmas";
const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OficiosBanco = ({ selectorPlanilla, tipoPlanilla, descargar, descargando }) => {
  const [id, setId] = useState("");
  const [banco, setBanco] = useState("");
  const [tipo, setTipo] = useState("");
  const [fecha, setFecha] = useState(hoyIso());
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [bancos, setBancos] = useState({});
  const [conceptos, setConceptos] = useState({});
  const [firmas, setFirmas] = useState(() => leer(LLAVE_FIRMAS, null));

  useEffect(() => {
    if (!id) { setDatos(null); return; }
    setCargando(true); setError(null);
    axiosClient.get(`/impresiones/oficios-banco/${id}`)
      .then(({ data }) => {
        const d = data.data;
        setDatos(d);
        // Datos de cada banco: lo guardado en este equipo gana sobre lo propuesto.
        const guardados = leer(LLAVE_BANCOS, {});
        setBancos(Object.fromEntries(Object.entries(d.bancos).map(([b, v]) => [b, { ...v, ...(guardados[b] || {}) }])));
        setConceptos(Object.fromEntries(d.oficios.map((o) => [`${o.banco}|${o.grupo}`, o.periodos.join("\n")])));
        setFirmas((f) => f || [...d.firmas, { nombre: "", cargo: "" }].slice(0, 3));
      })
      .catch((e) => setError(e.response?.data?.message || "No fue posible cargar los oficios."))
      .finally(() => setCargando(false));
  }, [id]);

  const oficios = (datos?.oficios || []).filter((o) => (!banco || o.banco === banco) && (!tipo || o.grupo === tipo));
  const listaBancos = [...new Set((datos?.oficios || []).map((o) => o.banco))];
  const listaTipos = [...new Set((datos?.oficios || []).map((o) => o.grupo))];
  const firmasLista = firmas || [{ nombre: "", cargo: "" }, { nombre: "", cargo: "" }, { nombre: "", cargo: "" }];

  const setBancoCampo = (b, campo, valor) => {
    setBancos((prev) => {
      const nuevo = { ...prev, [b]: { ...prev[b], [campo]: valor } };
      guardar(LLAVE_BANCOS, { ...leer(LLAVE_BANCOS, {}), [b]: nuevo[b] });
      return nuevo;
    });
  };
  const setFirma = (i, campo, valor) => {
    const copia = firmasLista.map((f, k) => (k === i ? { ...f, [campo]: valor } : f));
    setFirmas(copia);
    guardar(LLAVE_FIRMAS, copia);
  };

  const imprimir = () => {
    const usados = Object.fromEntries(oficios.map((o) => [`${o.banco}|${o.grupo}`, conceptos[`${o.banco}|${o.grupo}`] || ""]));
    const q = new URLSearchParams({
      banco, tipoJubilacion: tipo, fecha,
      bancos: JSON.stringify(bancos),
      conceptos: JSON.stringify(usados),
      firmas: JSON.stringify(firmasLista.filter((f) => f.nombre?.trim() || f.cargo?.trim()))
    });
    descargar(`/impresiones/oficios-banco/${id}/pdf?${q.toString()}`, `oficios_banco_${datos?.planilla?.numero || id}.pdf`);
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Tamaño carta, una hoja por banco y tipo de jubilación. El monto es el total del listado de depósitos de
        ese banco y tipo; los beneficiarios de jubilados fallecidos van en su propio oficio. Los datos del banco y
        las firmas que cambie quedan guardados en este equipo.
      </Alert>

      <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            {selectorPlanilla(tipoPlanilla, id, (v) => { setId(v); setBanco(""); setTipo(""); }, "Planilla de jubilados (AAAAMM)")}
          </Grid>
          <Grid item xs={12} md={2.5}>
            <FormControl fullWidth disabled={!datos}>
              <InputLabel>Tipo de jubilación</InputLabel>
              <Select label="Tipo de jubilación" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {listaTipos.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth disabled={!datos}>
              <InputLabel>Banco</InputLabel>
              <Select label="Banco" value={banco} onChange={(e) => setBanco(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {listaBancos.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <CampoFecha label="Fecha del oficio y débito" value={fecha} onChange={setFecha} />
          </Grid>
          <Grid item xs={12} md={1.5}>
            <Button fullWidth variant="contained" startIcon={<PrintIcon />} disabled={!id || !oficios.length || descargando} onClick={imprimir}>
              Oficios
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {cargando && <CircularProgress size={26} />}
      {error && <Alert severity="error">{error}</Alert>}

      {datos && (
        <>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Oficios que se imprimen ({oficios.length})</Typography>
            {oficios.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No hay depósitos a cuenta para este filtro.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Banco</TableCell><TableCell>Tipo</TableCell><TableCell align="right">Depósitos</TableCell>
                    <TableCell align="right">Monto</TableCell><TableCell sx={{ width: "38%" }}>Periodo (un renglón por periodo, se puede cambiar)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {oficios.map((o) => {
                    const k = `${o.banco}|${o.grupo}`;
                    return (
                      <TableRow key={k}>
                        <TableCell>{o.banco}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{o.grupo}</TableCell>
                        <TableCell align="right">{o.depositos}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtQ(o.monto)}</TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth multiline minRows={1} value={conceptos[k] ?? ""}
                            onChange={(e) => setConceptos((c) => ({ ...c, [k]: e.target.value }))} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Datos del banco</Typography>
            <Stack spacing={1.5}>
              {Object.keys(bancos).filter((b) => !banco || b === banco).map((b) => (
                <Grid container spacing={1.5} key={b} alignItems="center">
                  <Grid item xs={12} md={1.5}><Typography sx={{ fontWeight: 700 }}>{b}</Typography></Grid>
                  <Grid item xs={12} md={3}><TextField size="small" fullWidth label="Nombre en el oficio" value={bancos[b].nombre || ""} onChange={(e) => setBancoCampo(b, "nombre", e.target.value)} /></Grid>
                  <Grid item xs={12} md={2.5}><TextField size="small" fullWidth label="Agencia" value={bancos[b].agencia || ""} onChange={(e) => setBancoCampo(b, "agencia", e.target.value)} /></Grid>
                  <Grid item xs={12} md={2.5}><TextField size="small" fullWidth label="Dirección" value={bancos[b].direccion || ""} onChange={(e) => setBancoCampo(b, "direccion", e.target.value)} /></Grid>
                  <Grid item xs={12} md={2.5}><TextField size="small" fullWidth label="Cuenta a debitar" value={bancos[b].cuenta || ""} onChange={(e) => setBancoCampo(b, "cuenta", e.target.value)}
                    error={!bancos[b].cuenta} helperText={!bancos[b].cuenta ? "Falta la cuenta" : ""} /></Grid>
                </Grid>
              ))}
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Firmas del oficio</Typography>
            <Typography variant="caption" color="text.secondary">Se proponen el Presidente y el Tesorero de la Junta Administradora. Deje vacía la que no use.</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
              {firmasLista.map((f, i) => (
                <Grid item xs={12} md={4} key={i}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <TextField size="small" label="Nombre" value={f.nombre || ""} onChange={(e) => setFirma(i, "nombre", e.target.value)} />
                    <TextField size="small" label="Cargo" value={f.cargo || ""} onChange={(e) => setFirma(i, "cargo", e.target.value)} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </>
      )}
    </Stack>
  );
};

export default OficiosBanco;
