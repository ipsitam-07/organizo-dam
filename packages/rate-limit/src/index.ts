import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { Request, Response } from "express";
import { logger } from "@repo/logger";

const handler = (
  req: Request,
  res: Response,
  _next: any,
  options: any
): void => {
  logger.warn(
    `[RateLimit] ${req.ip} exceeded limit on ${req.method} ${req.path}`
  );
  res.status(429).json({
    status: "error",
    message: options.message,
    retryAfter: Math.ceil(options.windowMs / 1000 / 60), // minutes
  });
};

const skipInTest = () => process.env.NODE_ENV === "test";

export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many auth attempts. Please try again in 15 minutes.",
  handler,
  skip: skipInTest,
});

export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests. Please try later.",
  handler,
  skip: skipInTest,
});

export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many upload requests. Please try later.",
  handler,
  skip: skipInTest,
});

export const shareLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many share link requests. Please try later.",
  handler,
  skip: skipInTest,
});
