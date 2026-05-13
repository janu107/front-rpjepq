import { createContext, useContext, useEffect, useMemo, useState } from "react";

import axiosClient from "../api/axiosClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("rpjepq_token"));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("rpjepq_user") || localStorage.getItem("rpjepq_usuario");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  const logout = () => {
    localStorage.removeItem("rpjepq_token");
    localStorage.removeItem("rpjepq_user");
    localStorage.removeItem("rpjepq_usuario");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const validateSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await axiosClient.get("/auth/me");
        setUser(data.data);
        localStorage.setItem("rpjepq_user", JSON.stringify(data.data));
      } catch (error) {
        logout();
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, [token]);

  const login = (sessionData) => {
    localStorage.setItem("rpjepq_token", sessionData.token);
    localStorage.setItem("rpjepq_user", JSON.stringify(sessionData.user));
    localStorage.removeItem("rpjepq_usuario");
    setToken(sessionData.token);
    setUser(sessionData.user);
  };

  const value = useMemo(
    () => ({
      user,
      usuario: user,
      token,
      loading,
      cargandoSesion: loading,
      isAuthenticated: Boolean(token && user),
      autenticado: Boolean(token && user),
      login,
      logout,
      iniciarSesion: login,
      cerrarSesion: logout
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }

  return context;
};
