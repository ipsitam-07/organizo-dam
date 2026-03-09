import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";
import type { LoginPayload, RegisterPayload } from "../interfaces";
import { queryKeys } from "../lib/queryKeys";

export const useBootstrapAuth = () => {
  const { token, login, setHydrated } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      console.log("[Auth] Validating stored token via /auth/me");
      return authApi.getMe();
    },
    enabled: !!token,
    staleTime: 5 * 60_000,
    retry: false,
    throwOnError: false,
  });

  useEffect(() => {
    if (!token) {
      console.log("[Auth] No token found, skipping validation");
      setHydrated();
      return;
    }
    if (!query.isPending) {
      if (query.isSuccess && query.data) {
        console.log("[Auth] Token valid, user:", query.data);
        login({ token, user: query.data });
      } else if (query.isError) {
        console.warn("[Auth] Token validation failed:", query.error);
      }
      setHydrated();
    }
  }, [
    token,
    query.isPending,
    query.isSuccess,
    query.isError,
    query.data,
    query.error,
    login,
    setHydrated,
  ]);
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  const { login } = useAuth();

  return useMutation({
    mutationFn: async (userData: RegisterPayload) => {
      console.log("[Auth] Step 1: Registering user:", userData.email);
      await authApi.register(userData);

      console.log("[Auth] Step 2: Auto-logging in:", userData.email);
      const authResponse = await authApi.login({
        email: userData.email,
        password: userData.password,
      });

      console.log("[Auth] Step 2 success, token received");
      return authResponse;
    },
    onSuccess: (data) => {
      console.log("[Auth] onSuccess: updating auth context, user:", data.user);
      queryClient.clear();
      login(data);
      queryClient.invalidateQueries();
    },
    onError: (err) => {
      console.error("[Auth] Registration/Login failed:", err);
    },
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  const { login } = useAuth();

  return useMutation({
    mutationFn: async (credentials: LoginPayload) => {
      console.log("[Auth] Logging in:", credentials.email);
      return authApi.login(credentials);
    },
    onSuccess: (data) => {
      console.log("[Auth] onSuccess: updating auth context, user:", data.user);
      queryClient.clear();
      login(data);
      queryClient.invalidateQueries();
    },
    onError: (err) => {
      console.error("[Auth] Login failed:", err);
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useCallback(async () => {
    console.log("[Auth] Logging out");
    queryClient.clear();
    await logout();
    navigate("/login", { replace: true });
  }, [logout, queryClient, navigate]);
};
