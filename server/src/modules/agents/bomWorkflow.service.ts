import { parseUploadedBOMFile } from "../boms/bom.parser.js";
import { runBOMIngestionAgent, BOMIngestionResult } from "./bomIngestion/bomIngestion.agent.js";
import { runInventoryAuditAgent, InventoryAuditResult } from "./inventoryAudit/inventoryAudit.agent.js";
import { runAlternativeMatcherAgent, AlternativeMatchResult } from "./alternativeMatcher/alternativeMatcher.agent.js";
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
  bomAgentSummary: string;
}

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

  const auditResult: InventoryAuditResult = await runInventoryAuditAgent({
    bomId: ingestionResult.bom.id,
    batchQuantity,
  });

  let alternativesResult: AlternativeMatchResult | null = null;

  if (auditResult.deficitItems.length > 0) {
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
  }

  return {
    bom: ingestionResult.bom,
    audit: auditResult,
    alternatives: alternativesResult,
    bomAgentSummary: ingestionResult.agentSummary,
  };
};
