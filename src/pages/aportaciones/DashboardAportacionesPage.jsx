import {
  Box, Card, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, Tooltip, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/common/PageHeader";

// Dashboard de aportaciones de empleados EPQ: cuánto se aporta por año y quiénes
// han aportado más. Una sola serie por gráfica (un color), sin librerías externas.

const PRIMARIO = "#1F4E79";
const PRIMARIO_SUAVE = "#8FA9C4";
const GRID = "#E6EBF0";

const fmtQ = (n) => `Q ${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n) => Number(n || 0).toLocaleString("es-GT");
const fmtCorto = (n) => {
  const v = Number(n || 0);
  if (v >= 1e6) return `Q${(v / 1e6).toLocaleString("es-GT", { maximumFractionDigits: 1 })}M`;
  if (v >= 1e3) return `Q${(v / 1e3).toLocaleString("es-GT", { maximumFractionDigits: 0 })}K`;
  return `Q${v.toFixed(0)}`;
};
const fecha = (v) => (v ? new Date(v).toLocaleDateString("es-GT", { month: "short", year: "numeric" }) : "");

const Kpi = ({ etiqueta, valor, nota }) => (
  <Card sx={{ p: 2, height: "100%" }}>
    <Typography variant="caption" color="text.secondary">{etiqueta}</Typography>
    <Typography sx={{ fontWeight: 800, fontSize: { xs: 22, md: 26 }, color: PRIMARIO, lineHeight: 1.2, mt: 0.5, fontVariantNumeric: "tabular-nums" }}>
      {valor}
    </Typography>
    {nota && <Typography variant="caption" color="text.secondary">{nota}</Typography>}
  </Card>
);

// Barras verticales: total aportado por año. Clic en una barra filtra por ese año.
const GraficaPorAnio = ({ datos, anioSel, onElegir, anioParcial }) => {
  const max = Math.max(...datos.map((d) => d.total), 1);
  const escala = useMemo(() => {
    const paso = Math.pow(10, Math.floor(Math.log10(max)));
    const tope = Math.ceil(max / paso) * paso;
    return [0, 0.25, 0.5, 0.75, 1].map((f) => f * tope);
  }, [max]);
  const tope = escala[escala.length - 1];
  const ALTO = 220;

  return (
    <Box sx={{ position: "relative", pl: 7, pr: 1 }}>
      {/* Cuadrícula y eje Y */}
      <Box sx={{ position: "absolute", left: 0, right: 8, top: 0, height: ALTO }}>
        {escala.map((v) => (
          <Box key={v} sx={{ position: "absolute", left: 56, right: 0, bottom: `${(v / tope) * 100}%`, borderTop: `1px solid ${GRID}` }}>
            <Typography variant="caption" sx={{ position: "absolute", left: -56, width: 50, textAlign: "right", top: -9, color: "text.secondary", fontSize: 11 }}>
              {fmtCorto(v)}
            </Typography>
          </Box>
        ))}
      </Box>
      {/* Barras */}
      <Box sx={{ position: "relative", height: ALTO, display: "flex", alignItems: "flex-end", gap: "2px" }}>
        {datos.map((d) => {
          const elegido = anioSel === String(d.anio);
          const atenuado = anioSel && !elegido;
          return (
            <Tooltip
              key={d.anio} arrow placement="top"
              title={(
                <Box sx={{ p: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{d.anio}{String(d.anio) === String(anioParcial) ? " (año en curso)" : ""}</Typography>
                  <Typography sx={{ fontSize: 12 }}>Total: <b>{fmtQ(d.total)}</b></Typography>
                  <Typography sx={{ fontSize: 12 }}>{fmtN(d.aportes)} aportes · {fmtN(d.empleados)} empleados</Typography>
                  <Typography sx={{ fontSize: 11, opacity: 0.8, mt: 0.5 }}>Clic para ver ese año</Typography>
                </Box>
              )}
            >
              <Box
                onClick={() => onElegir(elegido ? "" : String(d.anio))}
                sx={{ flex: 1, minWidth: 6, height: "100%", display: "flex", alignItems: "flex-end", cursor: "pointer", "&:hover > div": { opacity: 0.85 } }}
              >
                <Box sx={{
                  width: "100%", height: `${Math.max((d.total / tope) * 100, 0.5)}%`,
                  bgcolor: String(d.anio) === String(anioParcial) ? PRIMARIO_SUAVE : PRIMARIO,
                  borderRadius: "4px 4px 0 0", opacity: atenuado ? 0.3 : 1, transition: "opacity .15s"
                }} />
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      {/* Eje X: un año sí y uno no si son muchos */}
      <Box sx={{ display: "flex", gap: "2px", mt: 0.5 }}>
        {datos.map((d, i) => (
          <Typography key={d.anio} variant="caption" sx={{
            flex: 1, minWidth: 6, textAlign: "center", fontSize: 10, color: anioSel === String(d.anio) ? "text.primary" : "text.secondary",
            fontWeight: anioSel === String(d.anio) ? 700 : 400, visibility: datos.length > 16 && i % 2 && i !== datos.length - 1 ? "hidden" : "visible",
            whiteSpace: "nowrap"
          }}>
            {datos.length > 16 ? `'${String(d.anio).slice(-2)}` : d.anio}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

// Barras horizontales: total por gerencia.
const BarrasGerencia = ({ filas }) => {
  const max = Math.max(...filas.map((g) => g.total), 1);
  return (
    <Stack spacing={1.25}>
      {filas.map((g) => (
        <Tooltip key={g.gerencia} arrow placement="top" title={`${fmtN(g.empleados)} empleados · ${fmtN(g.aportes)} aportes`}>
          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.gerencia}</Typography>
              <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtQ(g.total)} <Typography component="span" variant="caption" color="text.secondary">· {g.porcentaje}%</Typography>
              </Typography>
            </Stack>
            <Box sx={{ height: 8, bgcolor: GRID, borderRadius: 4 }}>
              <Box sx={{ height: "100%", width: `${(g.total / max) * 100}%`, bgcolor: PRIMARIO, borderRadius: 4 }} />
            </Box>
          </Box>
        </Tooltip>
      ))}
    </Stack>
  );
};

