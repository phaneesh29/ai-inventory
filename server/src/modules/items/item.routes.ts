import { Router } from "express";
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} from "./item.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  CreateItemSchema,
  UpdateItemSchema,
  ItemQuerySchema,
  ItemIdParamSchema,
} from "./item.schema.js";

const router = Router();

router.get("/", validate({ query: ItemQuerySchema }), getItems);
router.get("/:id", validate({ params: ItemIdParamSchema }), getItemById);
router.post("/", validate({ body: CreateItemSchema }), createItem);
router.patch("/:id", validate({ params: ItemIdParamSchema, body: UpdateItemSchema }), updateItem);
router.delete("/:id", validate({ params: ItemIdParamSchema }), deleteItem);

export default router;
