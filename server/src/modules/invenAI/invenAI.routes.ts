import { Router } from "express";
import { chatWithInvenAI } from "./invenAI.controller.js";
import { validate } from "../../middleware/validate.js";
import { InvenAIChatSchema } from "./invenAI.schema.js";

const router = Router();

router.post("/chat", validate({ body: InvenAIChatSchema }), chatWithInvenAI);

export default router;
