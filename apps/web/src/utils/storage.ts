const TOKEN_KEY = "dam_token";
const TOKEN_USER = "dam_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const clearUser = () => localStorage.removeItem(TOKEN_USER);
