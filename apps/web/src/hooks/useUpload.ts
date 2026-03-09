import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { getToken } from "../utils/storage";

export type UploadState = "idle" | "uploading" | "success" | "error";
export interface UploadFile {
  name: string;
  percent: number;
}

export function useUpload() {
  const qc = useQueryClient();
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState<UploadFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setProgress(null);
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: File) => {
      setState("uploading");
      setProgress({ name: file.name, percent: 0 });
      setError(null);
      try {
        const { Upload } = await import("tus-js-client");
        await new Promise<void>((resolve, reject) => {
          const t = new Upload(file, {
            endpoint: "/api/upload/core",
            retryDelays: [0, 1000, 3000, 5000],
            chunkSize: 10 * 1024 * 1024,
            headers: { Authorization: `Bearer ${getToken() ?? ""}` },
            metadata: { filename: file.name, filetype: file.type },
            onProgress: (sent, total) =>
              setProgress({
                name: file.name,
                percent: Math.round((sent / total) * 100),
              }),
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          });
          t.start();
        });
        setState("success");
        qc.invalidateQueries({ queryKey: queryKeys.assets.all() });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
        setState("error");
      }
    },
    [qc]
  );

  return { state, progress, error, upload, reset };
}
