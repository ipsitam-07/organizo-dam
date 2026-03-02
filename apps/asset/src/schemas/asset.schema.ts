import { z } from "zod";

export const listAssetsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["queued", "processing", "ready", "failed"]).optional(),
  mime_type: z.string().optional(),
  tag: z.string().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});

export const addTagSchema = z.object({
  name: z
    .string({ required_error: "Tag name is required" })
    .min(1)
    .max(64)
    .trim()
    .toLowerCase(),
});

export type ListAssetsInput = z.infer<typeof listAssetsSchema>;
export type AddTagInput = z.infer<typeof addTagSchema>;
