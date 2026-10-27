import DownloadIcon from "@mui/icons-material/Download";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PrintIcon from "@mui/icons-material/Print";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box, Button, CircularProgress, Collapse, InputAdornment, LinearProgress, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TablePagination, TableRow, TextField, Typography
} from "@mui/material";
import { Fragment, useEffect, useRef, useState } from "react";

import axiosClient from "../../api/axiosClient";

// Deuda pendiente por tipo de jubilación. Cada tipo se despliega para ver
// a qué jubilados pertenece; clic en un jubilado abre su estado de cuenta.
const PRIMARIO = "#1F4E79";
const ROJO = "#F44336";
const POR_PAGINA = 20;
const ENDPOINT = "/jubilados-reportes/deuda-por-tipo";

const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n) => Number(n || 0).toLocaleString("es-GT");
const MES3 = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const fmtPeriodo = (p) => { const s = String(p || ""); return s.length === 6 ? `${MES3[Number(s.slice(4, 6)) - 1]} ${s.slice(0, 4)}` : s; };

const DetalleTipo = ({ filas, onJubilado }) => {
  const [pagina, setPagina] = useState(0);
  const visibles = filas.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);
  return (
    <Box sx={{ m: 1.5, ml: 6, border: "1px solid #E3E8EE", borderRadius: 1, bgcolor: "#fff" }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ "& th": { bgcolor: "#F4F6F8", fontWeight: 600 } }}>
            <TableCell>Código</TableCell><TableCell>Jubilado</TableCell><TableCell>DPI</TableCell>
            <TableCell align="right">Meses</TableCell><TableCell>Desde</TableCell><TableCell>Hasta</TableCell>
            <TableCell align="right">Saldo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibles.map((j) => (
            <TableRow key={j.idJubilado} hover sx={{ cursor: "pointer" }} onClick={() => onJubilado(j)}>
              <TableCell>{j.codigo}</TableCell><TableCell>{j.nombre}</TableCell><TableCell>{j.dpi}</TableCell>
              <TableCell align="right">{j.meses}</TableCell><TableCell>{fmtPeriodo(j.desde)}</TableCell><TableCell>{fmtPeriodo(j.hasta)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>{fmtQ(j.saldo)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filas.length > POR_PAGINA && (
        <TablePagination
          component="div" count={filas.length} page={pagina} onPageChange={(_, p) => setPagina(p)}
          rowsPerPage={POR_PAGINA} rowsPerPageOptions={[POR_PAGINA]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      )}
    </Box>
  );
};

const DeudaPorTipoReporte = ({ onJubilado }) => {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [texto, setTexto] = useState("");
  const [abiertos, setAbiertos] = useState({});
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const timer = useRef(null);
  const ultima = useRef(0);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const n = ++ultima.current;
      try {
        setLoading(true);
        const { data } = await axiosClient.get(ENDPOINT, { params: texto.trim() ? { q: texto.trim() } : {} });
        if (n !== ultima.current) return;
        const lista = data.data || [];
        setTipos(lista);
        // Al buscar se abren los tipos con resultados para ver al jubilado de una vez.
        setAbiertos(texto.trim() ? Object.fromEntries(lista.map((t) => [t.tipoJubilacion, true])) : {});
      } catch { if (n === ultima.current) setTipos([]); } finally { if (n === ultima.current) setLoading(false); }
    }, 400);
    return () => timer.current && clearTimeout(timer.current);
  }, [texto]);

  const total = tipos.reduce((a, t) => a + t.saldo, 0);
  const totalJub = tipos.reduce((a, t) => a + t.jubilados, 0);
  const totalMeses = tipos.reduce((a, t) => a + t.periodosDeuda, 0);
  const alternar = (t) => setAbiertos((a) => ({ ...a, [t]: !a[t] }));

  const exportarCSV = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const enc = ["Tipo de jubilación", "Código", "Jubilado", "DPI", "Meses", "Desde", "Hasta", "Saldo"];
    const filas = tipos.flatMap((t) => t.detalle.map((j) => [t.tipoJubilacion, j.codigo, j.nombre, j.dpi, j.meses, fmtPeriodo(j.desde), fmtPeriodo(j.hasta), j.saldo]));
    const csv = [enc, ...filas].map((f) => f.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "deuda_por_tipo.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const imprimirPdf = async () => {
    try {
      setGenerandoPdf(true);
      const { data } = await axiosClient.get(`${ENDPOINT}/pdf`, { params: texto.trim() ? { q: texto.trim() } : {}, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch { /* el interceptor ya muestra el error */ } finally { setGenerandoPdf(false); }
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ color: PRIMARIO, fontWeight: 700 }}>Deuda por tipo de jubilación</Typography>
          <Typography variant="body2" color="text.secondary">Haga clic en un tipo para ver sus jubilados; clic en un jubilado abre su estado de cuenta.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportarCSV} disabled={!tipos.length}>Excel (CSV)</Button>
          <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={imprimirPdf} disabled={!tipos.length || generandoPdf}>{generandoPdf ? "Generando..." : "PDF"}</Button>
        </Stack>
      </Stack>

      <TextField
        size="small" value={texto} onChange={(e) => setTexto(e.target.value)} sx={{ mb: 2, width: { xs: "100%", md: 420 } }}
        placeholder="Buscar jubilado por código, nombre, apellido o DPI"
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      {loading ? <CircularProgress size={24} /> : !tipos.length ? (
        <Typography color="text.secondary">Sin resultados.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 600 } }}>
              <TableCell>Tipo de jubilación</TableCell>
              <TableCell align="right">Jubilados</TableCell>
              <TableCell align="right">Meses adeudados</TableCell>
              <TableCell align="right">Saldo</TableCell>
              <TableCell sx={{ width: { md: 260 } }}>% de la deuda</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tipos.map((t) => {
              const abierto = Boolean(abiertos[t.tipoJubilacion]);
              return (
                <Fragment key={t.tipoJubilacion}>
                  <TableRow hover sx={{ cursor: "pointer", "& td": { borderBottom: abierto ? "none" : undefined } }} onClick={() => alternar(t.tipoJubilacion)}>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        {abierto ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                        <span>{t.tipoJubilacion}</span>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{fmtN(t.jubilados)}</TableCell>
                    <TableCell align="right">{fmtN(t.periodosDeuda)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtQ(t.saldo)}</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LinearProgress variant="determinate" value={Math.min(t.porcentaje, 100)}
                          sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: "#F1D5D3", "& .MuiLinearProgress-bar": { bgcolor: ROJO } }} />
                        <Typography variant="body2" sx={{ minWidth: 48, textAlign: "right" }}>{t.porcentaje}%</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} sx={{ p: 0, bgcolor: "#FAFBFC", borderBottom: abierto ? undefined : "none" }}>
                      <Collapse in={abierto} unmountOnExit>
                        <DetalleTipo filas={t.detalle} onJubilado={onJubilado} />
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
            <TableRow sx={{ "& td": { fontWeight: 800, bgcolor: "#EEF2F6" } }}>
              <TableCell>TOTAL</TableCell>
              <TableCell align="right">{fmtN(totalJub)}</TableCell>
              <TableCell align="right">{fmtN(totalMeses)}</TableCell>
              <TableCell align="right" sx={{ color: ROJO }}>{fmtQ(total)}</TableCell>
              <TableCell>100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export default DeudaPorTipoReporte;
