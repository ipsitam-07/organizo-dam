import type { QualityPickerProps } from "@/types/props.types";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/utility";
import { formatBytes } from "@/utils/utility";
import { ChevronDown } from "lucide-react";

export function QualityPicker({
  options,
  selected,
  onSelect,
}: QualityPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const openDropdown = () => {
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        (triggerRef.current &&
          !triggerRef.current.contains(e.target as Node)) ||
        dropdownRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const dropdown =
    open && rect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: rect.bottom + 6,
              right: window.innerWidth - rect.right,
            }}
            className="border-white/8#0d1f16]/90 z-9999 min-w-38 overflow-hidden rounded-xl border shadow-2xl backdrop-blur-2xl"
          >
            <div className="border-b border-white/[0.07] px-3 py-2">
              <p className="text-[9px] font-semibold tracking-[0.12em] text-white/35 uppercase">
                Quality
              </p>
            </div>
            {options.map((r) => {
              const isSelected = r.id === selected.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    onSelect(r);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2.5 text-[11px] transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "text-white/70 hover:bg-white/6 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-3 w-3 shrink-0 items-center justify-center rounded-full border",
                      isSelected ? "border-primary" : "border-white/25"
                    )}
                  >
                    {isSelected && (
                      <span className="bg-primary h-1.5 w-1.5 rounded-full" />
                    )}
                  </span>
                  <span className="flex-1 text-left font-semibold tracking-wide">
                    {r.label}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] tabular-nums",
                      isSelected ? "text-primary/60" : "text-white/30"
                    )}
                  >
                    {r.size_bytes
                      ? formatBytes(r.size_bytes)
                      : r.height
                        ? `${r.height}p`
                        : ""}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={openDropdown}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide",
          "border border-white/15 bg-white/8 text-white/90",
          "ring-0 outline-none focus:outline-none focus-visible:ring-0",
          "transition-colors hover:border-white/25 hover:bg-white/15",
          open && "border-white/25 bg-white/15"
        )}
      >
        {selected.label}
        <ChevronDown
          size={10}
          className={cn(
            "text-white/50 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>
      {dropdown}
    </>
  );
}
