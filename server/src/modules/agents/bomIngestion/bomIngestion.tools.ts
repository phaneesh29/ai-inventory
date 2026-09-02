import { tool } from "ai";
import { createBOM, EnrichedBOM } from "../../boms/bom.service.js";
import { CreateBOMSchema } from "../../boms/bom.schema.js";

export const createBOMIngestionTools = () => {
  let createdBOM: EnrichedBOM | null = null;

  const tools = {
    saveBOMToDatabase: tool({
      description: "Persists the standardized BOM and its line items directly into the PostgreSQL database.",
      inputSchema: CreateBOMSchema,
      execute: async (validatedBOMInput) => {
        createdBOM = await createBOM(validatedBOMInput);
        return {
          status: "saved",
          bomId: createdBOM.id,
          itemsCount: createdBOM.items.length,
        };
      },
    }),
  };

  return {
    tools,
    getCreatedBOM: () => createdBOM,
  };
};
