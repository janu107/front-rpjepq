import LockIcon from "@mui/icons-material/Lock";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const Unauthorized = () => (
  <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
    <Paper elevation={0} sx={{ p: 4, border: "1px solid #dde3ea", maxWidth: 460, textAlign: "center" }}>
      <Stack spacing={2} alignItems="center">
        <LockIcon color="primary" sx={{ fontSize: 46 }} />
        <Typography variant="h5">Acceso restringido</Typography>
        <Typography color="text.secondary">No tiene permisos para acceder a esta seccion.</Typography>
        <Button component={RouterLink} to="/dashboard" variant="contained">Ir al dashboard</Button>
      </Stack>
    </Paper>
  </Box>
);

export default Unauthorized;
