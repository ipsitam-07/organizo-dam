import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";

export class AuthController {
  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ message: "User registered successfully", user });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json({ message: "Login successful", ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
