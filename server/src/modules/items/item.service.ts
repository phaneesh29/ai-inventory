import { eq, ilike, or, and, sql } from "drizzle-orm";
import { db, itemsTable, inventoryTable, bomItemsTable, Item } from "../../db/index.js";
import { NotFoundError, ConflictError, BadRequestError } from "../../utils/errors.js";
import type { CreateItemInput, UpdateItemInput, ItemQueryInput } from "./item.schema.js";

export const findAllItems = async (
  query: ItemQueryInput
): Promise<{ items: Item[]; total: number }> => {
  const conditions = [];

  if (query.search) {
    const searchPattern = `%${query.search}%`;
    conditions.push(
      or(
        ilike(itemsTable.partNumber, searchPattern),
        ilike(itemsTable.name, searchPattern),
        ilike(itemsTable.description, searchPattern)
      )
    );
  }

  if (query.category) {
    conditions.push(ilike(itemsTable.category, query.category));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ count: sql`count(*)::int` })
    .from(itemsTable)
    .where(whereClause);

  const items = await db
    .select()
    .from(itemsTable)
    .where(whereClause)
    .limit(query.limit)
    .offset(query.offset);

  return {
    items,
    total: Number(totalResult?.count || 0),
  };
};

export const findItemById = async (id: string): Promise<Item> => {
  const [item] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));

  if (!item) {
    throw new NotFoundError(`Item with ID '${id}' not found`);
  }

  return item;
};

export const findItemByPartNumber = async (partNumber: string): Promise<Item> => {
  const [item] = await db.select().from(itemsTable).where(eq(itemsTable.partNumber, partNumber));

  if (!item) {
    throw new NotFoundError(`Item with part number '${partNumber}' not found`);
  }

  return item;
};

export const createItem = async (data: CreateItemInput): Promise<Item> => {
  const [existing] = await db
    .select({ id: itemsTable.id })
    .from(itemsTable)
    .where(eq(itemsTable.partNumber, data.partNumber));

  if (existing) {
    throw new ConflictError(`Item with part number '${data.partNumber}' already exists`);
  }

  const [created] = await db
    .insert(itemsTable)
    .values({
      partNumber: data.partNumber,
      name: data.name,
      description: data.description,
      category: data.category,
      unit: data.unit,
      specifications: data.specifications || {},
    })
    .returning();

  return created;
};

export const updateItem = async (id: string, data: UpdateItemInput): Promise<Item> => {
  const [existing] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));

  if (!existing) {
    throw new NotFoundError(`Item with ID '${id}' not found`);
  }

  const [updated] = await db
    .update(itemsTable)
    .set({
      name: data.name,
      description: data.description,
      category: data.category,
      unit: data.unit,
      specifications: data.specifications,
      updatedAt: new Date(),
    })
    .where(eq(itemsTable.id, id))
    .returning();

  return updated;
};

export const deleteItem = async (id: string): Promise<{ id: string }> => {
  const [existing] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));

  if (!existing) {
    throw new NotFoundError(`Item with ID '${id}' not found`);
  }

  const [bomItemUsage] = await db
    .select({ id: bomItemsTable.id })
    .from(bomItemsTable)
    .where(eq(bomItemsTable.itemId, id))
    .limit(1);

  if (bomItemUsage) {
    throw new BadRequestError("Cannot delete item because it is referenced in one or more active BOMs");
  }

  await db.delete(inventoryTable).where(eq(inventoryTable.itemId, id));
  await db.delete(itemsTable).where(eq(itemsTable.id, id));

  return { id };
};
