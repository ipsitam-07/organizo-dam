import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate =
  (schema: ZodSchema, source: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      res
        .status(422)
        .json({ status: "error", message: "Validation failed", errors });
      return;
    }

    req[source] = result.data;
    next();
  };
