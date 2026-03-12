import {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { User, AuthResponse } from "@/types/auth.types";
import { authApi } from "../services/auth.service";
import {
  getToken,
  clearToken,
  setToken,
  clearUser,
  getUserKey,
  setUserKey,
} from "../utils/storage";
import type { ExtendedAuthContextValue, AuthState } from "@/types/auth.types";
import { ERROR_STRINGS } from "../constants";

const AuthContext = createContext<ExtendedAuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isHydrating, setIsHydrating] = useState(() => !!getToken());

  const [state, setState] = useState<AuthState>(() => {
    try {
      const token = getToken();
      const user: User | null = JSON.parse(getUserKey() ?? "null");
      return { token, user, isAuthenticated: !!(token && user) };
    } catch {
      return { token: null, user: null, isAuthenticated: false };
    }
  });

  const setHydrated = useCallback(() => setIsHydrating(false), []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setState({ token: null, user: null, isAuthenticated: false });
      setIsHydrating(false);
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = useCallback((r: AuthResponse) => {
    setToken(r.token);
    setUserKey(JSON.stringify(r.user));
    setState({ token: r.token, user: r.user, isAuthenticated: true });
    setIsHydrating(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      //the user is logged out locally even if the server request fails.
    }
    clearToken();
    clearUser();
    setState({ token: null, user: null, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, isHydrating, setHydrated }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(ERROR_STRINGS.AUTH_CONTEXT_ERROR);
  }
  return ctx;
}
