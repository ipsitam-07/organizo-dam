import { apiClient } from "../config/axios";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from "../interfaces";
import { API_ENDPOINTS } from "../constants";

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      payload
    );
    return data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      payload
    );
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<User | { data: User }>(
      API_ENDPOINTS.AUTH.ME
    );
    return "data" in data ? data.data : data;
  },
};
