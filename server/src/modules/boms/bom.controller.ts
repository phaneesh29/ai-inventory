import { Request, Response } from "express";
import * as bomService from "./bom.service.js";
import { runBOMUploadAndAuditWorkflow } from "../agents/bomWorkflow.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { BadRequestError } from "../../utils/errors.js";
import type {
  CreateBOMInput,
  UpdateBOMInput,
  AddBOMItemsInput,
} from "./bom.schema.js";

export const uploadBOMFile = async (req: Request, res: Response): Promise<Response> => {
  if (!req.file) {
    throw new BadRequestError("File is required for upload");
  }

  const workspaceId = req.body.workspaceId;
  if (!workspaceId) {
    throw new BadRequestError("workspaceId is required for upload");
  }

  const batchQuantity = req.body.batchQuantity ? Number(req.body.batchQuantity) : 1;

  const result = await runBOMUploadAndAuditWorkflow({
    file: req.file,
    workspaceId,
    name: req.body.name,
    version: req.body.version,
    instructions: req.body.instructions,
    batchQuantity,
  });

  return sendSuccess(
    res,
    result,
    "BOM file uploaded, audited, and process execution plan formulated",
    201
  );
};

export const createBOM = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as CreateBOMInput;
  const result = await bomService.createBOM(body);
  return sendSuccess(res, result, "BOM created successfully", 201);
};

export const getBOMsByWorkspace = async (req: Request, res: Response): Promise<Response> => {
  const { workspaceId } = req.params as { workspaceId: string };
  const result = await bomService.findBOMsByWorkspaceId(workspaceId);
  return sendSuccess(res, result, "Workspace BOMs retrieved successfully");
};

export const getBOMById = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const result = await bomService.findBOMById(id);
  return sendSuccess(res, result, "BOM retrieved successfully");
};

export const updateBOM = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateBOMInput;
  const result = await bomService.updateBOM(id, body);
  return sendSuccess(res, result, "BOM updated successfully");
};

export const addItemsToBOM = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const body = req.body as AddBOMItemsInput;
  const result = await bomService.addItemsToBOM(id, body);
  return sendSuccess(res, result, "Items added to BOM successfully");
};

export const removeItemFromBOM = async (req: Request, res: Response): Promise<Response> => {
  const { id, itemId } = req.params as { id: string; itemId: string };
  const result = await bomService.removeItemFromBOM(id, itemId);
  return sendSuccess(res, result, "Item removed from BOM successfully");
};

export const deleteBOM = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const result = await bomService.deleteBOM(id);
  return sendSuccess(res, result, "BOM deleted successfully");
};
