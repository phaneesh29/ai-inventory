import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, NotFoundError } from "../utils/errors.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import { sendError } from "../utils/apiResponse.js";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.originalUrl, method: req.method }, err.message);
    } else {
      logger.warn({ errCode: err.errorCode, path: req.originalUrl, method: req.method }, err.message);
    }
    sendError(res, err.message, err.statusCode, err.errorCode, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    logger.warn({ path: req.originalUrl, issues }, "Zod Validation Error");
    sendError(res, "Request validation failed", 400, "VALIDATION_ERROR", issues);
    return;
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 && env.NODE_ENV === "production"
    ? "An unexpected internal server error occurred"
    : err.message || "Internal Server Error";

  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
      statusCode,
    },
    `Unhandled Server Error: ${err.message || "Unknown error"}`
  );

  const debugDetails = env.NODE_ENV === "development" ? { stack: err.stack } : undefined;
  sendError(res, message, statusCode, "INTERNAL_SERVER_ERROR", debugDetails);
};
