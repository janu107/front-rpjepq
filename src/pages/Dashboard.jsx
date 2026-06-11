import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ElderlyIcon from "@mui/icons-material/Elderly";
import GroupsIcon from "@mui/icons-material/Groups";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ShieldIcon from "@mui/icons-material/Shield";
import SupervisedUserCircleIcon from "@mui/icons-material/SupervisedUserCircle";
import { Box, Chip, Grid, LinearProgress, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import axiosClient from "../api/axiosClient";

const NAV_CARDS = [
  { label: "Operacion", value: "Mantenimientos y catalogos", icon: <PeopleAltIcon />, path: "/empleados" },
  { label: "Nomina", value: "Generacion y reportes", icon: <AccountBalanceWalletIcon />, path: "/nomina" },
  { label: "Seguridad", value: "Roles y auditoria", icon: <ShieldIcon />, path: "/roles" }
];

const CHART_COLORS = {
  regimen: "#1f4e5f",
  aportaciones: "#2e7d91",
  jubilados: "#6ab5c4"
};

const BarRow = ({ label, count, total, color, icon }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="body2" fontWeight={600}>{label}</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">{pct}%</Typography>
          <Chip label={count} size="small" sx={{ bgcolor: color, color: "#fff", fontWeight: 700, minWidth: 46 }} />
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 10,
          borderRadius: 5,
          bgcolor: "rgba(0,0,0,0.08)",
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 5 }
        }}
      />
    </Stack>
  );
};

const Dashboard = () => {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get("/reportes/regimen/resumen-empleados")
      .then((res) => {
        const raw = res.data.data;
        if (!raw) { setResumen(null); return; }
        // Backend returns { labels, data: [regimen, aportaciones, jubilados], totalGeneral }
        setResumen({
          totalRegimen: raw.data?.[0] ?? 0,
          totalAportaciones: raw.data?.[1] ?? 0,
          totalJubilados: raw.data?.[2] ?? 0,
          totalGeneral: raw.totalGeneral ?? 0
        });
      })
      .catch(() => setResumen(null))
      .finally(() => setLoading(false));
  }, []);

  const totalGeneral = resumen?.totalGeneral ?? 0;

  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, border: "1px solid #dde3ea", bgcolor: "primary.main", color: "primary.contrastText" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
          <Box>
            <Typography variant="h5">Panel administrativo</Typography>
            <Typography sx={{ mt: 1, opacity: 0.86 }}>
              Sistema RPJEPQ listo para operacion, nomina, reportes y auditoria.
            </Typography>
          </Box>
          <AssessmentIcon sx={{ fontSize: 48, opacity: 0.9 }} />
        </Stack>
      </Paper>

      {/* Grafica de empleados */}
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: "1px solid #dde3ea" }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
          <GroupsIcon sx={{ color: "primary.main" }} />
          <Typography variant="h6">Totales de empleados</Typography>
          {!loading && resumen && (
            <Chip label={`Total: ${totalGeneral}`} size="small" sx={{ ml: "auto", bgcolor: "#1f4e5f", color: "#fff", fontWeight: 700 }} />
          )}
        </Stack>

        {loading ? (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={36} />)}
          </Stack>
        ) : !resumen ? (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>No se pudo cargar la informacion.</Typography>
        ) : (
          <Stack spacing={2.5}>
            <BarRow
              label="Régimen"
              count={resumen.totalRegimen ?? 0}
              total={totalGeneral}
              color={CHART_COLORS.regimen}
              icon={<SupervisedUserCircleIcon fontSize="small" />}
            />
            <BarRow
              label="Aportaciones"
              count={resumen.totalAportaciones ?? 0}
              total={totalGeneral}
              color={CHART_COLORS.aportaciones}
              icon={<PeopleAltIcon fontSize="small" />}
            />
            <BarRow
              label="Jubilados"
              count={resumen.totalJubilados ?? 0}
              total={totalGeneral}
              color={CHART_COLORS.jubilados}
              icon={<ElderlyIcon fontSize="small" />}
            />
          </Stack>
        )}
      </Paper>

      <Grid container spacing={2}>
        {NAV_CARDS.map((item) => (
          <Grid item xs={12} md={4} key={item.label}>
            <Paper
              component={RouterLink}
              to={item.path}
              elevation={0}
              sx={{
                display: "block",
                p: 3,
                border: "1px solid #dde3ea",
                height: "100%",
                cursor: "pointer",
                color: "inherit",
                textDecoration: "none",
                transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                "&:hover": {
                  transform: "translateY(-3px)",
                  borderColor: "primary.main",
                  boxShadow: "0 18px 42px rgba(20, 63, 75, 0.12)"
                },
                "&:focus-visible": {
                  outline: "3px solid rgba(31, 93, 107, 0.28)",
                  outlineOffset: 3
                }
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: "primary.main" }}>{item.icon}</Box>
                <Typography color="text.secondary">{item.label}</Typography>
              </Stack>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {item.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default Dashboard;
