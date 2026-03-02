import { Request, Response, NextFunction } from "express";
import { logger } from "@repo/logger";
import { AppError } from "@repo/auth";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.warn(
      `[${req.method}] ${req.path} - ${err.statusCode} - ${err.message}`
    );
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  // Unhandled/Unexpected Errors
  logger.error(`[${req.method}] ${req.path} - 500 - ${err.message}`, {
    stack: err.stack,
  });
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
