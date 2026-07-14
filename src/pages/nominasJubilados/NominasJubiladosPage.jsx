import CalculateIcon from "@mui/icons-material/Calculate";
import UndoIcon from "@mui/icons-material/Undo";
import { Alert, Box, Button, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/common/PageHeader";

const PRIMARIO = "#1F4E79";
const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NominasJubiladosPage = () => {
  const [idPlanilla, setIdPlanilla] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);

  const idOk = idPlanilla && Number(idPlanilla) > 0;

  const generar = async (tipo) => {
    if (!idOk) { Swal.fire("Validación", "Indique el número de planilla.", "warning"); return; }
    const url = tipo === "amparistas" ? "/nominas/amparistas/generar" : "/nominas/jubilados/generar";
    try {
      setCargando(true);
      const { data } = await axiosClient.post(url, { idPlanilla: Number(idPlanilla) });
      setResultado({ tipo, data: data.data });
      Swal.fire("Listo", data.message || "Nómina generada correctamente.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible generar la nómina.", "error");
    } finally { setCargando(false); }
  };

  const revertir = async () => {
    if (!idOk) { Swal.fire("Validación", "Indique el número de planilla.", "warning"); return; }
    const r = await Swal.fire({
      title: "Revertir nómina", input: "textarea", inputLabel: "Motivo del reverso (obligatorio)",
      inputValidator: (v) => (!v || !v.trim() ? "El motivo es obligatorio" : undefined),
      icon: "warning", showCancelButton: true, confirmButtonText: "Sí, revertir", cancelButtonText: "Cancelar", confirmButtonColor: "#F44336"
    });
    if (!r.isConfirmed) return;
    try {
      setCargando(true);
      const { data } = await axiosClient.post(`/nominas/${Number(idPlanilla)}/revertir`, { motivo: r.value });
      setResultado({ tipo: "revertir", data: data.data });
      Swal.fire("Listo", data.message || "Nómina reversada correctamente.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible revertir.", "error");
    } finally { setCargando(false); }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Nóminas de Jubilados" subtitle="Generación y reverso de nóminas (tipo 2 normal, tipo 4 amparistas)" />

      <Paper sx={{ p: 2.5 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField label="No. de planilla (id)" type="number" value={idPlanilla} onChange={(e) => setIdPlanilla(e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
              <Button variant="contained" startIcon={<CalculateIcon />} disabled={!idOk || cargando} onClick={() => generar("jubilados")}>Generar jubilados (tipo 2)</Button>
              <Button variant="contained" color="secondary" startIcon={<CalculateIcon />} disabled={!idOk || cargando} onClick={() => generar("amparistas")}>Generar amparistas (tipo 4)</Button>
              <Button variant="outlined" color="error" startIcon={<UndoIcon />} disabled={!idOk || cargando} onClick={revertir}>Revertir nómina</Button>
            </Stack>
          </Grid>
        </Grid>
        <Alert severity="info" sx={{ mt: 2 }}>
          «Generar jubilados» corre la nómina normal (50%) y además paga a los beneficiarios de fallecidos. «Amparistas» corre la planilla tipo 4 al 100%.
        </Alert>
      </Paper>

      {resultado && (
        <Paper sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 1.5, color: PRIMARIO }}>Resultado</Typography>
          {resultado.tipo === "jubilados" && (
            <Box>
              <Typography>Jubilados procesados: <b>{resultado.data?.jubilados?.procesados ?? 0}</b></Typography>
              <Typography>Total pagado jubilados: <b>{fmtQ(resultado.data?.jubilados?.totalPagado)}</b></Typography>
              <Typography>Beneficiarios procesados: <b>{resultado.data?.beneficiarios?.procesados ?? 0}</b></Typography>
              {resultado.data?.message && <Typography sx={{ mt: 1 }} color="text.secondary">{resultado.data.message}</Typography>}
            </Box>
          )}
          {resultado.tipo === "amparistas" && (
            <Typography>Amparistas procesados: <b>{resultado.data?.procesados ?? 0}</b> — Total: <b>{fmtQ(resultado.data?.total)}</b></Typography>
          )}
          {resultado.tipo === "revertir" && (
            <Typography>Planilla <b>{resultado.data?.idPlanilla}</b> → estado <b>{resultado.data?.estadoNuevo}</b>. La deuda abonada fue restaurada.</Typography>
          )}
        </Paper>
      )}
    </Stack>
  );
};

export default NominasJubiladosPage;
