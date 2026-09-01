import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import type { Server } from "http";

const startServer = async () => {
  const app = createApp();

  const server: Server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        healthCheck: `http://localhost:${env.PORT}/api/health`,
      },
      `⚡ Server running at http://localhost:${env.PORT}`
    );
  });

  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forcing shutdown after timeout.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("unhandledRejection", (reason: any) => {
    logger.error({ reason }, "Unhandled Promise Rejection");
  });

  process.on("uncaughtException", (error: Error) => {
    logger.fatal({ error }, "Uncaught Exception detected! Exiting...");
    process.exit(1);
  });
};

startServer().catch((error) => {
  logger.fatal({ error }, "Failed to start server");
  process.exit(1);
});
