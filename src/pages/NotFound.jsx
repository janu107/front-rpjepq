import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const NotFound = () => {
  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" sx={{ px: 2 }}>
      <Paper elevation={0} sx={{ maxWidth: 460, width: "100%", p: 4, textAlign: "center", border: "1px solid #dde3ea" }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h5">Página no encontrada</Typography>
          <Typography color="text.secondary">La ruta solicitada no existe en RPJEPQ.</Typography>
          <Button component={RouterLink} to="/dashboard" variant="contained">
            Volver al dashboard
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default NotFound;
