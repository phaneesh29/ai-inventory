import { db, purchaseOrdersTable, purchaseOrderItemsTable } from "../../../db/index.js";

export interface DraftPurchaseOrderItem {
  itemId: string;
  partNumber: string;
  name: string;
  supplierPartNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  volumeDiscountApplied: boolean;
  leadTimeDays: number;
}

export interface DraftPurchaseOrder {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  status: "PENDING_USER_APPROVAL";
  estimatedLeadTimeDays: number;
  totalAmount: number;
  currency: string;
  items: DraftPurchaseOrderItem[];
}

export interface CommittedPurchaseOrder {
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  status: string;
  totalAmount: number;
  currency: string;
  items: DraftPurchaseOrderItem[];
}

export const commitPurchaseOrdersToDB = async (
  draftOrders: DraftPurchaseOrder[]
): Promise<CommittedPurchaseOrder[]> => {
  const committed: CommittedPurchaseOrder[] = [];

  for (const order of draftOrders) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const poNumber = `PO-${order.supplierCode}-${Date.now().toString().slice(-4)}-${randomSuffix}`;

    const [createdPO] = await db
      .insert(purchaseOrdersTable)
      .values({
        poNumber,
        supplierId: order.supplierId,
        status: "APPROVED_AND_ISSUED",
        totalAmount: order.totalAmount,
        currency: order.currency,
        notes: "Approved and issued via Supply Chain Multi-Agent Pipeline",
      })
      .returning();

    const insertedLines: DraftPurchaseOrderItem[] = [];

    for (const item of order.items) {
      const [insertedItem] = await db
        .insert(purchaseOrderItemsTable)
        .values({
          purchaseOrderId: createdPO.id,
          itemId: item.itemId,
          supplierPartNumber: item.supplierPartNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })
        .returning();

      insertedLines.push({
        itemId: insertedItem.itemId,
        partNumber: item.partNumber,
        name: item.name,
        supplierPartNumber: insertedItem.supplierPartNumber,
        quantity: insertedItem.quantity,
        unitPrice: insertedItem.unitPrice,
        totalPrice: insertedItem.totalPrice,
        volumeDiscountApplied: item.volumeDiscountApplied,
        leadTimeDays: item.leadTimeDays,
      });
    }

    committed.push({
      poId: createdPO.id,
      poNumber: createdPO.poNumber,
      supplierId: createdPO.supplierId,
      supplierName: order.supplierName,
      supplierCode: order.supplierCode,
      status: createdPO.status,
      totalAmount: createdPO.totalAmount,
      currency: createdPO.currency,
      items: insertedLines,
    });
  }

  return committed;
};
