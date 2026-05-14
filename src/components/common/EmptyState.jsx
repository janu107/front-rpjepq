import InboxIcon from "@mui/icons-material/Inbox";
import { Stack, Typography } from "@mui/material";

const EmptyState = ({ message = "No hay registros para mostrar." }) => (
  <Stack spacing={1} alignItems="center" justifyContent="center" sx={{ py: 5, color: "text.secondary" }}>
    <InboxIcon />
    <Typography>{message}</Typography>
  </Stack>
);

export default EmptyState;
