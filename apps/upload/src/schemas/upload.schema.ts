import { z } from "zod";

export const sessionIdSchema = z.object({
  id: z
    .string({ required_error: "Session ID is required" })
    .uuid("Session ID must be a valid UUID"),
});

export type SessionIdParams = z.infer<typeof sessionIdSchema>;
