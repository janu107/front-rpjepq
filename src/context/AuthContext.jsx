import { createContext, useContext, useEffect, useMemo, useState } from "react";

import axiosClient, { AUTH_UNAUTHORIZED_EVENT } from "../api/axiosClient";

const AuthContext = createContext(null);

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );
    const decoded = JSON.parse(json);

    if (decoded.exp && decoded.exp * 1000 <= Date.now()) {
      return null;
    }

    return {
      id: decoded.id,
      usuario: decoded.usuario,
      rol: decoded.rol
    };
  } catch (error) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("rpjepq_token"));
  const [user, setUser] = useState(() => decodeJwtPayload(localStorage.getItem("rpjepq_token")));
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
      } catch (error) {
        logout();
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, [token]);

  useEffect(() => {
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, logout);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, logout);
    };
  }, []);

  const login = (sessionData) => {
    localStorage.setItem("rpjepq_token", sessionData.token);
    localStorage.removeItem("rpjepq_user");
    localStorage.removeItem("rpjepq_usuario");
    setToken(sessionData.token);
    setUser(decodeJwtPayload(sessionData.token) || sessionData.user || null);
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
