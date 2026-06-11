import FilterListIcon from "@mui/icons-material/FilterList";
import PrintIcon from "@mui/icons-material/Print";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box, Button, Chip, FormControl, InputAdornment, InputLabel, MenuItem,
  Paper, Select, Skeleton, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography
} from "@mui/material";
import { useMemo, useState } from "react";

const today = () =>
  new Date().toLocaleDateString("es-GT", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Componente base reutilizable para todos los reportes PDF del sistema.
 *
 * Props:
 *  titulo      string        — Titulo del reporte (aparece en header del documento)
 *  rows        array         — Datos ya cargados por el padre
 *  loading     bool          — Muestra skeletons mientras carga
 *  columns     array         — [{ key, label, width, bold, render(row) }]
 *  searchKeys  array         — Claves de las propiedades en las que busca el TextField
 *  filterDefs  array         — [{ key, label, options?, dynamic? }]
 *                               dynamic=true deriva opciones unicas de rows[key]
 *  getTotales  fn(filtered)  — Devuelve [{ label, value, main? }] para la fila de totales
 */
const ReportePDF = ({
  titulo = "Reporte",
  rows = [],
  loading = false,
  columns = [],
  searchKeys = [],
  filterDefs = [],
  getTotales
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [filterValues, setFilterValues] = useState({});

  const dynamicOptions = useMemo(() => {
    const opts = {};
    filterDefs.filter((f) => f.dynamic).forEach((f) => {
      opts[f.key] = [...new Set(rows.map((r) => r[f.key]).filter(Boolean))].sort();
    });
    return opts;
  }, [rows, filterDefs]);

  const filtered = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return rows.filter((row) => {
      for (const f of filterDefs) {
        const val = filterValues[f.key];
        if (val && String(row[f.key] || "") !== val) return false;
      }
      if (term && !searchKeys.some((k) => String(row[k] || "").toLowerCase().includes(term))) return false;
      return true;
    });
  }, [rows, busqueda, filterValues, filterDefs, searchKeys]);

  const totales = getTotales ? getTotales(filtered) : [{ label: "Total registros", value: filtered.length }];
  const hasFilter = busqueda || Object.values(filterValues).some(Boolean);
  const showFilters = filterDefs.length > 0 || searchKeys.length > 0;

  return (
    <Stack spacing={2.5}>

      {/* ── Cabecera de pantalla (oculta al imprimir) ── */}
      <Box className="no-print">
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>{titulo}</Typography>
            <Typography color="text.secondary">Generacion y exportacion del reporte</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            size="large"
            sx={{ minWidth: 190, fontWeight: 700 }}
          >
            Imprimir / PDF
          </Button>
        </Stack>
      </Box>

      {/* ── Filtros (ocultos al imprimir) ── */}
      {showFilters && (
        <Paper elevation={0} className="no-print" sx={{ p: 2, border: "1px solid #dde3ea" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <FilterListIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={700}>Filtros</Typography>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
            {searchKeys.length > 0 && (
              <TextField
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                size="small"
                sx={{ minWidth: 250 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              />
            )}
            {filterDefs.map((f) => (
              <FormControl key={f.key} size="small" sx={{ minWidth: 160 }}>
                <InputLabel>{f.label}</InputLabel>
                <Select
                  label={f.label}
                  value={filterValues[f.key] || ""}
                  onChange={(e) => setFilterValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                >
                  <MenuItem value=""><em>Todos</em></MenuItem>
                  {(f.options || dynamicOptions[f.key] || []).map((opt) => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={`${filtered.length} registros`} color="primary" size="small" />
              {hasFilter && (
                <Chip label="Limpiar" size="small" variant="outlined"
                  onClick={() => { setBusqueda(""); setFilterValues({}); }} />
              )}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* ── Documento formal (visible en pantalla y al imprimir) ── */}
      {loading ? (
        <Stack spacing={1.5} className="no-print">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rounded" height={44} />)}
        </Stack>
      ) : (
        <Box
          sx={{
            bgcolor: "white", p: { xs: 2, md: 3 },
            border: "1px solid #dde3ea", borderRadius: 2,
            boxShadow: "0 2px 18px rgba(20,63,75,0.06)",
            "@media print": { border: "none", boxShadow: "none", p: 0, borderRadius: 0 }
          }}
        >
          {/* Encabezado institucional */}
          <Box sx={{ textAlign: "center", mb: 3, pb: 2, borderBottom: "2px solid #1f4e5f", "@media print": { mb: 2, pb: 1 } }}>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "0.82rem", md: "0.95rem" }, color: "#1f4e5f", letterSpacing: 0.5, textTransform: "uppercase" }}>
              Régimen de Pensiones y Jubilaciones
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: "0.82rem", md: "0.95rem" }, color: "#1f4e5f", letterSpacing: 0.5, textTransform: "uppercase" }}>
              del Personal de la Empresa Portuaria Quetzal
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: "0.92rem", md: "1.08rem" }, color: "#2e7d91", mt: 1, letterSpacing: 0.3 }}>
              {titulo}
            </Typography>
            <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap" sx={{ mt: 1.5 }}>
              {filterDefs.map((f) => filterValues[f.key] ? (
                <Typography key={f.key} variant="body2" color="text.secondary">
                  {f.label}: <strong>{filterValues[f.key]}</strong>
                </Typography>
              ) : null)}
              <Typography variant="body2" color="text.secondary">
                Fecha de emision: <strong>{today()}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total registros: <strong>{filtered.length}</strong>
              </Typography>
            </Stack>
          </Box>

          {/* Tabla de datos */}
          <TableContainer sx={{ "@media print": { overflow: "visible" } }}>
            <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#1f4e5f", "@media print": { bgcolor: "#e8ecef" } }}>
                  <TableCell sx={{ color: "white", fontWeight: 800, fontSize: "0.72rem", width: 38, py: 1, "@media print": { color: "#1f4e5f", bgcolor: "#e8ecef", fontSize: "8pt", py: 0.5 } }}>
                    No.
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={col.key} sx={{ color: "white", fontWeight: 800, fontSize: "0.72rem", py: 1, width: col.width, "@media print": { color: "#1f4e5f", bgcolor: "#e8ecef", fontWeight: 700, fontSize: "8pt", py: 0.5 } }}>
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((row, i) => (
                  <TableRow key={row.id ?? i} sx={{ bgcolor: i % 2 === 0 ? "white" : "rgba(31,78,95,0.03)", "&:hover": { bgcolor: "rgba(31,78,95,0.06)" }, "@media print": { bgcolor: i % 2 === 0 ? "white" : "#f5f7f8" } }}>
                    <TableCell sx={{ fontSize: "0.75rem", "@media print": { fontSize: "8pt" } }}>{i + 1}</TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.key} sx={{ fontSize: "0.75rem", fontWeight: col.bold ? 700 : 400, "@media print": { fontSize: "8pt" } }}>
                        {col.render ? col.render(row) : (row[col.key] ?? "—")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      No hay registros para mostrar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Totales */}
          {filtered.length > 0 && (
            <Box sx={{ mt: 2, pt: 1.5, borderTop: "2px solid #1f4e5f", display: "flex", justifyContent: "flex-end", gap: 4, flexWrap: "wrap", "@media print": { mt: 1, pt: 0.5 } }}>
              {totales.map((t) => (
                <Stack key={t.label} direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>{t.label}:</Typography>
                  <Typography variant={t.main ? "body1" : "body2"} fontWeight={t.main ? 900 : 800} color="#1f4e5f">{t.value}</Typography>
                </Stack>
              ))}
            </Box>
          )}

          {/* Firmas */}
          <Box sx={{ mt: 5, pt: 3, borderTop: "1px dashed #bbb", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3, "@media print": { mt: 3, pt: 2 } }}>
            {["Elaborado por", "Revisado por", "Autorizado por"].map((label) => (
              <Box key={label} sx={{ textAlign: "center" }}>
                <Box sx={{ height: 1, bgcolor: "#555", mb: 0.75, mx: 3 }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {label}
                </Typography>
                <Box sx={{ height: 30 }} />
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Stack>
  );
};

export default ReportePDF;
