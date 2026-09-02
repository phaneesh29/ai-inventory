import { Request, Response } from "express";
import {
  findAllInventory,
  findInventoryById,
  findLowStockAlerts,
  addInventoryItem,
  updateInventoryItem,
  adjustStock,
  allocateStock,
  releaseStock,
  deleteInventoryItem,
} from "./inventory.service.js";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse.js";
import type {
  InventoryQueryInput,
  AddInventoryItemInput,
  UpdateInventoryItemInput,
  AdjustStockInput,
  AllocateStockInput,
  ReleaseStockInput,
} from "./inventory.schema.js";

export const getInventory = async (req: Request, res: Response): Promise<Response> => {
  const query = req.query as unknown as InventoryQueryInput;
  const result = await findAllInventory(query);

  return sendPaginated(
    res,
    result.items,
    result.total,
    query.limit,
    query.offset,
    "Inventory retrieved successfully"
  );
};

export const getLowStockAlerts = async (req: Request, res: Response): Promise<Response> => {
  const result = await findLowStockAlerts();
  return sendSuccess(res, result, "Low stock alerts retrieved successfully");
};

export const getInventoryById = async (req: Request, res: Response): Promise<Response> => {
  const id = req.params.id as string;
  const item = await findInventoryById(id);

  return sendSuccess(res, item, "Inventory item retrieved successfully");
};

export const addInventory = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as AddInventoryItemInput;
  const item = await addInventoryItem(body);

  return sendSuccess(res, item, "Inventory item added successfully", 201);
};

export const adjustStockHandler = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as AdjustStockInput;
  const item = await adjustStock(body);

  return sendSuccess(res, item, `Stock adjusted successfully. New on hand: ${item.quantityOnHand}`);
};

export const allocateStockHandler = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as AllocateStockInput;
  const item = await allocateStock(body);

  return sendSuccess(
    res,
    item,
    `Stock allocated successfully. Reserved: ${item.quantityReserved}, Available: ${item.quantityAvailable}`
  );
};

export const releaseStockHandler = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as ReleaseStockInput;
  const item = await releaseStock(body);

  return sendSuccess(
    res,
    item,
    `Stock released successfully. Reserved: ${item.quantityReserved}, Available: ${item.quantityAvailable}`
  );
};

export const updateInventory = async (req: Request, res: Response): Promise<Response> => {
  const id = req.params.id as string;
  const body = req.body as UpdateInventoryItemInput;
  const item = await updateInventoryItem(id, body);

  return sendSuccess(res, item, "Inventory item updated successfully");
};

export const deleteInventory = async (req: Request, res: Response): Promise<Response> => {
  const id = req.params.id as string;
  await deleteInventoryItem(id);

  return sendSuccess(res, null, "Inventory record deleted successfully");
};
