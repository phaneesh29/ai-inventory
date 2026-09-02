import { Request, Response } from "express";
import * as inventoryService from "./inventory.service.js";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse.js";
import type { AddInventoryItemInput, UpdateInventoryItemInput, InventoryQueryInput } from "./inventory.schema.js";

export const getInventory = async (req: Request, res: Response): Promise<Response> => {
  const query = req.query as unknown as InventoryQueryInput;
  const result = await inventoryService.findAllInventory(query);
  return sendPaginated(
    res,
    result.items,
    result.total,
    query.limit,
    query.offset,
    "Inventory items retrieved successfully"
  );
};

export const getInventoryById = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const result = await inventoryService.findInventoryById(id);
  return sendSuccess(res, result, "Inventory record retrieved successfully");
};

export const addInventory = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as AddInventoryItemInput;
  const result = await inventoryService.addInventoryItem(body);
  return sendSuccess(res, result, "Item stocked into inventory successfully", 201);
};

export const updateInventory = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateInventoryItemInput;
  const result = await inventoryService.updateInventoryItem(id, body);
  return sendSuccess(res, result, "Inventory record updated successfully");
};

export const deleteInventory = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const result = await inventoryService.deleteInventoryItem(id);
  return sendSuccess(res, result, "Item removed from inventory successfully");
};
