import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(b: number): string {
  if (!b) return "0 B";
  const k = 1024,
    s = ["B", "KB", "MB", "GB", "TB"],
    i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${s[i]}`;
}
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export function mimeLabel(mime: string): string {
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("gz"))
    return "Archive";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "Sheet";
  if (mime.includes("document") || mime.includes("word")) return "Doc";
  return "File";
}
export function fileExt(filename: string): string {
  return filename.split(".").pop()?.toUpperCase().slice(0, 4) ?? "FILE";
}
