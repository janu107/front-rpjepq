import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import {
  Button, CircularProgress, Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography
} from "@mui/material";
import { useEffect, useState } from "react";

import axiosClient from "../../api/axiosClient";

// Componente genérico de reporte: título, endpoint, columnas y filtros.
// columns: [{ key, label, align?, render?(row) }]
// filtros: [{ key, label, type='date' }]
// onRowClick?(row)
const PRIMARIO = "#1F4E79";

const toCSV = (columns, rows) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(c.csv ? c.csv(r) : r[c.key])).join(",")).join("\n");
  return `${head}\n${body}`;
};

const ReporteTabla = ({ title, endpoint, columns, filtros = [], onRowClick }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroVals, setFiltroVals] = useState(() => Object.fromEntries(filtros.map((f) => [f.key, ""])));

  const cargar = async () => {
    try {
      setLoading(true);
      const params = {};
      Object.entries(filtroVals).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await axiosClient.get(endpoint, { params });
      setRows(data.data || []);
    } catch { setRows([]); } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [endpoint]);

  const exportarCSV = () => {
    const csv = toCSV(columns, rows);
    const url = window.URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${title.replace(/\s+/g, "_").toLowerCase()}.csv`; a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ color: PRIMARIO }}>{title}</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportarCSV} disabled={!rows.length}>Excel (CSV)</Button>
          <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} disabled={!rows.length}>PDF (imprimir)</Button>
        </Stack>
      </Stack>

      {filtros.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
          {filtros.map((f) => (
            <Grid item xs={12} sm={4} md={3} key={f.key}>
              <TextField label={f.label} type={f.type || "date"} value={filtroVals[f.key]} onChange={(e) => setFiltroVals({ ...filtroVals, [f.key]: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth size="small" />
            </Grid>
          ))}
          <Grid item><Button variant="contained" onClick={cargar}>Aplicar</Button></Grid>
        </Grid>
      )}

      {loading ? <CircularProgress size={24} /> : rows.length === 0 ? (
        <Typography color="text.secondary">Sin resultados.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>{columns.map((c) => <TableCell key={c.key} align={c.align}>{c.label}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id ?? r.idJubilado ?? i} hover={!!onRowClick} sx={onRowClick ? { cursor: "pointer" } : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {columns.map((c) => <TableCell key={c.key} align={c.align}>{c.render ? c.render(r) : r[c.key]}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export default ReporteTabla;
