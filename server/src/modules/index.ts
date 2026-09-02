import { Router } from "express";
import healthRoutes from "./health/health.routes.js";
import workspaceRoutes from "./workspaces/workspace.routes.js";
import bomRoutes from "./boms/bom.routes.js";

const v1Router = Router();

v1Router.use("/health", healthRoutes);
v1Router.use("/workspaces", workspaceRoutes);
v1Router.use("/boms", bomRoutes);

export default v1Router;
