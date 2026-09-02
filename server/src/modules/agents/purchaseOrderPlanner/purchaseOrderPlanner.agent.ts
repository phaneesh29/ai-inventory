import { ComponentSupplierMarketData } from "../supplierDiscovery/supplierDiscovery.tools.js";
import {
  DraftPurchaseOrder,
  DraftPurchaseOrderItem,
} from "./purchaseOrderPlanner.tools.js";

export interface RunPurchaseOrderPlannerParams {
  marketData: ComponentSupplierMarketData[];
}

export interface PurchaseOrderPlannerResult {
  totalDeficitComponentsOrdered: number;
  totalDraftPurchaseOrders: number;
  totalEstimatedSpendUSD: number;
  draftPurchaseOrders: DraftPurchaseOrder[];
  agentSummary: string;
}

export const runPurchaseOrderPlannerAgent = async (
  params: RunPurchaseOrderPlannerParams
): Promise<PurchaseOrderPlannerResult> => {
  if (params.marketData.length === 0) {
    return {
      totalDeficitComponentsOrdered: 0,
      totalDraftPurchaseOrders: 0,
      totalEstimatedSpendUSD: 0,
      draftPurchaseOrders: [],
      agentSummary: "No deficit components require purchase orders.",
    };
  }

  const supplierOrdersMap = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      supplierCode: string;
      maxLeadTimeDays: number;
      items: DraftPurchaseOrderItem[];
    }
  >();

  const allocationSummaryLines: string[] = [];

  for (const comp of params.marketData) {
    if (comp.availableSuppliers.length === 0) {
      allocationSummaryLines.push(
        `- **${comp.partNumber}** (${comp.name}): ⚠️ No supplier available in database. Sourcing escalated to manual procurement.`
      );
      continue;
    }

    let bestQuote = comp.availableSuppliers[0];
    let bestTotalCost = Infinity;
    let isVolumeDiscountApplied = false;

    for (const q of comp.availableSuppliers) {
      const moq = q.minimumOrderQuantity || 1;
      const orderQty = Math.max(comp.deficitQuantity, moq);

      let effectiveUnitPrice = q.baseUnitPrice;
      let hasDiscount = false;

      if (q.priceTiers && q.priceTiers.length > 0) {
        const sortedTiers = [...q.priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);
        for (const tier of sortedTiers) {
          if (orderQty >= tier.minQuantity) {
            effectiveUnitPrice = tier.unitPrice;
            hasDiscount = tier.unitPrice < q.baseUnitPrice;
            break;
          }
        }
      }

      const totalCost = orderQty * effectiveUnitPrice;
      if (totalCost < bestTotalCost) {
        bestTotalCost = totalCost;
        bestQuote = q;
        isVolumeDiscountApplied = hasDiscount;
      }
    }

    const supplierId = bestQuote.supplierId;
    const moq = bestQuote.minimumOrderQuantity || 1;
    const orderQty = Math.max(comp.deficitQuantity, moq);

    let finalUnitPrice = bestQuote.baseUnitPrice;
    if (bestQuote.priceTiers && bestQuote.priceTiers.length > 0) {
      const sortedTiers = [...bestQuote.priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);
      for (const tier of sortedTiers) {
        if (orderQty >= tier.minQuantity) {
          finalUnitPrice = tier.unitPrice;
          break;
        }
      }
    }

    const lineTotal = Number((orderQty * finalUnitPrice).toFixed(2));

    if (!supplierOrdersMap.has(supplierId)) {
      supplierOrdersMap.set(supplierId, {
        supplierId,
        supplierName: bestQuote.supplierName,
        supplierCode: bestQuote.supplierCode,
        maxLeadTimeDays: bestQuote.leadTimeDays,
        items: [],
      });
    }

    const currentOrder = supplierOrdersMap.get(supplierId)!;
    currentOrder.maxLeadTimeDays = Math.max(currentOrder.maxLeadTimeDays, bestQuote.leadTimeDays);

    currentOrder.items.push({
      itemId: comp.itemId,
      partNumber: comp.partNumber,
      name: comp.name,
      supplierPartNumber: bestQuote.supplierPartNumber,
      quantity: orderQty,
      unitPrice: finalUnitPrice,
      totalPrice: lineTotal,
      volumeDiscountApplied: isVolumeDiscountApplied,
      leadTimeDays: bestQuote.leadTimeDays,
    });

    const discountTag = isVolumeDiscountApplied ? " *(Volume Tier Discount Applied)*" : "";
    allocationSummaryLines.push(
      `- **${comp.partNumber}** (${comp.name} | Need: ${comp.deficitQuantity}):\n  ➔ Sourced from **${bestQuote.supplierName}** (\`${bestQuote.supplierCode}\`): Order **${orderQty} units** @ **$${finalUnitPrice}/unit** (Total: **$${lineTotal.toFixed(2)} USD**, Est. Lead Time: **${bestQuote.leadTimeDays} days**)${discountTag}`
    );
  }

  const draftPOs: DraftPurchaseOrder[] = [];

  for (const [, order] of supplierOrdersMap) {
    const totalOrderAmount = order.items.reduce((acc, i) => acc + i.totalPrice, 0);

    draftPOs.push({
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      supplierCode: order.supplierCode,
      status: "PENDING_USER_APPROVAL",
      estimatedLeadTimeDays: order.maxLeadTimeDays,
      totalAmount: Number(totalOrderAmount.toFixed(2)),
      currency: "USD",
      items: order.items,
    });
  }

  const totalSpend = draftPOs.reduce((acc, po) => acc + po.totalAmount, 0);

  const poCardSummaries = draftPOs.map(
    (po) =>
      `• **Distributor:** ${po.supplierName} (\`${po.supplierCode}\`)
  - **Estimated Order Spend:** **$${po.totalAmount.toFixed(2)} USD** (${po.items.length} line items)
  - **Fulfillment Lead Time:** **~${po.estimatedLeadTimeDays} business days**
  - **Status:** \`${po.status}\` (Awaiting User Execution Confirmation)`
  );

  const summary = `### **Draft Purchase Order Procurement & Cost Optimization Report**
**Shortage Components Optimized:** ${params.marketData.length}
**Drafted Purchase Orders:** ${draftPOs.length}
**Total Estimated Procurement Spend:** **$${totalSpend.toFixed(2)} USD**

---

#### **📋 Sourcing Allocations & Distributor Trade-offs:**
${allocationSummaryLines.join("\n\n")}

---

#### **📄 Drafted Purchase Orders (Awaiting Approval):**
${poCardSummaries.join("\n\n")}

---
*Please review the drafted purchase orders and confirm approval to issue procurement orders to distributors.*`;

  return {
    totalDeficitComponentsOrdered: params.marketData.length,
    totalDraftPurchaseOrders: draftPOs.length,
    totalEstimatedSpendUSD: Number(totalSpend.toFixed(2)),
    draftPurchaseOrders: draftPOs,
    agentSummary: summary,
  };
};
