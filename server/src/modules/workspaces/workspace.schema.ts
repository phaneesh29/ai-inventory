import { z } from "zod";

export const CreateWorkspaceSchema = z.object({
  name: z
    .string({ error: "Workspace name is required" })
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(255, { error: "Name must not exceed 255 characters" }),
});

export const UpdateWorkspaceSchema = z.object({
  name: z
    .string({ error: "Workspace name is required" })
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(255, { error: "Name must not exceed 255 characters" }),
});

export const WorkspaceIdParamSchema = z.object({
  id: z.uuid({ error: "Invalid workspace UUID format" }),
});

export const ListWorkspacesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type ListWorkspacesQuery = z.infer<typeof ListWorkspacesQuerySchema>;
