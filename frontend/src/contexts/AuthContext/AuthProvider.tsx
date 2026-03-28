import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import api from "../../utils/api";
import axios from "axios";

export default function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load the current user info if a token is available in storage
  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    // get user jwt toke
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      setUser(null);
      setToken(null);
      return;
    }
    // fectch user data
    try {
      setToken(storedToken);
      const response = await api.get("/users/me");
      setUser(response.data);
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  }

  // log the user in and set their jwt token
  async function login(email: string, password: string) {
    try {
      // authenticate account holder
      const response = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", response.data.token);
      setToken(response.data.token);
      // update user object
      await loadUser();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new Error(err.response?.data?.error || "Login failed");
      }
      throw new Error("Login failed");
    }
  }

  // log the user out
  function logout() {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem("token");
  }

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
