import { eq, desc, ilike, sql } from "drizzle-orm";
import { db, workspacesTable, Workspace } from "../../db/index.js";
import { NotFoundError } from "../../utils/errors.js";
import type { CreateWorkspaceInput, UpdateWorkspaceInput, ListWorkspacesQuery } from "./workspace.schema.js";

export const findAllWorkspaces = async (
  query: ListWorkspacesQuery
): Promise<{ workspaces: Workspace[]; total: number }> => {
  const { limit, offset, search } = query;
  const whereClause = search ? ilike(workspacesTable.name, `%${search}%`) : undefined;

  const [workspaces, totalResult] = await Promise.all([
    db
      .select()
      .from(workspacesTable)
      .where(whereClause)
      .orderBy(desc(workspacesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(workspacesTable)
      .where(whereClause),
  ]);

  return {
    workspaces,
    total: totalResult[0]?.count ?? 0,
  };
};

export const findWorkspaceById = async (id: string): Promise<Workspace> => {
  const [workspace] = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, id))
    .limit(1);

  if (!workspace) {
    throw new NotFoundError(`Workspace with ID '${id}' not found`);
  }

  return workspace;
};

export const createWorkspace = async (input: CreateWorkspaceInput): Promise<Workspace> => {
  const [newWorkspace] = await db
    .insert(workspacesTable)
    .values({
      name: input.name,
    })
    .returning();

  return newWorkspace;
};

export const updateWorkspace = async (
  id: string,
  input: UpdateWorkspaceInput
): Promise<Workspace> => {
  await findWorkspaceById(id);

  const [updatedWorkspace] = await db
    .update(workspacesTable)
    .set({
      name: input.name,
      updatedAt: new Date(),
    })
    .where(eq(workspacesTable.id, id))
    .returning();

  return updatedWorkspace;
};

export const deleteWorkspace = async (
  id: string
): Promise<{ id: string; deleted: boolean }> => {
  await findWorkspaceById(id);
  await db.delete(workspacesTable).where(eq(workspacesTable.id, id));

  return { id, deleted: true };
};
