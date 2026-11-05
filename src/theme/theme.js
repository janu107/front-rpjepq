import { createTheme } from "@mui/material/styles";

// Tema claro y oscuro. Los colores de superficie y bordes que usan las pantallas
// van como colores del tema (fondo.suave, borde, marca) para que cambien con el modo.
export const crearTema = (modo = "claro") => {
  const oscuro = modo === "oscuro";
  return createTheme({
  palette: {
    mode: oscuro ? "dark" : "light",
    fondo: { suave: oscuro ? "#1b2a31" : "#f3f6f8", fuerte: oscuro ? "#22343c" : "#e8eef1" },
    borde: oscuro ? "#2e434c" : "#dde3ea",
    marca: { main: oscuro ? "#7cc4d4" : "#1f4e5f" },
    divider: oscuro ? "#2e434c" : "rgba(0, 0, 0, 0.12)",
    primary: oscuro ? { main: "#5fb1c2", dark: "#3e8d9e", light: "#8fd0dd", contrastText: "#0d181d" } : {
      main: "#1f5d6b",
      dark: "#123f4b",
      light: "#4f8895",
      contrastText: "#ffffff"
    },
    secondary: {
      main: "#ba7a2f",
      light: "#d99a4f"
    },
    success: {
      main: "#2e7d5b"
    },
    warning: {
      main: "#c9822b"
    },
    error: {
      main: "#b94141"
    },
    background: oscuro ? { default: "#0f1a1f", paper: "#16242b" } : {
      default: "#f3f6f8",
      paper: "#ffffff"
    },
    text: oscuro ? { primary: "#e3ebef", secondary: "#9fb2bc" } : {
      primary: "#24333b",
      secondary: "#60717b"
    }
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
    h4: {
      fontWeight: 800
    },
    h5: {
      fontWeight: 800
    },
    h6: {
      fontWeight: 700
    },
    button: {
      letterSpacing: 0
    }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 800,
          borderRadius: 10,
          boxShadow: "none"
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderRadius: 12
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: oscuro ? "#2a3c44" : "#e5ebef"
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        size: "medium"
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: "transform 160ms ease, background-color 160ms ease",
          "&:hover": {
            transform: "translateY(-1px)"
          }
        }
      }
    }
  }
  });
};

const theme = crearTema("claro");
export default theme;
