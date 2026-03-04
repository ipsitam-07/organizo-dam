import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { logger } from "@repo/logger";

//Workers download from MinIO and write back to disk for ffmpeg
export async function writeTempFile(
  buffer: Buffer,
  extension: string
): Promise<string> {
  const filePath = path.join(
    os.tmpdir(),
    `dam-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
  );
  await fs.promises.writeFile(filePath, buffer);

  logger.info(
    `[Temp] Written ${(buffer.length / 1024 / 1024).toFixed(2)}MB. Path: ${filePath}`
  );

  return filePath;
}

//Delete temp file
export async function cleanTempFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
    logger.info(`[Temp] Cleaned ${filePath}`);
  } catch {
    //no actions to be performed
  }
}

export async function readFile(filePath: string): Promise<Buffer> {
  return fs.promises.readFile(filePath);
}

export async function getFileSize(filePath: string): Promise<number> {
  const stat = await fs.promises.stat(filePath);
  return stat.size;
}

//mapping mime type to file extension

export function mimeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/webm": "webm",
    "video/x-matroska": "mkv",
    "video/mpeg": "mpeg",
    "video/3gpp": "3gp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/aac": "aac",
    "application/pdf": "pdf",
  };
  return map[mimeType] ?? "bin";
}

//Returns true if FFmpeg can transcode MIME type to MP4
export function isTranscodableVideo(mimeType: string): boolean {
  return [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska",
    "video/mpeg",
    "video/3gpp",
  ].includes(mimeType);
}

//Returns true if FFprobe can extract some imp metadata from the type
export function isProbeableMedia(mimeType: string): boolean {
  return mimeType.startsWith("video/") || mimeType.startsWith("audio/");
}
