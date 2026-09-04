import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import HistoryIcon from "@mui/icons-material/History";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Skeleton,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import BuscadorPersona from "../../components/common/BuscadorPersona";
import PageHeader from "../../components/common/PageHeader";

const PRIMARIO = "#1F4E79";
const ROJO = "#F44336";
const VERDE = "#4CAF50";
const AMARILLO = "#FF9800";

const fmtQ = (n) => `Q${Number(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPeriodo = (p) => { const s = String(p); return s.length === 6 ? `${s.slice(4, 6)}/${s.slice(0, 4)}` : s; };

const colorEstadoDeuda = (d) => {
  if (!d.esDeuda) return VERDE;               // historia (pagado 100%)
  if (d.estado === "PAGADA") return VERDE;
  if (d.estado === "PARCIAL") return AMARILLO;
  return ROJO;                                 // PENDIENTE
};

const Dato = ({ label, valor }) => (
  <Grid item xs={12} sm={6} md={3}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography sx={{ fontWeight: 600 }}>{valor}</Typography>
  </Grid>
);

const EstadoCuentaPage = () => {
  const [loading, setLoading] = useState(false);
  const [jub, setJub] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [historiaOpen, setHistoriaOpen] = useState(false);
  const [historia, setHistoria] = useState([]);
  const [idSel, setIdSel] = useState(null);
  const location = useLocation();

  const seleccionar = async (opt) => {
    if (!opt) { setJub(null); setResumen(null); setBeneficiarios([]); setPagos([]); setIdSel(null); return; }
    setIdSel(opt.id);
    setLoading(true);
    try {
      const [g, r, b, p] = await Promise.all([
        axiosClient.get(`/jubilados/${opt.id}`),
        axiosClient.get(`/jubilados/${opt.id}/resumen-financiero`),
        axiosClient.get(`/jubilados/${opt.id}/beneficiarios-activos`),
        axiosClient.get(`/jubilados/${opt.id}/ultimos-pagos`, { params: { limit: 12 } })
      ]);
      setJub(g.data.data); setResumen(r.data.data); setBeneficiarios(b.data.data || []); setPagos(p.data.data || []);
    } catch {
      Swal.fire("Error", "No fue posible cargar el estado de cuenta.", "error");
    } finally { setLoading(false); }
  };

  const verHistoria = async () => {
    try {
      const { data } = await axiosClient.get(`/jubilados/${idSel}/historia-completa`);
      setHistoria(data.data || []); setHistoriaOpen(true);
    } catch { Swal.fire("Error", "No fue posible cargar la historia.", "error"); }
  };

  const exportarPdf = async () => {
    try {
      const resp = await axiosClient.get(`/jubilados/${idSel}/estado-cuenta.pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      window.open(url, "_blank");
    } catch {
      Swal.fire("PDF no disponible", "El reporte PDF aún no está habilitado en el servidor.", "info");
    }
  };

  // Precarga desde reportes / fallecimientos (navigate con state {id})
  useEffect(() => {
    if (location.state?.id) seleccionar({ id: location.state.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const saldo = Number(resumen?.deudaPendiente || 0);

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Estado de Cuenta" subtitle="Consulta del estado financiero del jubilado (solo lectura)" />

      <Paper sx={{ p: 2.5 }}>
        <BuscadorPersona
          label="Buscar jubilado por código, nombre o DPI (vivos y fallecidos)"
          endpoint="/jubilados/buscar"
          value={null}
          getOptionLabel={(o) => (o ? `${o.idJubilado} - ${o.nombreCompleto} — ${o.dpi}` : "")}
          renderOption={(props, o) => (
            <li {...props} key={o.id}>{o.estadoPago === "FALLECIDO" ? "⚰️ " : ""}{o.idJubilado} - {o.nombreCompleto} — {o.dpi}</li>
          )}
          onSelect={seleccionar}
        />
      </Paper>

      {loading && (
        <Paper sx={{ p: 2.5 }}><Skeleton height={40} /><Skeleton height={30} width="60%" /><Skeleton height={120} /></Paper>
      )}

      {!loading && jub && (
        <>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ color: PRIMARIO }}>
                {jub.nombres} {jub.apellidos} {resumen?.estadoPago === "FALLECIDO" && "⚰️"}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<HistoryIcon />} onClick={verHistoria}>Ver historia completa</Button>
                <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={exportarPdf}>Exportar PDF</Button>
              </Stack>
            </Stack>
            <Grid container spacing={2}>
              <Dato label="DPI" valor={jub.dpi} />
              <Dato label="Tipo de pago" valor={resumen?.tipoPago} />
              <Dato label="Estado de pago" valor={resumen?.estadoPago} />
              <Dato label="Cuota mensual (pensión)" valor={fmtQ(resumen?.pension)} />
              <Dato label="Meses adeudados" valor={resumen?.periodosDeuda ?? 0} />
              <Dato label="Total pagado" valor={fmtQ(resumen?.totalPagado)} />
              <Dato label="Meses de historia" valor={resumen?.periodosHistoria ?? 0} />
            </Grid>
            <Box sx={{ mt: 2, p: 2, borderRadius: 2, textAlign: "center", bgcolor: saldo > 0 ? "rgba(244,67,54,0.08)" : "rgba(76,175,80,0.08)" }}>
              <Typography variant="caption" color="text.secondary">SALDO PENDIENTE</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 34, color: saldo > 0 ? ROJO : VERDE }}>{fmtQ(saldo)}</Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 1.5, color: PRIMARIO }}>Beneficiarios activos</Typography>
            {beneficiarios.length === 0 ? <Typography color="text.secondary">Sin beneficiarios activos.</Typography> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>Nombre</TableCell><TableCell>Parentesco</TableCell><TableCell align="right">%</TableCell><TableCell align="right">Monto mensual</TableCell></TableRow></TableHead>
                <TableBody>
                  {beneficiarios.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{`${b.nombres || ""} ${b.apellidos}`.trim()}</TableCell>
                      <TableCell>{b.tipoParentesco}</TableCell>
                      <TableCell align="right">{Number(b.porcentaje).toFixed(2)}</TableCell>
                      <TableCell align="right">{fmtQ(Number(resumen?.pension || 0) * 0.5 * (Number(b.porcentaje) / 100))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 1.5, color: PRIMARIO }}>Últimos pagos</Typography>
            {pagos.length === 0 ? <Typography color="text.secondary">Sin pagos registrados.</Typography> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>Período</TableCell><TableCell>Fecha pago</TableCell><TableCell align="right">Total</TableCell><TableCell align="right">Corriente</TableCell><TableCell align="right">Abono</TableCell></TableRow></TableHead>
                <TableBody>
                  {pagos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.periodo}</TableCell>
                      <TableCell>{p.fechaPago ? String(p.fechaPago).slice(0, 10) : ""}</TableCell>
                      <TableCell align="right">{fmtQ(p.total)}</TableCell>
                      <TableCell align="right">{fmtQ(p.pagoCorriente)}</TableCell>
                      <TableCell align="right">{fmtQ(p.abono)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}

      <Dialog open={historiaOpen} onClose={() => setHistoriaOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Historia completa</DialogTitle>
        <DialogContent dividers>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Período</TableCell><TableCell align="right">Pensión completa</TableCell><TableCell align="right">Monto generado</TableCell>
                <TableCell align="right">Pagado</TableCell><TableCell align="right">Saldo</TableCell><TableCell>Estado</TableCell><TableCell>Tipo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historia.map((d) => {
                const color = colorEstadoDeuda(d);
                const generado = Number(d.montoPagado || 0) + Number(d.saldo || 0);
                return (
                  <TableRow key={d.id} sx={{ bgcolor: `${color}14` }}>
                    <TableCell>{fmtPeriodo(d.periodo)}</TableCell>
                    <TableCell align="right">{fmtQ(d.pensionCompleta)}</TableCell>
                    <TableCell align="right">{fmtQ(generado)}</TableCell>
                    <TableCell align="right">{fmtQ(d.montoPagado)}</TableCell>
                    <TableCell align="right">{fmtQ(d.saldo)}</TableCell>
                    <TableCell><Chip size="small" label={d.esDeuda ? d.estado : "HISTORIA"} sx={{ bgcolor: color, color: "#fff" }} /></TableCell>
                    <TableCell>{d.tipoPago}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions><Button onClick={() => setHistoriaOpen(false)}>Cerrar</Button></DialogActions>
      </Dialog>
    </Stack>
  );
};

export default EstadoCuentaPage;
