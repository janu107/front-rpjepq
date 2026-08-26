import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import GavelIcon from "@mui/icons-material/Gavel";
import BadgeIcon from "@mui/icons-material/Badge";
import CalculateIcon from "@mui/icons-material/Calculate";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import GroupIcon from "@mui/icons-material/Group";
import InsertChartIcon from "@mui/icons-material/InsertChart";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import PaidIcon from "@mui/icons-material/Paid";
import PaymentsIcon from "@mui/icons-material/Payments";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import ShieldIcon from "@mui/icons-material/Shield";
import WorkIcon from "@mui/icons-material/Work";
import { Box, Collapse, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { hasRole } from "../utils/permissions";

const items = [
  { text: "Dashboard", path: "/dashboard", icon: <DashboardIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
  {
    text: "Cat\u00e1logos",
    path: "/catalogos",
    icon: <FactCheckIcon />,
    roles: ["ADMIN", "OPERADOR"],
    children: [
      { text: "Bancos", path: "/catalogos/bancos", icon: <AccountBalanceIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "\u00c1reas", path: "/catalogos/areas", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Manejo administraci\u00f3n", path: "/catalogos/manejo-administracion", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Puestos", path: "/catalogos/puestos", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Tipo ingreso", path: "/catalogos/tipo-ingreso", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Tipo descuento", path: "/catalogos/tipo-descuento", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Tipo jubilaci\u00f3n", path: "/catalogos/tipo-jubilacion", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Tipo planilla", path: "/catalogos/tipo-planilla", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Par\u00e1metro general", path: "/catalogos/parametro-general", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Par\u00e1metro planilla", path: "/catalogos/parametro-planilla", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Firmas de planilla", path: "/catalogos/firma-planilla", icon: <FactCheckIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] }
    ]
  },
  {
    text: "Mantenimiento EPQ",
    icon: <SettingsSuggestIcon />,
    roles: ["ADMIN", "OPERADOR"],
    children: [
      { text: "Empleados EPQ", path: "/aportaciones", icon: <PaidIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Aportaciones", path: "/aportaciones/detalle", icon: <PaidIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Prestamos", path: "/prestamos", icon: <AccountBalanceWalletIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Detalle Prestamos", path: "/prestamos/detalle", icon: <ListAltIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] }
    ]
  },
  {
    text: "Proceso R\u00e9gimen",
    icon: <BadgeIcon />,
    roles: ["ADMIN", "OPERADOR"],
    children: [
      { text: "Control de Empleados", path: "/empleados-regimen", icon: <BadgeIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Control de Jubilados", path: "/jubilados", icon: <PeopleAltIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Tiempo Extraordinario", path: "/tiempo-extra", icon: <PaymentsIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Juntas Directivas", path: "/junta-directiva", icon: <WorkIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Pago Dietas", path: "/dietas", icon: <PaymentsIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Descuentos Judiciales", path: "/descuentos-judiciales", icon: <GavelIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Préstamos Régimen", path: "/prestamos-regimen", icon: <AccountBalanceWalletIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] }
    ]
  },
  {
    text: "Jubilados y Pensiones",
    icon: <PeopleAltIcon />,
    roles: ["ADMIN", "OPERADOR", "CONSULTA"],
    children: [
      { text: "Beneficiarios", path: "/beneficiarios", icon: <GroupIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Registrar Fallecimiento", path: "/fallecimientos", icon: <PeopleAltIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Amparistas", path: "/amparistas", icon: <GavelIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Convenios de Pago", path: "/convenios", icon: <AccountBalanceWalletIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Suspensiones", path: "/suspensiones", icon: <PaymentsIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Estado de Cuenta", path: "/estado-cuenta", icon: <InsertChartIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Reportes y Dashboard", path: "/reportes-jubilados", icon: <InsertChartIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Nóminas Jubilados", path: "/nominas-jubilados", icon: <CalculateIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] }
    ]
  },
  {
    text: "N\u00f3minas",
    icon: <CalculateIcon />,
    roles: ["ADMIN", "OPERADOR"],
    children: [
      // CAMBIO: "Generaci\u00f3n de Planillas" se omite del men\u00fa (pantalla descontinuada).
      // La ruta permanece en AppRouter para no romper navegaci\u00f3n, pero no es visible.
      { text: "Planilla de Empleados", path: "/planillas-trabajadores", icon: <PaidIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Planilla de Pensionados", path: "/planillas-pensionados", icon: <PaidIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Nómina Tiempo Extra", path: "/nomina-tiempo-extra", icon: <CalculateIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Prestaciones (Bono 14 / Aguinaldo)", path: "/prestaciones", icon: <PaidIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Otros Descuentos", path: "/otros-descuentos", icon: <PaymentsIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] },
      { text: "Consulta N\u00f3mina", path: "/nomina", icon: <PaymentsIcon />, enabled: true, roles: ["ADMIN", "OPERADOR"] }
    ]
  },
  {
    text: "Reportes",
    icon: <InsertChartIcon />,
    roles: ["ADMIN", "OPERADOR", "CONSULTA"],
    children: [
      { text: "Reportes de N\u00f3mina", path: "/reportes/nomina", icon: <InsertChartIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Resumen R\u00e9gimen", path: "/reportes/regimen", icon: <InsertChartIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Reporte Pr\u00e9stamos", path: "/reportes/prestamos-regimen", icon: <ListAltIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Reporte Junta Directiva", path: "/reportes/junta-directiva", icon: <ListAltIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Reporte Dietas", path: "/reportes/dietas", icon: <ListAltIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Reporte Empleados R\u00e9gimen", path: "/reportes/empleados-regimen", icon: <ListAltIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Reporte Aportaciones", path: "/reportes/aportaciones", icon: <ListAltIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] },
      { text: "Detalle Aportaciones", path: "/reportes/detalle-aportaciones", icon: <ListAltIcon />, enabled: true, roles: ["ADMIN", "OPERADOR", "CONSULTA"] }
    ]
  },
  {
    text: "Administraci\u00f3n",
    icon: <GroupIcon />,
    roles: ["ADMIN"],
    children: [
      { text: "Usuarios", path: "/usuarios", icon: <GroupIcon />, enabled: true, roles: ["ADMIN"] },
      { text: "Roles", path: "/roles", icon: <ShieldIcon />, enabled: true, roles: ["ADMIN"] },
      { text: "Auditor\u00eda", path: "/auditoria", icon: <ManageSearchIcon />, enabled: true, roles: ["ADMIN"] },
      { text: "Mantenimiento", path: "/mantenimiento", icon: <SettingsSuggestIcon />, enabled: true, roles: ["ADMIN"] }
    ]
  }
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
      end
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
            Administraci\u00f3n
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
