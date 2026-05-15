import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import WavesIcon from "@mui/icons-material/Waves";
import { Avatar, Box, Button, Chip, Divider, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: "", contrasena: "" });
  const [loading, setLoading] = useState(false);
  const loginBackground = `${import.meta.env.BASE_URL}login-bg.png`;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.usuario.trim() || !form.contrasena.trim()) {
      Swal.fire({
        title: "Datos requeridos",
        text: "Ingrese usuario y contrasena.",
        icon: "warning",
        confirmButtonColor: "#1f4e5f"
      });
      return;
    }

    setLoading(true);

    try {
      const { data } = await axiosClient.post("/auth/login", form);
      login(data.data);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      Swal.fire({
        title: "No fue posible iniciar sesion",
        text: error.response?.data?.message || "Revise sus credenciales e intente nuevamente.",
        icon: "error",
        confirmButtonColor: "#1f4e5f"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "background.default",
        px: 2,
        py: 4,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${loginBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.5,
          filter: "saturate(1.08) contrast(1.04)",
          transform: "scale(1.01)"
        },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(120deg, rgba(247,250,251,0.94) 0%, rgba(247,250,251,0.76) 42%, rgba(18,63,75,0.56) 100%)"
        },
        "& .login-accent": {
          position: "absolute",
          zIndex: 1,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(186,122,47,0.20), transparent 66%)",
          right: { xs: -120, md: 52 },
          top: { xs: -90, md: 76 },
          pointerEvents: "none"
        }
      }}
    >
      <Box className="login-accent" />
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 460,
          p: { xs: 3, sm: 4.5 },
          border: "1px solid rgba(255, 255, 255, 0.72)",
          bgcolor: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(18px)",
          boxShadow: "0 28px 80px rgba(18, 63, 75, 0.24)",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: "0 0 auto 0",
            height: 5,
            background: "linear-gradient(90deg, #1f5d6b, #ba7a2f)"
          }
        }}
      >
        <Stack spacing={3.25}>
          <Stack spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 68,
                height: 68,
                bgcolor: "primary.main",
                boxShadow: "0 16px 34px rgba(31, 93, 107, 0.24)"
              }}
            >
              <WavesIcon sx={{ fontSize: 34 }} />
            </Avatar>

            <Box textAlign="center">
              <Typography variant="h4" sx={{ fontWeight: 900, color: "primary.main", letterSpacing: 0.2 }}>
                RPJEPQ
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Sistema Administrativo
              </Typography>
            </Box>

            <Chip
              icon={<LockOutlinedIcon />}
              label="Acceso seguro"
              size="small"
              sx={{
                bgcolor: "rgba(31, 93, 107, 0.10)",
                color: "primary.main",
                fontWeight: 800
              }}
            />
          </Stack>

          <Divider sx={{ borderColor: "rgba(31, 93, 107, 0.12)" }} />

          <Box component="form" onSubmit={handleSubmit} width="100%">
            <Stack spacing={2.5}>
              <TextField
                label="Usuario"
                name="usuario"
                value={form.usuario}
                onChange={handleChange}
                autoComplete="username"
                fullWidth
                required
                autoFocus
                variant="outlined"
              />
              <TextField
                label="Contrasena"
                name="contrasena"
                type="password"
                value={form.contrasena}
                onChange={handleChange}
                autoComplete="current-password"
                fullWidth
                required
                variant="outlined"
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                fullWidth
                sx={{
                  minHeight: 50,
                  mt: 0.5,
                  fontWeight: 900,
                  boxShadow: "0 14px 30px rgba(31, 93, 107, 0.22)"
                }}
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              mx: { xs: -3, sm: -4.5 },
              mb: { xs: -3, sm: -4.5 },
              px: { xs: 3, sm: 4.5 },
              py: 2,
              bgcolor: "rgba(31, 93, 107, 0.07)",
              borderTop: "1px solid rgba(31, 93, 107, 0.10)"
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Gestion administrativa, nomina y reportes institucionales.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Login;
