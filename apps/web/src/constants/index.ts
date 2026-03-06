//STORAGE

export const STORAGE_TOKENS = {
  TOKEN_KEY: "dam_token",
  USER_KEY: "dam_user",
} as const;

export const ERROR_STRINGS = {
  AUTH_CONTEXT_ERROR: "useAuth must be used inside <AuthProvider>",
} as const;

export const ROLE = {
  USER: "user",
  ADMIN: "admin",
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
  },
} as const;
