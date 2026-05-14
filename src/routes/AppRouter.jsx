import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import AuditoriaPage from "../pages/auditoria/AuditoriaPage";
import CatalogosPage from "../pages/catalogos/CatalogosPage";
import AportacionesPage from "../pages/aportaciones/AportacionesPage";
import Dashboard from "../pages/Dashboard";
import EmpleadosPage from "../pages/empleados/EmpleadosPage";
import JubiladosPage from "../pages/jubilados/JubiladosPage";
import JuntaDirectivaPage from "../pages/juntaDirectiva/JuntaDirectivaPage";
import Login from "../pages/Login";
import MantenimientoPage from "../pages/mantenimiento/MantenimientoPage";
import NotFound from "../pages/NotFound";
import DietasPage from "../pages/dietas/DietasPage";
import GeneracionPlanillaPage from "../pages/generacionPlanilla/GeneracionPlanillaPage";
import NominaPage from "../pages/nomina/NominaPage";
import OtrosDescuentosPage from "../pages/otrosDescuentos/OtrosDescuentosPage";
import PrestamosPage from "../pages/prestamos/PrestamosPage";
import ReportesNominaPage from "../pages/reportes/ReportesNominaPage";
import RolesPage from "../pages/roles/RolesPage";
import SalariosPage from "../pages/salarios/SalariosPage";
import TiempoExtraPage from "../pages/tiempoExtra/TiempoExtraPage";
import UsuariosPage from "../pages/usuarios/UsuariosPage";
import ProtectedRoute from "./ProtectedRoute";

const AppRouter = () => {
  return (
    <BrowserRouter basename="/rpj_administrativo">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/usuarios" element={<ProtectedRoute allowedRoles={["ADMIN"]}><UsuariosPage /></ProtectedRoute>} />
            <Route path="/roles" element={<ProtectedRoute allowedRoles={["ADMIN"]}><RolesPage /></ProtectedRoute>} />
            <Route path="/catalogos" element={<CatalogosPage />} />
            <Route path="/catalogos/:catalogo" element={<CatalogosPage />} />
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
            <Route path="/generacion-planilla" element={<GeneracionPlanillaPage />} />
            <Route path="/reportes/nomina" element={<ReportesNominaPage />} />
            <Route path="/auditoria" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AuditoriaPage /></ProtectedRoute>} />
            <Route path="/mantenimiento" element={<ProtectedRoute allowedRoles={["ADMIN"]}><MantenimientoPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
