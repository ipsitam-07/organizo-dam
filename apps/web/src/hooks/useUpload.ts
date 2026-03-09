import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { getToken } from "../utils/storage";
import type { FileEntry } from "@/interfaces";

export function useUpload() {
  const qc = useQueryClient();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [active, setActive] = useState(false);

  const reset = useCallback(() => {
    setFiles([]);
    setActive(false);
  }, []);

  const updateFile = useCallback((id: string, patch: Partial<FileEntry>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const uploadOne = useCallback(
    async (entry: FileEntry): Promise<void> => {
      updateFile(entry.id, { status: "uploading", percent: 0 });
      try {
        const { Upload } = await import("tus-js-client");
        await new Promise<void>((resolve, reject) => {
          const t = new Upload(entry.file, {
            endpoint: "/api/upload/core",
            retryDelays: [0, 1000, 3000, 5000],
            chunkSize: 10 * 1024 * 1024,
            headers: { Authorization: `Bearer ${getToken() ?? ""}` },
            metadata: { filename: entry.file.name, filetype: entry.file.type },
            onProgress: (sent, total) =>
              updateFile(entry.id, {
                percent: Math.round((sent / total) * 100),
              }),
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          });
          t.start();
        });
        updateFile(entry.id, { status: "done", percent: 100 });
      } catch (e) {
        updateFile(entry.id, {
          status: "error",
          error: e instanceof Error ? e.message : "Upload failed",
        });
      }
    },
    [updateFile]
  );

  const uploadAll = useCallback(
    async (selected: File[]) => {
      const entries: FileEntry[] = selected.map((file, i) => ({
        id: `${Date.now()}-${i}`,
        file,
        status: "queued",
        percent: 0,
      }));
      setFiles(entries);
      setActive(true);

      // Upload sequentially
      for (const entry of entries) {
        await uploadOne(entry);
      }

      setActive(false);
      qc.invalidateQueries({ queryKey: queryKeys.assets.all() });
    },
    [uploadOne, qc]
  );

  const allDone =
    files.length > 0 &&
    files.every((f) => f.status === "done" || f.status === "error");
  const anyError = files.some((f) => f.status === "error");
  const doneCount = files.filter((f) => f.status === "done").length;
  const errCount = files.filter((f) => f.status === "error").length;

  return {
    files,
    active,
    allDone,
    anyError,
    doneCount,
    errCount,
    uploadAll,
    reset,
  };
}
