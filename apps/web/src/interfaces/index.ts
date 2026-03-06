import type { ROLE } from "../constants";

export interface ApiError {
  message: string;
  status: number;
}

//AUTH
export interface User {
  id: string;
  email: string;
  role: typeof ROLE.USER | typeof ROLE.ADMIN;
  is_active: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (r: AuthResponse) => void;
  logout: () => Promise<void>;
}
