import { parseUploadedBOMFile } from "../boms/bom.parser.js";
import { runBOMIngestionAgent, BOMIngestionResult } from "./bomIngestion/bomIngestion.agent.js";
import { runInventoryAuditAgent, InventoryAuditResult } from "./inventoryAudit/inventoryAudit.agent.js";
import { runAlternativeMatcherAgent, AlternativeMatchResult } from "./alternativeMatcher/alternativeMatcher.agent.js";
import { runSupplierOptimizerAgent, SupplierOptimizerResult } from "./supplierOptimizer/supplierOptimizer.agent.js";
import {
  generateProcessExecutionPlan,
  ProcessPlanProposal,
} from "./processExecution/processExecution.agent.js";
import { InternalServerError } from "../../utils/errors.js";
import type { EnrichedBOM } from "../boms/bom.service.js";

export interface RunBOMWorkflowParams {
  file: Express.Multer.File;
  workspaceId: string;
  name?: string;
  version?: string;
  instructions?: string;
  batchQuantity?: number;
}

export interface BOMWorkflowResult {
  bom: EnrichedBOM;
  audit: InventoryAuditResult;
  alternatives: AlternativeMatchResult | null;
  supplierOrders: SupplierOptimizerResult | null;
  processPlan: ProcessPlanProposal;
  workflowStage: "ALL_IN_STOCK_EXECUTION" | "IN_HOUSE_SUBSTITUTIONS" | "SUPPLIER_PURCHASE_ORDER";
  bomAgentSummary: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const runBOMUploadAndAuditWorkflow = async (
  params: RunBOMWorkflowParams
): Promise<BOMWorkflowResult> => {
  const fileNameWithoutExt = params.file.originalname.replace(/\.[^/.]+$/, "");
  const bomName = params.name || fileNameWithoutExt || "Uploaded BOM";
  const version = params.version || "v1.0";
  const batchQuantity = params.batchQuantity || 1;

  const parsed = await parseUploadedBOMFile(params.file);
  const rawContent = parsed.type === "structured" ? parsed.data : parsed.markdown;

  const ingestionResult: BOMIngestionResult = await runBOMIngestionAgent({
    workspaceId: params.workspaceId,
    name: bomName,
    version,
    rawContent,
    instructions: params.instructions,
  });

  if (!ingestionResult.bom) {
    throw new InternalServerError("BOM Ingestion Agent failed to persist BOM to database");
  }

  await sleep(1500);

  const auditResult: InventoryAuditResult = await runInventoryAuditAgent({
    bomId: ingestionResult.bom.id,
    batchQuantity,
  });

  let alternativesResult: AlternativeMatchResult | null = null;
  let supplierOrdersResult: SupplierOptimizerResult | null = null;
  let workflowStage: "ALL_IN_STOCK_EXECUTION" | "IN_HOUSE_SUBSTITUTIONS" | "SUPPLIER_PURCHASE_ORDER" =
    "ALL_IN_STOCK_EXECUTION";

  if (auditResult.deficitItems.length > 0) {
    await sleep(1500);

    alternativesResult = await runAlternativeMatcherAgent({
      deficitItems: auditResult.deficitItems.map((d) => ({
        itemId: d.itemId,
        partNumber: d.partNumber,
        name: d.name,
        category: d.category,
        deficitQuantity: d.deficitQuantity,
        specifications: ingestionResult.bom?.items.find((i) => i.itemId === d.itemId)?.specifications,
      })),
    });

    const resolvedItemIds = new Set<string>();
    if (alternativesResult && alternativesResult.matches.length > 0) {
      for (const match of alternativesResult.matches) {
        if (match.hasMatches && match.recommendations.length > 0) {
          const topRec = match.recommendations[0];
          const primaryCandidate = topRec.candidateItems[0];
          if (primaryCandidate && primaryCandidate.quantityAvailable >= match.deficitQuantity) {
            resolvedItemIds.add(match.itemId);
          }
        }
      }
    }

    const unresolvableDeficits = auditResult.deficitItems.filter(
      (d) => !resolvedItemIds.has(d.itemId)
    );

    if (unresolvableDeficits.length > 0) {
      workflowStage = "SUPPLIER_PURCHASE_ORDER";
      supplierOrdersResult = await runSupplierOptimizerAgent({
        unresolvedDeficits: unresolvableDeficits.map((d) => ({
          itemId: d.itemId,
          partNumber: d.partNumber,
          name: d.name,
          category: d.category,
          deficitQuantity: d.deficitQuantity,
        })),
      });
    } else {
      workflowStage = "IN_HOUSE_SUBSTITUTIONS";
    }
  }

  const processPlan = await generateProcessExecutionPlan({
    bom: ingestionResult.bom,
    audit: auditResult,
    alternatives: alternativesResult,
  });

  return {
    bom: ingestionResult.bom,
    audit: auditResult,
    alternatives: alternativesResult,
    supplierOrders: supplierOrdersResult,
    processPlan,
    workflowStage,
    bomAgentSummary: ingestionResult.agentSummary,
  };
};
