import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestoreIcon from "@mui/icons-material/Restore";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Box, Button, Grid, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import PageHeader from "../../components/common/PageHeader";

const StatCard = ({ label, value }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #dde3ea", height: "100%" }}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography variant="h6">{value || "N/A"}</Typography>
    </Paper>
  </Grid>
);

const MantenimientoPage = () => {
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState(null);
  const [storage, setStorage] = useState(null);
  const [backups, setBackups] = useState([]);
  const [backupStatus, setBackupStatus] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [file, setFile] = useState(null);
  const [appLog, setAppLog] = useState([]);
  const [errorLog, setErrorLog] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    const [statusResponse, storageResponse] = await Promise.all([
      axiosClient.get("/system/status"),
      axiosClient.get("/system/storage")
    ]);
    setStatus(statusResponse.data.data);
    setStorage(storageResponse.data.data);
  };

  const loadBackups = async () => {
    const [statusResponse, listResponse, historyResponse] = await Promise.all([
      axiosClient.get("/backup/status"),
      axiosClient.get("/backup/listar"),
      axiosClient.get("/backup/historial")
    ]);
    setBackupStatus(statusResponse.data.data);
    setBackups(listResponse.data.data || []);
    setHistorial(historyResponse.data.data || []);
  };

  const loadLogs = async () => {
    const [appResponse, errorResponse] = await Promise.all([
      axiosClient.get("/system/logs/app"),
      axiosClient.get("/system/logs/error")
    ]);
    setAppLog(appResponse.data.data || []);
    setErrorLog(errorResponse.data.data || []);
  };

  useEffect(() => {
    loadStatus().catch(() => {});
    loadBackups().catch(() => {});
    loadLogs().catch(() => {});
  }, []);

  const generarBackup = async () => {
    const result = await Swal.fire({ title: "Generar backup", text: "Se creara un respaldo SQL comprimido.", icon: "question", showCancelButton: true, confirmButtonText: "Generar", confirmButtonColor: "#1f4e5f" });
    if (!result.isConfirmed) return;
    setLoading(true);
    try {
      await axiosClient.post("/backup/generar");
      Swal.fire("Listo", "Backup generado correctamente.", "success");
      loadBackups();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible generar backup.", "error");
    } finally {
      setLoading(false);
    }
  };

  const download = async (name) => {
    const response = await axiosClient.get(`/backup/descargar/${name}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const eliminar = async (name) => {
    const result = await Swal.fire({ title: "Eliminar backup", text: name, icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", confirmButtonColor: "#1f4e5f" });
    if (!result.isConfirmed) return;
    await axiosClient.delete(`/backup/${name}`);
    Swal.fire("Listo", "Backup eliminado correctamente.", "success");
    loadBackups();
  };

  const restaurar = async () => {
    if (!file) {
      Swal.fire("Archivo requerido", "Seleccione un archivo .sql o .sql.gz.", "warning");
      return;
    }
    const result = await Swal.fire({
      title: "Restaurar base de datos",
      text: "Esta accion puede reemplazar informacion actual de la base de datos. Escriba RESTAURAR para continuar.",
      input: "text",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Restaurar",
      confirmButtonColor: "#1f4e5f",
      preConfirm: (value) => {
        if (value !== "RESTAURAR") Swal.showValidationMessage("Debe escribir RESTAURAR");
      }
    });
    if (!result.isConfirmed) return;

    const formData = new FormData();
    formData.append("archivo", file);
    setLoading(true);
    try {
      await axiosClient.post("/backup/restaurar", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setFile(null);
      Swal.fire("Listo", "Base de datos restaurada correctamente.", "success");
      loadBackups();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No se pudo restaurar la base de datos.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Mantenimiento" subtitle="Backups, restauracion, monitoreo y logs del sistema" />
      <Paper elevation={0} sx={{ border: "1px solid #dde3ea" }}>
        <Tabs value={tab} onChange={(event, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab label="Estado del sistema" />
          <Tab label="Backups" />
          <Tab label="Restauracion" />
          <Tab label="Logs" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Grid container spacing={2}>
          <StatCard label="API" value={status?.api} />
          <StatCard label="DB" value={status?.db?.message} />
          <StatCard label="Uptime" value={`${status?.uptimeSegundos || 0} segundos`} />
          <StatCard label="Memoria heap" value={status?.memoria?.heapUsed} />
          <StatCard label="Ambiente" value={status?.nodeEnv} />
          <StatCard label="Node" value={status?.nodeVersion} />
          <StatCard label="Logs" value={storage?.logs?.tamano} />
          <StatCard label="Backups" value={storage?.backups?.tamano} />
          <StatCard label="Memoria libre sistema" value={storage?.sistema?.memoriaLibre} />
        </Grid>
      )}

      {tab === 1 && (
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={generarBackup} disabled={loading}>Generar backup</Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadBackups}>Refrescar</Button>
          </Stack>
          <Typography color="text.secondary">Backups: {backupStatus?.cantidadBackups || 0} | Ultimo: {backupStatus?.ultimoBackup || "N/A"}</Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
            <Table size="small"><TableHead><TableRow><TableCell>Archivo</TableCell><TableCell>Tamano</TableCell><TableCell>Fecha</TableCell><TableCell align="right">Acciones</TableCell></TableRow></TableHead>
              <TableBody>{backups.map((item) => <TableRow key={item.nombre}><TableCell>{item.nombre}</TableCell><TableCell>{item.tamano}</TableCell><TableCell>{new Date(item.fechaCreacion).toLocaleString("es-GT")}</TableCell><TableCell align="right"><Button startIcon={<CloudDownloadIcon />} onClick={() => download(item.nombre)}>Descargar</Button><Button color="error" startIcon={<DeleteIcon />} onClick={() => eliminar(item.nombre)}>Eliminar</Button></TableCell></TableRow>)}</TableBody>
            </Table>
          </TableContainer>
          <Typography variant="h6">Historial</Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea" }}>
            <Table size="small"><TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Archivo</TableCell><TableCell>Tipo</TableCell><TableCell>Accion</TableCell><TableCell>Usuario</TableCell></TableRow></TableHead>
              <TableBody>{historial.map((item) => <TableRow key={item.id}><TableCell>{new Date(item.fecha).toLocaleString("es-GT")}</TableCell><TableCell>{item.nombreArchivo}</TableCell><TableCell>{item.tipo}</TableCell><TableCell>{item.accion}</TableCell><TableCell>{item.usuario}</TableCell></TableRow>)}</TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {tab === 2 && (
        <Paper elevation={0} sx={{ p: 3, border: "1px solid #dde3ea" }}>
          <Stack spacing={2}>
            <Typography variant="h6">Restauracion de base de datos</Typography>
            <Typography color="error">Esta accion puede reemplazar informacion actual de la base de datos.</Typography>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              Seleccionar archivo SQL
              <input hidden type="file" accept=".sql,.gz" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </Button>
            <Typography color="text.secondary">{file?.name || "Ningun archivo seleccionado"}</Typography>
            <Button variant="contained" color="error" startIcon={<RestoreIcon />} onClick={restaurar} disabled={loading}>Restaurar base de datos</Button>
          </Stack>
        </Paper>
      )}

      {tab === 3 && (
        <Stack spacing={2}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadLogs} sx={{ alignSelf: "flex-start" }}>Refrescar logs</Button>
          {[["app.log", appLog], ["error.log", errorLog]].map(([name, lines]) => (
            <Paper key={name} elevation={0} sx={{ p: 2, border: "1px solid #dde3ea" }}>
              <Typography variant="h6">{name}</Typography>
              <Box component="pre" sx={{ whiteSpace: "pre-wrap", maxHeight: 340, overflow: "auto", bgcolor: "#111827", color: "#e5e7eb", p: 2, borderRadius: 1 }}>
                {lines.join("\n") || "Sin registros"}
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default MantenimientoPage;
