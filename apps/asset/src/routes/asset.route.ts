import { Router } from "express";
import { requireAuth } from "@repo/auth";
import { assetController } from "../controllers/asset.controller";
import {
  validate,
  validateQuery,
  validateAssetId,
} from "../middleware/validation.middleware";
import {
  addTagSchema,
  createShareLinkSchema,
  listAssetsSchema,
} from "../schemas/asset.schema";

const router = Router();
router.use(requireAuth);

// GET /api/assets — list with filters and pagination
router.get(
  "/",
  validateQuery(listAssetsSchema),
  assetController.listOfAssets.bind(assetController)
);

// GET /api/assets/stats (admin only access can be added later via requireAdmin)
router.get("/stats", assetController.getStats.bind(assetController));

// GET /api/assets/:id
router.get(
  "/:id",
  validateAssetId,
  assetController.getAssetbyID.bind(assetController)
);

// DELETE /api/assets/:id
router.delete(
  "/:id",
  validateAssetId,
  assetController.removeAsset.bind(assetController)
);

// GET /api/assets/:id/download?rendition=label
router.get(
  "/:id/download",
  validateAssetId,
  assetController.download.bind(assetController)
);

// GET /api/assets/:id/preview
router.get(
  "/:id/preview",
  validateAssetId,
  assetController.preview.bind(assetController)
);

// GET /api/assets/:id/thumbnail
router.get(
  "/:id/thumbnail",
  validateAssetId,
  assetController.thumbnail.bind(assetController)
);

// GET /api/assets/:id/renditions
router.get(
  "/:id/renditions",
  validateAssetId,
  assetController.renditions.bind(assetController)
);

// POST /api/assets/:id/tags
router.post(
  "/:id/tags",
  validateAssetId,
  validate(addTagSchema),
  assetController.addTag.bind(assetController)
);

// DELETE /api/assets/:id/tags/:tagId
router.delete(
  "/:id/tags/:tagId",
  validateAssetId,
  assetController.removeTag.bind(assetController)
);

// GET /api/assets/:id/status
router.get(
  "/:id/status",
  validateAssetId,
  assetController.status.bind(assetController)
);

// POST /api/assets/:id/share
router.post(
  "/:id/share",
  validateAssetId,
  validate(createShareLinkSchema),
  assetController.createShareLink.bind(assetController)
);

// DELETE /api/assets/:id/share/:linkId
router.delete(
  "/:id/share/:linkId",
  validateAssetId,
  assetController.revokeShareLink.bind(assetController)
);

export default router;
