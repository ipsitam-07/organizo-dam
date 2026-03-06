import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../services/auth.service";
import { setToken, setUserKey } from "../utils/storage";
import type { LoginPayload, RegisterPayload } from "../interfaces";

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginPayload) => authApi.login(credentials),
    onSuccess: (data) => {
      setToken(data.token);
      setUserKey(JSON.stringify(data.user));
      queryClient.clear();
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: RegisterPayload) => authApi.register(userData),
    onSuccess: (data) => {
      setToken(data.token);
      setUserKey(JSON.stringify(data.user));
      queryClient.clear();
    },
  });
};
