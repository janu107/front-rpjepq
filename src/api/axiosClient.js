import axios from "axios";

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
    if (error.response?.status === 401) {
      localStorage.removeItem("rpjepq_token");
      localStorage.removeItem("rpjepq_user");
      localStorage.removeItem("rpjepq_usuario");

      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
