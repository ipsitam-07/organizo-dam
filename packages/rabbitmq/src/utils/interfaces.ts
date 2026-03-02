import amqp from "amqplib";
export interface UploadCompletePayload {
  assetId: string;
  uploadSessionId: string;
  userId: string;
  storageKey: string;
}

export interface JobCompletedPayload {
  assetId: string;
  jobId: string;
  jobType: string;
  renditionId?: string;
  status: "completed" | "failed";
  errorMessage?: string;
}

export type MessageHandler = (
  payload: any,
  msg: amqp.ConsumeMessage
) => Promise<void>;
