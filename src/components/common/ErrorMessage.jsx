import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Alert } from "@mui/material";

const ErrorMessage = ({ message = "No fue posible completar la operacion." }) => (
  <Alert icon={<ErrorOutlineIcon />} severity="error" variant="outlined">
    {message}
  </Alert>
);

export default ErrorMessage;