const DashboardAportacionesPage = () => {
  const [anio, setAnio] = useState("");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    axiosClient.get("/aportaciones/dashboard", { params: anio ? { anio } : {} })
      .then(({ data }) => { if (vigente) setDatos(data.data); })
      .catch(() => { if (vigente) setDatos(null); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [anio]);

  const anios = useMemo(() => (datos?.porAnio || []).map((d) => String(d.anio)).reverse(), [datos]);
  const k = datos?.kpiAnio;
  const anioKpi = datos?.anioKpi;
  const parcial = k && k.meses < 12;
  const ultimoAnio = datos?.porAnio?.length ? datos.porAnio[datos.porAnio.length - 1].anio : null;
  const etiquetaFiltro = anio ? `en ${anio}` : "en todos los años";

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Dashboard de Aportaciones" subtitle="Aportaciones de los empleados EPQ: cuánto se aporta por año y quiénes han aportado más" />

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Año</InputLabel>
            <Select label="Año" value={anio} onChange={(e) => setAnio(e.target.value)}>
              <MenuItem value="">Todos los años</MenuItem>
              {anios.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          {datos?.general && (
            <Typography variant="body2" color="text.secondary">
              Historial del {fecha(datos.general.desde)} al {fecha(datos.general.hasta)} · {fmtN(datos.general.aportes)} aportes registrados
            </Typography>
          )}
          {cargando && <CircularProgress size={20} />}
        </Stack>
      </Paper>

      {!datos && !cargando && <Paper sx={{ p: 3 }}><Typography color="text.secondary">No fue posible cargar el dashboard.</Typography></Paper>}

      {datos && (
        <>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
            <Kpi etiqueta="Total aportado (histórico)" valor={fmtQ(datos.general.total)} nota={`${fmtN(datos.general.empleados)} empleados han aportado`} />
            <Kpi etiqueta={`Total aportado ${anioKpi}`} valor={fmtQ(k.total)} nota={parcial ? `Año en curso: ${k.meses} mes(es) registrados` : `${fmtN(k.aportes)} aportes`} />
            <Kpi etiqueta={`Empleados que aportaron en ${anioKpi}`} valor={fmtN(k.empleados)} nota={`${fmtN(datos.general.activos)} empleados activos`} />
            <Kpi etiqueta={`Aporte mensual promedio ${anioKpi}`} valor={fmtQ(k.promedioMensualEmpleado)} nota="por empleado" />
          </Box>

          <Paper sx={{ p: 2.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "baseline" }} sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARIO }}>Total aportado por año</Typography>
              <Typography variant="caption" color="text.secondary">
                Pase el mouse para ver el detalle; clic en una barra para filtrar ese año.{ultimoAnio && parcial && !anio ? ` ${ultimoAnio} en tono claro: año en curso.` : ""}
              </Typography>
            </Stack>
            <GraficaPorAnio datos={datos.porAnio} anioSel={anio} onElegir={setAnio} anioParcial={parcial ? ultimoAnio : null} />
          </Paper>

          <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "1.7fr 1fr" } }}>
            <Paper sx={{ p: 2.5, overflowX: "auto" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARIO }}>Quiénes han aportado más</Typography>
              <Typography variant="caption" color="text.secondary">Top 15 {etiquetaFiltro}</Typography>
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary" } }}>
                    <TableCell>#</TableCell><TableCell>Código</TableCell><TableCell>Empleado</TableCell>
                    <TableCell align="right">Aportes</TableCell><TableCell align="right">Total</TableCell><TableCell sx={{ minWidth: 110 }}>% del total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {datos.top.map((t, i) => (
                    <TableRow key={t.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: i < 3 ? PRIMARIO : "text.secondary" }}>{i + 1}</TableCell>
                      <TableCell>{t.codigo}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.gerencia || "Sin gerencia"} · desde {fecha(t.desde)}</Typography>
                      </TableCell>
                      <TableCell align="right">{fmtN(t.aportes)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtQ(t.total)}</TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ flex: 1, height: 6, bgcolor: GRID, borderRadius: 3 }}>
                            <Box sx={{ height: "100%", width: `${Math.min(100, (t.total / (datos.top[0]?.total || 1)) * 100)}%`, bgcolor: PRIMARIO, borderRadius: 3 }} />
                          </Box>
                          <Typography variant="caption" sx={{ minWidth: 34, textAlign: "right" }}>{t.porcentaje}%</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!datos.top.length && <TableRow><TableCell colSpan={6} align="center">Sin aportes {etiquetaFiltro}.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Paper>

            <Paper sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARIO }}>Aportes por gerencia</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                {fmtQ(datos.totalFiltro)} {etiquetaFiltro}
              </Typography>
              <BarrasGerencia filas={datos.porGerencia} />
            </Paper>
          </Box>
        </>
      )}
    </Stack>
  );
};

export default DashboardAportacionesPage;
