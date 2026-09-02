import { Router } from "express";
import {
  uploadBOMFile,
  createBOM,
  processBOMWithAgent,
  getBOMsByWorkspace,
  getBOMById,
  updateBOM,
  addItemsToBOM,
  removeItemFromBOM,
  deleteBOM,
} from "./bom.controller.js";
import { validate } from "../../middleware/validate.js";
import { upload } from "../../middleware/upload.js";
import {
  CreateBOMSchema,
  ProcessBOMWithAgentSchema,
  UpdateBOMSchema,
  AddBOMItemsSchema,
  BOMIdParamSchema,
  WorkspaceIdParamSchema,
  RemoveBOMItemParamSchema,
} from "./bom.schema.js";

const router = Router();

router.post("/upload", upload.single("file"), uploadBOMFile);
router.post("/", validate({ body: CreateBOMSchema }), createBOM);
router.post("/agent-process", validate({ body: ProcessBOMWithAgentSchema }), processBOMWithAgent);
router.get("/workspace/:workspaceId", validate({ params: WorkspaceIdParamSchema }), getBOMsByWorkspace);
router.get("/:id", validate({ params: BOMIdParamSchema }), getBOMById);
router.patch("/:id", validate({ params: BOMIdParamSchema, body: UpdateBOMSchema }), updateBOM);
router.post("/:id/items", validate({ params: BOMIdParamSchema, body: AddBOMItemsSchema }), addItemsToBOM);
router.delete("/:id/items/:itemId", validate({ params: RemoveBOMItemParamSchema }), removeItemFromBOM);
router.delete("/:id", validate({ params: BOMIdParamSchema }), deleteBOM);

export default router;
