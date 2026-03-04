import ffmpeg from "fluent-ffmpeg";
import { VideoMetadata } from "../interfaces/interfaces";

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
