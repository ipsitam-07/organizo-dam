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
    RENDITIONS: (id: string) => `/assets/${id}/renditions`,
  },
  UPLOAD: { TUS: "/upload" },
} as const;
