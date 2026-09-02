import {
  reserveStockInDB,
  applySubstitutionsInDB,
  StockReservationItem,
  ComponentSubstitutionItem,
} from "./processExecution.tools.js";
import {
  commitPurchaseOrdersToDB,
  DraftPurchaseOrder,
  CommittedPurchaseOrder,
} from "../purchaseOrderPlanner/purchaseOrderPlanner.tools.js";
import type { EnrichedBOM } from "../../boms/bom.service.js";
import type { InventoryAuditResult } from "../inventoryAudit/inventoryAudit.agent.js";
import type { AlternativeMatchResult } from "../alternativeMatcher/alternativeMatcher.agent.js";
import type { PurchaseOrderPlannerResult } from "../purchaseOrderPlanner/purchaseOrderPlanner.agent.js";

export interface ComponentChangeProposal {
  originalItemId: string;
  originalPartNumber: string;
  originalName: string;
  replacementItemId: string;
  replacementPartNumber: string;
  replacementName: string;
  substitutionTier: "TIER_1_DROP_IN" | "TIER_2_PARAMETRIC_UPGRADE" | "TIER_3_CIRCUIT_COMBINATION";
  circuitTopology: "SINGLE" | "SERIES" | "PARALLEL";
  effectiveValue?: string;
  engineeringReason: string;
  riskLevel: "NONE" | "LOW" | "MEDIUM";
  quantity: number;
}

export interface StockReservationProposal {
  itemId: string;
  partNumber: string;
  name: string;
  quantityToReserve: number;
  location: string;
}

export interface ProcessPlanProposal {
  bomId: string;
  bomName: string;
  version: string;
  status: "APPROVAL_REQUIRED";
  isSubstitutionRequired: boolean;
  totalComponentsToReserve: number;
  totalComponentChanges: number;
  totalDraftPurchaseOrders: number;
  totalEstimatedProcurementSpendUSD: number;
  componentChanges: ComponentChangeProposal[];
  stockReservations: StockReservationProposal[];
  draftPurchaseOrders: DraftPurchaseOrder[];
  agentSummary: string;
}

export interface GenerateProcessPlanParams {
  bom: EnrichedBOM;
  audit: InventoryAuditResult;
  alternatives: AlternativeMatchResult | null;
  poPlan: PurchaseOrderPlannerResult | null;
}

export interface ExecuteApprovedPlanParams {
  bomId: string;
  reservations: StockReservationItem[];
  substitutions: ComponentSubstitutionItem[];
  purchaseOrders: DraftPurchaseOrder[];
}

