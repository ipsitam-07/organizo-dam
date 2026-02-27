import { Router } from "express";
import { requireAuth } from "@repo/auth";
import { uploadController } from "../controllers/upload.controller";

const router = Router();

router.use(requireAuth);

router.get(
  "/sessions",
  uploadController.getUserSessions.bind(uploadController)
);
router.get(
  "/sessions/:id",
  uploadController.getSessionById.bind(uploadController)
);
router.post(
  "/sessions/:id/cancel",
  uploadController.cancelSession.bind(uploadController)
);

export default router;
