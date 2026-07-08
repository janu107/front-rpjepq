import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import { useEffect, useRef, useState } from "react";

import axiosClient from "../../api/axiosClient";

// Autocomplete reutilizable con debounce (300ms) y mínimo de caracteres.
// props: endpoint (GET, responde {data:[...]}), extraParams, getOptionLabel,
//        onSelect(opcionSeleccionada|null), value, label, placeholder, renderOption, minChars.
const BuscadorPersona = ({
  label = "Buscar", placeholder = "Mínimo 3 caracteres", endpoint, extraParams = {},
  getOptionLabel, onSelect, value = null, minChars = 3, renderOption
}) => {
  const [input, setInput] = useState("");
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = input.trim();
    if (term.length < minChars) { setOpts([]); return undefined; }
    timer.current = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await axiosClient.get(endpoint, { params: { q: term, ...extraParams } });
        setOpts(data.data || []);
      } catch { setOpts([]); } finally { setLoading(false); }
    }, 300);
    return () => timer.current && clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <Autocomplete
      options={opts}
      loading={loading}
      value={value}
      onChange={(_, val) => onSelect(val)}
      onInputChange={(_, val, reason) => { if (reason === "input") setInput(val); }}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      renderOption={renderOption}
      noOptionsText={input.trim().length < minChars ? `Escriba al menos ${minChars} caracteres` : "Sin resultados"}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          InputProps={{ ...params.InputProps, endAdornment: (<>{loading ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>) }}
        />
      )}
    />
  );
};

export default BuscadorPersona;
