import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "@repo/config";
import { UnauthorizedError } from "../utils/error";
import { redisClient } from "../services/redis";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError(
        "Authentication token is missing or incorrectly formatted"
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret as string) as {
      id: string;
      email: string;
      role: string;
    };
    const redisKey = `session:${decoded.id}`;
    const activeToken = await redisClient.get(redisKey);

    if (!activeToken || activeToken !== token) {
      throw new UnauthorizedError(
        "Session expired or invalidated. Please log in again."
      );
    }
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid or expired token"));
    } else {
      next(error);
    }
  }
};
