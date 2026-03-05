import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "@repo/auth";
import { validate } from "../middleware/validation.middleware";
import { registerSchema, loginSchema } from "../schemas/auth.schema";
import { authLimiter, apiLimiter } from "@repo/rate-limit";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register.bind(authController)
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  authController.login.bind(authController)
);

router.get(
  "/me",
  apiLimiter,
  requireAuth,
  authController.getMe.bind(authController)
);

router.post(
  "/logout",
  apiLimiter,
  requireAuth,
  authController.logout.bind(authController)
);

export default router;
