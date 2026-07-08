import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import {
  Alert, Box, Button, Chip, FormControl, FormControlLabel, Grid, Paper, Radio, RadioGroup, Stack,
  Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import BuscadorPersona from "../../components/common/BuscadorPersona";
import PageHeader from "../../components/common/PageHeader";

const PRIMARIO = "#1F4E79";
const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hoy = () => new Date().toISOString().slice(0, 10);

const SuspensionesPage = () => {
  const [tab, setTab] = useState(0);

  // --- Suspender ---
  const [ben, setBen] = useState(null);
  const [monto, setMonto] = useState(0);
  const [motivo, setMotivo] = useState("EMPLEO_ESTATAL");
  const [empleador, setEmpleador] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");

  // --- Reactivar ---
  const [suspendidos, setSuspendidos] = useState([]);

  const cargarSuspendidos = async () => {
    try { const { data } = await axiosClient.get("/beneficiarios/suspendidos"); setSuspendidos(data.data || []); } catch { setSuspendidos([]); }
  };
  useEffect(() => { cargarSuspendidos(); }, []);

  const seleccionarBen = async (o) => {
    setMonto(0); setEmpleador(""); setFechaInicio(""); setMotivo("EMPLEO_ESTATAL");
    if (!o) { setBen(null); return; }
    setBen(o);
    try {
      const { data } = await axiosClient.get(`/jubilados/${o.idJubilado}/resumen-financiero`);
      const pension = Number(data.data?.pension || 0);
      setMonto(pension * 0.5 * (Number(o.porcentaje) / 100));
    } catch { setMonto(0); }
  };

  const validoSuspender = ben && (motivo !== "EMPLEO_ESTATAL" || (empleador.trim() && fechaInicio && fechaInicio <= hoy()));

  const suspender = async () => {
    if (!validoSuspender) { Swal.fire("Validación", "Complete los datos requeridos.", "warning"); return; }
    const nombre = `${ben.nombres || ""} ${ben.apellidos}`.trim();
    const r = await Swal.fire({
      title: "Suspender beneficiario",
      html: `<div style="text-align:left"><b>IMPORTANTE:</b><ul>
        <li>${nombre} dejará de cobrar <b>${fmtQ(monto)}</b> mensuales.</li>
        <li>NO se acumulará deuda por el tiempo suspendido.</li>
        <li>Cuando termine el empleo, debe reactivarse manualmente.</li></ul>¿Confirma?</div>`,
      icon: "warning", showCancelButton: true, confirmButtonText: "Sí, suspender", cancelButtonText: "Cancelar", confirmButtonColor: "#FF9800"
    });
    if (!r.isConfirmed) return;
    try {
      await axiosClient.post(`/beneficiarios/${ben.id}/suspender`, { motivo, empleador: empleador || null, fechaInicioEmpleo: fechaInicio || null });
      Swal.fire("Listo", "Beneficiario suspendido.", "success");
      setBen(null); setMonto(0); setEmpleador(""); setFechaInicio(""); cargarSuspendidos();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible suspender.", "error");
    }
  };

  const reactivar = async (row) => {
    const r = await Swal.fire({ title: "Reactivar beneficiaria", text: "La beneficiaria vuelve a cobrar. El tiempo suspendido NO se puede reclamar.", icon: "question", showCancelButton: true, confirmButtonText: "Reactivar", cancelButtonText: "Cancelar", confirmButtonColor: "#4CAF50" });
    if (!r.isConfirmed) return;
    try { await axiosClient.post(`/beneficiarios/${row.id}/reactivar`); Swal.fire("Listo", "Beneficiaria reactivada.", "success"); cargarSuspendidos(); }
    catch (error) { Swal.fire("Error", error.response?.data?.message || "No fue posible reactivar.", "error"); }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Suspensión por Empleo Estatal" subtitle="Suspende o reactiva el pago a beneficiarios" />

      <Paper sx={{ p: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Suspender" /><Tab label="Reactivar" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 2.5 }}>
            <BuscadorPersona
              label="Buscar beneficiario activo"
              endpoint="/beneficiarios/activos"
              value={null}
              getOptionLabel={(o) => (o ? `${o.nombres || ""} ${o.apellidos} — ${o.dpi}` : "")}
              onSelect={seleccionarBen}
            />
            {ben && (
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={6}><TextField label="Jubilado (padre)" value={ben.jubiladoNombre || ""} InputProps={{ readOnly: true }} variant="filled" fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField label="Monto mensual" value={fmtQ(monto)} InputProps={{ readOnly: true }} variant="filled" fullWidth /></Grid>
                <Grid item xs={12}>
                  <FormControl>
                    <Typography variant="caption" color="text.secondary">Motivo</Typography>
                    <RadioGroup row value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                      <FormControlLabel value="EMPLEO_ESTATAL" control={<Radio />} label="Empleo estatal" />
                      <FormControlLabel value="OTRO" control={<Radio />} label="Otro" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                {motivo === "EMPLEO_ESTATAL" && (
                  <>
                    <Grid item xs={12} md={8}><TextField label="Empleador estatal *" value={empleador} onChange={(e) => setEmpleador(e.target.value)} fullWidth /></Grid>
                    <Grid item xs={12} md={4}><TextField label="Fecha inicio empleo *" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} inputProps={{ max: hoy() }} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
                  </>
                )}
                <Grid item xs={12}><Button variant="contained" color="warning" startIcon={<BlockIcon />} disabled={!validoSuspender} onClick={suspender}>Suspender</Button></Grid>
              </Grid>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 1.5, color: PRIMARIO }}>Beneficiarios suspendidos</Typography>
            {suspendidos.length === 0 ? <Typography color="text.secondary">No hay beneficiarios suspendidos.</Typography> : (
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>Nombre</TableCell><TableCell>Jubilado</TableCell><TableCell align="right">%</TableCell>
                  <TableCell>Empleador</TableCell><TableCell>Inicio empleo</TableCell><TableCell align="center">Acción</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {suspendidos.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{`${b.nombres || ""} ${b.apellidos}`.trim()}</TableCell>
                      <TableCell>{b.jubiladoNombre}</TableCell>
                      <TableCell align="right">{Number(b.porcentaje).toFixed(2)}</TableCell>
                      <TableCell>{b.empleadorEstatal || "—"}</TableCell>
                      <TableCell>{b.fechaInicioEmpleo ? String(b.fechaInicioEmpleo).slice(0, 10) : "—"}</TableCell>
                      <TableCell align="center"><Button size="small" color="success" startIcon={<CheckCircleIcon />} onClick={() => reactivar(b)}>Reactivar</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}
      </Paper>
    </Stack>
  );
};

export default SuspensionesPage;
