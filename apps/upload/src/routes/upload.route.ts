import { Router } from "express";
import { requireAuth } from "@repo/auth";
import { uploadController } from "../controllers/upload.controller";
import { sessionIdSchema } from "../schemas/upload.schema";
import { validate } from "../middleware/validation.middleware";

const router = Router();

router.use(requireAuth);

router.get(
  "/sessions",
  uploadController.getUserSessions.bind(uploadController)
);
router.get(
  "/sessions/:id",
  validate(sessionIdSchema, "params"),
  uploadController.getSessionById.bind(uploadController)
);
router.post(
  "/sessions/:id/cancel",
  validate(sessionIdSchema, "params"),
  uploadController.cancelSession.bind(uploadController)
);

export default router;
