import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Avatar, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
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
          opacity: 0.42,
          filter: "saturate(1.08) contrast(1.03)",
          transform: "scale(1.01)"
        },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(120deg, rgba(247,250,251,0.92) 0%, rgba(247,250,251,0.72) 42%, rgba(18,63,75,0.48) 100%)"
        }
      }}
    >
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 430,
          p: { xs: 3, sm: 4 },
          border: "1px solid rgba(221, 227, 234, 0.82)",
          bgcolor: "rgba(255, 255, 255, 0.86)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 24px 70px rgba(18, 63, 75, 0.20)"
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>
            <LockOutlinedIcon />
          </Avatar>

          <Box textAlign="center">
            <Typography variant="h5">RPJEPQ</Typography>
            <Typography color="text.secondary">Acceso administrativo</Typography>
          </Box>

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
              />
              <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Login;
