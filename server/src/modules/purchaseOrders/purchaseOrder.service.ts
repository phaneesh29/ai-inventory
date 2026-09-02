import { eq, and, sql, desc } from "drizzle-orm";
import {
  db,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  suppliersTable,
  itemsTable,
  inventoryTable,
} from "../../db/index.js";
import { NotFoundError, BadRequestError } from "../../utils/errors.js";
import type {
  PurchaseOrderQueryInput,
  ReceivePurchaseOrderInput,
} from "./purchaseOrder.schema.js";

export interface EnrichedPurchaseOrderItem {
  id: string;
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  supplierPartNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface EnrichedPurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  supplierReliabilityScore: number;
  status: string;
  totalAmount: number;
  currency: string;
  notes: string | null;
  items: EnrichedPurchaseOrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceivePurchaseOrderResult {
  purchaseOrder: EnrichedPurchaseOrder;
  deliveryTimeliness: {
    status: "EARLY" | "ON_TIME" | "LATE";
    daysDifference: number;
    expectedArrivalDate: string;
    actualArrivalDate: string;
  };
  supplierScoreAdjustment: {
    supplierName: string;
    supplierCode: string;
    previousScore: number;
    newScore: number;
    scoreDelta: number;
    reason: string;
  };
  inventoryStockUpdates: {
    itemId: string;
    partNumber: string;
    quantityAdded: number;
    newQuantityOnHand: number;
    location: string;
  }[];
}

export const findAllPurchaseOrders = async (
  query: PurchaseOrderQueryInput
): Promise<{ purchaseOrders: EnrichedPurchaseOrder[]; total: number }> => {
  const conditions = [];

  if (query.status) {
    conditions.push(eq(purchaseOrdersTable.status, query.status));
  }
  if (query.supplierId) {
    conditions.push(eq(purchaseOrdersTable.supplierId, query.supplierId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalCountResult] = await db
    .select({ count: sql`count(*)::int` })
    .from(purchaseOrdersTable)
    .where(whereClause);

  const poRows = await db
    .select({
      po: purchaseOrdersTable,
      supplier: suppliersTable,
    })
    .from(purchaseOrdersTable)
    .innerJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
    .where(whereClause)
    .orderBy(desc(purchaseOrdersTable.createdAt))
    .limit(query.limit)
    .offset(query.offset);

  const result: EnrichedPurchaseOrder[] = [];

  for (const row of poRows) {
    const itemRows = await db
      .select({
        poItem: purchaseOrderItemsTable,
        item: itemsTable,
      })
      .from(purchaseOrderItemsTable)
      .innerJoin(itemsTable, eq(purchaseOrderItemsTable.itemId, itemsTable.id))
      .where(eq(purchaseOrderItemsTable.purchaseOrderId, row.po.id));

    result.push({
      id: row.po.id,
      poNumber: row.po.poNumber,
      supplierId: row.supplier.id,
      supplierName: row.supplier.name,
      supplierCode: row.supplier.code,
      supplierReliabilityScore: row.supplier.reliabilityScore,
      status: row.po.status,
      totalAmount: row.po.totalAmount,
      currency: row.po.currency,
      notes: row.po.notes,
      createdAt: row.po.createdAt,
      updatedAt: row.po.updatedAt,
      items: itemRows.map((ir) => ({
        id: ir.poItem.id,
        itemId: ir.item.id,
        partNumber: ir.item.partNumber,
        name: ir.item.name,
        category: ir.item.category,
        supplierPartNumber: ir.poItem.supplierPartNumber,
        quantity: ir.poItem.quantity,
        unitPrice: ir.poItem.unitPrice,
        totalPrice: ir.poItem.totalPrice,
      })),
    });
  }

  return {
    purchaseOrders: result,
    total: Number(totalCountResult?.count || 0),
  };
};

export const findPurchaseOrderById = async (id: string): Promise<EnrichedPurchaseOrder> => {
  const [poRow] = await db
    .select({
      po: purchaseOrdersTable,
      supplier: suppliersTable,
    })
    .from(purchaseOrdersTable)
    .innerJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
    .where(eq(purchaseOrdersTable.id, id));

  if (!poRow) {
    throw new NotFoundError(`Purchase order with ID '${id}' not found`);
  }

  const itemRows = await db
    .select({
      poItem: purchaseOrderItemsTable,
      item: itemsTable,
    })
    .from(purchaseOrderItemsTable)
    .innerJoin(itemsTable, eq(purchaseOrderItemsTable.itemId, itemsTable.id))
    .where(eq(purchaseOrderItemsTable.purchaseOrderId, poRow.po.id));

  return {
    id: poRow.po.id,
    poNumber: poRow.po.poNumber,
    supplierId: poRow.supplier.id,
    supplierName: poRow.supplier.name,
    supplierCode: poRow.supplier.code,
    supplierReliabilityScore: poRow.supplier.reliabilityScore,
    status: poRow.po.status,
    totalAmount: poRow.po.totalAmount,
    currency: poRow.po.currency,
    notes: poRow.po.notes,
    createdAt: poRow.po.createdAt,
    updatedAt: poRow.po.updatedAt,
    items: itemRows.map((ir) => ({
      id: ir.poItem.id,
      itemId: ir.item.id,
      partNumber: ir.item.partNumber,
      name: ir.item.name,
      category: ir.item.category,
      supplierPartNumber: ir.poItem.supplierPartNumber,
      quantity: ir.poItem.quantity,
      unitPrice: ir.poItem.unitPrice,
      totalPrice: ir.poItem.totalPrice,
    })),
  };
};

export const receivePurchaseOrder = async (
  id: string,
  input: ReceivePurchaseOrderInput
): Promise<ReceivePurchaseOrderResult> => {
  const po = await findPurchaseOrderById(id);

  if (po.status === "DELIVERED") {
    throw new BadRequestError(`Purchase order ${po.poNumber} has already been marked as DELIVERED`);
  }

  const [supplier] = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, po.supplierId));

  if (!supplier) {
    throw new NotFoundError(`Supplier with ID '${po.supplierId}' not found`);
  }

  const leadTimeDays = supplier.leadTimeDaysAverage || 3.0;
  const createdDate = new Date(po.createdAt);
  const expectedArrival = new Date(
    createdDate.getTime() + leadTimeDays * 24 * 60 * 60 * 1000
  );
  const actualArrival = input.deliveryDate ? new Date(input.deliveryDate) : new Date();

  const diffMs = actualArrival.getTime() - expectedArrival.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let timelinessStatus: "EARLY" | "ON_TIME" | "LATE" = "ON_TIME";
  let scoreDelta = 0;
  let scoreReason = "";

  if (diffDays < 0) {
    timelinessStatus = "EARLY";
    scoreDelta = 1.0;
    scoreReason = `Order delivered ${Math.abs(diffDays)} day(s) early. Reliability rewarded.`;
  } else if (diffDays === 0) {
    timelinessStatus = "ON_TIME";
    scoreDelta = 0.5;
    scoreReason = `Order delivered exactly on time. Reliability rewarded.`;
  } else {
    timelinessStatus = "LATE";
    scoreDelta = -Math.min(20.0, Number((diffDays * 2.0).toFixed(1)));
    scoreReason = `Order delivered ${diffDays} day(s) late. Reliability score penalized.`;
  }

  const previousScore = supplier.reliabilityScore;
  const newScore = Math.max(
    40.0,
    Math.min(100.0, Number((previousScore + scoreDelta).toFixed(1)))
  );

  await db
    .update(suppliersTable)
    .set({
      reliabilityScore: newScore,
      updatedAt: new Date(),
    })
    .where(eq(suppliersTable.id, supplier.id));

  const stockUpdates = [];

  for (const poItem of po.items) {
    const [existingInv] = await db
      .select()
      .from(inventoryTable)
      .where(eq(inventoryTable.itemId, poItem.itemId));

    let updatedOnHand = poItem.quantity;
    const targetLocation = input.location || existingInv?.location || "Main Warehouse";

    if (existingInv) {
      const [updated] = await db
        .update(inventoryTable)
        .set({
          quantityOnHand: sql`${inventoryTable.quantityOnHand} + ${poItem.quantity}`,
          unitCost: poItem.unitPrice,
          updatedAt: new Date(),
        })
        .where(eq(inventoryTable.id, existingInv.id))
        .returning();

      updatedOnHand = updated.quantityOnHand;
    } else {
      const [inserted] = await db
        .insert(inventoryTable)
        .values({
          itemId: poItem.itemId,
          quantityOnHand: poItem.quantity,
          quantityReserved: 0,
          reorderThreshold: 10,
          location: targetLocation,
          unitCost: poItem.unitPrice,
        })
        .returning();

      updatedOnHand = inserted.quantityOnHand;
    }

    stockUpdates.push({
      itemId: poItem.itemId,
      partNumber: poItem.partNumber,
      quantityAdded: poItem.quantity,
      newQuantityOnHand: updatedOnHand,
      location: targetLocation,
    });
  }

  await db
    .update(purchaseOrdersTable)
    .set({
      status: "DELIVERED",
      notes: input.notes
        ? po.notes
          ? `${po.notes} | Delivery Note: ${input.notes}`
          : input.notes
        : po.notes,
      updatedAt: new Date(),
    })
    .where(eq(purchaseOrdersTable.id, id));

  const updatedPO = await findPurchaseOrderById(id);

  return {
    purchaseOrder: updatedPO,
    deliveryTimeliness: {
      status: timelinessStatus,
      daysDifference: diffDays,
      expectedArrivalDate: expectedArrival.toISOString().split("T")[0],
      actualArrivalDate: actualArrival.toISOString().split("T")[0],
    },
    supplierScoreAdjustment: {
      supplierName: supplier.name,
      supplierCode: supplier.code,
      previousScore,
      newScore,
      scoreDelta,
      reason: scoreReason,
    },
    inventoryStockUpdates: stockUpdates,
  };
};
