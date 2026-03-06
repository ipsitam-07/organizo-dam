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

export const APP_NAME = "Organizo";

export const UI_STRINGS = {
  SIGN_UP_PAGE: {
    SUB_HEADING: "Digital Asset Management",
    CREATE_ACCOUNT: "Create an account",
    GET_STARTED: "Get started — it's free",
    HAVE_ACCOUNT: "Already have an account?",
    AGREE: "By continuing you agree to our",
    TERMS: "Terms of Service",
    PRIVACY: "Privacy Policy",
    AND: "and",
  },
  CREDENTIALS: {
    EMAIL: "Email",
    PASSWORD: "Password",
  },

  LOGIN_PAGE: {
    SUB_HEADING: "Digital Asset Management",
    WELCOME_BACK: "Welcome back",
    SIGN_IN_TO_CONTINUE: "Sign in to continue",
    NO_ACCOUNT: "Don't have an account?",
    FORGOT_PASSWORD: "Forgot password?",
  },
  BUTTONS: {
    CREATE: "Create account",
    SIGN_IN: "Sign in",
    SIGN_UP: "Sign up",
  },
} as const;
