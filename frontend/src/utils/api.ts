import axios from "axios";

// in production the frontend is served from the same origin as the backend,
// so baseURL is just "/api". in development VITE_BACKEND_URL points to localhost:3000.
const api = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || ""}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// auto-logout on expired tokens — skip for auth endpoints so login/reset
// errors don't cause a full page reload
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthRoute = url.startsWith("/auth/") || url.startsWith("/api/auth/");
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
