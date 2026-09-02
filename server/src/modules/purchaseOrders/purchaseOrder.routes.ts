import { Router } from "express";
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  receivePurchaseOrderHandler,
} from "./purchaseOrder.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  PurchaseOrderQuerySchema,
  ReceivePurchaseOrderSchema,
} from "./purchaseOrder.schema.js";
import { z } from "zod";

const UUIDParamSchema = z.object({
  id: z.uuid({ error: "Invalid UUID format" }),
});

const router = Router();

router.get("/", validate({ query: PurchaseOrderQuerySchema }), getAllPurchaseOrders);
router.get("/:id", validate({ params: UUIDParamSchema }), getPurchaseOrderById);
router.post(
  "/:id/receive",
  validate({ params: UUIDParamSchema, body: ReceivePurchaseOrderSchema }),
  receivePurchaseOrderHandler
);

export default router;
