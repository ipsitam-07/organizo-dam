import { STORAGE_TOKENS } from "../constants";

const TOKEN_KEY = STORAGE_TOKENS.TOKEN_KEY;
const USER_KEY = STORAGE_TOKENS.USER_KEY;

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);

export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getUserKey = () => localStorage.getItem(USER_KEY);

export const setUserKey = (user: string) =>
  localStorage.setItem(USER_KEY, user);

export const clearUser = () => localStorage.removeItem(USER_KEY);
