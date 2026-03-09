import type { AssetStatus } from "@/interfaces";
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
    THUMBNAIL: (id: string) => `/assets/${id}/thumbnail`,
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

  DELETE_MODAL: {
    DELETE: "Permanently delete this asset?",
    WARNING: "will be removed from storage. This cannot be undone.",
    CANCEL: "Cancel",
    DLT_BUTTON: "Delete",
    DELETING: "Deleting...",
    FAILED: "Failed",
  },
  DETAIL_MODAL: {
    TAGS: "Tags",
    DOWNLOAD: "Download",
    SHARE: "Share",
    DELETE: "Delete",
  },
  SHARE_MODAL: {
    HEADING: "Share link created. Copy and send it.",
    COPIED: "Copied!",
    COPY: "Copy link",
    SHARE: "Share",
    OPTIONAL: "All options are optional.",
    EXPIRE: "Expires (hours)",
    DOWNLOADS: "Max downloads",
    PASSWORD: "Password (optional)",
    CANCEL: "Cancel",
    CREATING: "Creating…",
    LINK: "Create link",
  },
} as const;

export const MIME_COLORS: Record<string, string> = {
  Image: "from-violet-900/40 to-violet-950/20 text-violet-300",
  Video: "from-blue-900/40 to-blue-950/20 text-blue-300",
  Audio: "from-pink-900/40 to-pink-950/20 text-pink-300",
  PDF: "from-red-900/40 to-red-950/20 text-red-300",
  Sheet: "from-emerald-900/40 to-emerald-950/20 text-emerald-300",
  Doc: "from-sky-900/40 to-sky-950/20 text-sky-300",
} as const;

export const STATUS_DOT: Record<AssetStatus, string> = {
  ready: "bg-primary",
  processing: "bg-amber-400 animate-pulse",
  queued: "bg-blue-400 animate-pulse",
  failed: "bg-destructive",
} as const;

export const STATUS_STYLE: Record<AssetStatus, string> = {
  ready: "text-primary border-primary/30 bg-primary/10",
  processing: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  queued: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  failed: "text-destructive border-destructive/30 bg-destructive/10",
} as const;
