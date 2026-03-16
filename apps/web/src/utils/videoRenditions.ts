import type { AssetRenditionWithUrl } from "@/types/asset.types";

const QUALITY_ORDER = ["1080p", "720p", "360p"];

export function sortVideoRenditions(renditions: AssetRenditionWithUrl[]) {
  return [...renditions].sort((a, b) => {
    const ai = QUALITY_ORDER.indexOf(a.label);
    const bi = QUALITY_ORDER.indexOf(b.label);

    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;

    return ai - bi;
  });
}
