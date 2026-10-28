import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  Box, Button, IconButton, InputAdornment, MenuItem, Popover, Select, Stack, TextField, Typography
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

// Campo de fecha que se puede ESCRIBIR (DD/MM/AAAA) o elegir en un calendario.
// El calendario es propio (no el del navegador): el de Safari no avisaba del
// valor al escribir y no se cerraba al elegir.
// value / onChange trabajan en formato ISO "AAAA-MM-DD" ("" si la fecha está incompleta).

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["D", "L", "M", "M", "J", "V", "S"];

const pad = (n) => String(n).padStart(2, "0");
const aIso = (y, m, d) => `${String(y).padStart(4, "0")}-${pad(m + 1)}-${pad(d)}`;
const hoyIso = () => { const h = new Date(); return aIso(h.getFullYear(), h.getMonth(), h.getDate()); };

const isoATexto = (iso) => {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
};

const textoAIso = (texto) => {
  const m = String(texto).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const [, d, mes, y] = m.map(Number);
  const fecha = new Date(y, mes - 1, d);
  if (fecha.getFullYear() !== y || fecha.getMonth() !== mes - 1 || fecha.getDate() !== d) return "";
  return aIso(y, mes - 1, d);
};

// Pone las barras solas mientras se escribe: 15102026 -> 15/10/2026.
const formatear = (entrada) => {
  const dig = String(entrada).replace(/\D/g, "").slice(0, 8);
  if (dig.length <= 2) return dig;
  if (dig.length <= 4) return `${dig.slice(0, 2)}/${dig.slice(2)}`;
  return `${dig.slice(0, 2)}/${dig.slice(2, 4)}/${dig.slice(4)}`;
};

const Calendario = ({ valor, onElegir }) => {
  const base = valor || hoyIso();
  const [anio, setAnio] = useState(Number(base.slice(0, 4)));
  const [mes, setMes] = useState(Number(base.slice(5, 7)) - 1);
  const hoy = hoyIso();

  const mover = (delta) => {
    const d = new Date(anio, mes + delta, 1);
    setAnio(d.getFullYear()); setMes(d.getMonth());
  };

  const primerDia = new Date(anio, mes, 1).getDay();
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const celdas = [...Array(primerDia).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  while (celdas.length % 7) celdas.push(null);

  const anioActual = new Date().getFullYear();
  const anios = [];
  for (let y = anioActual + 5; y >= 1920; y -= 1) anios.push(y);
  if (!anios.includes(anio)) anios.push(anio);

  return (
    <Box sx={{ p: 2, width: 336 }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5 }}>
        <IconButton size="small" onClick={() => mover(-1)} aria-label="Mes anterior"><ChevronLeftIcon /></IconButton>
        <Select size="small" value={mes} onChange={(e) => setMes(Number(e.target.value))} sx={{ flex: 1.4, fontWeight: 600 }} MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}>
          {MESES.map((m, i) => <MenuItem key={m} value={i}>{m}</MenuItem>)}
        </Select>
        <Select size="small" value={anio} onChange={(e) => setAnio(Number(e.target.value))} sx={{ flex: 1, fontWeight: 600 }} MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}>
          {anios.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </Select>
        <IconButton size="small" onClick={() => mover(1)} aria-label="Mes siguiente"><ChevronRightIcon /></IconButton>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, textAlign: "center" }}>
        {DIAS.map((d, i) => (
          <Typography key={`${d}${i}`} variant="caption" sx={{ fontWeight: 700, color: "text.secondary", py: 0.5 }}>{d}</Typography>
        ))}
        {celdas.map((dia, i) => {
          if (!dia) return <Box key={`v${i}`} />;
          const iso = aIso(anio, mes, dia);
          const elegido = iso === valor;
          const esHoy = iso === hoy;
          return (
            <Box
              key={iso} component="button" type="button" onClick={() => onElegir(iso)}
              sx={{
                height: 40, border: esHoy && !elegido ? "1.5px solid" : "none", borderColor: "primary.main",
                borderRadius: "50%", cursor: "pointer", fontSize: 14, fontFamily: "inherit",
                bgcolor: elegido ? "primary.main" : "transparent", color: elegido ? "#fff" : "text.primary",
                fontWeight: elegido || esHoy ? 700 : 400,
                "&:hover": { bgcolor: elegido ? "primary.dark" : "action.hover" }
              }}
            >
              {dia}
            </Box>
          );
        })}
      </Box>

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
        <Button size="small" onClick={() => onElegir(hoy)}>Hoy</Button>
      </Stack>
    </Box>
  );
};

const CampoFecha = ({ label, value, onChange, disabled, onKeyDown, fullWidth = true, required }) => {
  const [texto, setTexto] = useState(isoATexto(value));
  const [anclaCalendario, setAnclaCalendario] = useState(null);
  const campo = useRef(null);

  // Si el valor cambia desde afuera (editar un registro, limpiar el formulario), se refleja.
  useEffect(() => {
    if (textoAIso(texto) !== String(value || "").slice(0, 10)) setTexto(isoATexto(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const cambiar = (nuevoTexto) => {
    const t = formatear(nuevoTexto);
    setTexto(t);
    const iso = textoAIso(t);
    if (iso !== String(value || "").slice(0, 10)) onChange(iso);
  };

  const elegir = (iso) => {
    setTexto(isoATexto(iso));
    onChange(iso);
    setAnclaCalendario(null);
    setTimeout(() => campo.current?.focus(), 0);
  };

  const completo = texto.length === 10;
  const invalida = completo && !textoAIso(texto);

  return (
    <>
      <TextField
        label={label}
        value={texto}
        inputRef={campo}
        onChange={(e) => cambiar(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="DD/MM/AAAA"
        inputProps={{ inputMode: "numeric", maxLength: 10 }}
        InputLabelProps={{ shrink: true }}
        error={invalida}
        helperText={invalida ? "Fecha no válida" : undefined}
        disabled={disabled}
        required={required}
        fullWidth={fullWidth}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small" tabIndex={-1} disabled={disabled} aria-label="Abrir calendario"
                onClick={(e) => setAnclaCalendario(e.currentTarget.closest(".MuiInputBase-root") || e.currentTarget)}
              >
                <CalendarMonthIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      <Popover
        open={Boolean(anclaCalendario)}
        anchorEl={anclaCalendario}
        onClose={() => setAnclaCalendario(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { mt: 0.5, borderRadius: 2 } } }}
      >
        {anclaCalendario && <Calendario valor={textoAIso(texto) || ""} onElegir={elegir} />}
      </Popover>
    </>
  );
};

export default CampoFecha;
