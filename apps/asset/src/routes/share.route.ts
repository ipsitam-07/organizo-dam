import { Router } from "express";
import { shareController } from "../controllers/share.controller";

const router = Router();

// GET /api/share/:token  (public, no auth required)
router.get("/:token", shareController.resolve.bind(shareController));

export default router;
