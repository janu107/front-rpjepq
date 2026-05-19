import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { canCreate, canDelete, canEdit } from "../../utils/permissions";

const catalogConfigs = [
  {
    key: "areas",
    label: "Areas",
    codeKey: "id",
    searchFields: ["descripcion"],
    columns: [{ key: "descripcion", label: "Descripcion" }],
    fields: [{ key: "descripcion", label: "Descripcion", required: true }]
  },
  {
    key: "manejo-administracion",
    label: "Manejo administracion",
    codeKey: "id",
    searchFields: ["descripcion"],
    columns: [{ key: "descripcion", label: "Descripcion" }],
    fields: [{ key: "descripcion", label: "Descripcion", required: true }]
  },
  {
    key: "puestos",
    label: "Puestos",
    codeKey: "id",
    searchFields: ["nombre", "funcion", "areaDescripcion", "manejoDescripcion"],
    columns: [
      { key: "nombre", label: "Puesto" },
      { key: "funcion", label: "Funcion" },
      { key: "manejoDescripcion", label: "Manejo" },
      { key: "areaDescripcion", label: "Area" }
    ],
    fields: [
      { key: "nombre", label: "Nombre puesto", required: true },
      { key: "funcion", label: "Funcion", required: true },
      { key: "tipoManejo", label: "Tipo manejo", required: true, type: "select", source: "manejos" },
      { key: "idArea", label: "Area", required: true, type: "select", source: "areas" }
    ]
  },
  {
    key: "tipo-ingreso",
    label: "Tipo ingreso",
    codeKey: "id",
    searchFields: ["tipoIngreso", "descripcion"],
    columns: [
      { key: "tipoIngreso", label: "Tipo" },
      { key: "descripcion", label: "Descripcion" }
    ],
    fields: [
      { key: "tipoIngreso", label: "Tipo ingreso", required: true },
      { key: "descripcion", label: "Descripcion", required: true }
    ]
  },
  {
    key: "tipo-descuento",
    label: "Tipo descuento",
    codeKey: "id",
    searchFields: ["tipoDescuento", "descripcion"],
    columns: [
      { key: "tipoDescuento", label: "Tipo" },
      { key: "descripcion", label: "Descripcion" }
    ],
    fields: [
      { key: "tipoDescuento", label: "Tipo descuento", required: true },
      { key: "descripcion", label: "Descripcion", required: true }
    ]
  },
  {
    key: "tipo-jubilacion",
    label: "Tipo jubilacion",
    codeKey: "id",
    searchFields: ["descripcion"],
    columns: [{ key: "descripcion", label: "Descripcion" }],
    fields: [{ key: "descripcion", label: "Descripcion", required: true }]
  },
  {
    key: "tipo-planilla",
    label: "Tipo planilla",
    codeKey: "id",
    searchFields: ["tipoPlanilla", "descripcion", "idTipoUso"],
    columns: [
      { key: "tipoPlanilla", label: "Tipo" },
      { key: "descripcion", label: "Descripcion" },
      { key: "idTipoUso", label: "Tipo uso" }
    ],
    fields: [
      { key: "tipoPlanilla", label: "Tipo planilla", required: true },
      { key: "descripcion", label: "Descripcion", required: true },
      { key: "idTipoUso", label: "Tipo uso", required: true, type: "number" }
    ]
  },
  {
    key: "parametro-general",
    label: "Parametro general",
    codeKey: "id",
    searchFields: ["nombreEmpresa", "nit", "correo"],
    columns: [
      { key: "nombreEmpresa", label: "Empresa" },
      { key: "nit", label: "NIT" },
      { key: "telefono", label: "Telefono" },
      { key: "correo", label: "Correo" },
      { key: "iva", label: "IVA" }
    ],
    fields: [
      { key: "nombreEmpresa", label: "Nombre empresa", required: true },
      { key: "nit", label: "NIT", required: true },
      { key: "telefono", label: "Telefono", required: true },
      { key: "correo", label: "Correo", required: true },
      { key: "iva", label: "IVA", type: "number" },
      { key: "porcentajePagos", label: "Porcentaje pagos", type: "number" },
      { key: "isr", label: "ISR", type: "number" },
      { key: "porcentajeTiempoExtra", label: "Porcentaje tiempo extra", type: "number" },
      { key: "pagoDieta", label: "Pago dieta", type: "number" }
    ]
  },
  {
    key: "parametro-planilla",
    label: "Parametro planilla",
    codeKey: "id",
    searchFields: ["numero", "frecuencia", "estado", "tipoPlanillaNombre"],
    columns: [
      { key: "numero", label: "Numero" },
      { key: "tipoPlanillaNombre", label: "Tipo planilla" },
      { key: "frecuencia", label: "Frecuencia" },
      { key: "estado", label: "Estado" }
    ],
    fields: [
      { key: "tipoPlanilla", label: "Tipo planilla", required: true, type: "select", source: "tiposPlanilla" },
      { key: "numero", label: "Numero", required: true, type: "number" },
      { key: "fechaInicio", label: "Fecha inicio", required: true, type: "date" },
      { key: "fechaFinal", label: "Fecha final", required: true, type: "date" },
      { key: "fechaPago", label: "Fecha pago", required: true, type: "date" },
      { key: "frecuencia", label: "Frecuencia", required: true },
      { key: "estado", label: "Estado", required: true }
    ]
  }
];

