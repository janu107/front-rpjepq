import { Grid, Paper, Stack, Typography } from "@mui/material";

const resumen = [
  { label: "Usuarios", value: "Base preparada" },
  { label: "Roles", value: "Base preparada" },
  { label: "Módulos", value: "Rutas iniciales" }
];

const Dashboard = () => {
  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ p: 3, border: "1px solid #dde3ea" }}>
        <Typography variant="h5">Panel administrativo</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Estructura inicial del sistema RPJEPQ lista para construir los módulos administrativos.
        </Typography>
      </Paper>

      <Grid container spacing={2}>
        {resumen.map((item) => (
          <Grid item xs={12} md={4} key={item.label}>
            <Paper elevation={0} sx={{ p: 3, border: "1px solid #dde3ea", height: "100%" }}>
              <Typography color="text.secondary">{item.label}</Typography>
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
