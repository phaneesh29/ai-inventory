import { Request, Response } from "express";
import {
  findAllPurchaseOrders,
  findPurchaseOrderById,
  receivePurchaseOrder,
} from "./purchaseOrder.service.js";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse.js";
import type {
  PurchaseOrderQueryInput,
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
