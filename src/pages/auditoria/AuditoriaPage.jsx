import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box, Button, Chip, Dialog, DialogContent, DialogTitle, Grid, IconButton, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
  TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";

const initialFilters = { usuario: "", modulo: "", accion: "", fechaInicio: "", fechaFin: "" };

const AuditoriaPage = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = async (nextPage = page, nextLimit = limit, nextFilters = filters) => {
    setLoading(true);
    const params = { ...nextFilters, page: nextPage + 1, limit: nextLimit };
    Object.keys(params).forEach((key) => {
      if (!params[key]) delete params[key];
    });
    try {
      const { data } = await axiosClient.get("/auditoria", { params });
      setRows(data.data.rows || []);
      setTotal(data.data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData().catch((error) => Swal.fire("Error", error.response?.data?.message || "No fue posible cargar auditoria.", "error"));
  }, []);

  const search = () => {
    setPage(0);
    loadData(0).catch((error) => Swal.fire("Error", error.response?.data?.message || "No fue posible filtrar auditoria.", "error"));
  };

  const clear = () => {
    setFilters(initialFilters);
    setPage(0);
    loadData(0, limit, initialFilters).catch((error) => Swal.fire("Error", error.response?.data?.message || "No fue posible cargar auditoria.", "error"));
  };

  const changePage = (event, nextPage) => {
    setPage(nextPage);
    loadData(nextPage).catch(() => {});
  };

  const changeRows = (event) => {
    const nextLimit = Number(event.target.value);
    setLimit(nextLimit);
    setPage(0);
    loadData(0, nextLimit).catch(() => {});
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5">Auditoria</Typography>
        <Typography color="text.secondary">Historial de acciones importantes del sistema</Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={2.4}><TextField label="Usuario" value={filters.usuario} onChange={(e) => setFilters({ ...filters, usuario: e.target.value })} fullWidth /></Grid>
          <Grid item xs={12} md={2.4}><TextField label="Modulo" value={filters.modulo} onChange={(e) => setFilters({ ...filters, modulo: e.target.value.toUpperCase() })} fullWidth /></Grid>
          <Grid item xs={12} md={2.4}><TextField label="Accion" value={filters.accion} onChange={(e) => setFilters({ ...filters, accion: e.target.value.toUpperCase() })} fullWidth /></Grid>
          <Grid item xs={12} md={2.4}><TextField label="Fecha inicio" type="date" value={filters.fechaInicio} onChange={(e) => setFilters({ ...filters, fechaInicio: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} md={2.4}><TextField label="Fecha fin" type="date" value={filters.fechaFin} onChange={(e) => setFilters({ ...filters, fechaFin: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
        </Grid>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mt: 2 }}>
          <Button variant="contained" startIcon={<FilterAltIcon />} onClick={search}>Buscar</Button>
          <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={clear}>Limpiar filtros</Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Modulo</TableCell>
              <TableCell>Accion</TableCell>
              <TableCell>Ruta</TableCell>
              <TableCell align="right">Detalle</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">Cargando auditoria...</TableCell>
              </TableRow>
            )}
            {!loading && rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.fecha ? new Date(row.fecha).toLocaleString("es-GT") : ""}</TableCell>
                <TableCell>{row.usuario || "N/A"}</TableCell>
                <TableCell>{row.rol || "N/A"}</TableCell>
                <TableCell><Chip label={row.modulo} size="small" /></TableCell>
                <TableCell><Chip label={row.accion} size="small" color="primary" variant="outlined" /></TableCell>
                <TableCell>{row.ruta}</TableCell>
                <TableCell align="right"><Tooltip title="Ver detalle"><IconButton onClick={() => setDetail(row)}><VisibilityIcon /></IconButton></Tooltip></TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">No hay registros de auditoria para mostrar.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} rowsPerPage={limit} onPageChange={changePage} onRowsPerPageChange={changeRows} />
      </TableContainer>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        <DialogTitle>Detalle de auditoria</DialogTitle>
        <DialogContent>
          {detail && <Stack spacing={1.2} sx={{ mt: 1 }}>
            {Object.entries(detail).map(([key, value]) => <Typography key={key}><strong>{key}:</strong> {String(value || "")}</Typography>)}
          </Stack>}
        </DialogContent>
      </Dialog>
    </Stack>
  );
};

export default AuditoriaPage;
