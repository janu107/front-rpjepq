import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1f4e5f",
      dark: "#173b48",
      contrastText: "#ffffff"
    },
    secondary: {
      main: "#b58935"
    },
    background: {
      default: "#f4f6f8",
      paper: "#ffffff"
    }
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
    h5: {
      fontWeight: 700
    },
    h6: {
      fontWeight: 700
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
          fontWeight: 700
        }
      }
    }
  }
});

export default theme;
