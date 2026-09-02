import {
  reserveStockInDB,
  applySubstitutionsInDB,
  StockReservationItem,
  ComponentSubstitutionItem,
} from "./processExecution.tools.js";
import type { EnrichedBOM } from "../../boms/bom.service.js";
import type { InventoryAuditResult } from "../inventoryAudit/inventoryAudit.agent.js";
import type { AlternativeMatchResult } from "../alternativeMatcher/alternativeMatcher.agent.js";

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
  componentChanges: ComponentChangeProposal[];
  stockReservations: StockReservationProposal[];
  agentSummary: string;
}

export interface GenerateProcessPlanParams {
  bom: EnrichedBOM;
  audit: InventoryAuditResult;
  alternatives: AlternativeMatchResult | null;
}

export interface ExecuteApprovedPlanParams {
  bomId: string;
  reservations: StockReservationItem[];
  substitutions: ComponentSubstitutionItem[];
}

export const generateProcessExecutionPlan = async (
  params: GenerateProcessPlanParams
): Promise<ProcessPlanProposal> => {
  const { bom, audit, alternatives } = params;

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

  const changeLines =
    componentChanges.length > 0
      ? componentChanges
          .map(
            (c) =>
              `- **[${c.substitutionTier}]** ${c.originalPartNumber} (${c.originalName}) ➔ **${c.replacementPartNumber}** (${c.replacementName}) | Topology: ${c.circuitTopology} | Reason: ${c.engineeringReason} (Risk: ${c.riskLevel})`
          )
          .join("\n")
      : "No component substitutions required. All components available as originally specified.";

  const reservationLines = stockReservations
    .map((r) => `- **${r.partNumber}**: Reserve **${r.quantityToReserve} units** at \`${r.location}\``)
    .join("\n");

  const summary = `### **Production Release & Process Execution Plan**
**BOM ID:** \`${bom.id}\`
**BOM Name:** ${bom.name} (${bom.version})
**Status:** **APPROVAL_REQUIRED (Awaiting User Confirmation)**

---

#### **🔄 Component Changed List (${componentChanges.length} substitutions):**
${changeLines}

---

#### **📦 Warehouse Stock Reservations (${stockReservations.length} items):**
${reservationLines}

---
*Please review the proposed component changes and confirm approval to execute warehouse reservations and BOM updates.*`;

  return {
    bomId: bom.id,
    bomName: bom.name,
    version: bom.version,
    status: "APPROVAL_REQUIRED",
    isSubstitutionRequired: componentChanges.length > 0,
    totalComponentsToReserve: stockReservations.length,
    totalComponentChanges: componentChanges.length,
    componentChanges,
    stockReservations,
    agentSummary: summary,
  };
};

export const executeApprovedProcessPlan = async (params: ExecuteApprovedPlanParams) => {
  let reservationsResult = null;
  let substitutionsResult = null;

  if (params.substitutions.length > 0) {
    substitutionsResult = await applySubstitutionsInDB(params.substitutions);
  }

  if (params.reservations.length > 0) {
    reservationsResult = await reserveStockInDB(params.reservations);
  }

  return {
    bomId: params.bomId,
    status: "APPROVED_AND_EXECUTED",
    substitutionsApplied: substitutionsResult,
    stockReservationsApplied: reservationsResult,
  };
};
