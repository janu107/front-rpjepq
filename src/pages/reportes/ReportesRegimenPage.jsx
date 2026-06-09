import SearchIcon from "@mui/icons-material/Search";
import {
  Box, InputAdornment, Paper, Stack, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import axiosClient from "../../api/axiosClient";

const formatDate = (v) => (v ? String(v).slice(0, 10) : "");
const money = (v) => `Q ${Number(v || 0).toFixed(2)}`;

const ReportTable = ({ columns, rows, search, searchKeys }) => {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => searchKeys.some((k) => String(r[k] || "").toLowerCase().includes(term)));
  }, [rows, search, searchKeys]);

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #dde3ea", overflow: "hidden" }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: "rgba(31, 78, 95, 0.08)" }}>
          <TableRow>
            {columns.map((c) => <TableCell key={c.key} sx={{ fontWeight: 800, color: "text.secondary" }}>{c.label}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((row, i) => (
            <TableRow key={i} hover>
              {columns.map((c) => <TableCell key={c.key}>{c.render ? c.render(row) : row[c.key] ?? ""}</TableCell>)}
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow><TableCell colSpan={columns.length} align="center">No hay registros para mostrar.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ReportesRegimenPage = () => {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ prestamos: [], junta: [], dietas: [], empleados: [], aportaciones: [] });

  useEffect(() => {
    const endpoints = [
      ["/reportes/regimen/prestamos-regimen", "prestamos"],
      ["/reportes/regimen/junta-directiva", "junta"],
      ["/reportes/regimen/dietas", "dietas"],
      ["/reportes/regimen/empleados-regimen", "empleados"],
      ["/reportes/regimen/aportaciones", "aportaciones"]
    ];
    Promise.allSettled(endpoints.map(([url]) => axiosClient.get(url))).then((results) => {
      const next = { ...data };
      results.forEach((r, i) => {
        if (r.status === "fulfilled") next[endpoints[i][1]] = r.value.data.data || [];
      });
      setData(next);
    });
  }, []);

  const tabs = [
    {
      label: "Préstamos Régimen",
      rows: data.prestamos,
      searchKeys: ["noReferencia", "personaNombre", "bancoNombre", "estado"],
      columns: [
        { key: "noReferencia", label: "No. Referencia" },
        { key: "personaNombre", label: "Persona" },
        { key: "bancoNombre", label: "Banco" },
        { key: "monto", label: "Monto", render: (r) => money(r.monto) },
        { key: "valorMes", label: "Valor mes", render: (r) => money(r.valorMes) },
        { key: "saldo", label: "Saldo", render: (r) => money(r.saldo) },
        { key: "noCuotas", label: "Cuotas" },
        { key: "fechaInicio", label: "Inicio", render: (r) => formatDate(r.fechaInicio) },
        { key: "fechaFin", label: "Fin", render: (r) => formatDate(r.fechaFin) },
        { key: "uso", label: "Uso" },
        { key: "estado", label: "Estado" }
      ]
    },
    {
      label: "Junta Directiva",
      rows: data.junta,
      searchKeys: ["nombre", "apellidos", "puesto", "tipoJunta", "estado"],
      columns: [
        { key: "idJunta", label: "ID" },
        { key: "nombre", label: "Nombre" },
        { key: "apellidos", label: "Apellidos" },
        { key: "tipoJunta", label: "Tipo junta" },
        { key: "puesto", label: "Puesto" },
        { key: "estado", label: "Estado" },
        { key: "fechaInicio", label: "Inicio", render: (r) => formatDate(r.fechaInicio) },
        { key: "fechaFinal", label: "Final", render: (r) => formatDate(r.fechaFinal) },
        { key: "manejoDescripcion", label: "Manejo" }
      ]
    },
    {
      label: "Dietas",
      rows: data.dietas,
      searchKeys: ["miembroNombre", "puesto", "tipoJunta", "acta"],
      columns: [
        { key: "miembroNombre", label: "Miembro" },
        { key: "puesto", label: "Puesto" },
        { key: "tipoJunta", label: "Tipo junta" },
        { key: "manejoDescripcion", label: "Manejo" },
        { key: "acta", label: "Acta" },
        { key: "sesionesMes", label: "Sesiones" },
        { key: "valor", label: "Valor", render: (r) => money(r.valor) },
        { key: "retencionIsr", label: "Retención ISR", render: (r) => money(r.retencionIsr) },
        { key: "liquido", label: "Líquido", render: (r) => money(r.liquido) },
        { key: "fechaSesion", label: "F. sesión", render: (r) => formatDate(r.fechaSesion) },
        { key: "fechaPago", label: "F. pago", render: (r) => formatDate(r.fechaPago) }
      ]
    },
    {
      label: "Empleados Régimen",
      rows: data.empleados,
      searchKeys: ["nombres", "apellidos", "dpi", "puestoNombre", "areaDescripcion"],
      columns: [
        { key: "idEmpleado", label: "ID" },
        { key: "nombres", label: "Nombres" },
        { key: "apellidos", label: "Apellidos" },
        { key: "sexo", label: "Sexo" },
        { key: "dpi", label: "DPI" },
        { key: "estadoCivil", label: "Est. civil" },
        { key: "puestoNombre", label: "Puesto" },
        { key: "areaDescripcion", label: "Area" },
        { key: "manejoDescripcion", label: "Manejo" }
      ]
    },
    {
      label: "Aportaciones de Empleados",
      rows: data.aportaciones,
      searchKeys: ["nombre", "apellido", "dpi", "gerencia", "estado", "manejoDescripcion"],
      columns: [
        { key: "aportanteId", label: "ID" },
        { key: "nombre", label: "Nombre" },
        { key: "apellido", label: "Apellido" },
        { key: "dpi", label: "DPI" },
        { key: "gerencia", label: "Gerencia" },
        { key: "estado", label: "Estado" },
        { key: "manejoDescripcion", label: "Manejo" },
        { key: "totalAportado", label: "Total aportado", render: (r) => money(r.totalAportado) },
        { key: "cantidadAportes", label: "Cantidad aportes" }
      ]
    }
  ];

  const current = tabs[tab];

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5">Reportes Régimen</Typography>
        <Typography color="text.secondary">Reportes del sistema de régimen</Typography>
      </Box>
      <Tabs value={tab} onChange={(_, v) => { setTab(v); setSearch(""); }} variant="scrollable" scrollButtons="auto">
        {tabs.map((t, i) => <Tab key={i} label={t.label} />)}
      </Tabs>
      <TextField
        placeholder="Buscar"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ maxWidth: { md: 420 } }}
        fullWidth
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />
      <ReportTable columns={current.columns} rows={current.rows} search={search} searchKeys={current.searchKeys} />
    </Stack>
  );
};

export default ReportesRegimenPage;
