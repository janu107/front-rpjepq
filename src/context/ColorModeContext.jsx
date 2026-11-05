import { CssBaseline, ThemeProvider } from "@mui/material";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { crearTema } from "../theme/theme";

// Modo claro / oscuro. Se recuerda en este equipo; la primera vez sigue la
// configuración del sistema operativo.
const LLAVE = "rpj_modo_color";
const ColorModeContext = createContext({ modo: "claro", alternar: () => {} });

const modoInicial = () => {
  try {
    const guardado = window.localStorage.getItem(LLAVE);
    if (guardado === "claro" || guardado === "oscuro") return guardado;
  } catch { /* sin almacenamiento: se usa el del sistema */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
};

export const ColorModeProvider = ({ children }) => {
  const [modo, setModo] = useState(modoInicial);
  useEffect(() => {
    document.body.dataset.modo = modo;
    try { window.localStorage.setItem(LLAVE, modo); } catch { /* sin almacenamiento */ }
  }, [modo]);
  const valor = useMemo(() => ({ modo, alternar: () => setModo((m) => (m === "oscuro" ? "claro" : "oscuro")) }), [modo]);
  const tema = useMemo(() => crearTema(modo), [modo]);
  return (
    <ColorModeContext.Provider value={valor}>
      <ThemeProvider theme={tema}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export const useColorMode = () => useContext(ColorModeContext);
