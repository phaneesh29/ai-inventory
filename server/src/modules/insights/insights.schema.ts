import { z } from "zod";

export const InsightsQuerySchema = z.object({
  workspaceId: z.uuid({ error: "Invalid workspace UUID format" }).optional(),
});

export type InsightsQueryInput = z.infer<typeof InsightsQuerySchema>;
