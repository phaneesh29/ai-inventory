import { ToolLoopAgent } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { INVENTORY_AUDIT_INSTRUCTIONS } from "./inventoryAudit.instructions.js";
import { createInventoryAuditTools, SubstituteOption } from "./inventoryAudit.tools.js";
import { NotFoundError } from "../../../utils/errors.js";

export interface RunInventoryAuditParams {
  bomId: string;
  batchQuantity?: number;
}

export interface InventoryAuditLineItem {
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  unit: string;
  requiredQuantity: number;
  availableQuantity: number;
  deficitQuantity: number;
  status: "IN_STOCK" | "PARTIAL_STOCK" | "OUT_OF_STOCK";
  substitutes: SubstituteOption[];
}

export interface InventoryAuditResult {
  bomId: string;
  bomName: string;
  version: string;
  batchQuantity: number;
  isReadyForProduction: boolean;
  readinessScore: number;
  maxBuildableUnits: number;
  totalLineItems: number;
  inStockLineItems: number;
  deficitLineItems: number;
  limitingBottleneckComponent: {
    partNumber: string;
    name: string;
    availableUnits: number;
  } | null;
  lineItems: InventoryAuditLineItem[];
  deficitItems: InventoryAuditLineItem[];
  agentSummary: string;
}

export const runInventoryAuditAgent = async (
  params: RunInventoryAuditParams
): Promise<InventoryAuditResult> => {
  const batchMultiplier = Math.max(1, params.batchQuantity || 1);

  const { tools, getCachedData } = createInventoryAuditTools();

  const agent = new ToolLoopAgent({
    model: mistral("codestral-latest"),
    instructions: INVENTORY_AUDIT_INSTRUCTIONS,
    tools,
  });

  const agentResponse = await agent.generate({
    prompt: `Perform an autonomous supply chain and warehouse inventory audit:
BOM ID: ${params.bomId}
Target Production Batch Multiplier: ${batchMultiplier} unit(s)

1. Fetch the BOM components using fetchBOMRequirements.
2. Check warehouse stock for all components with checkWarehouseStock.
3. If any component has a deficit (available < required * ${batchMultiplier}), search for in-stock substitutes with findSubstituteComponents.
4. Report the overall production readiness, bottleneck component, and procurement deficit list.`,
  });

  const { bom, stock, substitutes } = getCachedData();

  if (!bom) {
    throw new NotFoundError(`BOM with ID '${params.bomId}' could not be loaded for inventory audit`);
  }

  const stockMap = new Map(stock.map((s) => [s.itemId, s]));

  let inStockCount = 0;
  let minBuildableRatio = Infinity;
  let bottleneckPart: { partNumber: string; name: string; availableUnits: number } | null = null;

  const lineItems: InventoryAuditLineItem[] = bom.items.map((item) => {
    const stockInfo = stockMap.get(item.itemId);
    const available = stockInfo?.quantityAvailable || 0;
    const requiredTotal = item.requiredQuantity * batchMultiplier;
    const deficit = Math.max(0, requiredTotal - available);

    let status: "IN_STOCK" | "PARTIAL_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
    if (available === 0) {
      status = "OUT_OF_STOCK";
    } else if (available < requiredTotal) {
      status = "PARTIAL_STOCK";
    } else {
      inStockCount++;
    }

    const itemBuildableRatio =
      item.requiredQuantity > 0 ? Math.floor(available / item.requiredQuantity) : Infinity;
    if (itemBuildableRatio < minBuildableRatio) {
      minBuildableRatio = itemBuildableRatio;
      bottleneckPart = {
        partNumber: item.partNumber,
        name: item.name,
        availableUnits: itemBuildableRatio,
      };
    }

    return {
      itemId: item.itemId,
      partNumber: item.partNumber,
      name: item.name,
      category: item.category,
      unit: item.unit,
      requiredQuantity: requiredTotal,
      availableQuantity: available,
      deficitQuantity: deficit,
      status,
      substitutes: substitutes[item.itemId] || [],
    };
  });

  const deficitItems = lineItems.filter((i) => i.deficitQuantity > 0);
  const totalLineItems = lineItems.length;
  const readinessScore =
    totalLineItems > 0 ? Math.round((inStockCount / totalLineItems) * 100) : 100;
  const maxBuildableUnits = minBuildableRatio === Infinity ? 0 : minBuildableRatio;
  const isReadyForProduction = deficitItems.length === 0;

  return {
    bomId: bom.bomId,
    bomName: bom.bomName,
    version: bom.version,
    batchQuantity: batchMultiplier,
    isReadyForProduction,
    readinessScore,
    maxBuildableUnits,
    totalLineItems,
    inStockLineItems: inStockCount,
    deficitLineItems: deficitItems.length,
    limitingBottleneckComponent: bottleneckPart,
    lineItems,
    deficitItems,
    agentSummary: agentResponse.text || "Inventory audit completed.",
  };
};
