import { useCallback, useRef, useState } from "react";
import { FileUp, CheckCircle2, AlertCircle, Loader2, File } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utility";
import { formatBytes } from "@/utils/utility";
import { MAX_FILES, UI_STRINGS } from "@/constants/ui.constants";

export function UploadModal({ onClose }: { onClose: () => void }) {
  const {
    files,
    active,
    allDone,
    anyError,
    doneCount,
    errCount,
    uploadAll,
    reset,
  } = useUpload();
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setValidationError(null);

      if (fileList.length > MAX_FILES) {
        setValidationError(
          `Maximum ${MAX_FILES} files at a time. You selected ${fileList.length}.`
        );
        return;
      }

      uploadAll(Array.from(fileList));
    },
    [uploadAll]
  );

  const idle = files.length === 0;

  return (
    <div className="bg-accent flex flex-col gap-4">
      {idle && (
        <div
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
            dragging
              ? "border-primary/60 bg-primary/5"
              : "border-border hover:border-border/80 hover:bg-accent/30"
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <div className="border-border bg-muted flex h-11 w-11 items-center justify-center rounded-full border">
            <FileUp size={18} className="text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {UI_STRINGS.UPDATE_MODAL.UPLOAD_FILE_TEXT}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {UI_STRINGS.UPDATE_MODAL.ANY_FILE}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <p className="bg-destructive/10 text-destructive flex items-center gap-1.5 rounded-md px-3 py-2 text-xs">
          <AlertCircle size={12} /> {validationError}
        </p>
      )}

      {files.length > 0 && (
        <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-0.5">
          {files.map((entry) => (
            <div
              key={entry.id}
              className="border-border bg-muted/20 rounded-lg border px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="shrink-0">
                  {entry.status === UI_STRINGS.UPDATE_MODAL.STATUS.QUEUED && (
                    <File size={14} className="text-muted-foreground" />
                  )}
                  {entry.status ===
                    UI_STRINGS.UPDATE_MODAL.STATUS.UPLOADING && (
                    <Loader2 size={14} className="text-primary animate-spin" />
                  )}
                  {entry.status === UI_STRINGS.UPDATE_MODAL.STATUS.DONE && (
                    <CheckCircle2 size={14} className="text-primary" />
                  )}
                  {entry.status === UI_STRINGS.UPDATE_MODAL.STATUS.ERROR && (
                    <AlertCircle size={14} className="text-destructive" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs leading-tight font-medium">
                    {entry.file.name}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {formatBytes(entry.file.size)}
                    {entry.status ===
                      UI_STRINGS.UPDATE_MODAL.STATUS.UPLOADING &&
                      ` - ${entry.percent}%`}
                    {entry.status === UI_STRINGS.UPDATE_MODAL.STATUS.DONE &&
                      ` - ${UI_STRINGS.UPDATE_MODAL.DONE}`}
                    {entry.status === UI_STRINGS.UPDATE_MODAL.STATUS.ERROR &&
                      ` - ${entry.error}`}
                  </p>
                </div>

                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize",
                    entry.status === UI_STRINGS.UPDATE_MODAL.STATUS.QUEUED &&
                      "bg-muted text-muted-foreground",
                    entry.status === UI_STRINGS.UPDATE_MODAL.STATUS.UPLOADING &&
                      "bg-primary/10 text-primary",
                    entry.status === UI_STRINGS.UPDATE_MODAL.STATUS.DONE &&
                      "bg-primary/10 text-primary",
                    entry.status === UI_STRINGS.UPDATE_MODAL.STATUS.ERROR &&
                      "bg-destructive/10 text-destructive"
                  )}
                >
                  {entry.status === UI_STRINGS.UPDATE_MODAL.STATUS.UPLOADING
                    ? `${entry.percent}%`
                    : entry.status}
                </span>
              </div>

              {/* Progress bar */}
              {entry.status === "uploading" && (
                <div className="bg-border mt-2 h-0.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-200"
                    style={{ width: `${entry.percent}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {allDone && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm",
            anyError
              ? "bg-amber-500/10 text-amber-500"
              : "bg-primary/10 text-primary"
          )}
        >
          {anyError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span className="font-medium">
            {doneCount} {UI_STRINGS.UPDATE_MODAL.UPLOADED}
            {errCount > 0
              ? `, ${errCount} ${UI_STRINGS.UPDATE_MODAL.FAILED}`
              : ""}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {allDone && (
          <Button size="sm" variant="outline" onClick={reset}>
            {UI_STRINGS.UPDATE_MODAL.UPLOAD_MORE}
          </Button>
        )}
        <Button
          size="sm"
          variant={active ? "ghost" : "outline"}
          disabled={active}
          onClick={onClose}
        >
          {allDone
            ? UI_STRINGS.UPDATE_MODAL.DONE
            : UI_STRINGS.UPDATE_MODAL.CLOSE}
        </Button>
      </div>
    </div>
  );
}
