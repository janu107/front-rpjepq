import AutorenewIcon from "@mui/icons-material/Autorenew";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PreviewIcon from "@mui/icons-material/Preview";
import {
  Box, Button, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { canCleanPayroll, canGeneratePayroll } from "../../utils/permissions";

const initialForm = {
  tipoManejo: "",
  idTipoPlanilla: "",
  idPlanilla: "",
  generarPara: "EMPLEADOS"
};

const money = (value) => `Q ${Number(value || 0).toFixed(2)}`;

const PreviewTable = ({ title, rows, type }) => (
  <Stack spacing={1.5}>
    <Typography variant="h6">{title}</Typography>
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Persona</TableCell>
            <TableCell>Concepto</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Puesto</TableCell>
            <TableCell>Area</TableCell>
            <TableCell align="right">Valor</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${type}-${index}`} hover>
              <TableCell>{row.persona}</TableCell>
              <TableCell>{row.concepto}</TableCell>
              <TableCell>{type === "ingresos" ? row.tipoIngreso : row.tipoDescuento}</TableCell>
              <TableCell>{row.puesto}</TableCell>
              <TableCell>{row.area}</TableCell>
              <TableCell align="right">{money(row.valor)}</TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={6} align="center">Sin registros para mostrar</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </Stack>
);

const SummaryCard = ({ label, value, currency = false }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea", height: "100%" }}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography variant="h6">{currency ? money(value) : value || 0}</Typography>
    </Paper>
  </Grid>
);

const GeneracionPlanillaPage = () => {
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [options, setOptions] = useState({ manejos: [], tiposPlanilla: [], planillas: [] });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedPlanillas = useMemo(() => {
    if (!form.idTipoPlanilla) return options.planillas;
    return options.planillas.filter((planilla) => Number(planilla.tipoPlanilla) === Number(form.idTipoPlanilla));
  }, [form.idTipoPlanilla, options.planillas]);

  const loadOptions = async () => {
    const endpoints = {
      manejos: "/catalogos/manejo-administracion",
      tiposPlanilla: "/catalogos/tipo-planilla",
      planillas: "/catalogos/parametro-planilla"
    };
    const entries = await Promise.all(Object.entries(endpoints).map(async ([key, endpoint]) => [key, (await axiosClient.get(endpoint)).data.data || []]));
    setOptions(Object.fromEntries(entries));
  };

  useEffect(() => {
    loadOptions().catch((error) => Swal.fire("Error", error.response?.data?.message || "No fue posible cargar catalogos.", "error"));
  }, []);

  const payload = (regenerar = false) => ({
    idPlanilla: Number(form.idPlanilla),
    idTipoPlanilla: Number(form.idTipoPlanilla),
    tipoManejo: Number(form.tipoManejo),
    generarPara: form.generarPara,
    regenerar
  });

  const validateForm = () => {
    if (!form.tipoManejo || !form.idTipoPlanilla || !form.idPlanilla || !form.generarPara) {
      Swal.fire("Datos requeridos", "Seleccione manejo, tipo planilla, planilla y generar para.", "warning");
      return false;
    }
    return true;
  };

  const previsualizar = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { data } = await axiosClient.post("/generacion-planilla/preview", payload(false));
      setPreview(data.data);
      Swal.fire("Listo", "Previsualizacion generada correctamente.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible previsualizar.", "error");
    } finally {
      setLoading(false);
    }
  };

  const generar = async (regenerar = false) => {
    if (!validateForm()) return;
    const result = await Swal.fire({
      title: regenerar ? "Regenerar planilla" : "Generar planilla",
      text: regenerar ? "Se eliminaran los registros existentes y se generaran nuevamente." : "Se guardaran los ingresos y descuentos previsualizados.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: regenerar ? "Regenerar" : "Generar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1f4e5f"
    });
    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const { data } = await axiosClient.post("/generacion-planilla/generar", payload(regenerar));
      setPreview(data.data);
      Swal.fire("Listo", "Planilla generada correctamente.", "success");
    } catch (error) {
      const message = error.response?.data?.message || "No fue posible generar la planilla.";
      Swal.fire("Error", message.includes("ya tiene registros") ? "La planilla ya fue generada. Puede regenerarla o limpiarla." : message, "error");
    } finally {
      setLoading(false);
    }
  };

  const limpiar = async () => {
    if (!form.idPlanilla) {
      Swal.fire("Dato requerido", "Seleccione una planilla para limpiar.", "warning");
      return;
    }
    const result = await Swal.fire({
      title: "Limpiar planilla",
      text: "Se eliminaran los ingresos y descuentos generados para esta planilla.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Limpiar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1f4e5f"
    });
    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      await axiosClient.delete(`/generacion-planilla/limpiar/${form.idPlanilla}`);
      setPreview(null);
      Swal.fire("Listo", "Planilla limpiada correctamente.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible limpiar la planilla.", "error");
    } finally {
      setLoading(false);
    }
  };

  const resumen = preview?.resumen || {};

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5">Generar planilla</Typography>
        <Typography color="text.secondary">Generacion automatica de ingresos y descuentos</Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo manejo</InputLabel>
              <Select label="Tipo manejo" value={form.tipoManejo} onChange={(e) => setForm({ ...form, tipoManejo: e.target.value })}>
                {options.manejos.map((item) => <MenuItem key={item.id} value={item.id}>{item.descripcion}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo planilla</InputLabel>
              <Select label="Tipo planilla" value={form.idTipoPlanilla} onChange={(e) => setForm({ ...form, idTipoPlanilla: e.target.value, idPlanilla: "" })}>
                {options.tiposPlanilla.map((item) => <MenuItem key={item.id} value={item.id}>{item.tipoPlanilla} - {item.descripcion}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Planilla</InputLabel>
              <Select label="Planilla" value={form.idPlanilla} onChange={(e) => setForm({ ...form, idPlanilla: e.target.value })}>
                {selectedPlanillas.map((item) => <MenuItem key={item.id} value={item.id}>Planilla {item.numero}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Generar para</InputLabel>
              <Select label="Generar para" value={form.generarPara} onChange={(e) => setForm({ ...form, generarPara: e.target.value })}>
                <MenuItem value="EMPLEADOS">Empleados</MenuItem>
                <MenuItem value="JUBILADOS">Jubilados</MenuItem>
                <MenuItem value="AMBOS">Ambos</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mt: 2 }}>
          {canGeneratePayroll(user) && <Button variant="outlined" startIcon={<PreviewIcon />} onClick={previsualizar} disabled={loading}>Previsualizar</Button>}
          {canGeneratePayroll(user) && <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => generar(false)} disabled={loading}>Generar planilla</Button>}
          {canCleanPayroll(user) && <Button variant="outlined" startIcon={<AutorenewIcon />} onClick={() => generar(true)} disabled={loading}>Regenerar planilla</Button>}
          {canCleanPayroll(user) && <Button variant="outlined" color="error" startIcon={<DeleteSweepIcon />} onClick={limpiar} disabled={loading}>Limpiar planilla</Button>}
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <SummaryCard label="Total ingresos" value={resumen.totalIngresos} currency />
        <SummaryCard label="Total descuentos" value={resumen.totalDescuentos} currency />
        <SummaryCard label="Liquido" value={resumen.liquido} currency />
        <SummaryCard label="Cantidad personas" value={resumen.cantidadPersonas} />
        <SummaryCard label="Cantidad ingresos" value={resumen.cantidadIngresos} />
        <SummaryCard label="Cantidad descuentos" value={resumen.cantidadDescuentos} />
      </Grid>

      <PreviewTable title="Ingresos a generar" rows={preview?.ingresos || []} type="ingresos" />
      <PreviewTable title="Descuentos a generar" rows={preview?.descuentos || []} type="descuentos" />
    </Stack>
  );
};

export default GeneracionPlanillaPage;
