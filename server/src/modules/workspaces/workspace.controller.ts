import { Request, Response } from "express";
import * as workspaceService from "./workspace.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import type { CreateWorkspaceInput, UpdateWorkspaceInput, ListWorkspacesQuery } from "./workspace.schema.js";

export const getAllWorkspaces = async (req: Request, res: Response): Promise<Response> => {
  const query = req.query as unknown as ListWorkspacesQuery;
  const result = await workspaceService.findAllWorkspaces(query);
  return sendSuccess(res, result, "Workspaces retrieved successfully");
};

export const getWorkspaceById = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const workspace = await workspaceService.findWorkspaceById(id);
  return sendSuccess(res, workspace, "Workspace retrieved successfully");
};

export const createWorkspace = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as CreateWorkspaceInput;
  const workspace = await workspaceService.createWorkspace(body);
  return sendSuccess(res, workspace, "Workspace created successfully", 201);
};

export const updateWorkspace = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateWorkspaceInput;
  const workspace = await workspaceService.updateWorkspace(id, body);
  return sendSuccess(res, workspace, "Workspace updated successfully");
};

export const deleteWorkspace = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const result = await workspaceService.deleteWorkspace(id);
  return sendSuccess(res, result, "Workspace deleted successfully");
};
