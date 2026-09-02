import { tool } from "ai";
import { logger } from "../../config/logger.js";
import { createBOM, EnrichedBOM } from "./bom.service.js";
import { CreateBOMSchema } from "./bom.schema.js";

export const createBOMTools = () => {
  let createdBOM: EnrichedBOM | null = null;

  const tools = {
    saveBOMToDatabase: tool({
      description: "Persists the standardized BOM and its line items directly into Neon PostgreSQL.",
      inputSchema: CreateBOMSchema,
      execute: async (validatedBOMInput) => {
        logger.info(
          { name: validatedBOMInput.name, workspaceId: validatedBOMInput.workspaceId },
          "BOM Agent: persisting BOM to database"
        );
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
