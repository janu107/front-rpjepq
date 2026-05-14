import { Box, CircularProgress, Stack, Typography } from "@mui/material";

const LoadingScreen = ({ message = "Cargando..." }) => (
  <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
    <Stack spacing={2} alignItems="center">
      <CircularProgress />
      <Typography color="text.secondary">{message}</Typography>
    </Stack>
  </Box>
);

export default LoadingScreen;
