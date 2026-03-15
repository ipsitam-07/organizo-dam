import { QueryClient } from "@tanstack/react-query";

const PRESIGNED_URL_STALE_MS = 10 * 60 * 1000; // 10 min

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: import.meta.env.PROD,
    },
  },
});

export { PRESIGNED_URL_STALE_MS };