const buildInitialForm = (config) =>
  config.fields.reduce((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {});

const CatalogosPage = () => {
  const { user } = useAuth();
  const { catalogo } = useParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState({});
  const [areas, setAreas] = useState([]);
  const [manejos, setManejos] = useState([]);
  const [tiposPlanilla, setTiposPlanilla] = useState([]);

  const catalogIndex = catalogConfigs.findIndex((item) => item.key === (catalogo || catalogConfigs[0].key));
  const config = catalogConfigs[catalogIndex >= 0 ? catalogIndex : 0];

  const loadRecords = async (catalogKey = config.key) => {
    try {
      const { data } = await axiosClient.get(`/catalogos/${catalogKey}`);
      if (catalogKey === config.key) {
        setRecords(data.data || []);
      }
      return data.data || [];
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible cargar el catalogo.", "error");
      return [];
    }
  };

  const loadDependencies = async () => {
    const [areasData, manejosData, tiposPlanillaData] = await Promise.all([
      axiosClient.get("/catalogos/areas"),
      axiosClient.get("/catalogos/manejo-administracion"),
      axiosClient.get("/catalogos/tipo-planilla")
    ]);
    setAreas(areasData.data.data || []);
    setManejos(manejosData.data.data || []);
    setTiposPlanilla(tiposPlanillaData.data.data || []);
  };

  useEffect(() => {
    if (catalogo && catalogIndex === -1) {
      navigate("/catalogos/areas", { replace: true });
    }
  }, [catalogo, catalogIndex, navigate]);

  useEffect(() => {
    setSearch("");
    loadRecords();
    if (config.key === "puestos" || config.key === "parametro-planilla") {
      loadDependencies();
    }
  }, [config.key]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) =>
      config.searchFields.some((field) => String(record[field] || "").toLowerCase().includes(term))
    );
  }, [records, search, config]);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setForm(buildInitialForm(config));
    setDialogOpen(true);
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    setForm(
      config.fields.reduce((acc, field) => {
        acc[field.key] = record[field.key] ?? "";
        return acc;
      }, {})
    );
    setDialogOpen(true);
  };

  const validateForm = () => {
    const missing = config.fields.find((field) => field.required && String(form[field.key] ?? "").trim() === "");
    if (missing) {
      return `El campo ${missing.label} es obligatorio.`;
    }
    return null;
  };

  const handleSave = async () => {
    const validationMessage = validateForm();
    if (validationMessage) {
      Swal.fire("Validacion", validationMessage, "warning");
      return;
    }

    try {
      if (editingRecord) {
        await axiosClient.put(`/catalogos/${config.key}/${editingRecord.id}`, form);
        Swal.fire("Listo", "Registro actualizado correctamente.", "success");
      } else {
        await axiosClient.post(`/catalogos/${config.key}`, form);
        Swal.fire("Listo", "Registro creado correctamente.", "success");
      }
      setDialogOpen(false);
      loadRecords();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible guardar el registro.", "error");
    }
  };

  const handleDelete = async (record) => {
    const result = await Swal.fire({
      title: "Eliminar registro",
      text: "Esta accion no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1f4e5f"
    });

    if (!result.isConfirmed) return;

    try {
      await axiosClient.delete(`/catalogos/${config.key}/${record.id}`);
      Swal.fire("Listo", "Registro eliminado correctamente.", "success");
      loadRecords();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "No fue posible eliminar el registro.", "error");
    }
  };

  const renderField = (field) => {
    if (field.type === "select") {
      const options = field.source === "areas" ? areas : field.source === "tiposPlanilla" ? tiposPlanilla : manejos;
      return (
        <FormControl fullWidth key={field.key}>
          <InputLabel>{field.label}</InputLabel>
          <Select
            label={field.label}
            value={form[field.key] ?? ""}
            onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
          >
            {options.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {field.source === "tiposPlanilla" ? `${option.tipoPlanilla} - ${option.descripcion}` : option.descripcion}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        key={field.key}
        label={field.label}
        type={field.type || "text"}
        value={form[field.key] ?? ""}
        onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
        fullWidth
      />
    );
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5">Catalogos</Typography>
        <Typography color="text.secondary">{config.label}</Typography>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
        <TextField
          placeholder="Buscar"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ maxWidth: { md: 420 } }}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
        {canCreate(user) && <Button type="button" variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Nuevo
        </Button>}
      </Stack>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea", overflow: "hidden" }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>Codigo</TableCell>
              {config.columns.map((column) => (
                <TableCell key={column.key} sx={{ fontWeight: 800, color: "text.secondary" }}>{column.label}</TableCell>
              ))}
              <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>Creacion</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: "text.secondary" }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id} hover>
                <TableCell>{record[config.codeKey] ?? record.id}</TableCell>
                {config.columns.map((column) => (
                  <TableCell key={column.key}>{record[column.key]}</TableCell>
                ))}
                <TableCell>{record.usuarioCreacion || ""}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  {canEdit(user) && <Tooltip title="Editar">
                    <IconButton color="primary" size="small" aria-label="Editar catalogo" onClick={() => openEditDialog(record)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>}
                  {canDelete(user) && <Tooltip title="Eliminar">
                    <IconButton color="primary" size="small" aria-label="Eliminar catalogo" onClick={() => handleDelete(record)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {filteredRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={config.columns.length + 3} align="center">
                  No hay registros para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { width: "min(1080px, calc(100% - 24px))" } }}
      >
        <DialogTitle>{editingRecord ? "Editar registro" : "Nuevo registro"}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {config.fields.map((field) => (
              <Grid item xs={12} md={field.fullWidth ? 12 : 6} key={field.key}>
                {renderField(field)}
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default CatalogosPage;
