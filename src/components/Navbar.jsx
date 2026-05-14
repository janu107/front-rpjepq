import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Avatar, Box, IconButton, Stack, Toolbar, Tooltip, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { useAuth } from "../context/AuthContext";
import RoleChip from "./common/RoleChip";

const Navbar = ({ onMenuClick, drawerWidth }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Cerrar sesion",
      text: "Desea salir del sistema?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Si, salir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#1f4e5f"
    });

    if (result.isConfirmed) {
      logout();
      navigate("/login", { replace: true });
    }
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        borderBottom: "1px solid #dde3ea",
        bgcolor: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        color: "text.primary"
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, md: 72 } }}>
        <IconButton color="inherit" edge="start" onClick={onMenuClick} sx={{ mr: 2, display: { md: "none" } }}>
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.15 }}>Sistema Administrativo RPJEPQ</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap" }}>
            <Typography variant="body2" color="text.secondary">
              {user?.nombre || user?.usuario || "Usuario administrador"}
            </Typography>
            {user?.rol && <RoleChip value={user.rol} />}
          </Stack>
        </Box>

        <Avatar sx={{ display: { xs: "none", sm: "flex" }, mr: 1.25, bgcolor: "primary.main", width: 36, height: 36, fontSize: 14, fontWeight: 800 }}>
          {(user?.nombre || user?.usuario || "U").slice(0, 1).toUpperCase()}
        </Avatar>
        <Tooltip title="Cerrar sesion">
          <IconButton color="primary" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
