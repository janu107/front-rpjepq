import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import BadgeIcon from "@mui/icons-material/Badge";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import GroupIcon from "@mui/icons-material/Group";
import PaidIcon from "@mui/icons-material/Paid";
import PaymentsIcon from "@mui/icons-material/Payments";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ShieldIcon from "@mui/icons-material/Shield";
import WorkIcon from "@mui/icons-material/Work";
import { Box, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import { NavLink } from "react-router-dom";

const items = [
  { text: "Dashboard", path: "/dashboard", icon: <DashboardIcon />, enabled: true },
  { text: "Usuarios", path: "/usuarios", icon: <GroupIcon />, enabled: true },
  { text: "Roles", path: "/roles", icon: <ShieldIcon />, enabled: true },
  { text: "Catalogos", path: "/catalogos", icon: <FactCheckIcon />, enabled: true },
  { text: "Empleados", path: "/empleados", icon: <BadgeIcon />, enabled: true },
  { text: "Jubilados", path: "/jubilados", icon: <PeopleAltIcon />, enabled: true },
  { text: "Junta Directiva", path: "/junta-directiva", icon: <WorkIcon />, enabled: true },
  { text: "Prestamos", path: "/prestamos", icon: <AccountBalanceWalletIcon />, enabled: true },
  { text: "Aportaciones", path: "/aportaciones", icon: <PaidIcon />, enabled: true },
  { text: "Salarios", path: "/salarios", icon: <PaymentsIcon />, enabled: true },
  { text: "Tiempo extra", path: "/tiempo-extra", icon: <PaymentsIcon />, enabled: true },
  { text: "Dietas", path: "/dietas", icon: <PaymentsIcon />, enabled: true },
  { text: "Otros descuentos", path: "/otros-descuentos", icon: <PaymentsIcon />, enabled: true },
  { text: "Nomina", path: "/nomina", icon: <PaymentsIcon />, enabled: true }
];

const SidebarContent = () => (
  <Box sx={{ height: "100%", bgcolor: "primary.dark", color: "primary.contrastText" }}>
    <Toolbar sx={{ alignItems: "center" }}>
      <Box>
        <Typography variant="h6">RPJEPQ</Typography>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          Administracion
        </Typography>
      </Box>
    </Toolbar>
    <Divider sx={{ borderColor: "rgba(255,255,255,0.16)" }} />
    <List sx={{ px: 1.5 }}>
      {items.map((item) => (
        <ListItemButton
          key={item.text}
          component={item.enabled ? NavLink : "button"}
          to={item.enabled ? item.path : undefined}
          disabled={!item.enabled}
          sx={{
            borderRadius: 1,
            my: 0.5,
            color: "rgba(255,255,255,0.82)",
            "&.active": {
              bgcolor: "rgba(255,255,255,0.14)",
              color: "primary.contrastText"
            },
            "&.Mui-disabled": {
              color: "rgba(255,255,255,0.35)"
            },
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.10)"
            }
          }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
            {item.icon || <WorkIcon />}
          </ListItemIcon>
          <ListItemText primary={item.text} />
        </ListItemButton>
      ))}
    </List>
  </Box>
);

const Sidebar = ({ drawerWidth, mobileOpen, onClose }) => {
  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" }
        }}
      >
        <SidebarContent />
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", border: 0 }
        }}
        open
      >
        <SidebarContent />
      </Drawer>
    </Box>
  );
};

export default Sidebar;
