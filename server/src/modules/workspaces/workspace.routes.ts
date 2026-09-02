import { Router } from "express";
import {
  getAllWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from "./workspace.controller.js";
import { validate } from "../../middleware/validate.js";
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  WorkspaceIdParamSchema,
  ListWorkspacesQuerySchema,
} from "./workspace.schema.js";

const router = Router();

router.get("/", validate({ query: ListWorkspacesQuerySchema }), getAllWorkspaces);

router.post("/", validate({ body: CreateWorkspaceSchema }), createWorkspace);

router.get("/:id", validate({ params: WorkspaceIdParamSchema }), getWorkspaceById);

router.patch("/:id", validate({ params: WorkspaceIdParamSchema, body: UpdateWorkspaceSchema }), updateWorkspace);

router.delete("/:id", validate({ params: WorkspaceIdParamSchema }), deleteWorkspace);

export default router;
