import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useCreateShareLink } from "@/hooks/useCreateShareLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Asset } from "@/types/asset.types";
import { UI_STRINGS } from "@/constants/ui.constants";

export function ShareModal({
  asset,
  onClose,
}: {
  asset: Asset;
  onClose: () => void;
}) {
  const create = useCreateShareLink(asset.id);
  const [pw, setPw] = useState("");
  const [maxDl, setMaxDl] = useState("");
  const [expiry, setExpiry] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const handleCreate = () => {
    setFormErr(null);
    create.mutate(
      {
        password: pw || undefined,
        max_downloads: maxDl ? parseInt(maxDl) : undefined,
        expires_in_hours: expiry ? parseInt(expiry) : undefined,
      },
      {
        onSuccess: (link) =>
          setShareUrl(`${window.location.origin}/share/${link.token}`),
        onError: (e) => setFormErr(e.message ?? "Failed"),
      }
    );
  };

  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (shareUrl)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-xs">
          {UI_STRINGS.SHARE_MODAL.HEADING}
        </p>
        <div className="border-primary/20 bg-primary/5 flex items-center gap-2 rounded-lg border px-3 py-2.5">
          <span className="text-foreground flex-1 truncate font-mono text-[11px]">
            {shareUrl}
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={copy}>
            {copied ? (
              <>
                <Check size={12} /> {UI_STRINGS.SHARE_MODAL.COPIED}
              </>
            ) : (
              <>
                <Copy size={12} /> {UI_STRINGS.SHARE_MODAL.COPY}
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-xs">
        {UI_STRINGS.SHARE_MODAL.SHARE}{" "}
        <span className="text-foreground font-medium">
          {asset.original_filename}
        </span>
        . {UI_STRINGS.SHARE_MODAL.OPTIONAL}
      </p>
      {formErr && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
          {formErr}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>{UI_STRINGS.SHARE_MODAL.EXPIRE}</Label>
          <Input
            type="number"
            min="1"
            placeholder="e.g. 24"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{UI_STRINGS.SHARE_MODAL.DOWNLOADS}</Label>
          <Input
            type="number"
            min="1"
            placeholder="e.g. 10"
            value={maxDl}
            onChange={(e) => setMaxDl(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{UI_STRINGS.SHARE_MODAL.PASSWORD}</Label>
        <Input
          type="password"
          placeholder="Leave blank for public link"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleCreate} disabled={create.isPending}>
          {create.isPending
            ? UI_STRINGS.SHARE_MODAL.CREATING
            : UI_STRINGS.SHARE_MODAL.LINK}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          {UI_STRINGS.SHARE_MODAL.CANCEL}
        </Button>
      </div>
    </div>
  );
}
