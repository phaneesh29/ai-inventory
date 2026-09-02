import { Router } from "express";
import { getSupplyChainInsights } from "./insights.controller.js";

const router = Router();

router.get("/", getSupplyChainInsights);

export default router;
