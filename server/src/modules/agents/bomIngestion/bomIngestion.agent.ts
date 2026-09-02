import { ToolLoopAgent } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { EnrichedBOM } from "../../boms/bom.service.js";
import { BOM_INGESTION_INSTRUCTIONS } from "./bomIngestion.instructions.js";
import { createBOMIngestionTools } from "./bomIngestion.tools.js";

export interface RunBOMIngestionParams {
  workspaceId: string;
  name: string;
  version?: string;
  items?: any[];
  rawContent?: string | any[];
  instructions?: string;
}

export interface BOMIngestionResult {
  bom: EnrichedBOM | null;
  agentSummary: string;
}

export const runBOMIngestionAgent = async (
  params: RunBOMIngestionParams
): Promise<BOMIngestionResult> => {
  const { tools, getCreatedBOM } = createBOMIngestionTools();

  const agent = new ToolLoopAgent({
    model: mistral("mistral-medium-latest"),
    instructions: BOM_INGESTION_INSTRUCTIONS,
    tools,
  });

  const contentToProcess =
    params.rawContent !== undefined
      ? typeof params.rawContent === "string"
        ? params.rawContent
        : JSON.stringify(params.rawContent, null, 2)
      : JSON.stringify(params.items || [], null, 2);

  const result = await agent.generate({
    prompt: `Process and persist this BOM run:
Workspace ID: ${params.workspaceId}
BOM Title: ${params.name}
Version: ${params.version || "v1.0"}
Custom Instructions: ${params.instructions || "Standardize component specifications, normalize units/categories, and persist."}

Raw BOM Content / Table Data:
${contentToProcess}`,
  });

  return {
    bom: getCreatedBOM(),
    agentSummary: result.text || "BOM processed and persisted successfully.",
  };
};
