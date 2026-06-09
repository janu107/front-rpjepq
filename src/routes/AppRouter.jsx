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
import ReportesRegimenPage from "../pages/reportes/ReportesRegimenPage";
import DescuentosJudicialesPage from "../pages/descuentosJudiciales/DescuentosJudicialesPage";
import PrestamosRegimenPage from "../pages/prestamosRegimen/PrestamosRegimenPage";
import RolesPage from "../pages/roles/RolesPage";
import SalariosPage from "../pages/salarios/SalariosPage";
import TiempoExtraPage from "../pages/tiempoExtra/TiempoExtraPage";
import UsuariosPage from "../pages/usuarios/UsuariosPage";
import { useAuth } from "../context/AuthContext";
import { isConsulta } from "../utils/permissions";
import ProtectedRoute from "./ProtectedRoute";

const HomeRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={isConsulta(user) ? "/reportes/nomina" : "/dashboard"} replace />;
};

const AppRouter = () => {
  return (
    <BrowserRouter basename="/rpj_administrativo">
      <Routes>
        <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute allowedRoles={["ADMIN"]}><UsuariosPage /></ProtectedRoute>} />
            <Route path="/roles" element={<ProtectedRoute allowedRoles={["ADMIN"]}><RolesPage /></ProtectedRoute>} />
            <Route path="/catalogos" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><CatalogosPage /></ProtectedRoute>} />
            <Route path="/catalogos/:catalogo" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><CatalogosPage /></ProtectedRoute>} />
            <Route path="/aportaciones" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><AportacionesPage /></ProtectedRoute>} />
            <Route path="/aportaciones/detalle" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><AportacionesPage detailOnly /></ProtectedRoute>} />
            <Route path="/empleados" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><EmpleadosPage /></ProtectedRoute>} />
            <Route path="/empleados-regimen" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><EmpleadosPage title="Control de Empleados" subtitle="Mantenimiento de empleados regimen" fixedManejoId={1} onlyOccupiedPuestos showPlanilla /></ProtectedRoute>} />
            <Route path="/jubilados" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><JubiladosPage showPlanilla /></ProtectedRoute>} />
            <Route path="/junta-directiva" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><JuntaDirectivaPage /></ProtectedRoute>} />
            <Route path="/prestamos" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><PrestamosPage /></ProtectedRoute>} />
            <Route path="/prestamos/detalle" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><PrestamosPage detailOnly /></ProtectedRoute>} />
            <Route path="/salarios" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><SalariosPage /></ProtectedRoute>} />
            <Route path="/tiempo-extra" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><TiempoExtraPage /></ProtectedRoute>} />
            <Route path="/dietas" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><DietasPage /></ProtectedRoute>} />
            <Route path="/otros-descuentos" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><OtrosDescuentosPage /></ProtectedRoute>} />
            <Route path="/nomina" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><NominaPage /></ProtectedRoute>} />
            <Route path="/generacion-planilla" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><GeneracionPlanillaPage /></ProtectedRoute>} />
            <Route path="/reportes/nomina" element={<ReportesNominaPage />} />
            <Route path="/reportes/regimen" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR", "CONSULTA"]}><ReportesRegimenPage /></ProtectedRoute>} />
            <Route path="/descuentos-judiciales" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><DescuentosJudicialesPage /></ProtectedRoute>} />
            <Route path="/prestamos-regimen" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><PrestamosRegimenPage /></ProtectedRoute>} />
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
