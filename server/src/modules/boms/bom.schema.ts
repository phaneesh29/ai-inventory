import { z } from "zod";

export const BOMItemInputSchema = z.object({
  partNumber: z
    .string({ error: "Part number is required" })
    .trim()
    .min(1, { error: "Part number cannot be empty" })
    .max(100),
  name: z
    .string({ error: "Item name is required" })
    .trim()
    .min(1, { error: "Item name cannot be empty" })
    .max(255),
  description: z.string().trim().optional(),
  category: z
    .string({ error: "Category is required" })
    .trim()
    .min(1, { error: "Category cannot be empty" })
    .max(100),
  unit: z
    .string({ error: "Unit is required" })
    .trim()
    .min(1, { error: "Unit cannot be empty" })
    .max(50),
  specifications: z.record(z.string(), z.any()).default({}),
  quantity: z
    .number({ error: "Quantity must be a number" })
    .positive({ error: "Quantity must be greater than 0" }),
  referenceDesignator: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const CreateBOMSchema = z.object({
  workspaceId: z.uuid({ error: "Valid workspace UUID is required" }),
  name: z
    .string({ error: "BOM name is required" })
    .trim()
    .min(2, { error: "BOM name must be at least 2 characters" })
    .max(255),
  version: z.string().trim().default("v1.0"),
  items: z
    .array(BOMItemInputSchema, { error: "Items array is required" })
    .min(1, { error: "At least one BOM item is required" }),
});

export const ProcessBOMWithAgentSchema = z.object({
  workspaceId: z.uuid({ error: "Valid workspace UUID is required" }),
  name: z
    .string({ error: "BOM name is required" })
    .trim()
    .min(2, { error: "BOM name must be at least 2 characters" })
    .max(255),
  version: z.string().trim().default("v1.0"),
  items: z
    .array(BOMItemInputSchema, { error: "Items array is required" })
    .min(1, { error: "At least one BOM item is required" }),
  instructions: z.string().trim().optional(),
});

export const UpdateBOMSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  version: z.string().trim().max(50).optional(),
});

export const AddBOMItemsSchema = z.object({
  items: z
    .array(BOMItemInputSchema, { error: "Items array is required" })
    .min(1, { error: "At least one item is required" }),
});

export const BOMIdParamSchema = z.object({
  id: z.uuid({ error: "Invalid BOM UUID format" }),
});

export const WorkspaceIdParamSchema = z.object({
  workspaceId: z.uuid({ error: "Invalid workspace UUID format" }),
});

export const RemoveBOMItemParamSchema = z.object({
  id: z.uuid({ error: "Invalid BOM UUID format" }),
  itemId: z.uuid({ error: "Invalid item UUID format" }),
});

export type BOMItemInput = z.infer<typeof BOMItemInputSchema>;
export type CreateBOMInput = z.infer<typeof CreateBOMSchema>;
export type ProcessBOMWithAgentInput = z.infer<typeof ProcessBOMWithAgentSchema>;
export type UpdateBOMInput = z.infer<typeof UpdateBOMSchema>;
export type AddBOMItemsInput = z.infer<typeof AddBOMItemsSchema>;
