import { Router } from "express";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierItems,
  addSupplierItem,
  updateSupplierItem,
  deleteSupplierItem,
  getSuppliersByItem,
} from "./supplier.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  CreateSupplierSchema,
  UpdateSupplierSchema,
  SupplierQuerySchema,
  SupplierIdParamSchema,
  AddSupplierItemSchema,
  UpdateSupplierItemSchema,
  SupplierItemIdParamSchema,
  ItemParamSchema,
} from "./supplier.schema.js";

const router = Router();

router.get("/", validate({ query: SupplierQuerySchema }), getSuppliers);
router.get("/items/:itemId", validate({ params: ItemParamSchema }), getSuppliersByItem);
router.get("/:id", validate({ params: SupplierIdParamSchema }), getSupplierById);
router.post("/", validate({ body: CreateSupplierSchema }), createSupplier);
router.patch("/:id", validate({ params: SupplierIdParamSchema, body: UpdateSupplierSchema }), updateSupplier);
router.delete("/:id", validate({ params: SupplierIdParamSchema }), deleteSupplier);

router.get("/:id/items", validate({ params: SupplierIdParamSchema }), getSupplierItems);
router.post("/:id/items", validate({ params: SupplierIdParamSchema, body: AddSupplierItemSchema }), addSupplierItem);
router.patch(
  "/:id/items/:itemId",
  validate({ params: SupplierItemIdParamSchema, body: UpdateSupplierItemSchema }),
  updateSupplierItem
);
router.delete(
  "/:id/items/:itemId",
  validate({ params: SupplierItemIdParamSchema }),
  deleteSupplierItem
);

export default router;
