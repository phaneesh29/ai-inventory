import { Request, Response } from "express";
import * as bomService from "./bom.service.js";
import { runBOMAgent } from "./bom.agent.js";
import { parseUploadedBOMFile } from "./bom.parser.js";
import { createWorkspace } from "../workspaces/workspace.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { BadRequestError, InternalServerError } from "../../utils/errors.js";
import type { CreateBOMInput, UpdateBOMInput, AddBOMItemsInput } from "./bom.schema.js";

export const uploadBOMFile = async (req: Request, res: Response): Promise<Response> => {
  if (!req.file) {
    throw new BadRequestError("File is required for upload");
  }

  let workspaceId = req.body.workspaceId;
  const fileNameWithoutExt = req.file.originalname.replace(/\.[^/.]+$/, "");
  const bomName = req.body.name || fileNameWithoutExt || "Uploaded BOM";
  const version = req.body.version || "v1.0";
  const instructions = req.body.instructions;

  if (!workspaceId) {
    const newWorkspace = await createWorkspace({
      name: `Workspace - ${bomName}`,
    });
    workspaceId = newWorkspace.id;
  }

  const parsed = await parseUploadedBOMFile(req.file);

  const rawContent = parsed.type === "structured" ? parsed.data : parsed.markdown;

  const agentResult = await runBOMAgent({
    workspaceId,
    name: bomName,
    version,
    rawContent,
    instructions,
  });

  if (!agentResult.bom) {
    throw new InternalServerError("BOM Agent failed to persist BOM to database");
  }

  return sendSuccess(
    res,
    {
      bom: agentResult.bom,
      agentSummary: agentResult.agentSummary,
    },
    "BOM file parsed, audited and persisted successfully",
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
