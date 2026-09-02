import { ToolLoopAgent } from "ai";
import { createMistral } from "@ai-sdk/mistral";
import { env } from "../../config/env.js";
import { EnrichedBOM } from "./bom.service.js";
import { BOM_AGENT_INSTRUCTIONS } from "./bom.instructions.js";
import { createBOMTools } from "./bom.tools.js";

export interface RunBOMAgentParams {
  workspaceId: string;
  name: string;
  version?: string;
  items: Array<{
    partNumber: string;
    name: string;
    category: string;
    unit: string;
    quantity: number;
    specifications?: Record<string, any>;
    referenceDesignator?: string;
    notes?: string;
  }>;
  instructions?: string;
}

export interface BOMAgentResult {
  bom: EnrichedBOM | null;
  agentSummary: string;
}

export const runBOMAgent = async (params: RunBOMAgentParams): Promise<BOMAgentResult> => {
  const mistral = createMistral({
    apiKey: env.MISTRAL_API_KEY,
  });

  const { tools, getCreatedBOM } = createBOMTools();

  const agent = new ToolLoopAgent({
    model: mistral("mistral-large-latest"),
    instructions: BOM_AGENT_INSTRUCTIONS,
    tools,
  });

  const result = await agent.generate({
    prompt: `Process and persist this BOM run:
Workspace ID: ${params.workspaceId}
BOM Title: ${params.name}
Version: ${params.version || "v1.0"}
Custom Instructions: ${params.instructions || "Standardize semiconductor specifications and persist."}

Raw Items Data:
${JSON.stringify(params.items, null, 2)}`,
  });

  return {
    bom: getCreatedBOM(),
    agentSummary: result.text || "BOM processed and persisted successfully.",
  };
};
