import { Router } from "express";
import { requireAuth } from "@repo/auth";
import { assetController } from "../controllers/asset.controller";
import { validate } from "../middleware/validation.middleware";
import { addTagSchema } from "../schemas/asset.schema";

const router = Router();
router.use(requireAuth);

// GET /api/assets — list with filters and pagination
router.get("/", assetController.listOfAssets.bind(assetController));

// GET /api/assets/:id
router.get("/:id", assetController.getAssetbyID.bind(assetController));

// DELETE /api/assets/:id
router.delete("/:id", assetController.removeAsset.bind(assetController));

// GET /api/assets/:id/download?rendition=label
router.get("/:id/download", assetController.download.bind(assetController));

// POST /api/assets/:id/tags
router.post(
  "/:id/tags",
  validate(addTagSchema),
  assetController.addTag.bind(assetController)
);

// DELETE /api/assets/:id/tags/:tagId
router.delete(
  "/:id/tags/:tagId",
  assetController.removeTag.bind(assetController)
);

export default Router;
