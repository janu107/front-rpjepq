import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BadgeIcon from "@mui/icons-material/Badge";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ElderlyIcon from "@mui/icons-material/Elderly";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import PaymentsIcon from "@mui/icons-material/Payments";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SavingsIcon from "@mui/icons-material/Savings";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Box, Chip, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import axiosClient from "../api/axiosClient";
import { MENU_ITEMS, filterByRole } from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { hasRole } from "../utils/permissions";

// ============================================================================
// Panel principal: indicadores del régimen, nómina de jubilados de los últimos
// 12 meses, jubilados por tipo, aportes EPQ del año, pendientes y accesos.
// Las gráficas son SVG propios (una sola serie, color de la marca) con
// información al pasar el mouse.
// ============================================================================

const MARCA = "#1f4e5f";
const MARCA_2 = "#2e7d91";
const SUAVE = "#e8eef1";
const TEXTO_2 = "#5b6770";
const BORDE = "#dde3ea";
const MES3 = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n) => Number(n || 0).toLocaleString("en-US");
// Montos grandes abreviados para ejes y tarjetas: Q1.11M, Q268.3K.
const fmtCorto = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1e6) return `Q${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `Q${(v / 1e3).toFixed(1)}K`;
  return `Q${v.toFixed(0)}`;
};
const per = (p) => { const s = String(p || ""); return s.length === 6 ? `${MES3[Number(s.slice(4, 6)) - 1]} ${s.slice(2, 4)}` : s; };

const Tarjeta = ({ children, sx }) => (
  <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, border: `1px solid ${BORDE}`, borderRadius: 3, height: "100%", ...sx }}>{children}</Paper>
);

const Titulo = ({ titulo, subtitulo, accion }) => (
  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#1d2a31" }}>{titulo}</Typography>
      {subtitulo && <Typography variant="body2" sx={{ color: TEXTO_2 }}>{subtitulo}</Typography>}
    </Box>
    {accion}
  </Stack>
);

const Kpi = ({ icono, etiqueta, valor, detalle, to }) => (
  <Paper
    component={to ? RouterLink : "div"} to={to} elevation={0}
    sx={{
      p: 2.25, border: `1px solid ${BORDE}`, borderRadius: 3, height: "100%", display: "block", color: "inherit", textDecoration: "none",
      transition: "border-color 160ms ease, box-shadow 160ms ease",
      "&:hover": to ? { borderColor: MARCA_2, boxShadow: "0 10px 28px rgba(20,63,75,0.10)" } : undefined
    }}
  >
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: SUAVE, color: MARCA, display: "grid", placeItems: "center" }}>{icono}</Box>
      <Typography variant="body2" sx={{ color: TEXTO_2, fontWeight: 600 }}>{etiqueta}</Typography>
    </Stack>
    <Typography sx={{ mt: 1.25, fontSize: 28, fontWeight: 800, color: "#1d2a31", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{valor}</Typography>
    {detalle && <Typography variant="body2" sx={{ mt: 0.5, color: TEXTO_2 }}>{detalle}</Typography>}
  </Paper>
);

// Columnas verticales de una sola serie con eje Y discreto y tooltip al pasar el mouse.
const Columnas = ({ datos, alto = 230, etiquetaX, valorTexto, resaltar }) => {
  const [hover, setHover] = useState(null);
  const ancho = 640;
  const m = { izq: 58, der: 8, arr: 14, aba: 28 };
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const paso = (() => { const crudo = max / 4; const p = 10 ** Math.floor(Math.log10(crudo)); return Math.ceil(crudo / p) * p; })();
  const tope = paso * 4;
  const h = alto - m.arr - m.aba;
  const w = ancho - m.izq - m.der;
  const banda = w / datos.length;
  const barra = Math.min(34, banda * 0.62);
  const y = (v) => m.arr + h - (v / tope) * h;
  return (
    <Box sx={{ position: "relative" }}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%" role="img" style={{ display: "block", overflow: "visible" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={m.izq} x2={ancho - m.der} y1={y(paso * i)} y2={y(paso * i)} stroke="#eef1f3" />
            <text x={m.izq - 8} y={y(paso * i) + 4} textAnchor="end" fontSize="11" fill={TEXTO_2}>{fmtCorto(paso * i)}</text>
          </g>
        ))}
        {datos.map((d, i) => {
          const x = m.izq + banda * i + (banda - barra) / 2;
          const alt = Math.max(0, y(0) - y(d.valor));
          const r = Math.min(4, alt / 2, barra / 2);
          const es = resaltar ? resaltar(d) : false;
          const sel = hover === i;
          return (
            <g key={d.clave} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
              <rect x={m.izq + banda * i} y={m.arr} width={banda} height={h} fill={sel ? "rgba(31,78,95,0.05)" : "transparent"} />
              {alt > 0 && (
                <path
                  d={`M${x},${y(0)} V${y(d.valor) + r} Q${x},${y(d.valor)} ${x + r},${y(d.valor)} H${x + barra - r} Q${x + barra},${y(d.valor)} ${x + barra},${y(d.valor) + r} V${y(0)} Z`}
                  fill={es ? "#fff" : MARCA} stroke={es ? MARCA : "none"} strokeWidth={es ? 2 : 0} strokeDasharray={es ? "4 3" : undefined}
                  opacity={hover === null || sel ? 1 : 0.55}
                />
              )}
              <text x={m.izq + banda * i + banda / 2} y={alto - 8} textAnchor="middle" fontSize="11" fill={TEXTO_2}>{etiquetaX(d)}</text>
            </g>
          );
        })}
        <line x1={m.izq} x2={ancho - m.der} y1={y(0)} y2={y(0)} stroke="#c9d2d8" />
      </svg>
      {hover !== null && (
        <Box sx={{
          position: "absolute", top: 0, left: `${((m.izq + banda * hover + banda / 2) / ancho) * 100}%`, transform: "translate(-50%, -6px)",
          bgcolor: "#1d2a31", color: "#fff", px: 1.25, py: 0.75, borderRadius: 1.5, fontSize: 12, pointerEvents: "none", whiteSpace: "nowrap",
          boxShadow: "0 6px 18px rgba(0,0,0,0.18)"
        }}>
          {valorTexto(datos[hover])}
        </Box>
      )}
    </Box>
  );
};

// Barras horizontales con etiqueta directa (una sola serie).
const BarrasH = ({ datos }) => {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const total = datos.reduce((a, d) => a + d.valor, 0) || 1;
  return (
    <Stack spacing={1.5}>
      {datos.map((d) => (
        <Box key={d.etiqueta}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#1d2a31" }}>{d.etiqueta}</Typography>
            <Typography variant="body2" sx={{ color: TEXTO_2, fontVariantNumeric: "tabular-nums" }}>
              <b style={{ color: "#1d2a31" }}>{fmtN(d.valor)}</b> · {Math.round((d.valor / total) * 100)}%
            </Typography>
          </Stack>
          <Box sx={{ height: 10, bgcolor: "#eef1f3", borderRadius: 5, overflow: "hidden" }} title={`${d.etiqueta}: ${fmtN(d.valor)}`}>
            <Box sx={{ width: `${(d.valor / max) * 100}%`, height: "100%", bgcolor: MARCA, borderRadius: 5 }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

const NIVEL = {
  bien: { color: "#2e7d32", fondo: "#edf7ee", icono: <CheckCircleIcon fontSize="small" /> },
  aviso: { color: "#b26a00", fondo: "#fff5e5", icono: <WarningAmberIcon fontSize="small" /> },
  alerta: { color: "#c62828", fondo: "#fdecec", icono: <ErrorOutlineIcon fontSize="small" /> }
};
const Pendiente = ({ nivel, titulo, detalle, to }) => {
  const n = NIVEL[nivel];
  return (
    <Stack component={to ? RouterLink : "div"} to={to} direction="row" spacing={1.5} alignItems="center"
      sx={{ p: 1.25, borderRadius: 2, color: "inherit", textDecoration: "none", "&:hover": to ? { bgcolor: "#f5f8f9" } : undefined }}>
      <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: n.fondo, color: n.color, display: "grid", placeItems: "center", flex: "none" }}>{n.icono}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "#1d2a31" }}>{titulo}</Typography>
        {detalle && <Typography variant="caption" sx={{ color: TEXTO_2 }}>{detalle}</Typography>}
      </Box>
      {to && <ArrowForwardIcon fontSize="small" sx={{ color: "#9aa7af" }} />}
    </Stack>
  );
};

const ACCESOS = [
  { titulo: "Planilla de jubilados", detalle: "Generar, revisar y cerrar", icono: <PaymentsIcon />, to: "/planillas-pensionados" },
  { titulo: "Planilla de empleados", detalle: "Nómina del régimen", icono: <ReceiptLongIcon />, to: "/planillas-trabajadores" },
  { titulo: "Beneficiarios", detalle: "Viudez y orfandad", icono: <FamilyRestroomIcon />, to: "/beneficiarios" },
  { titulo: "Estado de cuenta", detalle: "Deuda y pagos por jubilado", icono: <AccountBalanceIcon />, to: "/estado-cuenta" },
  { titulo: "Impresión Jubilación", detalle: "Nómina, depósitos y oficios", icono: <PrintIcon />, to: "/impresiones-jubilacion" },
  { titulo: "Aportaciones EPQ", detalle: "Aportes y carga masiva", icono: <SavingsIcon />, to: "/aportaciones/detalle" }
];

const saludo = () => { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"; };
const hoyLargo = () => { const d = new Date(); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };

// Inicio para usuarios con ventanas puntuales (sin el panel general del sistema):
// accesos directos a sus ventanas.
const InicioUsuario = ({ user }) => {
  const grupos = filterByRole(MENU_ITEMS, user).filter((g) => g.children?.length);
  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>{saludo()}{user?.nombre ? `, ${user.nombre}` : ""}</Typography>
        <Typography color="text.secondary">{hoyLargo()} · Estas son las ventanas a las que tiene acceso.</Typography>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
        {grupos.map((g) => (
          <Paper key={g.text} elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea", borderRadius: 3 }}>
            <Typography sx={{ fontWeight: 800, color: "#1F4E5F", mb: 1 }}>{g.text}</Typography>
            <Stack spacing={0.5}>
              {g.children.map((c) => (
                <Box key={c.path} component={RouterLink} to={c.path}
                  sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", color: "text.primary", p: 1, borderRadius: 2, "&:hover": { bgcolor: "#F2F6F8" } }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.text}</Typography>
                  <ArrowForwardIcon fontSize="small" color="action" />
                </Box>
              ))}
            </Stack>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  // El panel general (cifras de todo el sistema) es del superusuario y de los operadores generales.
  const panelGeneral = hasRole(user, ["ADMIN", "OPERADOR", "ADMINISTRACION"]);
  return panelGeneral ? <PanelGeneral /> : <InicioUsuario user={user} />;
};

const PanelGeneral = () => {
  const [d, setD] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    axiosClient.get("/dashboard/general").then(({ data }) => setD(data.data)).catch(() => setError(true));
  }, []);

  const ultJub = d?.planillas?.jubilados?.slice(-1)[0];
  const varAportes = useMemo(() => {
    if (!d) return null;
    const meses = d.aportes.porMes.filter((v) => v > 0).length || 1;
    const promedio = d.aportes.actual / meses;
    return { meses, promedio };
  }, [d]);

  const pendientes = useMemo(() => {
    if (!d) return [];
    const p = d.pendientes;
    const lista = [];
    p.planillasGeneradas.forEach((g) => lista.push({
      nivel: "aviso", titulo: `Planilla ${g.numero} generada sin cerrar`, detalle: String(g.tipo).replace(/\s+/g, " "),
      to: /JUBIL/i.test(g.tipo) ? "/planillas-pensionados" : "/planillas-trabajadores"
    }));
    if (p.jubiladosSinDatosPago > 0) lista.push({ nivel: "alerta", titulo: `${fmtN(p.jubiladosSinDatosPago)} jubilados sin datos de pago`, detalle: "Sin banco, cuenta ni forma de pago registrada", to: "/jubilados" });
    if (p.menoresSinTutor > 0) lista.push({ nivel: "alerta", titulo: `${p.menoresSinTutor} menores sin tutor`, detalle: "Beneficiarios activos que necesitan tutor", to: "/beneficiarios" });
    if (p.sesionesSinAprobar > 0) lista.push({ nivel: "aviso", titulo: `${p.sesionesSinAprobar} sesiones de junta sin aprobar`, detalle: "Apruébelas para poder pagar las dietas", to: "/dietas" });
    if (p.dietasPendientes > 0) lista.push({ nivel: "aviso", titulo: `${p.dietasPendientes} pagos de dietas pendientes`, detalle: "Registrar cheque o transferencia", to: "/dietas" });
    if (!lista.length) lista.push({ nivel: "bien", titulo: "Todo al día", detalle: "No hay pendientes" });
    return lista;
  }, [d]);

  if (error) {
    return <Tarjeta><Typography color="text.secondary" align="center" sx={{ py: 4 }}>No se pudo cargar el panel. Recargue la página.</Typography></Tarjeta>;
  }

  return (
    <Stack spacing={2.5}>
      {/* Encabezado */}
      <Paper elevation={0} sx={{
        p: { xs: 2.5, md: 3.5 }, borderRadius: 3, color: "#fff", position: "relative", overflow: "hidden",
        background: `linear-gradient(120deg, ${MARCA} 0%, #276174 60%, ${MARCA_2} 100%)`
      }}>
        <Box sx={{ position: "absolute", right: -60, top: -60, width: 240, height: 240, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.06)" }} />
        <Box sx={{ position: "absolute", right: 90, bottom: -90, width: 200, height: 200, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.05)" }} />
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "flex-end" }} sx={{ position: "relative" }}>
          <Box>
            <Typography sx={{ opacity: 0.85, fontSize: 14 }}>{saludo()} · {hoyLargo()}</Typography>
            <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 800, mt: 0.5, lineHeight: 1.15 }}>
              Régimen de Pensiones y Jubilaciones
            </Typography>
            <Typography sx={{ opacity: 0.85, mt: 0.5 }}>Empresa Portuaria Quetzal · panel general del sistema</Typography>
          </Box>
          {ultJub && (
            <Box sx={{ bgcolor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 2.5, px: 2, py: 1.25, minWidth: 230 }}>
              <Typography sx={{ fontSize: 12, opacity: 0.85 }}>Última planilla de jubilados</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 20, fontVariantNumeric: "tabular-nums" }}>{fmtQ(ultJub.neto)}</Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.9 }}>{ultJub.numero} · {ultJub.estado} · {fmtN(ultJub.personas)} pagos</Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Indicadores */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        {!d ? [1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={128} />) : (
          <>
            <Box>
              <Kpi icono={<ElderlyIcon fontSize="small" />} etiqueta="Jubilados activos" valor={fmtN(d.personas.jubilados)}
                detalle={`${fmtN(d.personas.beneficiarios)} beneficiarios · ${fmtN(d.personas.fallecidos)} fallecidos`} to="/jubilados" />
            </Box>
            <Box>
              <Kpi icono={<SavingsIcon fontSize="small" />} etiqueta="Aportantes EPQ" valor={fmtN(d.personas.aportantes)}
                detalle={`${fmtCorto(d.aportes.actual)} aportado en ${d.aportes.anio}`} to="/aportaciones" />
            </Box>
            <Box>
              <Kpi icono={<BadgeIcon fontSize="small" />} etiqueta="Empleados del régimen" valor={fmtN(d.personas.empleados)}
                detalle={`${fmtN(d.personas.junta)} miembros de junta directiva`} to="/empleados-regimen" />
            </Box>
            <Box>
              <Kpi icono={<AccountBalanceIcon fontSize="small" />} etiqueta="Deuda con jubilados" valor={fmtCorto(d.deuda.total)}
                detalle={`${fmtN(d.deuda.jubiladosPersonas + d.deuda.beneficiariosPersonas)} personas con saldo pendiente`} to="/reportes-jubilados" />
            </Box>
          </>
        )}
      </Box>

      {/* Nómina de jubilados + por tipo */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" } }}>
        <Box>
          <Tarjeta>
            <Titulo titulo="Nómina de jubilados" subtitulo="Neto pagado por planilla, últimos 12 meses (la punteada está generada, sin cerrar)"
              accion={<Chip size="small" component={RouterLink} clickable to="/planillas-pensionados" label="Ver planillas" sx={{ bgcolor: SUAVE, color: MARCA, fontWeight: 700 }} />} />
            {!d ? <Skeleton variant="rounded" height={230} /> : (
              <Columnas
                datos={d.planillas.jubilados.map((p) => ({ clave: p.numero, valor: p.neto, p }))}
                etiquetaX={(x) => per(x.clave)}
                resaltar={(x) => x.p.estado === "GENERADA"}
                valorTexto={(x) => <><b>{x.clave}</b> · {fmtQ(x.valor)}<br />{fmtN(x.p.personas)} pagos · {x.p.estado}</>}
              />
            )}
          </Tarjeta>
        </Box>
        <Box>
          <Tarjeta>
            <Titulo titulo="Jubilados por tipo" subtitulo="Activos que cobran en la nómina" />
            {!d ? <Skeleton variant="rounded" height={230} /> : <BarrasH datos={d.jubiladosPorTipo.map((t) => ({ etiqueta: t.tipo, valor: t.personas }))} />}
          </Tarjeta>
        </Box>
      </Box>

      {/* Aportes + pendientes */}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "7fr 5fr" } }}>
        <Box>
          <Tarjeta>
            <Titulo titulo={`Aportes EPQ ${d?.aportes?.anio || ""}`}
              subtitulo={d ? `${fmtQ(d.aportes.actual)} en el año · promedio ${fmtCorto(varAportes.promedio)} por mes · ${d.aportes.anio - 1}: ${fmtCorto(d.aportes.anterior)}` : " "}
              accion={<Chip size="small" component={RouterLink} clickable to="/aportaciones-dashboard" label="Ver detalle" sx={{ bgcolor: SUAVE, color: MARCA, fontWeight: 700 }} />} />
            {!d ? <Skeleton variant="rounded" height={210} /> : (
              <Columnas alto={210}
                datos={d.aportes.porMes.map((v, i) => ({ clave: i, valor: v }))}
                etiquetaX={(x) => MES3[x.clave]}
                valorTexto={(x) => <><b>{MESES[x.clave]} {d.aportes.anio}</b><br />{x.valor > 0 ? fmtQ(x.valor) : "Sin aportes cargados"}</>}
              />
            )}
          </Tarjeta>
        </Box>
        <Box>
          <Tarjeta>
            <Titulo titulo="Pendientes" subtitulo="Lo que requiere atención" />
            {!d ? <Skeleton variant="rounded" height={210} /> : (
              <Stack spacing={0.25}>{pendientes.map((p, i) => <Pendiente key={`${i}-${p.titulo}`} {...p} />)}</Stack>
            )}
          </Tarjeta>
        </Box>
      </Box>

      {/* Accesos rápidos */}
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#1d2a31", mb: 1.25 }}>Accesos rápidos</Typography>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" } }}>
          {ACCESOS.map((a) => (
            <Box key={a.to}>
              <Paper component={RouterLink} to={a.to} elevation={0} sx={{
                p: 1.75, height: "100%", display: "block", border: `1px solid ${BORDE}`, borderRadius: 3, color: "inherit", textDecoration: "none",
                transition: "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
                "&:hover": { transform: "translateY(-2px)", borderColor: MARCA_2, boxShadow: "0 10px 28px rgba(20,63,75,0.10)" }
              }}>
                <Box sx={{ color: MARCA, mb: 0.75 }}>{a.icono}</Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#1d2a31" }}>{a.titulo}</Typography>
                <Typography variant="caption" sx={{ color: TEXTO_2 }}>{a.detalle}</Typography>
              </Paper>
            </Box>
          ))}
        </Box>
      </Box>
    </Stack>
  );
};

export default Dashboard;
