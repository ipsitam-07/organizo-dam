import { Response, NextFunction } from "express";
import { AuthRequest, ForbiddenError } from "@repo/auth";

export const requireAdmin = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== "admin") {
    next(new ForbiddenError("Admin access required"));
    return;
  }
  next();
};
