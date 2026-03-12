import axios, { AxiosError } from "axios";
import type { ApiError } from "@/types";
import { getToken, clearToken, clearUser } from "../utils/storage";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

//Request interceptor and attach JWT
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

//Response interceptors and handle errors
apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      "Something went wrong";

    if (status === 401) {
      clearToken();
      clearUser();
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    const apiError: ApiError = { message, status };
    return Promise.reject(apiError);
  }
);
