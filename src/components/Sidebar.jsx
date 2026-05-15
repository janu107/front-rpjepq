import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import BadgeIcon from "@mui/icons-material/Badge";
import CalculateIcon from "@mui/icons-material/Calculate";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import InsertChartIcon from "@mui/icons-material/InsertChart";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import GroupIcon from "@mui/icons-material/Group";
import PaidIcon from "@mui/icons-material/Paid";
import PaymentsIcon from "@mui/icons-material/Payments";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ShieldIcon from "@mui/icons-material/Shield";
import WorkIcon from "@mui/icons-material/Work";
import { Box, Collapse, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { hasRole } from "../utils/permissions";

const items = [
  { text: "Dashboard", path: "/dashboard", icon: <DashboardIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
  {
    text: "Usuarios",
    icon: <GroupIcon />,
    roles: ["ADMIN"],
    children: [
      { text: "Usuarios", path: "/usuarios", icon: <GroupIcon />, enabled: true, roles: ["ADMIN"] },
      { text: "Roles", path: "/roles", icon: <ShieldIcon />, enabled: true, roles: ["ADMIN"] }
    ]
  },
  {
    text: "Catalogos",
    path: "/catalogos",
    icon: <FactCheckIcon />,
    roles: ["ADMIN", "OPERADOR", "CONSULTA"],
    children: [
      { text: "Areas", path: "/catalogos/areas", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Manejo administracion", path: "/catalogos/manejo-administracion", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Puestos", path: "/catalogos/puestos", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Tipo ingreso", path: "/catalogos/tipo-ingreso", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Tipo descuento", path: "/catalogos/tipo-descuento", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Tipo jubilacion", path: "/catalogos/tipo-jubilacion", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Tipo planilla", path: "/catalogos/tipo-planilla", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Parametro general", path: "/catalogos/parametro-general", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Parametro planilla", path: "/catalogos/parametro-planilla", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] }
    ]
  },
  {
    text: "Mantenimiento",
    icon: <SettingsSuggestIcon />,
    roles: ["ADMIN", "OPERADOR", "CONSULTA"],
    children: [
      {
        text: "Aportaciones EPQ",
        path: "/aportaciones",
        icon: <PaidIcon />,
        enabled: true,
        roles: ["ADMIN", "OPERADOR", "CONSULTA"]
      },
      {
        text: "Prestamo",
        path: "/prestamos",
        icon: <AccountBalanceWalletIcon />,
        enabled: true,
        roles: ["ADMIN", "OPERADOR", "CONSULTA"]
      }
    ]
  },
  {
    text: "Empleados Regimen",
    icon: <BadgeIcon />,
    roles: ["ADMIN", "OPERADOR", "CONSULTA"],
    children: [
      { text: "Empleados", path: "/empleados", icon: <BadgeIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Salarios", path: "/salarios", icon: <PaymentsIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Jubilados", path: "/jubilados", icon: <PeopleAltIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Juntas Directivas", path: "/junta-directiva", icon: <WorkIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Dietas", path: "/dietas", icon: <PaymentsIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Tiempo Extraordinario", path: "/tiempo-extra", icon: <PaymentsIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Otros Descuentos", path: "/otros-descuentos", icon: <PaymentsIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Nomina", path: "/nomina", icon: <PaymentsIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Generar planilla", path: "/generacion-planilla", icon: <CalculateIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Reportes de nomina", path: "/reportes/nomina", icon: <InsertChartIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] }
    ]
  },
  { text: "Auditoria", path: "/auditoria", icon: <ManageSearchIcon />, enabled: true, roles: ["ADMIN"] },
  { text: "Sistema", path: "/mantenimiento", icon: <SettingsSuggestIcon />, enabled: true, roles: ["ADMIN"] }
];

const filterByRole = (entries, user) => entries
  .filter((item) => !item.roles || hasRole(user, item.roles))
  .map((item) => ({
    ...item,
    children: item.children ? filterByRole(item.children, user) : undefined
  }))
  .filter((item) => !item.children || item.children.length > 0);

const hasActiveChild = (item, pathname) => {
  if (item.path === pathname) return true;
  return item.children?.some((child) => hasActiveChild(child, pathname));
};

const MenuItem = ({ item, level = 0, pathname, onNavigate }) => {
  const hasChildren = Boolean(item.children?.length);
  const active = hasActiveChild(item, pathname);
  const [open, setOpen] = useState(active);
  const pl = 1.5 + level * 2.2;

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (hasChildren) {
    return (
      <>
        <ListItemButton
          onClick={() => setOpen((value) => !value)}
          sx={{
            borderRadius: 2,
            my: 0.45,
            pl,
            color: active ? "primary.contrastText" : "rgba(255,255,255,0.82)",
            bgcolor: active ? "rgba(255,255,255,0.12)" : "transparent",
            transition: "transform 160ms ease, background-color 160ms ease, color 160ms ease",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.11)",
              transform: "translateX(3px)"
            }
          }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 38 }}>{item.icon || <WorkIcon />}</ListItemIcon>
          <ListItemText
            primary={item.text}
            primaryTypographyProps={{ fontWeight: level === 0 ? 800 : 700, fontSize: level === 0 ? 14 : 13 }}
          />
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </ListItemButton>
        <Collapse in={open} timeout={180} unmountOnExit>
          <List disablePadding sx={{ ml: level === 0 ? 0.75 : 0 }}>
            {item.children.map((child) => (
              <MenuItem key={`${item.text}-${child.text}`} item={child} level={level + 1} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </List>
        </Collapse>
      </>
    );
  }

  return (
    <ListItemButton
      component={item.enabled ? NavLink : "button"}
      to={item.enabled ? item.path : undefined}
      onClick={onNavigate}
      disabled={!item.enabled}
      sx={{
        borderRadius: 2,
        my: 0.45,
        pl,
        color: "rgba(255,255,255,0.82)",
        transition: "transform 160ms ease, background-color 160ms ease, color 160ms ease",
        "&.active": {
          bgcolor: "rgba(255,255,255,0.16)",
          color: "primary.contrastText",
          boxShadow: "inset 3px 0 0 #d99a4f"
        },
        "&.Mui-disabled": {
          color: "rgba(255,255,255,0.35)"
        },
        "&:hover": {
          bgcolor: "rgba(255,255,255,0.11)",
          transform: "translateX(3px)"
        }
      }}
    >
      <ListItemIcon sx={{ color: "inherit", minWidth: 38 }}>{item.icon || <WorkIcon />}</ListItemIcon>
      <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: level > 0 ? 13 : 14, fontWeight: level > 0 ? 650 : 700 }} />
    </ListItemButton>
  );
};

