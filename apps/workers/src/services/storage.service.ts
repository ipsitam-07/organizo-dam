import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { config } from "@repo/config";
import { logger } from "@repo/logger";

const s3 = new S3Client({
  endpoint: `http://${config.minio.endpoint}`,
  region: "us-east-1",
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey!,
  },
  forcePathStyle: true,
});

export const buckets = config.minio.buckets;

export async function copyToAssets(
  sourceKey: string,
  destKey: string
): Promise<void> {
  await s3.send(
    new CopyObjectCommand({
      CopySource: `${buckets.chunks}/${sourceKey}`,
      Bucket: buckets.assets,
      Key: destKey,
    })
  );
  logger.info(`[Storage] Copied chunks/"${sourceKey}" assets/"${destKey}"`);
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  logger.info(`[Storage] Deleted "${key}" from "${bucket}"`);
}

export async function getObjectBuffer(
  bucket: string,
  key: string
): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = res.Body as Readable;
  return new Promise((resolve, reject) => {
    const parts: Buffer[] = [];
    stream.on("data", (c: Buffer) => parts.push(Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(parts)));
    stream.on("error", reject);
  });
}

export async function putObject(
  bucket: string,
  key: string,
  body: Buffer | Readable,
  contentType: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  logger.info(`[Storage] Uploaded "${key}" to "${bucket}"`);
}

export async function getObjectSize(
  bucket: string,
  key: string
): Promise<number> {
  const res = await s3.send(
    new HeadObjectCommand({ Bucket: bucket, Key: key })
  );
  return res.ContentLength ?? 0;
}
