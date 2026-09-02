import { tool } from "ai";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  suppliersTable,
  supplierItemsTable,
  itemsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
} from "../../../db/index.js";

export interface ItemSupplierQuote {
  itemId: string;
  partNumber: string;
  deficitQuantity: number;
  availableQuotes: {
    supplierId: string;
    supplierName: string;
    supplierCode: string;
    supplierPartNumber: string;
    unitPrice: number;
    effectivePrice: number;
    minimumOrderQuantity: number;
    orderQuantity: number;
    totalCost: number;
    stockAvailable: number;
    leadTimeDays: number;
    reliabilityScore: number;
    isPreferred: boolean;
  }[];
}

export interface GeneratedPurchaseOrder {
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  status: string;
  totalAmount: number;
  currency: string;
  items: {
    itemId: string;
    supplierPartNumber: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

export const createSupplierOptimizerTools = () => {
  let createdPOs: GeneratedPurchaseOrder[] = [];

  const fetchSupplierQuotes = tool({
    description: "Fetches all supplier prices, stock availability, lead times, MOQ, and volume tiers for deficit parts.",
    inputSchema: z.object({
      deficitItems: z.array(
        z.object({
          itemId: z.uuid({ error: "Invalid item UUID" }),
          partNumber: z.string().min(1),
          deficitQuantity: z.number().positive(),
        })
      ),
    }),
    execute: async ({ deficitItems }) => {
      const itemIds = deficitItems.map((d) => d.itemId);

      const rows = await db
        .select({
          supplierItem: supplierItemsTable,
          supplier: suppliersTable,
          item: itemsTable,
        })
        .from(supplierItemsTable)
        .innerJoin(suppliersTable, eq(supplierItemsTable.supplierId, suppliersTable.id))
        .innerJoin(itemsTable, eq(supplierItemsTable.itemId, itemsTable.id))
        .where(inArray(supplierItemsTable.itemId, itemIds));

      const quotesByItem = new Map<string, ItemSupplierQuote>();

      for (const deficit of deficitItems) {
        quotesByItem.set(deficit.itemId, {
          itemId: deficit.itemId,
          partNumber: deficit.partNumber,
          deficitQuantity: deficit.deficitQuantity,
          availableQuotes: [],
        });
      }

      for (const r of rows) {
        const entry = quotesByItem.get(r.item.id);
        if (!entry) continue;

        const moq = r.supplierItem.minimumOrderQuantity || 1;
        const orderQty = Math.max(entry.deficitQuantity, moq);

        let effectiveUnitPrice = r.supplierItem.unitPrice;
        if (r.supplierItem.priceTiers && Array.isArray(r.supplierItem.priceTiers)) {
          const sortedTiers = [...r.supplierItem.priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);
          for (const tier of sortedTiers) {
            if (orderQty >= tier.minQuantity) {
              effectiveUnitPrice = tier.unitPrice;
              break;
            }
          }
        }

        const totalCost = Number((orderQty * effectiveUnitPrice).toFixed(2));

        entry.availableQuotes.push({
          supplierId: r.supplier.id,
          supplierName: r.supplier.name,
          supplierCode: r.supplier.code,
          supplierPartNumber: r.supplierItem.supplierPartNumber,
          unitPrice: r.supplierItem.unitPrice,
          effectivePrice: effectiveUnitPrice,
          minimumOrderQuantity: moq,
          orderQuantity: orderQty,
          totalCost,
          stockAvailable: r.supplierItem.stockAvailable,
          leadTimeDays: r.supplierItem.leadTimeDays,
          reliabilityScore: r.supplier.reliabilityScore,
          isPreferred: r.supplierItem.isPreferred,
        });
      }

      return Array.from(quotesByItem.values());
    },
  });

  const createPurchaseOrders = tool({
    description: "Creates and saves formal Purchase Orders in PostgreSQL grouped by selected suppliers.",
    inputSchema: z.object({
      orders: z.array(
        z.object({
          supplierId: z.uuid({ error: "Invalid supplier UUID" }),
          supplierName: z.string().min(1),
          supplierCode: z.string().min(1),
          items: z.array(
            z.object({
              itemId: z.uuid({ error: "Invalid item UUID" }),
              supplierPartNumber: z.string().min(1),
              quantity: z.number().positive(),
              unitPrice: z.number().positive(),
            })
          ),
          notes: z.string().optional(),
        })
      ),
    }),
    execute: async ({ orders }) => {
      const generatedList: GeneratedPurchaseOrder[] = [];

      for (const order of orders) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const poNumber = `PO-${order.supplierCode}-${Date.now().toString().slice(-4)}-${randomSuffix}`;

        let totalOrderAmount = 0;
        const lineItemsToInsert = order.items.map((item) => {
          const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
          totalOrderAmount += lineTotal;
          return {
            itemId: item.itemId,
            supplierPartNumber: item.supplierPartNumber,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: lineTotal,
          };
        });

        const [createdPO] = await db
          .insert(purchaseOrdersTable)
          .values({
            poNumber,
            supplierId: order.supplierId,
            status: "DRAFT",
            totalAmount: Number(totalOrderAmount.toFixed(2)),
            currency: "USD",
            notes: order.notes || "Automated Purchase Order generated by Supply Chain Workflow Pipeline",
          })
          .returning();

        const insertedLineItems = [];

        for (const line of lineItemsToInsert) {
          const [insertedItem] = await db
            .insert(purchaseOrderItemsTable)
            .values({
              purchaseOrderId: createdPO.id,
              itemId: line.itemId,
              supplierPartNumber: line.supplierPartNumber,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              totalPrice: line.totalPrice,
            })
            .returning();

          insertedLineItems.push({
            itemId: insertedItem.itemId,
            supplierPartNumber: insertedItem.supplierPartNumber,
            quantity: insertedItem.quantity,
            unitPrice: insertedItem.unitPrice,
            totalPrice: insertedItem.totalPrice,
          });
        }

        generatedList.push({
          poId: createdPO.id,
          poNumber: createdPO.poNumber,
          supplierId: createdPO.supplierId,
          supplierName: order.supplierName,
          supplierCode: order.supplierCode,
          status: createdPO.status,
          totalAmount: createdPO.totalAmount,
          currency: createdPO.currency,
          items: insertedLineItems,
        });
      }

      createdPOs = generatedList;
      return {
        status: "PURCHASE_ORDERS_GENERATED",
        totalPurchaseOrders: generatedList.length,
        purchaseOrders: generatedList,
      };
    },
  });

  return {
    tools: {
      fetchSupplierQuotes,
      createPurchaseOrders,
    },
    getCreatedPOs: () => createdPOs,
  };
};
