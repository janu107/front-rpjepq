import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box, Button, Divider, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Tooltip, Typography
} from "@mui/material";

// Renglones que se agregan a mano en "Editar montos" de una nómina (un tipo de
// ingreso o de descuento que el proceso no generó). Sólo se guardan si la planilla
// no está cerrada: eso lo valida el backend.
//   tipos:    { ingresos: [{ id, nombre }], descuentos: [{ id, nombre }] }
//   nuevos:   [{ key, clase: "INGRESO" | "DESCUENTO", tipo, valor }]
export const nuevoRenglon = (clase) => ({ key: `${clase}-${Date.now()}-${Math.random()}`, clase, tipo: "", valor: "" });

export const renglonesValidos = (nuevos) =>
  nuevos.every((n) => n.tipo && n.valor !== "" && !Number.isNaN(Number(n.valor)) && Number(n.valor) > 0);

const RenglonesNuevos = ({ tipos, nuevos, onChange }) => {
  const actualizar = (key, campo, valor) => onChange(nuevos.map((n) => (n.key === key ? { ...n, [campo]: valor } : n)));
  const quitar = (key) => onChange(nuevos.filter((n) => n.key !== key));
  const agregar = (clase) => onChange([...nuevos, nuevoRenglon(clase)]);

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 1.5 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Agregar renglones</Typography>
      {nuevos.map((n) => {
        const lista = n.clase === "INGRESO" ? tipos.ingresos : tipos.descuentos;
        return (
          <Stack key={n.key} direction="row" spacing={1.5} alignItems="center" mb={1}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>{n.clase === "INGRESO" ? "Tipo de ingreso" : "Tipo de descuento"}</InputLabel>
              <Select
                label={n.clase === "INGRESO" ? "Tipo de ingreso" : "Tipo de descuento"}
                value={n.tipo}
                onChange={(e) => actualizar(n.key, "tipo", e.target.value)}
              >
                {lista.map((t) => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" type="number" label="Monto" value={n.valor}
              onChange={(e) => actualizar(n.key, "valor", e.target.value)}
              inputProps={{ min: 0.01, step: 0.01 }} sx={{ width: 140 }} />
            <Tooltip title="Quitar">
              <IconButton size="small" color="error" onClick={() => quitar(n.key)}><DeleteIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Stack>
        );
      })}
      <Stack direction="row" spacing={1}>
        <Button size="small" startIcon={<AddIcon />} onClick={() => agregar("INGRESO")}>Agregar ingreso</Button>
        <Button size="small" color="error" startIcon={<AddIcon />} onClick={() => agregar("DESCUENTO")}>Agregar descuento</Button>
      </Stack>
    </Box>
  );
};

export default RenglonesNuevos;
