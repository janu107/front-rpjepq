import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SearchIcon from "@mui/icons-material/Search";
import TableViewIcon from "@mui/icons-material/TableView";
import {
  Box, Button, FormControl, Grid, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack,
  Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";

const money = (value) => `Q ${Number(value || 0).toFixed(2)}`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString("es-GT") : "");

const SummaryCard = ({ label, value, currency = false }) => (
  <Grid item xs={12} sm={6} md={3}>
    <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea", height: "100%" }}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography variant="h6">{currency ? money(value) : value || 0}</Typography>
    </Paper>
  </Grid>
);

const DetailTable = ({ title, rows, search, setSearch, type, onExport }) => {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => [
      row.persona,
      row.tipoPersona,
      type === "ingresos" ? row.tipoIngresoNombre : row.tipoDescuentoNombre,
      row.puesto,
      row.area
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [rows, search, type]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
        <TextField
          placeholder={`Buscar ${title.toLowerCase()}`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ maxWidth: 420 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
        <Button variant="outlined" startIcon={<TableViewIcon />} onClick={onExport}>Exportar Excel</Button>
      </Stack>
      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Persona</TableCell>
              <TableCell>Tipo persona</TableCell>
              <TableCell>{type === "ingresos" ? "Tipo ingreso" : "Tipo descuento"}</TableCell>
              <TableCell>Puesto</TableCell>
              <TableCell>Area</TableCell>
              <TableCell>Dias</TableCell>
              <TableCell align="right">Valor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={`${type}-${row.id}`} hover>
                <TableCell>{row.persona}</TableCell>
                <TableCell>{row.tipoPersona}</TableCell>
                <TableCell>{type === "ingresos" ? row.tipoIngresoNombre : row.tipoDescuentoNombre}</TableCell>
                <TableCell>{row.puesto}</TableCell>
                <TableCell>{row.area}</TableCell>
                <TableCell>{row.diasTrabajados}</TableCell>
                <TableCell align="right">{money(row.valor)}</TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={7} align="center">Sin registros para mostrar</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

const ReportesNominaPage = () => {
  const [planillas, setPlanillas] = useState([]);
  const [idPlanilla, setIdPlanilla] = useState("");
  const [reporte, setReporte] = useState(null);
  const [tab, setTab] = useState(0);
  const [searchIngresos, setSearchIngresos] = useState("");
  const [searchDescuentos, setSearchDescuentos] = useState("");
  const [loading, setLoading] = useState(false);

  const loadPlanillas = async () => {
    const { data } = await axiosClient.get("/reportes/nomina/planillas");
    setPlanillas(data.data || []);
  };

  useEffect(() => {
    loadPlanillas().catch((error) => Swal.fire("Error", error.response?.data?.message || "No fue posible cargar planillas.", "error"));
  }, []);

  const requirePlanilla = () => {
    if (!idPlanilla) {
      Swal.fire("Dato requerido", "Seleccione una planilla.", "warning");
      return false;
    }
    return true;
  };

  const consultar = async () => {
    if (!requirePlanilla()) return;
    setLoading(true);
    try {
      const { data } = await axiosClient.get(`/reportes/nomina/planilla/${idPlanilla}`);
      setReporte(data.data);
      Swal.fire("Listo", "Reporte de planilla obtenido correctamente.", "success");
    } catch (error) {
      const message = error.response?.data?.message || "No fue posible consultar el reporte.";
      Swal.fire("Sin reporte", message, "warning");
      setReporte(null);
    } finally {
      setLoading(false);
    }
  };

  const download = async (url, filename, successMessage) => {
    if (!requirePlanilla()) return;
    setLoading(true);
    try {
      const response = await axiosClient.get(url, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      Swal.fire("Listo", successMessage, "success");
    } catch (error) {
      Swal.fire("Error", "No fue posible generar la descarga.", "error");
    } finally {
      setLoading(false);
    }
  };

  const resumen = reporte?.resumen || {};

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5">Reportes de nomina</Typography>
        <Typography color="text.secondary">Consulta y exportacion de planillas generadas</Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <FormControl sx={{ minWidth: { xs: "100%", md: 360 } }}>
            <InputLabel>Planilla</InputLabel>
            <Select label="Planilla" value={idPlanilla} onChange={(event) => setIdPlanilla(event.target.value)}>
              {planillas.map((planilla) => (
                <MenuItem key={planilla.idPlanilla} value={planilla.idPlanilla}>
                  Planilla {planilla.numeroPlanilla} - {planilla.tipoPlanilla} - {money(planilla.liquido)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<SearchIcon />} onClick={consultar} disabled={loading}>Consultar</Button>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => download(`/reportes/nomina/planilla/${idPlanilla}/pdf`, `reporte_planilla_${idPlanilla}.pdf`, "PDF generado correctamente.")} disabled={loading}>Exportar PDF</Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => download(`/reportes/nomina/planilla/${idPlanilla}/excel`, `reporte_planilla_${idPlanilla}.xlsx`, "Excel generado correctamente.")} disabled={loading}>Exportar Excel</Button>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <SummaryCard label="Total ingresos" value={resumen.totalIngresos} currency />
        <SummaryCard label="Total descuentos" value={resumen.totalDescuentos} currency />
        <SummaryCard label="Liquido" value={resumen.liquido} currency />
        <SummaryCard label="Cantidad ingresos" value={resumen.cantidadIngresos} />
        <SummaryCard label="Cantidad descuentos" value={resumen.cantidadDescuentos} />
        <SummaryCard label="Cantidad empleados" value={resumen.cantidadEmpleados} />
        <SummaryCard label="Cantidad jubilados" value={resumen.cantidadJubilados} />
      </Grid>

      <Paper elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Tabs value={tab} onChange={(event, value) => setTab(value)}>
          <Tab label="Resumen" />
          <Tab label="Ingresos" />
          <Tab label="Descuentos" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
          <Grid container spacing={2}>
            {[
              ["Numero planilla", resumen.numeroPlanilla],
              ["Tipo planilla", resumen.tipoPlanilla],
              ["Fecha inicio", formatDate(resumen.fechaInicio)],
              ["Fecha final", formatDate(resumen.fechaFinal)],
              ["Fecha pago", formatDate(resumen.fechaPago)],
              ["Frecuencia", resumen.frecuencia],
              ["Estado", resumen.estado]
            ].map(([label, value]) => (
              <Grid item xs={12} md={4} key={label}>
                <Typography color="text.secondary" variant="body2">{label}</Typography>
                <Typography>{value || "N/A"}</Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {tab === 1 && (
        <DetailTable
          title="Ingresos"
          rows={reporte?.ingresos || []}
          search={searchIngresos}
          setSearch={setSearchIngresos}
          type="ingresos"
          onExport={() => download(`/reportes/nomina/planilla/${idPlanilla}/ingresos/excel`, `ingresos_planilla_${idPlanilla}.xlsx`, "Excel de ingresos generado correctamente.")}
        />
      )}

      {tab === 2 && (
        <DetailTable
          title="Descuentos"
          rows={reporte?.descuentos || []}
          search={searchDescuentos}
          setSearch={setSearchDescuentos}
          type="descuentos"
          onExport={() => download(`/reportes/nomina/planilla/${idPlanilla}/descuentos/excel`, `descuentos_planilla_${idPlanilla}.xlsx`, "Excel de descuentos generado correctamente.")}
        />
      )}
    </Stack>
  );
};

export default ReportesNominaPage;
