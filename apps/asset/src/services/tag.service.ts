import { Tag, AssetTag } from "@repo/database";
import { logger } from "@repo/logger";

//Derive auto-tags from a MIME type.
export function inferTagsFromMimeType(mimeType: string): string[] {
  const tags: string[] = [];

  if (mimeType.startsWith("video/")) tags.push("video");
  else if (mimeType.startsWith("image/")) tags.push("image");
  else if (mimeType.startsWith("audio/")) tags.push("audio");
  else if (mimeType === "application/pdf") tags.push("document");
  else if (
    mimeType === "application/zip" ||
    mimeType === "application/x-tar" ||
    mimeType === "application/gzip"
  )
    tags.push("archive");

  return tags;
}

//Check tag name in db then assign it
export async function attachTag(
  assetId: string,
  tagName: string,
  source: "auto" | "user",
  taggedBy?: string
): Promise<Tag> {
  const [tag] = await Tag.findOrCreate({
    where: { name: tagName.toLowerCase().trim() },
    defaults: { name: tagName.toLowerCase().trim(), source },
  });

  await AssetTag.findOrCreate({
    where: { asset_id: assetId, tag_id: tag.id },
    defaults: {
      asset_id: assetId,
      tag_id: tag.id,
      tagged_by: taggedBy ?? null,
    },
  });

  logger.info(
    `[TagService] Attached tag "${tagName}" (source=${source}) to asset "${assetId}"`
  );

  return tag;
}

//Auto tag after asset creation
export async function autoTagAsset(
  assetId: string,
  mimeType: string
): Promise<void> {
  const tagNames = inferTagsFromMimeType(mimeType);

  for (const name of tagNames) {
    await attachTag(assetId, name, "auto");
  }
}
