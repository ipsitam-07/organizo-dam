import type { Asset } from "@/interfaces";

export type ModalKind = "upload" | "detail" | "share" | "delete";

export type UIAction =
  | { type: "UPLOAD" }
  | { type: "DETAIL"; a: Asset }
  | { type: "SHARE"; a: Asset }
  | { type: "DELETE"; a: Asset }
  | { type: "CLOSE" };
