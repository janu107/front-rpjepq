import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";

// Campo de fecha que se puede ESCRIBIR (DD/MM/AAAA) además de elegir en el calendario.
// El campo nativo type="date" de algunos navegadores (Safari) no avisa del valor al
// escribirlo a mano, y lo que depende de la fecha no se actualizaba.
// value / onChange trabajan en formato ISO "AAAA-MM-DD" ("" si la fecha está incompleta).

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
  return `${String(y).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

// Pone las barras solas mientras se escribe: 15102026 -> 15/10/2026.
const formatear = (entrada) => {
  const dig = String(entrada).replace(/\D/g, "").slice(0, 8);
  if (dig.length <= 2) return dig;
  if (dig.length <= 4) return `${dig.slice(0, 2)}/${dig.slice(2)}`;
  return `${dig.slice(0, 2)}/${dig.slice(2, 4)}/${dig.slice(4)}`;
};

const CampoFecha = ({ label, value, onChange, disabled, onKeyDown, fullWidth = true, required }) => {
  const [texto, setTexto] = useState(isoATexto(value));
  const nativo = useRef(null);

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

  const completo = texto.length === 10;
  const invalida = completo && !textoAIso(texto);

  return (
    <>
      <TextField
        label={label}
        value={texto}
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
                onClick={() => { try { nativo.current?.showPicker(); } catch { nativo.current?.click(); } }}
              >
                <CalendarMonthIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }}
      />
      {/* Calendario nativo oculto: solo se usa para elegir con el mouse. */}
      <input
        ref={nativo} type="date" tabIndex={-1} aria-hidden="true"
        value={String(value || "").slice(0, 10)}
        onChange={(e) => { setTexto(isoATexto(e.target.value)); onChange(e.target.value); }}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
      />
    </>
  );
};

export default CampoFecha;
