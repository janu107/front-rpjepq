import { Alert, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { listarFirmas, tipoFirma } from "../../utils/firmas";

// Firmas de un documento (Catálogos › Firmas de planilla), con el mismo formato en
// todos los reportes: Elaborado por, Revisado por, Visto bueno y Autorizado por.
// Cada una se preselecciona con la firma de su tipo del grupo indicado (empleados
// régimen = 1, jubilados = 2, EPQ = 4…) y, si el grupo no tiene, con cualquiera de ese tipo.
// onChange recibe solo las elegidas: [{ rol, nombre, cargo, id }].
export const ROLES_FIRMA = [
  { key: "elabora", label: "Elaborado por", tipo: "ELABORADO POR" },
  { key: "revisa", label: "Revisado por", tipo: "REVISADO POR" },
  { key: "vobo", label: "Visto bueno", tipo: "VISTO BUENO" },
  { key: "autoriza", label: "Autorizado por", tipo: "AUTORIZADO POR" }
];

const FirmasSelector = ({ grupo, onChange, titulo = "Firmas del documento", className }) => {
  const [lista, setLista] = useState([]);
  const [cargada, setCargada] = useState(false);
  const [sel, setSel] = useState({});

  useEffect(() => { listarFirmas().then((l) => { setLista(l); setCargada(true); }); }, []);

  // Preselección por tipo (primero las del grupo del documento).
  useEffect(() => {
    const s = {};
    ROLES_FIRMA.forEach((r) => {
      const delTipo = lista.filter((f) => tipoFirma(f.tipo) === r.tipo);
      const f = delTipo.find((x) => Number(x.tipoManejo) === Number(grupo)) || delTipo[0];
      if (f) s[r.key] = f.id;
    });
    setSel(s);
  }, [lista, grupo]);

  useEffect(() => {
    onChange?.(ROLES_FIRMA.filter((r) => sel[r.key]).map((r) => {
      const f = lista.find((x) => Number(x.id) === Number(sel[r.key])) || {};
      return { rol: r.label, nombre: f.nombre || "", cargo: f.puesto || "", id: f.id };
    }));
  }, [sel, lista]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Paper elevation={0} className={className} sx={{ p: 2, border: "1px solid #dde3ea" }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>{titulo}</Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
        {ROLES_FIRMA.map((r) => (
          <FormControl key={r.key} size="small" sx={{ minWidth: 240 }}>
            <InputLabel>{r.label}</InputLabel>
            <Select label={r.label} value={sel[r.key] || ""} onChange={(e) => setSel((p) => ({ ...p, [r.key]: e.target.value }))}>
              <MenuItem value=""><em>Sin asignar</em></MenuItem>
              {lista.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.nombre}{f.puesto ? ` — ${f.puesto}` : ""}
                  {f.manejoDescripcion ? <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>({f.manejoDescripcion})</Typography> : null}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}
      </Stack>
      {cargada && !lista.length && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>No hay firmas registradas. Regístrelas en <b>Catálogos › Firmas de planilla</b>.</Alert>
      )}
    </Paper>
  );
};

export default FirmasSelector;
