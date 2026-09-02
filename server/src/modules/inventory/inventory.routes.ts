import { Router } from "express";
import {
  getInventory,
  getLowStockAlerts,
  getInventoryById,
  addInventory,
  adjustStockHandler,
  allocateStockHandler,
  releaseStockHandler,
  updateInventory,
  deleteInventory,
} from "./inventory.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  AddInventoryItemSchema,
  UpdateInventoryItemSchema,
  AdjustStockSchema,
  AllocateStockSchema,
  ReleaseStockSchema,
  InventoryQuerySchema,
  InventoryIdParamSchema,
} from "./inventory.schema.js";

const router = Router();

router.get("/alerts", getLowStockAlerts);
router.post("/adjust", validate({ body: AdjustStockSchema }), adjustStockHandler);
router.post("/allocate", validate({ body: AllocateStockSchema }), allocateStockHandler);
router.post("/release", validate({ body: ReleaseStockSchema }), releaseStockHandler);

router.get("/", validate({ query: InventoryQuerySchema }), getInventory);
router.post("/", validate({ body: AddInventoryItemSchema }), addInventory);
router.get("/:id", validate({ params: InventoryIdParamSchema }), getInventoryById);
router.patch("/:id", validate({ params: InventoryIdParamSchema, body: UpdateInventoryItemSchema }), updateInventory);
router.delete("/:id", validate({ params: InventoryIdParamSchema }), deleteInventory);

export default router;
