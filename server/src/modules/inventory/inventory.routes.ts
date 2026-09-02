import { Router } from "express";
import {
  getInventory,
  getInventoryById,
  addInventory,
  updateInventory,
  deleteInventory,
} from "./inventory.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  AddInventoryItemSchema,
  UpdateInventoryItemSchema,
  InventoryQuerySchema,
  InventoryIdParamSchema,
} from "./inventory.schema.js";

const router = Router();

router.get("/", validate({ query: InventoryQuerySchema }), getInventory);
router.get("/:id", validate({ params: InventoryIdParamSchema }), getInventoryById);
router.post("/", validate({ body: AddInventoryItemSchema }), addInventory);
router.patch("/:id", validate({ params: InventoryIdParamSchema, body: UpdateInventoryItemSchema }), updateInventory);
router.delete("/:id", validate({ params: InventoryIdParamSchema }), deleteInventory);

export default router;
