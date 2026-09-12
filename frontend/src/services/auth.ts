// Auth API calls.
import { api } from "./api";
import type { User } from "./types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>("/api/v1/auth/login/", payload),

  register: (payload: RegisterPayload) =>
    api.post<User>("/api/v1/auth/register/", payload),

  logout: (refresh: string) =>
    api.post("/api/v1/auth/logout/", { refresh }),

  refresh: (refresh: string) =>
    api.post<{ access: string }>("/api/v1/auth/refresh/", { refresh }),

  me: () => api.get<User>("/api/v1/auth/me/"),
};
