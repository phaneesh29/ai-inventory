import { z } from "zod";

export const CreateItemSchema = z.object({
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
});

export const UpdateItemSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().nullable().optional(),
  category: z.string().trim().min(1).max(100).optional(),
  unit: z.string().trim().min(1).max(50).optional(),
  specifications: z.record(z.string(), z.any()).optional(),
});

export const ItemQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
});

export const ItemIdParamSchema = z.object({
  id: z.uuid({ error: "Invalid item UUID format" }),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;
export type ItemQueryInput = z.infer<typeof ItemQuerySchema>;
