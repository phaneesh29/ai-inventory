import { Request, Response } from "express";
import { generateInvenAIChat } from "./invenAI.agent.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import type { InvenAIChatInput } from "./invenAI.schema.js";

export const chatWithInvenAI = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body as InvenAIChatInput;

  const result = await generateInvenAIChat(body.messages);

  const toolApprovalRequests = [];
  for (const part of result.content) {
    if (part.type === "tool-approval-request") {
      toolApprovalRequests.push(part);
    }
  }

  return sendSuccess(
    res,
    {
      text: result.text,
      toolApprovalRequests,
      steps: result.steps.map((s) => ({
        text: s.text,
        toolCalls: s.toolCalls,
        toolResults: s.toolResults,
        finishReason: s.finishReason,
      })),
      usage: result.usage,
    },
    "InvenAI response processed successfully"
  );
};
