import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" sx={{ px: 2 }}>
      <Paper elevation={0} sx={{ maxWidth: 460, width: "100%", p: 4, textAlign: "center", border: (t) => `1px solid ${t.palette.borde}` }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h5">Página no encontrada</Typography>
          <Typography color="text.secondary">La ruta solicitada no existe en RPJEPQ.</Typography>
          <Button type="button" onClick={() => navigate("/dashboard", { replace: true })} variant="contained">
            Volver al dashboard
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default NotFound;
