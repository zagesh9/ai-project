// Auth context — provides user, login, register, logout.
import React, { createContext, useContext, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, type LoginPayload, type RegisterPayload } from "../services/auth";

interface AuthContextValue {
  user: import("../services/types").User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<import("../services/types").User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const restoreSession = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      // not authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const payload: LoginPayload = { email, password };
      const { data } = await authApi.login(payload);
      if (data.access) {
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);
      }
      setUser(data.user);
      navigate("/dashboard");
    },
    [navigate],
  );

  const register = useCallback(
    async (data: RegisterPayload) => {
      const { data: user } = await authApi.register(data);
      // After registration we don't have tokens — user must log in.
      // Store minimal user info for the dashboard redirect; clear any stale tokens.
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(user);
      navigate("/dashboard");
    },
    [navigate],
  );

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refreshToken") ?? "";
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        // ignore
      }
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
