import PrintIcon from "@mui/icons-material/Print";
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, InputLabel,
  MenuItem, Select, Stack, TextField, Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import FirmasSelector from "../../components/common/FirmasSelector";

const FIRMAS_INICIALES = [
  { rol: "Elaborado por", nombre: "", cargo: "" },
  { rol: "Revisado por", nombre: "", cargo: "" },
  { rol: "Autorizado por", nombre: "", cargo: "" },
  { rol: "Autorizado por", nombre: "", cargo: "" }
];

// Parámetros de la impresión de la nómina / resumen de jubilados: tipo de jubilación
// (ej. RETIRO VOLUNTARIO) y las cuatro firmas del pie. Los nombres no viven en el
// sistema: se piden aquí y se envían con la impresión.
const ParametrosImpresionDialog = ({ open, titulo, tipos = [], onClose, onImprimir, imprimiendo }) => {
  const [tipoJubilacion, setTipoJubilacion] = useState("");
  const [firmas, setFirmas] = useState([]);

  useEffect(() => {
    if (!open) return;
    setTipoJubilacion("");
  }, [open]);

  const setFirma = (i, campo) => (e) => {
    const copia = [...firmas];
    copia[i] = { ...copia[i], [campo]: e.target.value };
    setFirmas(copia);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Tipo de jubilación</InputLabel>
            <Select label="Tipo de jubilación" value={tipoJubilacion} onChange={(e) => setTipoJubilacion(e.target.value)}>
              <MenuItem value="">Todos (separado por tipo)</MenuItem>
              {tipos.map((t) => <MenuItem key={t.id} value={t.nombre}>{t.nombre}</MenuItem>)}
            </Select>
          </FormControl>

          {open && <FirmasSelector grupo={2} onChange={setFirmas} />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" startIcon={<PrintIcon />} disabled={imprimiendo}
          onClick={() => onImprimir({
            tipoJubilacion,
            firmas: firmas.filter((f) => f.nombre.trim() || f.cargo.trim())
          })}>
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ParametrosImpresionDialog;
