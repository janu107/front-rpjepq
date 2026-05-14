import Swal from "sweetalert2";

export const confirmDialog = ({
  title = "Confirmar accion",
  text = "Esta accion requiere confirmacion.",
  confirmButtonText = "Confirmar",
  icon = "question"
}) => Swal.fire({
  title,
  text,
  icon,
  showCancelButton: true,
  confirmButtonText,
  cancelButtonText: "Cancelar",
  confirmButtonColor: "#1f4e5f"
});

export default confirmDialog;
