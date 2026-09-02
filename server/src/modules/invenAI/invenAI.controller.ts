import { Request, Response } from "express";
import { pipeAgentUIStreamToResponse } from "ai";
import { createInvenAIAgent } from "./invenAI.agent.js";
import type { InvenAIChatInput } from "./invenAI.schema.js";

export const chatWithInvenAI = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as InvenAIChatInput;
  const agent = createInvenAIAgent();

  await pipeAgentUIStreamToResponse({
    response: res,
    agent,
    uiMessages: body.messages || [],
  });
};
