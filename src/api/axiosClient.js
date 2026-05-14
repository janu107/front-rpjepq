import axios from "axios";
import Swal from "sweetalert2";

export const AUTH_UNAUTHORIZED_EVENT = "rpjepq:unauthorized";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api"
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("rpjepq_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const backendMessage = error.response?.data?.message;
    const isDevelopment = import.meta.env.DEV;

    if (error.response?.status === 401) {
      localStorage.removeItem("rpjepq_token");
      localStorage.removeItem("rpjepq_user");
      localStorage.removeItem("rpjepq_usuario");

      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }

    if (status === 400 && backendMessage) {
      Swal.fire("Validacion", backendMessage, "warning");
    }

    if (status === 403) {
      Swal.fire("Permisos insuficientes", "No tiene permisos para realizar esta accion.", "warning");
    }

    if (status === 404) {
      Swal.fire("No encontrado", "Recurso no encontrado.", "warning");
    }

    if (status >= 500) {
      Swal.fire("Error", "Error interno del servidor.", "error");
    }

    if (!error.response) {
      Swal.fire("Sin conexion", "No se pudo conectar con el servidor.", "error");
    }

    if (isDevelopment) {
      console.error("API error", {
        status,
        message: backendMessage || error.message,
        url: error.config?.url
      });
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
