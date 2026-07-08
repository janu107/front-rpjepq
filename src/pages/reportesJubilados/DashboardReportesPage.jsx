import { Box, Card, CardActionArea, CircularProgress, Grid, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/common/PageHeader";
import ReporteTabla from "../../components/common/ReporteTabla";

const PRIMARIO = "#1F4E79";
const ROJO = "#F44336";
const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPeriodo = (p) => { const s = String(p || ""); return s.length === 6 ? `${s.slice(4, 6)}/${s.slice(0, 4)}` : s; };

const KpiCard = ({ label, valor, onClick, big }) => (
  <Card sx={{ height: "100%", bgcolor: big ? "rgba(244,67,54,0.06)" : undefined }}>
    <CardActionArea onClick={onClick} sx={{ p: 2, height: "100%" }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: big ? 30 : 26, color: big ? ROJO : PRIMARIO }}>{valor}</Typography>
    </CardActionArea>
  </Card>
);

const DashboardReportesPage = () => {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    (async () => {
      try { const { data } = await axiosClient.get("/jubilados-reportes/dashboard"); setKpi(data.data); }
      catch { setKpi(null); } finally { setLoading(false); }
    })();
  }, []);

  const irEstadoCuenta = (row) => navigate("/estado-cuenta", { state: { id: row.idJubilado } });

  const reportes = useMemo(() => [
    {
      label: "Saldos", endpoint: "/jubilados-reportes/saldos", onRowClick: irEstadoCuenta,
      columns: [
        { key: "nombre", label: "Jubilado" }, { key: "dpi", label: "DPI" }, { key: "tipoPago", label: "Tipo" },
        { key: "estadoPago", label: "Estado" }, { key: "saldo", label: "Saldo", align: "right", render: (r) => fmtQ(r.saldo), csv: (r) => r.saldo }
      ]
    },
    {
      label: "Pagos", endpoint: "/jubilados-reportes/pagos",
      filtros: [{ key: "desde", label: "Desde" }, { key: "hasta", label: "Hasta" }],
      columns: [
        { key: "periodo", label: "Período" }, { key: "fechaPago", label: "Fecha pago", render: (r) => (r.fechaPago ? String(r.fechaPago).slice(0, 10) : "") },
        { key: "beneficiario", label: "Beneficiario/Jubilado" }, { key: "total", label: "Total", align: "right", render: (r) => fmtQ(r.total), csv: (r) => r.total }
      ]
    },
    {
      label: "Beneficiarios activos", endpoint: "/jubilados-reportes/beneficiarios-activos",
      columns: [
        { key: "nombre", label: "Nombre" }, { key: "dpi", label: "DPI" }, { key: "parentesco", label: "Parentesco" },
        { key: "porcentaje", label: "%", align: "right", render: (r) => Number(r.porcentaje).toFixed(2) }, { key: "jubilado", label: "Jubilado" }
      ]
    },
    {
      label: "Convenios", endpoint: "/jubilados-reportes/convenios",
      columns: [
        { key: "titular", label: "Titular" }, { key: "tipo", label: "Tipo" }, { key: "estado", label: "Estado" },
        { key: "deudaTotal", label: "Deuda", align: "right", render: (r) => fmtQ(r.deudaTotal), csv: (r) => r.deudaTotal },
        { key: "montoCuota", label: "Cuota", align: "right", render: (r) => fmtQ(r.montoCuota), csv: (r) => r.montoCuota }
      ]
    },
    {
      label: "Deuda por tipo", endpoint: "/jubilados-reportes/deuda-por-tipo",
      columns: [
        { key: "tipoPago", label: "Tipo de pago" }, { key: "periodosDeuda", label: "Períodos", align: "right" },
        { key: "saldo", label: "Saldo", align: "right", render: (r) => fmtQ(r.saldo), csv: (r) => r.saldo }
      ]
    },
    {
      label: "Amparistas", endpoint: "/jubilados-reportes/amparistas",
      columns: [
        { key: "nombre", label: "Jubilado" }, { key: "dpi", label: "DPI" }, { key: "estadoPago", label: "Estado" },
        { key: "noExpediente", label: "Expediente" }, { key: "juzgado", label: "Juzgado" },
        { key: "fechaEfectiva", label: "F. Efectiva", render: (r) => (r.fechaEfectiva ? String(r.fechaEfectiva).slice(0, 10) : "") }
      ]
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const rep = reportes[tab];

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Dashboard de Reportes" subtitle="Indicadores y reportes del módulo de jubilados" />

      {loading ? <Paper sx={{ p: 3 }}><CircularProgress size={26} /></Paper> : kpi && (
        <Grid container spacing={2}>
          <Grid item xs={6} md={4} lg={2}><KpiCard label="Jubilados NORMAL activos" valor={kpi.jubiladosNormalActivos} onClick={() => setTab(0)} /></Grid>
          <Grid item xs={6} md={4} lg={2}><KpiCard label="Amparistas" valor={kpi.amparistas} onClick={() => setTab(5)} /></Grid>
          <Grid item xs={6} md={4} lg={2}><KpiCard label="Fallecidos c/ beneficiarios" valor={kpi.fallecidosConBeneficiarios} onClick={() => setTab(2)} /></Grid>
          <Grid item xs={6} md={4} lg={2}><KpiCard label="Beneficiarios activos" valor={kpi.beneficiariosActivos} onClick={() => setTab(2)} /></Grid>
          <Grid item xs={6} md={4} lg={2}><KpiCard label="Beneficiarios suspendidos" valor={kpi.beneficiariosSuspendidos} onClick={() => setTab(2)} /></Grid>
          <Grid item xs={6} md={4} lg={2}><KpiCard label="DEUDA TOTAL" valor={fmtQ(kpi.deudaTotal)} onClick={() => setTab(4)} big /></Grid>
        </Grid>
      )}

      <Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 1.5 }}>
          {reportes.map((r) => <Tab key={r.label} label={r.label} />)}
        </Tabs>
        <ReporteTabla key={rep.endpoint} title={rep.label} endpoint={rep.endpoint} columns={rep.columns} filtros={rep.filtros} onRowClick={rep.onRowClick} />
      </Box>
    </Stack>
  );
};

export default DashboardReportesPage;
