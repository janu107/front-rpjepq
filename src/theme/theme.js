import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
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
    background: {
      default: "#f3f6f8",
      paper: "#ffffff"
    },
    text: {
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
          borderBottomColor: "#e5ebef"
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

export default theme;
