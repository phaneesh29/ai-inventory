import { Request, Response } from "express";
import { generateSupplyChainInsights } from "./insights.service.js";
import { generateExecutiveAIBrief } from "./insights.agent.js";
import { sendSuccess } from "../../utils/apiResponse.js";

export const getSupplyChainInsights = async (_req: Request, res: Response): Promise<Response> => {
  const insights = await generateSupplyChainInsights();
  const executiveAIBrief = await generateExecutiveAIBrief(insights);

  return sendSuccess(
    res,
    {
      ...insights,
      executiveAIBrief,
    },
    "Supply chain insights, demand forecasts, and anomaly detection generated successfully"
  );
};
