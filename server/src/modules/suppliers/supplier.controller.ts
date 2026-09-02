import { Request, Response } from "express";
import * as supplierService from "./supplier.service.js";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse.js";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierQueryInput,
  AddSupplierItemInput,
  UpdateSupplierItemInput,
} from "./supplier.schema.js";

export const getSuppliers = async (req: Request, res: Response): Promise<Response> => {
  const query = req.query as unknown as SupplierQueryInput;
  const result = await supplierService.findAllSuppliers(query);
  return sendPaginated(
    res,
    result.suppliers,
    result.total,
    query.limit,
    query.offset,
    "Suppliers retrieved successfully"
  );
};

export const getSupplierById = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const result = await supplierService.findSupplierById(id);
  return sendSuccess(res, result, "Supplier details retrieved successfully");
};

export const createSupplier = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as CreateSupplierInput;
  const result = await supplierService.createSupplier(body);
  return sendSuccess(res, result, "Supplier created successfully", 201);
};

export const updateSupplier = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateSupplierInput;
  const result = await supplierService.updateSupplier(id, body);
  return sendSuccess(res, result, "Supplier updated successfully");
};

export const deleteSupplier = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const result = await supplierService.deleteSupplier(id);
  return sendSuccess(res, result, "Supplier deleted successfully");
};

export const getSupplierItems = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const result = await supplierService.findSupplierItems(id);
  return sendSuccess(res, result, "Supplier catalog items retrieved successfully");
};

export const addSupplierItem = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params as { id: string };
  const body = req.body as AddSupplierItemInput;
  const result = await supplierService.addSupplierItem(id, body);
  return sendSuccess(res, result, "Item added to supplier catalog successfully", 201);
};

export const updateSupplierItem = async (req: Request, res: Response): Promise<Response> => {
  const { id, itemId } = req.params as { id: string; itemId: string };
  const body = req.body as UpdateSupplierItemInput;
  const result = await supplierService.updateSupplierItem(id, itemId, body);
  return sendSuccess(res, result, "Supplier item catalog details updated successfully");
};

export const deleteSupplierItem = async (req: Request, res: Response): Promise<Response> => {
  const { id, itemId } = req.params as { id: string; itemId: string };
  const result = await supplierService.deleteSupplierItem(id, itemId);
  return sendSuccess(res, result, "Item removed from supplier catalog successfully");
};

export const getSuppliersByItem = async (req: Request, res: Response): Promise<Response> => {
  const { itemId } = req.params as { itemId: string };
  const result = await supplierService.findSuppliersByItem(itemId);
  return sendSuccess(res, result, "Suppliers offering item retrieved successfully");
};
