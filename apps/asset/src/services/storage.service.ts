import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "@repo/config";
import { logger } from "@repo/logger";
import { DEFAULT_EXPIRY_SECONDS } from "../utils/constants";

const s3 = new S3Client({
  endpoint: `http://${config.minio.endpoint}`,
  region: "us-east-1",
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey!,
  },
  forcePathStyle: true,
});

export async function getPresignedUrl(
  bucket: string,
  key: string,
  expirySeconds = DEFAULT_EXPIRY_SECONDS
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: expirySeconds });
  logger.info(`[Storage] Generated presigned URL for key="${key}"`);
  return url;
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  logger.info(`[Storage] Deleted object key="${key}" from bucket="${bucket}"`);
}

export async function objectExists(
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
