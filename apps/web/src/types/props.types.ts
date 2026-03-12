import type { Asset, AssetRenditionWithUrl } from "./asset.types";

export interface Props {
  asset: Asset;
  onView: (a: Asset) => void;
  onShare: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onDownload: (a: Asset) => void;
}

export interface DeleteProps {
  asset: Asset;
  onShare: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onClose: () => void;
}

export interface ListViewProps {
  assets: Asset[];
  onView: (a: Asset) => void;
  onShare: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onDownload: (a: Asset) => void;
}

export interface DetailProps {
  asset: Asset;
  onShare: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onClose: () => void;
}

export interface DownloadPickerProps {
  asset: Asset;
}

export interface QualityPickerProps {
  options: AssetRenditionWithUrl[];
  selected: AssetRenditionWithUrl;
  onSelect: (r: AssetRenditionWithUrl) => void;
}

export interface PreviewProps {
  asset: Asset;
}
