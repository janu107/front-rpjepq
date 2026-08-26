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
import NominaTiempoExtraPage from "../pages/nominaTiempoExtra/NominaTiempoExtraPage";
import OtrosDescuentosPage from "../pages/otrosDescuentos/OtrosDescuentosPage";
import PrestacionesPage from "../pages/prestaciones/PrestacionesPage";
import PrestacionesJubiladosPage from "../pages/prestacionesJubilados/PrestacionesJubiladosPage";
import PrestamosPage from "../pages/prestamos/PrestamosPage";
import ReportesNominaPage from "../pages/reportes/ReportesNominaPage";
import ReportesRegimenPage from "../pages/reportes/ReportesRegimenPage";
import ReporteAportacionesPage from "../pages/reportes/ReporteAportacionesPage";
import ReportePrestamosRegimenPage from "../pages/reportes/ReportePrestamosRegimenPage";
import ReporteJuntaDirectivaPage from "../pages/reportes/ReporteJuntaDirectivaPage";
import ReporteDietasPage from "../pages/reportes/ReporteDietasPage";
import ReporteEmpleadosRegimenPage from "../pages/reportes/ReporteEmpleadosRegimenPage";
import ReporteDetalleAportacionesPage from "../pages/reportes/ReporteDetalleAportacionesPage";
import PlanillasPensionadosPage from "../pages/planillasPensionados/PlanillasPensionadosPage";
import DetallePlanillaPensionadosPage from "../pages/planillasPensionados/DetallePlanillaPensionadosPage";
import PlanillasTrabajadoresPage from "../pages/planillasTrabajadores/PlanillasTrabajadoresPage";
import DetallePlanillaTrabajadoresPage from "../pages/planillasTrabajadores/DetallePlanillaTrabajadoresPage";
import BeneficiariosPage from "../pages/beneficiarios/BeneficiariosPage";
import AmparistasPage from "../pages/amparistas/AmparistasPage";
import EstadoCuentaPage from "../pages/estadoCuenta/EstadoCuentaPage";
import FallecimientoPage from "../pages/fallecimientos/FallecimientoPage";
import ConveniosPage from "../pages/convenios/ConveniosPage";
import SuspensionesPage from "../pages/suspensiones/SuspensionesPage";
import DashboardReportesPage from "../pages/reportesJubilados/DashboardReportesPage";
import NominasJubiladosPage from "../pages/nominasJubilados/NominasJubiladosPage";
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
            <Route path="/nomina-tiempo-extra" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><NominaTiempoExtraPage /></ProtectedRoute>} />
            <Route path="/prestaciones" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><PrestacionesPage /></ProtectedRoute>} />
            <Route path="/prestaciones-jubilados" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><PrestacionesJubiladosPage /></ProtectedRoute>} />
            <Route path="/generacion-planilla" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><GeneracionPlanillaPage /></ProtectedRoute>} />
            <Route path="/reportes/nomina" element={<ReportesNominaPage />} />
            <Route path="/reportes/regimen" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR", "CONSULTA"]}><ReportesRegimenPage /></ProtectedRoute>} />
            <Route path="/reportes/prestamos-regimen" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR", "CONSULTA"]}><ReportePrestamosRegimenPage /></ProtectedRoute>} />
            <Route path="/reportes/junta-directiva" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR", "CONSULTA"]}><ReporteJuntaDirectivaPage /></ProtectedRoute>} />
            <Route path="/reportes/dietas" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR", "CONSULTA"]}><ReporteDietasPage /></ProtectedRoute>} />
            <Route path="/reportes/empleados-regimen" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR", "CONSULTA"]}><ReporteEmpleadosRegimenPage /></ProtectedRoute>} />
            <Route path="/reportes/aportaciones" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR", "CONSULTA"]}><ReporteAportacionesPage /></ProtectedRoute>} />
            <Route path="/reportes/detalle-aportaciones" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR", "CONSULTA"]}><ReporteDetalleAportacionesPage /></ProtectedRoute>} />
            <Route path="/descuentos-judiciales" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><DescuentosJudicialesPage /></ProtectedRoute>} />
            <Route path="/prestamos-regimen" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><PrestamosRegimenPage /></ProtectedRoute>} />
            <Route path="/planillas-pensionados" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><PlanillasPensionadosPage /></ProtectedRoute>} />
            <Route path="/planillas-pensionados/:id" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><DetallePlanillaPensionadosPage /></ProtectedRoute>} />
            <Route path="/planillas-trabajadores" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><PlanillasTrabajadoresPage /></ProtectedRoute>} />
            <Route path="/planillas-trabajadores/:id" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><DetallePlanillaTrabajadoresPage /></ProtectedRoute>} />
            <Route path="/beneficiarios" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><BeneficiariosPage /></ProtectedRoute>} />
            <Route path="/amparistas" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><AmparistasPage /></ProtectedRoute>} />
            <Route path="/estado-cuenta" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR", "CONSULTA"]}><EstadoCuentaPage /></ProtectedRoute>} />
            <Route path="/fallecimientos" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><FallecimientoPage /></ProtectedRoute>} />
            <Route path="/convenios" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><ConveniosPage /></ProtectedRoute>} />
            <Route path="/suspensiones" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><SuspensionesPage /></ProtectedRoute>} />
            <Route path="/reportes-jubilados" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR", "CONSULTA"]}><DashboardReportesPage /></ProtectedRoute>} />
            <Route path="/nominas-jubilados" element={<ProtectedRoute allowedRoles={["ADMIN", "OPERADOR"]}><NominasJubiladosPage /></ProtectedRoute>} />
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
