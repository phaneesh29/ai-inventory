import { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";

export const getHealth = (_req: Request, res: Response): Response => {
  return sendSuccess(
    res,
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    "Service operational"
  );
};
