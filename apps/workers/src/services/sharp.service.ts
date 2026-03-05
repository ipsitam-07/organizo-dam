import sharp from "sharp";
import { ImageMetadata, ImageRenditionSpec } from "../interfaces/interfaces";

//Extract image metadata
export async function probeImage(buffer: Buffer): Promise<ImageMetadata> {
  const instance = sharp(buffer);
  const meta = await instance.metadata();

  if (!meta.width || !meta.height || !meta.format) {
    throw new Error("sharp could not read image dimensions or format");
  }

  return {
    width: meta.width,
    height: meta.height,
    format: meta.format,
    size_bytes: buffer.length,
    hasAlpha: meta.hasAlpha ?? false,
    raw_metadata: {
      format: meta.format,
      width: meta.width,
      height: meta.height,
      space: meta.space,
      channels: meta.channels,
      depth: meta.depth,
      density: meta.density,
      hasAlpha: meta.hasAlpha,
      orientation: meta.orientation,
      exif: meta.exif ? "present" : null,
      icc: meta.icc ? "present" : null,
    },
  };
}

//Resize
export async function resizeImage(
  buffer: Buffer,
  spec: ImageRenditionSpec
): Promise<Buffer> {
  const instance = sharp(buffer, { animated: false })
    .rotate()
    .resize({
      width: spec.width,
      fit: "inside",
      withoutEnlargement: true,
    })
    .withMetadata({ orientation: undefined });

  let output: Buffer;
  if (spec.format === "jpeg") {
    output = await instance
      .jpeg({ quality: spec.quality, mozjpeg: true })
      .toBuffer();
  } else {
    output = await instance.webp({ quality: spec.quality }).toBuffer();
  }
  return output;
}
