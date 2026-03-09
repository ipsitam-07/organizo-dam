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
  ASSETS: {
    LIST: "/assets",
    STATS: "/assets/stats",
    DETAIL: (id: string) => `/assets/${id}`,
    DOWNLOAD: (id: string) => `/assets/${id}/download`,
    TAGS: (id: string) => `/assets/${id}/tags`,
    TAG: (id: string, tid: string) => `/assets/${id}/tags/${tid}`,
    SHARE: (id: string) => `/assets/${id}/share`,
  },
  UPLOAD: { TUS: "/upload" },
} as const;

export const APP_NAME = "Organizo";
export const MAX_FILES = 20;
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
  UPDATE_MODAL: {
    UPLOAD_FILE_TEXT: "Drop files here or click to browse",
    ANY_FILE: `Any file type · Up to ${MAX_FILES} files at once`,
    STATUS: {
      QUEUED: "queued",
      UPLOADING: "uploading",
      DONE: "done",
      ERROR: "error",
    },
    DONE: "Done",
    UPLOADED: "uploaded",
    FAILED: "failed",
    UPLOAD_MORE: "Upload more",
    CLOSE: "Close",
  },
} as const;
