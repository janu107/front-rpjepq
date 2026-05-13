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
      sx={{ bgcolor: "background.default", px: 2 }}
    >
      <Paper elevation={0} sx={{ width: "100%", maxWidth: 430, p: 4, border: "1px solid #dde3ea" }}>
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
