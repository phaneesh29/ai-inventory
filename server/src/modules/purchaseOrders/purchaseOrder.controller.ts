import { Request, Response } from "express";
import {
  findAllPurchaseOrders,
  findPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
  deletePurchaseOrder,
} from "./purchaseOrder.service.js";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse.js";
import type {
  PurchaseOrderQueryInput,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderStatusInput,
  ReceivePurchaseOrderInput,
} from "./purchaseOrder.schema.js";

export const getAllPurchaseOrders = async (req: Request, res: Response): Promise<Response> => {
  const query = req.query as unknown as PurchaseOrderQueryInput;
  const result = await findAllPurchaseOrders(query);

  return sendPaginated(
    res,
    result.purchaseOrders,
    result.total,
    query.limit,
    query.offset,
    "Purchase orders retrieved successfully"
  );
};

export const getPurchaseOrderById = async (req: Request, res: Response): Promise<Response> => {
  const id = req.params.id as string;
  const po = await findPurchaseOrderById(id);

  return sendSuccess(res, po, "Purchase order retrieved successfully");
};

export const createPurchaseOrderHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const body = req.body as CreatePurchaseOrderInput;
  const created = await createPurchaseOrder(body);

  return sendSuccess(res, created, `Purchase order ${created.poNumber} created successfully`, 201);
};

export const updatePurchaseOrderStatusHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const id = req.params.id as string;
  const body = req.body as UpdatePurchaseOrderStatusInput;
  const updated = await updatePurchaseOrderStatus(id, body);

  return sendSuccess(res, updated, `Purchase order ${updated.poNumber} status updated to ${updated.status}`);
};

export const receivePurchaseOrderHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const id = req.params.id as string;
  const body = req.body as ReceivePurchaseOrderInput;

  const result = await receivePurchaseOrder(id, body);

  return sendSuccess(
    res,
    result,
    `Purchase order ${result.purchaseOrder.poNumber} received successfully into warehouse inventory`
  );
};

export const deletePurchaseOrderHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const id = req.params.id as string;
  await deletePurchaseOrder(id);

  return sendSuccess(res, null, "Purchase order deleted successfully");
};
