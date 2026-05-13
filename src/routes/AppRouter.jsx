import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import CatalogosPage from "../pages/catalogos/CatalogosPage";
import AportacionesPage from "../pages/aportaciones/AportacionesPage";
import Dashboard from "../pages/Dashboard";
import EmpleadosPage from "../pages/empleados/EmpleadosPage";
import JubiladosPage from "../pages/jubilados/JubiladosPage";
import JuntaDirectivaPage from "../pages/juntaDirectiva/JuntaDirectivaPage";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";
import DietasPage from "../pages/dietas/DietasPage";
import NominaPage from "../pages/nomina/NominaPage";
import OtrosDescuentosPage from "../pages/otrosDescuentos/OtrosDescuentosPage";
import PrestamosPage from "../pages/prestamos/PrestamosPage";
import RolesPage from "../pages/roles/RolesPage";
import SalariosPage from "../pages/salarios/SalariosPage";
import TiempoExtraPage from "../pages/tiempoExtra/TiempoExtraPage";
import UsuariosPage from "../pages/usuarios/UsuariosPage";
import ProtectedRoute from "./ProtectedRoute";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/catalogos" element={<CatalogosPage />} />
            <Route path="/aportaciones" element={<AportacionesPage />} />
            <Route path="/empleados" element={<EmpleadosPage />} />
            <Route path="/jubilados" element={<JubiladosPage />} />
            <Route path="/junta-directiva" element={<JuntaDirectivaPage />} />
            <Route path="/prestamos" element={<PrestamosPage />} />
            <Route path="/salarios" element={<SalariosPage />} />
            <Route path="/tiempo-extra" element={<TiempoExtraPage />} />
            <Route path="/dietas" element={<DietasPage />} />
            <Route path="/otros-descuentos" element={<OtrosDescuentosPage />} />
            <Route path="/nomina" element={<NominaPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
