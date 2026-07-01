import AutorenewIcon from "@mui/icons-material/Autorenew";
import BlockIcon from "@mui/icons-material/Block";
import EditIcon from "@mui/icons-material/Edit";
import PaidIcon from "@mui/icons-material/Paid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Paper, Select, Stack,
  Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/common/PageHeader";
import StatusChip from "../../components/common/StatusChip";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canEdit } from "../../utils/permissions";

const money = (v) => `Q ${Number(v || 0).toFixed(2)}`;
const currentPeriodo = () => new Date().toISOString().slice(0, 7);
const tipoDocumentoOptions = ["CHEQUE", "TRANSFERENCIA", "DEPOSITO"];

// ---------------------------------------------------------------------------
// Tab 1: Sesiones (actas) con registro de asistencia individual de los miembros
// ---------------------------------------------------------------------------
const SesionesTab = ({ user, miembros }) => {
  const [rows, setRows] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ acta: "", fechaSesion: "", descripcion: "", asistentes: [] });

  const load = async () => {
    try {
      const { data } = await axiosClient.get("/sesiones");
      setRows(data.data || []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar sesiones.", "error");
    }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ acta: "", fechaSesion: "", descripcion: "", asistentes: [] });
    setDialogOpen(true);
  };
  const openEdit = async (row) => {
    try {
      const { data } = await axiosClient.get(`/sesiones/${row.id}`);
      const s = data.data;
      setEditing(s);
      setForm({
        acta: s.acta || "",
        fechaSesion: s.fechaSesion || "",
        descripcion: s.descripcion || "",
        asistentes: (s.asistentesIds || []).map(Number)
      });
      setDialogOpen(true);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar la sesión.", "error");
    }
  };

  const toggleAsistente = (id) => {
    setForm((f) => {
      const set = new Set(f.asistentes.map(Number));
      if (set.has(Number(id))) set.delete(Number(id)); else set.add(Number(id));
      return { ...f, asistentes: [...set] };
    });
  };

  const save = async () => {
    if (!form.acta.trim()) { Swal.fire("Validación", "El acta es obligatoria.", "warning"); return; }
    if (!form.fechaSesion) { Swal.fire("Validación", "La fecha de la sesión es obligatoria.", "warning"); return; }
    try {
      if (editing) await axiosClient.put(`/sesiones/${editing.id}`, form);
      else await axiosClient.post("/sesiones", form);
      Swal.fire("Listo", "Sesión guardada correctamente.", "success");
      setDialogOpen(false);
      load();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar la sesión.", "error");
    }
  };

  const anular = async (row) => {
    const result = await Swal.fire({
      title: "Anular sesión", text: `Acta ${row.acta}. La asistencia dejará de contar en los pagos PENDIENTE.`,
      icon: "warning", showCancelButton: true, confirmButtonText: "Anular", cancelButtonText: "Cancelar", confirmButtonColor: "#c62828"
    });
    if (!result.isConfirmed) return;
    try {
      await axiosClient.post(`/sesiones/${row.id}/anular`);
      Swal.fire("Listo", "Sesión anulada.", "success");
      load();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible anular la sesión.", "error");
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Sesiones registradas</Typography>
        {canCreate(user) && <Button variant="contained" startIcon={<ReceiptLongIcon />} onClick={openCreate}>Nueva sesión</Button>}
      </Stack>
      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "rgba(31,78,95,0.08)" }}>
            <TableRow>
              <TableCell>Acta</TableCell><TableCell>Fecha</TableCell><TableCell>Descripción</TableCell>
              <TableCell align="center">Asistentes</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.acta}</TableCell>
                <TableCell>{row.fechaSesion}</TableCell>
                <TableCell>{row.descripcion}</TableCell>
                <TableCell align="center">{row.asistentes}</TableCell>
                <TableCell><StatusChip value={row.estado} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {canEdit(user) && row.estado === "ACTIVA" && (
                      <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => openEdit(row)}><EditIcon /></IconButton></Tooltip>
                    )}
                    {canEdit(user) && row.estado === "ACTIVA" && (
                      <Tooltip title="Anular"><IconButton size="small" color="error" onClick={() => anular(row)}><BlockIcon /></IconButton></Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">No hay sesiones registradas.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Editar sesión" : "Nueva sesión de junta directiva"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={4}>
              <TextField label="Acta *" value={form.acta} onChange={(e) => setForm({ ...form, acta: e.target.value.toUpperCase() })} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Fecha sesión *" type="date" InputLabelProps={{ shrink: true }} value={form.fechaSesion} onChange={(e) => setForm({ ...form, fechaSesion: e.target.value })} fullWidth />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value.toUpperCase() })} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Asistencia ({form.asistentes.length})</Typography>
              <Grid container>
                {miembros.map((m) => (
                  <Grid item xs={12} md={6} key={m.id}>
                    <FormControlLabel
                      control={<Checkbox checked={form.asistentes.map(Number).includes(Number(m.id))} onChange={() => toggleAsistente(m.id)} />}
                      label={`${m.nombre || m.nombres || ""} ${m.apellidos || ""}`.trim() + (m.puesto ? ` — ${m.puesto}` : "")}
                    />
                  </Grid>
                ))}
                {miembros.length === 0 && <Typography color="text.secondary" sx={{ p: 1 }}>No hay miembros de junta directiva registrados.</Typography>}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={save}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

// ---------------------------------------------------------------------------
// Tab 2: Pagos del mes (recalcular, emitir pago, marcar recibido, voucher)
// ---------------------------------------------------------------------------
const PagosTab = ({ user, parIsr, bancos }) => {
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [rows, setRows] = useState([]);
  const [pagoDialog, setPagoDialog] = useState({ open: false, row: null, noDocumento: "", tipoDocumento: "CHEQUE", banco: "", fechaPago: "" });
  const [reciboDialog, setReciboDialog] = useState({ open: false, row: null, fechaRecibido: "" });
  const [detalle, setDetalle] = useState({ open: false, pago: null, sesiones: [] });

  const load = async (p = periodo) => {
    try {
      const { data } = await axiosClient.get(`/dietas/pagos?periodo=${p}`);
      setRows(data.data || []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar los pagos.", "error");
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const recalcular = async () => {
    try {
      const { data } = await axiosClient.post("/dietas/recalcular", { periodo });
      setRows(data.data || []);
      Swal.fire("Listo", "Totales recalculados.", "success");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible recalcular.", "error");
    }
  };

  const emitirPago = async () => {
    const d = pagoDialog;
    if (!d.noDocumento || !d.tipoDocumento || !d.banco || !d.fechaPago) {
      Swal.fire("Validación", "Complete No. documento, tipo, banco y fecha de pago.", "warning"); return;
    }
    try {
      await axiosClient.post(`/dietas/${d.row.id}/pagar`, { noDocumento: d.noDocumento, tipoDocumento: d.tipoDocumento, banco: d.banco, fechaPago: d.fechaPago });
      Swal.fire("Listo", "Pago emitido.", "success");
      setPagoDialog({ open: false, row: null, noDocumento: "", tipoDocumento: "CHEQUE", banco: "", fechaPago: "" });
      load();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible emitir el pago.", "error");
    }
  };

  const marcarRecibido = async () => {
    const d = reciboDialog;
    if (!d.fechaRecibido) { Swal.fire("Validación", "Indique la fecha de recibido.", "warning"); return; }
    try {
      await axiosClient.post(`/dietas/${d.row.id}/recibir`, { fechaRecibido: d.fechaRecibido });
      Swal.fire("Listo", "Pago marcado como recibido.", "success");
      setReciboDialog({ open: false, row: null, fechaRecibido: "" });
      load();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible marcar recibido.", "error");
    }
  };

  const verDetalle = async (row) => {
    try {
      const { data } = await axiosClient.get(`/dietas/${row.id}/detalle`);
      setDetalle({ open: true, pago: data.data.pago, sesiones: data.data.sesiones || [] });
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar el detalle.", "error");
    }
  };

  const totales = useMemo(() => rows.reduce((acc, r) => ({
    valor: acc.valor + Number(r.valor || 0), isr: acc.isr + Number(r.isr || 0), liquido: acc.liquido + Number(r.valorPago || 0)
  }), { valor: 0, isr: 0, liquido: 0 }), [rows]);

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: 2, border: "1px solid #dde3ea" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField label="Periodo (mes)" type="month" InputLabelProps={{ shrink: true }} value={periodo} onChange={(e) => setPeriodo(e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={6} md={2}>
            <Button variant="outlined" fullWidth onClick={() => load()}>Consultar</Button>
          </Grid>
          <Grid item xs={6} md={3}>
            {canEdit(user) && <Button variant="contained" startIcon={<AutorenewIcon />} fullWidth onClick={recalcular}>Recalcular totales</Button>}
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography color="text.secondary" variant="body2">ISR vigente</Typography>
            <Typography variant="h6">{Number(parIsr || 0).toFixed(2)} %</Typography>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "rgba(31,78,95,0.08)" }}>
            <TableRow>
              <TableCell>Miembro</TableCell><TableCell>Puesto</TableCell><TableCell align="center">Sesiones</TableCell>
              <TableCell align="right">Valor</TableCell><TableCell align="right">ISR</TableCell><TableCell align="right">Líquido</TableCell>
              <TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.juntaNombre}</TableCell>
                <TableCell>{row.juntaPuesto}</TableCell>
                <TableCell align="center">{row.totalSesiones}</TableCell>
                <TableCell align="right">{money(row.valor)}</TableCell>
                <TableCell align="right">{money(row.isr)}</TableCell>
                <TableCell align="right">{money(row.valorPago)}</TableCell>
                <TableCell><StatusChip value={row.estado} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Ver voucher"><IconButton size="small" color="primary" onClick={() => verDetalle(row)}><VisibilityIcon /></IconButton></Tooltip>
                    {canEdit(user) && row.estado === "PENDIENTE" && (
                      <Tooltip title="Emitir pago"><IconButton size="small" color="success" onClick={() => setPagoDialog({ open: true, row, noDocumento: "", tipoDocumento: "CHEQUE", banco: "", fechaPago: "" })}><PaidIcon /></IconButton></Tooltip>
                    )}
                    {canEdit(user) && row.estado === "PAGADO" && (
                      <Tooltip title="Marcar recibido"><IconButton size="small" color="success" onClick={() => setReciboDialog({ open: true, row, fechaRecibido: "" })}><ReceiptLongIcon /></IconButton></Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={8} align="center">No hay pagos para el periodo seleccionado.</TableCell></TableRow>}
            {rows.length > 0 && (
              <TableRow sx={{ "& td": { fontWeight: 800 } }}>
                <TableCell colSpan={3} align="right">TOTAL</TableCell>
                <TableCell align="right">{money(totales.valor)}</TableCell>
                <TableCell align="right">{money(totales.isr)}</TableCell>
                <TableCell align="right">{money(totales.liquido)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Emitir pago */}
      <Dialog open={pagoDialog.open} onClose={() => setPagoDialog({ ...pagoDialog, open: false })} fullWidth maxWidth="sm">
        <DialogTitle>Emitir pago — {pagoDialog.row?.juntaNombre}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo documento</InputLabel>
                <Select label="Tipo documento" value={pagoDialog.tipoDocumento} onChange={(e) => setPagoDialog({ ...pagoDialog, tipoDocumento: e.target.value })}>
                  {tipoDocumentoOptions.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}><TextField label="No. documento" value={pagoDialog.noDocumento} onChange={(e) => setPagoDialog({ ...pagoDialog, noDocumento: e.target.value.toUpperCase() })} fullWidth /></Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Banco</InputLabel>
                <Select label="Banco" value={pagoDialog.banco} onChange={(e) => setPagoDialog({ ...pagoDialog, banco: e.target.value })}>
                  {(bancos || []).map((b) => <MenuItem key={b.id} value={b.descripcion}>{b.descripcion}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}><TextField label="Fecha de pago" type="date" InputLabelProps={{ shrink: true }} value={pagoDialog.fechaPago} onChange={(e) => setPagoDialog({ ...pagoDialog, fechaPago: e.target.value })} fullWidth /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPagoDialog({ ...pagoDialog, open: false })}>Cancelar</Button>
          <Button variant="contained" onClick={emitirPago}>Emitir pago</Button>
        </DialogActions>
      </Dialog>

      {/* Marcar recibido */}
      <Dialog open={reciboDialog.open} onClose={() => setReciboDialog({ ...reciboDialog, open: false })} fullWidth maxWidth="xs">
        <DialogTitle>Marcar recibido — {reciboDialog.row?.juntaNombre}</DialogTitle>
        <DialogContent dividers>
          <TextField label="Fecha de recibido" type="date" InputLabelProps={{ shrink: true }} value={reciboDialog.fechaRecibido} onChange={(e) => setReciboDialog({ ...reciboDialog, fechaRecibido: e.target.value })} fullWidth sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReciboDialog({ ...reciboDialog, open: false })}>Cancelar</Button>
          <Button variant="contained" onClick={marcarRecibido}>Marcar recibido</Button>
        </DialogActions>
      </Dialog>

      {/* Voucher / detalle */}
      <Dialog open={detalle.open} onClose={() => setDetalle({ ...detalle, open: false })} fullWidth maxWidth="sm">
        <DialogTitle>Voucher — {detalle.pago?.juntaNombre}</DialogTitle>
        <DialogContent dividers>
          {detalle.pago && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">{detalle.pago.juntaPuesto} · Periodo {detalle.pago.periodo || "—"} · Estado {detalle.pago.estado}</Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Acta</TableCell><TableCell>Fecha</TableCell><TableCell>Estado</TableCell><TableCell align="right">Valor</TableCell></TableRow></TableHead>
                  <TableBody>
                    {detalle.sesiones.map((s) => (
                      <TableRow key={s.idDetalle}>
                        <TableCell>{s.acta}</TableCell><TableCell>{s.fechaSesion}</TableCell><TableCell>{s.estado}</TableCell><TableCell align="right">{money(s.valor)}</TableCell>
                      </TableRow>
                    ))}
                    {detalle.sesiones.length === 0 && <TableRow><TableCell colSpan={4} align="center">Sin sesiones asociadas.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
              <Divider />
              <Stack direction="row" justifyContent="space-between"><Typography>Valor bruto</Typography><Typography>{money(detalle.pago.valor)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography>ISR</Typography><Typography>{money(detalle.pago.isr)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontWeight: 800 }}>Líquido</Typography><Typography sx={{ fontWeight: 800 }}>{money(detalle.pago.valorPago)}</Typography></Stack>
              {detalle.pago.estado !== "PENDIENTE" && (
                <Typography variant="body2" color="text.secondary">
                  Documento: {detalle.pago.tipoDocumento} {detalle.pago.noDocumento} · Banco: {detalle.pago.banco} · Pago: {detalle.pago.fechaPago ? String(detalle.pago.fechaPago).slice(0, 10) : "—"} · Recibido: {detalle.pago.fechaRecibido ? String(detalle.pago.fechaRecibido).slice(0, 10) : "—"}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => window.print()}>Imprimir voucher</Button>
          <Button onClick={() => setDetalle({ ...detalle, open: false })}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

// ---------------------------------------------------------------------------
const DietasPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [miembros, setMiembros] = useState([]);
  const [parIsr, setParIsr] = useState(0);
  const [bancos, setBancos] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [junta, params, bancosRes] = await Promise.all([
          axiosClient.get("/junta-directiva"),
          axiosClient.get("/catalogos/parametro-general"),
          axiosClient.get("/catalogos/bancos")
        ]);
        setMiembros(junta.data.data || []);
        const list = params.data.data || [];
        setParIsr(list.length ? Number(list[list.length - 1].isr || 0) : 0);
        setBancos(bancosRes.data.data || []);
      } catch {
        /* las pestañas muestran su propio error al cargar */
      }
    })();
  }, []);

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Pago de Dietas" subtitle="Sesiones de junta directiva, asistencia y pagos mensuales" />
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Sesiones" />
          <Tab label="Pagos del mes" />
        </Tabs>
      </Box>
      {tab === 0 && <SesionesTab user={user} miembros={miembros} />}
      {tab === 1 && <PagosTab user={user} parIsr={parIsr} bancos={bancos} />}
    </Stack>
  );
};

export default DietasPage;
