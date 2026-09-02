import { Router } from "express";
import healthRoutes from "./health/health.routes.js";
import workspaceRoutes from "./workspaces/workspace.routes.js";
import bomRoutes from "./boms/bom.routes.js";
import inventoryRoutes from "./inventory/inventory.routes.js";
import itemRoutes from "./items/item.routes.js";
import supplierRoutes from "./suppliers/supplier.routes.js";
import invenAIRoutes from "./invenAI/invenAI.routes.js";
import insightsRoutes from "./insights/insights.routes.js";

const v1Router = Router();

v1Router.use("/health", healthRoutes);
v1Router.use("/workspaces", workspaceRoutes);
v1Router.use("/items", itemRoutes);
v1Router.use("/boms", bomRoutes);
v1Router.use("/inventory", inventoryRoutes);
v1Router.use("/suppliers", supplierRoutes);
v1Router.use("/inven-ai", invenAIRoutes);
v1Router.use("/insights", insightsRoutes);

export default v1Router;
