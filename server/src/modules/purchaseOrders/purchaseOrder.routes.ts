import { Router } from "express";
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrderHandler,
  updatePurchaseOrderStatusHandler,
  receivePurchaseOrderHandler,
  deletePurchaseOrderHandler,
} from "./purchaseOrder.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  PurchaseOrderQuerySchema,
  CreatePurchaseOrderSchema,
  UpdatePurchaseOrderStatusSchema,
  ReceivePurchaseOrderSchema,
} from "./purchaseOrder.schema.js";
import { z } from "zod";

const UUIDParamSchema = z.object({
  id: z.uuid({ error: "Invalid UUID format" }),
});

const router = Router();

router.get("/", validate({ query: PurchaseOrderQuerySchema }), getAllPurchaseOrders);
router.post("/", validate({ body: CreatePurchaseOrderSchema }), createPurchaseOrderHandler);
router.get("/:id", validate({ params: UUIDParamSchema }), getPurchaseOrderById);
router.patch(
  "/:id/status",
  validate({ params: UUIDParamSchema, body: UpdatePurchaseOrderStatusSchema }),
  updatePurchaseOrderStatusHandler
);
router.post(
  "/:id/receive",
  validate({ params: UUIDParamSchema, body: ReceivePurchaseOrderSchema }),
  receivePurchaseOrderHandler
);
router.delete("/:id", validate({ params: UUIDParamSchema }), deletePurchaseOrderHandler);

export default router;
