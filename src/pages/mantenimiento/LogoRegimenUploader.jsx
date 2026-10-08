import UploadFileIcon from "@mui/icons-material/UploadFile";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import LogoRegimen from "../../components/common/LogoRegimen";

// Sube el logo que se imprime en todos los reportes (PDF y en pantalla).
const LogoRegimenUploader = () => {
  const [version, setVersion] = useState(0);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (event) => {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;
    if (!["image/png", "image/jpeg"].includes(archivo.type)) {
      Swal.fire("Validacion", "El logo debe ser una imagen PNG o JPG.", "warning");
      return;
    }
    if (archivo.size > 3 * 1024 * 1024) {
      Swal.fire("Validacion", "La imagen no debe pasar de 3 MB.", "warning");
      return;
    }
    setSubiendo(true);
    try {
      await axiosClient.post("/logo", archivo, { headers: { "Content-Type": archivo.type } });
      setVersion((v) => v + 1);
      Swal.fire("Listo", "Logo actualizado. Ya sale en los reportes.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible subir el logo.", "error");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
        <Box sx={{ width: 96, height: 96, border: "1px dashed #c8d4da", borderRadius: 2, display: "grid", placeItems: "center", overflow: "hidden" }}>
          <LogoRegimen key={version} sx={{ maxWidth: 88, maxHeight: 88 }} />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" fontWeight={800}>Logo del régimen</Typography>
          <Typography variant="body2" color="text.secondary">
            Se imprime en el encabezado (lado izquierdo) de las nóminas, resúmenes y reportes. PNG o JPG, máximo 3 MB.
          </Typography>
        </Box>
        <Button component="label" variant="contained" startIcon={<UploadFileIcon />} disabled={subiendo}>
          {subiendo ? "Subiendo..." : "Subir logo"}
          <input hidden type="file" accept="image/png,image/jpeg" onChange={subir} />
        </Button>
      </Stack>
    </Paper>
  );
};

export default LogoRegimenUploader;
