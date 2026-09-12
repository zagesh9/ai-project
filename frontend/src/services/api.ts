// API client setup.
//
// Uses Axios with an interceptor that attaches the JWT access token from
// localStorage on every request, and redirects to /login on 401.

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

// Attach the access token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear stored tokens and let the auth context handle redirect.
// Skip redirect for /auth/me/ — that endpoint is called during session
// restore to check if a user is logged in; a 401 there just means "no session".
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isMeCheck = error.config?.url?.endsWith("/auth/me/");
      if (!isMeCheck) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
