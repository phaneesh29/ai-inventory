import { ToolLoopAgent } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { createBOM, EnrichedBOM } from "../../boms/bom.service.js";
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
    model: mistral("codestral-latest"),
    instructions: BOM_INGESTION_INSTRUCTIONS,
    tools,
  });

  const contentToProcess =
    params.rawContent !== undefined
      ? typeof params.rawContent === "string"
        ? params.rawContent
        : JSON.stringify(params.rawContent, null, 2)
      : JSON.stringify(params.items || [], null, 2);

  let summaryText = "";

  try {
    const result = await agent.generate({
      prompt: `Process, standardize, and call saveBOMToDatabase to persist this BOM run:
Workspace ID: ${params.workspaceId}
BOM Title: ${params.name}
Version: ${params.version || "v1.0"}
Custom Instructions: ${params.instructions || "Standardize component specifications, normalize units/categories, and persist."}

Raw BOM Content / Table Data:
${contentToProcess}`,
    });

    summaryText = result.text || "";
  } catch (err: any) {
    console.warn("BOM Ingestion Agent warning:", err.message);
  }

  let finalBOM = getCreatedBOM();

  if (!finalBOM && Array.isArray(params.rawContent) && params.rawContent.length > 0) {
    const fallbackItems = params.rawContent.map((row: any) => {
      const partNumber = String(row["Part Number"] || row["partNumber"] || row["MPN"] || row["Item"] || `PART-${Date.now()}`);
      const name = String(row["Description"] || row["name"] || row["Item Name"] || partNumber);
      const category = String(row["Category"] || row["category"] || "Other");
      const unit = String(row["Unit"] || row["unit"] || "pcs");
      const quantity = Math.max(1, parseInt(row["Quantity"] || row["quantity"] || row["Qty"]) || 1);
      const referenceDesignator = row["Designator"] || row["referenceDesignator"] || row["RefDes"] || undefined;
      const footprint = row["Footprint"] || row["Package"] || undefined;

      return {
        partNumber,
        name,
        description: name,
        category,
        unit,
        quantity,
        referenceDesignator,
        specifications: footprint ? { packageFootprint: footprint } : {},
      };
    });

    finalBOM = await createBOM({
      workspaceId: params.workspaceId,
      name: params.name,
      version: params.version || "v1.0",
      items: fallbackItems,
    });
  }

  return {
    bom: finalBOM,
    agentSummary: summaryText || "BOM processed, standardized, and saved to database.",
  };
};
