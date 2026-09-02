import { z } from "zod";

export const InvenAIChatSchema = z.object({
  messages: z.array(z.any()).min(1, { error: "At least one message is required" }),
});

export type InvenAIChatInput = z.infer<typeof InvenAIChatSchema>;
