import { Box, Container, Toolbar } from "@mui/material";
import { useState } from "react";
import { Outlet } from "react-router-dom";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import useResponsiveTableLabels from "../hooks/useResponsiveTableLabels";

const drawerWidth = 260;

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  useResponsiveTableLabels();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar drawerWidth={drawerWidth} onMenuClick={() => setMobileOpen(true)} />
      <Sidebar drawerWidth={drawerWidth} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${drawerWidth}px)` }, minWidth: 0 }}>
        <Toolbar />
        <Container className="page-enter" maxWidth="xl" sx={{ py: { xs: 2, md: 3 }, px: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
