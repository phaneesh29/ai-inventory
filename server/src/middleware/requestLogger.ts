import { pinoHttp } from "pino-http";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import type { IncomingMessage, ServerResponse } from "http";

export const requestLogger = pinoHttp({
  logger,
  autoLogging: env.NODE_ENV !== "test",
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req: any) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
    }),
  },
});
