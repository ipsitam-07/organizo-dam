import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

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

    req.body = result.data;
    next();
  };

// Validates req.query and attaches the parsed result to req.validatedQuery.
export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

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

    (req as any).validatedQuery = result.data;
    next();
  };
