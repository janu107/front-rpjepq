import SearchIcon from "@mui/icons-material/Search";
import {
  Box, Button, CircularProgress, Divider, IconButton, InputAdornment, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "./EmptyState";

const DataTable = ({
  loading, columns, rows, search, onSearch, actions,
  emptyMessage = "No hay registros para mostrar.", filterKeys,
  paginado = true, filasPorPagina = 20
}) => {
  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const term = search.trim().toLowerCase();
    const keys = filterKeys?.length ? filterKeys : columns.map((column) => column.key);
    return rows.filter((row) => keys.some((key) => String(row[key] || "").toLowerCase().includes(term)));
  }, [columns, filterKeys, rows, search]);

  // Paginación: 20 registros por página por defecto.
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(filasPorPagina);

  // Al filtrar o recargar, volver a la primera página para no quedar en una
  // página que ya no existe (ej. estabas en la 5 y el filtro dejó 3 registros).
  useEffect(() => { setPage(0); }, [search, rows.length]);

  const ultimaPagina = Math.max(0, Math.ceil(filteredRows.length / rowsPerPage) - 1);
  const paginaActual = Math.min(page, ultimaPagina);

  const pagedRows = useMemo(() => {
    if (!paginado) return filteredRows;
    return filteredRows.slice(paginaActual * rowsPerPage, paginaActual * rowsPerPage + rowsPerPage);
  }, [filteredRows, paginado, paginaActual, rowsPerPage]);

  return (
    <Stack spacing={2}>
      {onSearch && (
        <TextField
          placeholder="Buscar"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          sx={{ maxWidth: { md: 460 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
      )}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          display: { xs: "none", md: "block" },
          border: "1px solid #dde3ea",
          overflow: "hidden",
          boxShadow: "0 14px 40px rgba(31, 78, 95, 0.06)"
        }}
      >
        <Table size="small">
          <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}>
            <TableRow>
              {columns.map((column) => <TableCell key={column.key} align={column.align} sx={{ fontWeight: 800, color: "text.secondary" }}>{column.label}</TableCell>)}
              {actions?.length > 0 && <TableCell align="right" sx={{ fontWeight: 800, color: "text.secondary" }}>Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={columns.length + 1} align="center"><CircularProgress size={24} /></TableCell></TableRow>}
            {!loading && pagedRows.map((row) => (
              <TableRow
                key={row.id || JSON.stringify(row)}
                hover
                sx={{
                  transition: "background-color 160ms ease, transform 160ms ease",
                  "&:hover": { bgcolor: "rgba(31, 78, 95, 0.035)" }
                }}
              >
                {columns.map((column) => <TableCell key={column.key} align={column.align}>{column.render ? column.render(row) : row[column.key]}</TableCell>)}
                {actions?.length > 0 && (
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.75} justifyContent="flex-end" flexWrap="wrap">
                    {actions.map((action) => action.visible?.(row) === false ? null : (
                      <Tooltip title={action.label} key={action.label}>
                        <IconButton
                          color="primary"
                          size="small"
                          aria-label={action.label}
                          onClick={() => action.onClick(row)}
                          sx={{ mx: 0.25 }}
                        >
                          {action.icon}
                        </IconButton>
                      </Tooltip>
                    ))}
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!loading && filteredRows.length === 0 && <TableRow><TableCell colSpan={columns.length + 1}><EmptyState message={emptyMessage} /></TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
        {loading && (
          <Paper elevation={0} sx={{ p: 3, border: "1px solid #dde3ea", textAlign: "center" }}>
            <CircularProgress size={24} />
          </Paper>
        )}

        {!loading && filteredRows.length === 0 && (
          <Paper elevation={0} sx={{ border: "1px solid #dde3ea" }}>
            <EmptyState message={emptyMessage} />
          </Paper>
        )}

        {!loading && pagedRows.map((row) => (
          <Paper
            key={row.id || JSON.stringify(row)}
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid #dde3ea",
              boxShadow: "0 12px 30px rgba(31, 78, 95, 0.08)",
              transition: "transform 180ms ease, box-shadow 180ms ease",
              "&:active": { transform: "scale(0.995)" }
            }}
          >
            <Stack spacing={1.25}>
              {columns.map((column, index) => (
                <Box key={column.key}>
                  {index > 0 && <Divider sx={{ mb: 1.25 }} />}
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, minWidth: 92 }}>
                      {column.label}
                    </Typography>
                    <Box sx={{ textAlign: "right", minWidth: 0, wordBreak: "break-word" }}>
                      {column.render ? column.render(row) : row[column.key]}
                    </Box>
                  </Stack>
                </Box>
              ))}
              {actions?.length > 0 && (
                <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
                  {actions.map((action) => action.visible?.(row) === false ? null : (
                    <Tooltip title={action.label} key={action.label}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={action.icon}
                        color="primary"
                        aria-label={action.label}
                        onClick={() => action.onClick(row)}
                        sx={{ minHeight: 42 }}
                      >
                        {action.label}
                      </Button>
                    </Tooltip>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>

      {paginado && filteredRows.length > 0 && (
        <TablePagination
          component="div"
          count={filteredRows.length}
          page={paginaActual}
          onPageChange={(_, nueva) => setPage(nueva)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }}
          rowsPerPageOptions={[20, 50, 100]}
          labelRowsPerPage="Registros por página"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          sx={{ borderTop: "1px solid #dde3ea" }}
        />
      )}
    </Stack>
  );
};

export default DataTable;
