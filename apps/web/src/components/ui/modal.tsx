import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  title: string;
  size?: "sm" | "md";
  onClose: () => void;
  children: ReactNode;
}
export function Modal({
  open,
  title,
  size = "md",
  onClose,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="bg-background/80 absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "border-border bg-accent animate-fade-up relative z-10 w-full rounded-xl border shadow-2xl",
          size === "sm" ? "max-w-sm" : "max-w-lg"
        )}
      >
        <div className="border-border flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="font-display text-foreground text-sm font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-6 w-6 items-center justify-center rounded-md transition-colors"
          >
            <X size={13} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
