import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { UIState } from "@/types";
import type { Asset } from "@/types/asset.types";
import type { UIAction } from "@/types";

function reducer(_s: UIState, a: UIAction): UIState {
  switch (a.type) {
    case "UPLOAD":
      return { modal: "upload", asset: null };
    case "DETAIL":
      return { modal: "detail", asset: a.a };
    case "SHARE":
      return { modal: "share", asset: a.a };
    case "DELETE":
      return { modal: "delete", asset: a.a };
    case "CLOSE":
      return { modal: null, asset: null };
  }
}

interface UICtx extends UIState {
  openUpload: () => void;
  openDetail: (a: Asset) => void;
  openShare: (a: Asset) => void;
  openDelete: (a: Asset) => void;
  close: () => void;
}
const Ctx = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reducer, { modal: null, asset: null });
  return (
    <Ctx.Provider
      value={{
        ...s,
        openUpload: () => d({ type: "UPLOAD" }),
        openDetail: (a) => d({ type: "DETAIL", a }),
        openShare: (a) => d({ type: "SHARE", a }),
        openDelete: (a) => d({ type: "DELETE", a }),
        close: () => d({ type: "CLOSE" }),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI must be within <UIProvider>");
  return c;
}