const SidebarContent = ({ onNavigate }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const visibleItems = useMemo(() => filterByRole(items, user), [user]);

  return (
  <Box
    sx={{
      height: "100%",
      color: "primary.contrastText",
      background: "linear-gradient(180deg, #123f4b 0%, #164c59 52%, #0f3540 100%)",
      overflowY: "auto"
    }}
  >
    <Toolbar sx={{ alignItems: "center", minHeight: 76 }}>
      <Box>
        <Typography variant="h6" sx={{ letterSpacing: 0.2 }}>RPJEPQ</Typography>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          Administracion
        </Typography>
      </Box>
    </Toolbar>
    <Divider sx={{ borderColor: "rgba(255,255,255,0.16)" }} />
    <List sx={{ px: 1.5 }}>
      {visibleItems.map((item) => (
        <MenuItem key={item.text} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </List>
  </Box>
  );
};

const Sidebar = ({ drawerWidth, mobileOpen, onClose }) => {
  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true, disablePortal: true }}
        sx={{
          display: { xs: "block", md: "none" },
          zIndex: (theme) => theme.zIndex.appBar + 10,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            border: 0,
            boxShadow: "18px 0 48px rgba(18, 63, 75, 0.28)"
          }
        }}
      >
        <SidebarContent onNavigate={onClose} />
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
