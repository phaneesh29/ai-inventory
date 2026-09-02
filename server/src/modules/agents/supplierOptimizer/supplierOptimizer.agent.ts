import { inArray, eq } from "drizzle-orm";
import {
  db,
  suppliersTable,
  supplierItemsTable,
  itemsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
} from "../../../db/index.js";
import type { GeneratedPurchaseOrder } from "./supplierOptimizer.tools.js";

export interface RunSupplierOptimizerParams {
  unresolvedDeficits: {
    itemId: string;
    partNumber: string;
    name: string;
    category: string;
    deficitQuantity: number;
  }[];
}

export interface SupplierOptimizerResult {
  totalDeficitComponentsOrdered: number;
  totalPurchaseOrders: number;
  totalSpendUSD: number;
  purchaseOrders: GeneratedPurchaseOrder[];
  agentSummary: string;
}

export const runSupplierOptimizerAgent = async (
  params: RunSupplierOptimizerParams
): Promise<SupplierOptimizerResult> => {
  if (params.unresolvedDeficits.length === 0) {
    return {
      totalDeficitComponentsOrdered: 0,
      totalPurchaseOrders: 0,
      totalSpendUSD: 0,
      purchaseOrders: [],
      agentSummary: "No deficit components required external supplier purchase orders.",
    };
  }

  const itemIds = params.unresolvedDeficits.map((d) => d.itemId);

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

  const supplierOrdersMap = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      supplierCode: string;
      items: {
        itemId: string;
        supplierPartNumber: string;
        quantity: number;
        unitPrice: number;
      }[];
    }
  >();

  const poSummaryLines: string[] = [];

  for (const deficit of params.unresolvedDeficits) {
    const matchingQuotes = rows.filter((r) => r.item.id === deficit.itemId);

    if (matchingQuotes.length === 0) {
      poSummaryLines.push(
        `- **${deficit.partNumber}** (${deficit.name}): ⚠️ No suppliers found in supplier catalog. Manual sourcing required.`
      );
      continue;
    }

    let bestQuote = matchingQuotes[0];
    let bestTotalCost = Infinity;

    for (const q of matchingQuotes) {
      const moq = q.supplierItem.minimumOrderQuantity || 1;
      const orderQty = Math.max(deficit.deficitQuantity, moq);

      let effectiveUnitPrice = q.supplierItem.unitPrice;
      if (q.supplierItem.priceTiers && Array.isArray(q.supplierItem.priceTiers)) {
        const sortedTiers = [...q.supplierItem.priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);
        for (const tier of sortedTiers) {
          if (orderQty >= tier.minQuantity) {
            effectiveUnitPrice = tier.unitPrice;
            break;
          }
        }
      }

      const totalCost = orderQty * effectiveUnitPrice;
      if (totalCost < bestTotalCost) {
        bestTotalCost = totalCost;
        bestQuote = q;
      }
    }

    const supplierId = bestQuote.supplier.id;
    const moq = bestQuote.supplierItem.minimumOrderQuantity || 1;
    const orderQty = Math.max(deficit.deficitQuantity, moq);

    let finalUnitPrice = bestQuote.supplierItem.unitPrice;
    if (bestQuote.supplierItem.priceTiers && Array.isArray(bestQuote.supplierItem.priceTiers)) {
      const sortedTiers = [...bestQuote.supplierItem.priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);
      for (const tier of sortedTiers) {
        if (orderQty >= tier.minQuantity) {
          finalUnitPrice = tier.unitPrice;
          break;
        }
      }
    }

    if (!supplierOrdersMap.has(supplierId)) {
      supplierOrdersMap.set(supplierId, {
        supplierId,
        supplierName: bestQuote.supplier.name,
        supplierCode: bestQuote.supplier.code,
        items: [],
      });
    }

    supplierOrdersMap.get(supplierId)!.items.push({
      itemId: deficit.itemId,
      supplierPartNumber: bestQuote.supplierItem.supplierPartNumber,
      quantity: orderQty,
      unitPrice: finalUnitPrice,
    });

    poSummaryLines.push(
      `- **${deficit.partNumber}** ➔ Selected **${bestQuote.supplier.name}** (\`${bestQuote.supplier.code}\`): Order Qty: **${orderQty} units** @ $${finalUnitPrice}/unit (Total: $${(orderQty * finalUnitPrice).toFixed(2)}, Lead Time: ${bestQuote.supplierItem.leadTimeDays} days)`
    );
  }

  const createdPOs: GeneratedPurchaseOrder[] = [];

  for (const [, order] of supplierOrdersMap) {
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
        notes: "Automated Purchase Order generated by Autonomous Supply Chain Pipeline",
      })
      .returning();

    const insertedLines = [];

    for (const line of lineItemsToInsert) {
      const [inserted] = await db
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

      insertedLines.push({
        itemId: inserted.itemId,
        supplierPartNumber: inserted.supplierPartNumber,
        quantity: inserted.quantity,
        unitPrice: inserted.unitPrice,
        totalPrice: inserted.totalPrice,
      });
    }

    createdPOs.push({
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

  const totalSpend = createdPOs.reduce((acc, po) => acc + po.totalAmount, 0);

  const summary = `### **Autonomous Supplier Optimization & Purchase Order Report**
**Deficit Components Handled:** ${params.unresolvedDeficits.length}
**Total Purchase Orders Created:** ${createdPOs.length}
**Total Sourcing Spend:** $${totalSpend.toFixed(2)} USD

---

#### **📋 Sourcing Allocations:**
${poSummaryLines.join("\n")}

---

#### **📄 Generated Purchase Orders in Database:**
${createdPOs.map((po) => `• **${po.poNumber}** (${po.supplierName}) ➜ Total: **$${po.totalAmount.toFixed(2)} USD** (${po.items.length} line items, Status: \`${po.status}\`)`).join("\n")}`;

  return {
    totalDeficitComponentsOrdered: params.unresolvedDeficits.length,
    totalPurchaseOrders: createdPOs.length,
    totalSpendUSD: Number(totalSpend.toFixed(2)),
    purchaseOrders: createdPOs,
    agentSummary: summary,
  };
};
