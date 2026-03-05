import ffmpeg from "fluent-ffmpeg";
import { VideoMetadata, TranscodeProfile } from "../interfaces/interfaces";
import * as path from "path";
import * as os from "os";
import { logger } from "@repo/logger";
// Probe
export function probeFile(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);

      const video = data.streams?.find((s) => s.codec_type === "video");
      const audio = data.streams?.find((s) => s.codec_type === "audio");
      const fmt = data.format;

      let frame_rate: number | undefined;
      if (video?.r_frame_rate) {
        const [num, den] = video.r_frame_rate.split("/").map(Number);
        if (den && den > 0) frame_rate = parseFloat((num / den).toFixed(3));
      }

      resolve({
        width: video?.width,
        height: video?.height,
        duration_secs: fmt?.duration
          ? parseFloat(fmt.duration as any)
          : undefined,
        bitrate_kbps: fmt?.bit_rate
          ? Math.round(parseInt(fmt.bit_rate as any) / 1000)
          : undefined,
        video_codec: video?.codec_name,
        audio_codec: audio?.codec_name,
        frame_rate,
        format: fmt?.format_name,
        raw_metadata: data,
      });
    });
  });
}

//Thumbnail
export function extractThumbnail(
  inputPath: string,
  durationSecs: number
): Promise<string> {
  const seekTime = Math.max(1, Math.floor(durationSecs * 0.1));
  const outputPath = path.join(os.tmpdir(), `dam-thumb-${Date.now()}.jpg`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(seekTime)
      .frames(1)
      .output(outputPath)
      .outputOptions(["-vf scale=640:-1", "-q:v 3"])
      .on("end", () => {
        logger.info(`[FFmpeg] Thumbnail → ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        logger.error("[FFmpeg] Thumbnail failed", { error: err.message });
        reject(err);
      })
      .run();
  });
}

//Transcode
export function transcodeVideo(
  inputPath: string,
  profile: TranscodeProfile,
  onProgress?: (pct: number) => void
): Promise<string> {
  const outputPath = path.join(
    os.tmpdir(),
    `dam-transcode-${profile.label}-${Date.now()}.mp4`
  );

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        `-vf scale=-2:${profile.height}`,
        `-b:v ${profile.videoBitrate}`,
        `-b:a ${profile.audioBitrate}`,
        "-preset fast",
        "-movflags faststart",
        "-pix_fmt yuv420p",
      ])
      .on("progress", (p) => {
        if (onProgress && p.percent) onProgress(Math.round(p.percent));
      })
      .on("end", () => {
        logger.info(`[FFmpeg] Transcode done → ${profile.label}`);
        resolve(outputPath);
      })
      .on("error", (err) => {
        logger.error(`[FFmpeg] Transcode failed ${profile.label}`, {
          error: err.message,
        });
        reject(err);
      })
      .run();
  });
}
