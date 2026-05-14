import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ShieldIcon from "@mui/icons-material/Shield";
import { Box, Grid, Paper, Stack, Typography } from "@mui/material";

const resumen = [
  { label: "Operacion", value: "Mantenimientos y catalogos", icon: <PeopleAltIcon /> },
  { label: "Nomina", value: "Generacion y reportes", icon: <AccountBalanceWalletIcon /> },
  { label: "Seguridad", value: "Roles y auditoria", icon: <ShieldIcon /> }
];

const Dashboard = () => {
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

      <Grid container spacing={2}>
        {resumen.map((item) => (
          <Grid item xs={12} md={4} key={item.label}>
            <Paper elevation={0} sx={{ p: 3, border: "1px solid #dde3ea", height: "100%" }}>
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
