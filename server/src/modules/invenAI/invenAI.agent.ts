import { ToolLoopAgent, type ModelMessage } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { INVEN_AI_INSTRUCTIONS } from "./invenAI.instructions.js";
import { createInvenAITools } from "./invenAI.tools.js";

export const createInvenAIAgent = () => {
  const tools = createInvenAITools();

  return new ToolLoopAgent({
    model: mistral("mistral-medium-latest"),
    instructions: INVEN_AI_INSTRUCTIONS,
    tools,
    toolApproval: {
      insertMasterComponent: "user-approval",
      addWarehouseStock: "user-approval",
      registerSupplier: "user-approval",
      addSupplierCatalogItem: "user-approval",
    },
  });
};

export const generateInvenAIChat = async (messages: ModelMessage[]) => {
  const agent = createInvenAIAgent();
  return agent.generate({
    messages,
  });
};