export const generateProcessExecutionPlan = async (
  params: GenerateProcessPlanParams
): Promise<ProcessPlanProposal> => {
  const { bom, audit, alternatives, poPlan } = params;

  const componentChanges: ComponentChangeProposal[] = [];
  const stockReservations: StockReservationProposal[] = [];
  const resolvedDeficitIds = new Set<string>();

  if (alternatives && alternatives.matches.length > 0) {
    for (const match of alternatives.matches) {
      if (match.hasMatches && match.recommendations.length > 0) {
        const topRec = match.recommendations[0];
        const primaryCandidate = topRec.candidateItems[0];

        if (primaryCandidate && primaryCandidate.quantityAvailable >= match.deficitQuantity) {
          componentChanges.push({
            originalItemId: match.itemId,
            originalPartNumber: match.partNumber,
            originalName: match.name,
            replacementItemId: primaryCandidate.itemId,
            replacementPartNumber: primaryCandidate.partNumber,
            replacementName: primaryCandidate.name,
            substitutionTier: topRec.tier,
            circuitTopology: topRec.circuitTopology || "SINGLE",
            effectiveValue: topRec.effectiveCalculatedValue,
            engineeringReason: topRec.engineeringNotes,
            riskLevel: topRec.riskLevel,
            quantity: match.deficitQuantity,
          });

          stockReservations.push({
            itemId: primaryCandidate.itemId,
            partNumber: primaryCandidate.partNumber,
            name: primaryCandidate.name,
            quantityToReserve: match.deficitQuantity,
            location: primaryCandidate.location,
          });

          resolvedDeficitIds.add(match.itemId);
        }
      }
    }
  }

  for (const lineItem of audit.lineItems) {
    if (lineItem.status === "IN_STOCK" && lineItem.requiredQuantity > 0) {
      stockReservations.push({
        itemId: lineItem.itemId,
        partNumber: lineItem.partNumber,
        name: lineItem.name,
        quantityToReserve: lineItem.requiredQuantity,
        location: "Warehouse Stock",
      });
    }
  }

  const draftPOs = poPlan?.draftPurchaseOrders || [];
  const totalPOSpend = poPlan?.totalEstimatedSpendUSD || 0;

  const changeLines =
    componentChanges.length > 0
      ? componentChanges
          .map(
            (c) =>
              `- **[${c.substitutionTier}]** ${c.originalPartNumber} (${c.originalName}) ➔ **${c.replacementPartNumber}** (${c.replacementName}) | Topology: ${c.circuitTopology} | Reason: ${c.engineeringReason} (Risk: ${c.riskLevel})`
          )
          .join("\n")
      : "No component substitutions required.";

  const reservationLines =
    stockReservations.length > 0
      ? stockReservations
          .map((r) => `- **${r.partNumber}**: Reserve **${r.quantityToReserve} units** at \`${r.location}\``)
          .join("\n")
      : "No warehouse stock reservations required.";

  const poLines =
    draftPOs.length > 0
      ? draftPOs
          .map(
            (po) =>
              `- **${po.supplierName}** (\`${po.supplierCode}\`): Total **$${po.totalAmount.toFixed(2)} USD** (${po.items.length} items, Lead Time: ~${po.estimatedLeadTimeDays} days, Status: \`${po.status}\`)`
          )
          .join("\n")
      : "No external purchase orders required.";

  const summary = `### **Production Release & Procurement Plan (Awaiting User Approval)**
**BOM ID:** \`${bom.id}\`
**BOM Name:** ${bom.name} (${bom.version})
**Status:** **APPROVAL_REQUIRED (Awaiting User Confirmation)**

---

#### **🔄 In-House Component Substitutions (${componentChanges.length} changes):**
${changeLines}

---

#### **📦 Warehouse Stock Reservations (${stockReservations.length} items):**
${reservationLines}

---

#### **📄 Drafted Supplier Purchase Orders (${draftPOs.length} POs, Est. Spend: $${totalPOSpend.toFixed(2)} USD):**
${poLines}

---
*Please review and confirm to approve stock reservations, apply component swaps, and issue supplier purchase orders.*`;

  return {
    bomId: bom.id,
    bomName: bom.name,
    version: bom.version,
    status: "APPROVAL_REQUIRED",
    isSubstitutionRequired: componentChanges.length > 0,
    totalComponentsToReserve: stockReservations.length,
    totalComponentChanges: componentChanges.length,
    totalDraftPurchaseOrders: draftPOs.length,
    totalEstimatedProcurementSpendUSD: totalPOSpend,
    componentChanges,
    stockReservations,
    draftPurchaseOrders: draftPOs,
    agentSummary: summary,
  };
};

export const executeApprovedProcessPlan = async (params: any) => {
  const substitutions = params.substitutions || params.plan?.componentChanges || params.plan?.substitutions || [];
  const reservations = params.reservations || params.plan?.stockReservations || params.plan?.reservations || [];
  const purchaseOrders = params.purchaseOrders || params.plan?.draftPurchaseOrders || params.plan?.purchaseOrders || [];

  let reservationsResult = null;
  let substitutionsResult = null;
  let purchaseOrdersResult: CommittedPurchaseOrder[] = [];

  if (Array.isArray(substitutions) && substitutions.length > 0) {
    substitutionsResult = await applySubstitutionsInDB(substitutions);
  }

  if (Array.isArray(reservations) && reservations.length > 0) {
    reservationsResult = await reserveStockInDB(reservations);
  }

  if (Array.isArray(purchaseOrders) && purchaseOrders.length > 0) {
    purchaseOrdersResult = await commitPurchaseOrdersToDB(purchaseOrders);
  }

  return {
    bomId: params.bomId,
    status: "APPROVED_AND_EXECUTED",
    substitutionsApplied: substitutionsResult,
    stockReservationsApplied: reservationsResult,
    purchaseOrdersCreated: purchaseOrdersResult,
  };
};
