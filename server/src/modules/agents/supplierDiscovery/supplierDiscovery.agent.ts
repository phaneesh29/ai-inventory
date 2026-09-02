import {
  fetchAllSupplierQuotesForDeficits,
  ComponentSupplierMarketData,
} from "./supplierDiscovery.tools.js";

export interface RunSupplierDiscoveryParams {
  deficitItems: {
    itemId: string;
    partNumber: string;
    name: string;
    category: string;
    deficitQuantity: number;
  }[];
}

export interface SupplierDiscoveryResult {
  totalDeficitComponents: number;
  totalSuppliersFound: number;
  marketData: ComponentSupplierMarketData[];
  agentSummary: string;
}

export const runSupplierDiscoveryAgent = async (
  params: RunSupplierDiscoveryParams
): Promise<SupplierDiscoveryResult> => {
  if (params.deficitItems.length === 0) {
    return {
      totalDeficitComponents: 0,
      totalSuppliersFound: 0,
      marketData: [],
      agentSummary: "No deficit components require supplier discovery.",
    };
  }

  const marketData = await fetchAllSupplierQuotesForDeficits(params.deficitItems);

  const uniqueSuppliers = new Set<string>();
  const componentSummaries: string[] = [];

  for (const comp of marketData) {
    if (comp.availableSuppliers.length === 0) {
      componentSummaries.push(
        `- **${comp.partNumber}** (${comp.name}): ⚠️ No suppliers found in catalog database.`
      );
      continue;
    }

    const supplierQuotes = comp.availableSuppliers.map((s) => {
      uniqueSuppliers.add(s.supplierName);
      return `\`${s.supplierName}\` ($${s.baseUnitPrice}/unit, Stock: ${s.stockAvailable}, MOQ: ${s.minimumOrderQuantity}, Lead Time: ${s.leadTimeDays}d)`;
    });

    componentSummaries.push(
      `- **${comp.partNumber}** (${comp.name} | Need: ${comp.deficitQuantity}):\n  ${supplierQuotes.join(" | ")}`
    );
  }

  const summary = `### **Supplier Discovery & Market Catalog Report**
**Deficit Components Queried:** ${marketData.length}
**Active Distributors Found:** ${uniqueSuppliers.size} (${Array.from(uniqueSuppliers).join(", ") || "None"})

---

#### **🔍 Supplier Quotes by Component:**
${componentSummaries.join("\n\n")}

---
*Supplier market data successfully compiled. Handing off to Purchase Order Agent for cost and lead time optimization.*`;

  return {
    totalDeficitComponents: marketData.length,
    totalSuppliersFound: uniqueSuppliers.size,
    marketData,
    agentSummary: summary,
  };
};
