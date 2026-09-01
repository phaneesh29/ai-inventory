import { Router } from "express";
import healthRoutes from "./health/health.routes.js";
import workspaceRoutes from "./workspaces/workspace.routes.js";

const v1Router = Router();

v1Router.use("/health", healthRoutes);
v1Router.use("/workspaces", workspaceRoutes);

export default v1Router;
