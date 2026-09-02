import { eq, desc, inArray, sql } from "drizzle-orm";
import { db, bomsTable, bomItemsTable, itemsTable, workspacesTable, BOM, Item } from "../../db/index.js";
import { NotFoundError } from "../../utils/errors.js";
import type { CreateBOMInput, UpdateBOMInput, AddBOMItemsInput, BOMItemInput } from "./bom.schema.js";

export interface EnrichedBOMItem {
  id: string;
  itemId: string;
  partNumber: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  specifications: Record<string, any>;
  quantity: number;
  referenceDesignator: string | null;
  notes: string | null;
}

export interface EnrichedBOM extends BOM {
  items: EnrichedBOMItem[];
}

export const batchUpsertMasterItems = async (
  itemInputs: BOMItemInput[]
): Promise<Map<string, Item>> => {
  if (itemInputs.length === 0) {
    return new Map();
  }

  const uniquePartNumbers = Array.from(new Set(itemInputs.map((i) => i.partNumber)));

  const existingItems = await db
    .select()
    .from(itemsTable)
    .where(inArray(itemsTable.partNumber, uniquePartNumbers));

  const itemMap = new Map<string, Item>(existingItems.map((item) => [item.partNumber, item]));

  const missingPartInputsMap = new Map<string, BOMItemInput>();
  for (const input of itemInputs) {
    if (!itemMap.has(input.partNumber) && !missingPartInputsMap.has(input.partNumber)) {
      missingPartInputsMap.set(input.partNumber, input);
    }
  }

  const missingInputs = Array.from(missingPartInputsMap.values());

  if (missingInputs.length > 0) {
    const insertedItems = await db
      .insert(itemsTable)
      .values(
        missingInputs.map((input) => ({
          partNumber: input.partNumber,
          name: input.name,
          description: input.description || null,
          category: input.category,
          unit: input.unit,
          specifications: input.specifications || {},
        }))
      )
      .returning();

    for (const item of insertedItems) {
      itemMap.set(item.partNumber, item);
    }
  }

  return itemMap;
};


export const createBOM = async (input: CreateBOMInput): Promise<EnrichedBOM> => {

  const [workspace] = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, input.workspaceId))
    .limit(1);

  if (!workspace) {
    throw new NotFoundError(`Workspace with ID '${input.workspaceId}' not found`);
  }

  const itemMap = await batchUpsertMasterItems(input.items);

  const [newBOM] = await db
    .insert(bomsTable)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      version: input.version,
    })
    .returning();

  const bomItemRows = input.items.map((itemInput) => {
    const masterItem = itemMap.get(itemInput.partNumber)!;
    return {
      bomId: newBOM.id,
      itemId: masterItem.id,
      quantity: itemInput.quantity,
      referenceDesignator: itemInput.referenceDesignator || null,
      notes: itemInput.notes || null,
    };
  });

  const insertedBomItems = await db
    .insert(bomItemsTable)
    .values(bomItemRows)
    .returning();

  const enrichedItems: EnrichedBOMItem[] = insertedBomItems.map((bomItem) => {
    const masterItem = Array.from(itemMap.values()).find((i) => i.id === bomItem.itemId)!;
    return {
      id: bomItem.id,
      itemId: masterItem.id,
      partNumber: masterItem.partNumber,
      name: masterItem.name,
      description: masterItem.description,
      category: masterItem.category,
      unit: masterItem.unit,
      specifications: masterItem.specifications,
      quantity: bomItem.quantity,
      referenceDesignator: bomItem.referenceDesignator,
      notes: bomItem.notes,
    };
  });

  return {
    ...newBOM,
    items: enrichedItems,
  };
};


export const findBOMsByWorkspaceId = async (
  workspaceId: string
): Promise<Array<BOM & { totalItems: number }>> => {
  const [workspace] = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId))
    .limit(1);

  if (!workspace) {
    throw new NotFoundError(`Workspace with ID '${workspaceId}' not found`);
  }

  const boms = await db
    .select({
      id: bomsTable.id,
      workspaceId: bomsTable.workspaceId,
      name: bomsTable.name,
      version: bomsTable.version,
      createdAt: bomsTable.createdAt,
      updatedAt: bomsTable.updatedAt,
      totalItems: sql<number>`count(${bomItemsTable.id})::int`,
    })
    .from(bomsTable)
    .leftJoin(bomItemsTable, eq(bomsTable.id, bomItemsTable.bomId))
    .where(eq(bomsTable.workspaceId, workspaceId))
    .groupBy(bomsTable.id)
    .orderBy(desc(bomsTable.createdAt));

  return boms;
};


export const findBOMById = async (id: string): Promise<EnrichedBOM> => {
  const [bom] = await db
    .select()
    .from(bomsTable)
    .where(eq(bomsTable.id, id))
    .limit(1);

  if (!bom) {
    throw new NotFoundError(`BOM with ID '${id}' not found`);
  }

  const rows = await db
    .select({
      id: bomItemsTable.id,
      itemId: itemsTable.id,
      partNumber: itemsTable.partNumber,
      name: itemsTable.name,
      description: itemsTable.description,
      category: itemsTable.category,
      unit: itemsTable.unit,
      specifications: itemsTable.specifications,
      quantity: bomItemsTable.quantity,
      referenceDesignator: bomItemsTable.referenceDesignator,
      notes: bomItemsTable.notes,
    })
    .from(bomItemsTable)
    .innerJoin(itemsTable, eq(bomItemsTable.itemId, itemsTable.id))
    .where(eq(bomItemsTable.bomId, id));

  return {
    ...bom,
    items: rows,
  };
};


export const updateBOM = async (id: string, input: UpdateBOMInput): Promise<BOM> => {
  await findBOMById(id);

  const [updatedBOM] = await db
    .update(bomsTable)
    .set({
      ...(input.name && { name: input.name }),
      ...(input.version && { version: input.version }),
      updatedAt: new Date(),
    })
    .where(eq(bomsTable.id, id))
    .returning();

  return updatedBOM;
};


export const addItemsToBOM = async (
  bomId: string,
  input: AddBOMItemsInput
): Promise<EnrichedBOM> => {
  await findBOMById(bomId);

  const itemMap = await batchUpsertMasterItems(input.items);


  const bomItemRows = input.items.map((itemInput) => ({
    bomId,
    itemId: itemMap.get(itemInput.partNumber)!.id,
    quantity: itemInput.quantity,
    referenceDesignator: itemInput.referenceDesignator || null,
    notes: itemInput.notes || null,
  }));

  await db.insert(bomItemsTable).values(bomItemRows);

  return findBOMById(bomId);
};


export const removeItemFromBOM = async (
  bomId: string,
  itemId: string
): Promise<{ deleted: boolean }> => {
  await findBOMById(bomId);

  const result = await db
    .delete(bomItemsTable)
    .where(
      sql`${bomItemsTable.bomId} = ${bomId} AND ${bomItemsTable.itemId} = ${itemId}`
    )
    .returning();

  if (result.length === 0) {
    throw new NotFoundError(`Item '${itemId}' not found in BOM '${bomId}'`);
  }

  return { deleted: true };
};


export const deleteBOM = async (id: string): Promise<{ id: string; deleted: boolean }> => {
  await findBOMById(id);
  await db.delete(bomsTable).where(eq(bomsTable.id, id));

  return { id, deleted: true };
};
