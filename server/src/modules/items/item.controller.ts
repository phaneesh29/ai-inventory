import { Request, Response } from "express";
import * as itemService from "./item.service.js";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse.js";
import type {
  CreateItemInput,
  UpdateItemInput,
  ItemQueryInput,
} from "./item.schema.js";

export const getItems = async (req: Request, res: Response): Promise<Response> => {
  const query = req.query as unknown as ItemQueryInput;
  const result = await itemService.findAllItems(query);
  return sendPaginated(
    res,
    result.items,
    result.total,
    query.limit,
    query.offset,
    "Items retrieved successfully"
  );
};

export const getItemById = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const result = await itemService.findItemById(id);
  return sendSuccess(res, result, "Item retrieved successfully");
};

export const createItem = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as CreateItemInput;
  const result = await itemService.createItem(body);
  return sendSuccess(res, result, "Item created successfully", 201);
};

export const updateItem = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateItemInput;
  const result = await itemService.updateItem(id, body);
  return sendSuccess(res, result, "Item updated successfully");
};

export const deleteItem = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const result = await itemService.deleteItem(id);
  return sendSuccess(res, result, "Item deleted successfully");
};
