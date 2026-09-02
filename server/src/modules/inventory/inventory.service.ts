import { eq, ilike, or, and, sql } from "drizzle-orm";
import { db, inventoryTable, itemsTable } from "../../db/index.js";
import { NotFoundError, BadRequestError } from "../../utils/errors.js";
import type { AddInventoryItemInput, UpdateInventoryItemInput, InventoryQueryInput } from "./inventory.schema.js";

export interface EnrichedInventoryItem {
  id: string;
  itemId: string;
  partNumber: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  specifications: Record<string, any>;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderThreshold: number;
  isLowStock: boolean;
  location: string;
  unitCost: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const mapToEnrichedInventoryItem = (row: {
  inventory: typeof inventoryTable.$inferSelect;
  items: typeof itemsTable.$inferSelect;
}): EnrichedInventoryItem => {
  const quantityAvailable = row.inventory.quantityOnHand - row.inventory.quantityReserved;
  return {
    id: row.inventory.id,
    itemId: row.items.id,
    partNumber: row.items.partNumber,
    name: row.items.name,
    description: row.items.description,
    category: row.items.category,
    unit: row.items.unit,
    specifications: row.items.specifications,
    quantityOnHand: row.inventory.quantityOnHand,
    quantityReserved: row.inventory.quantityReserved,
    quantityAvailable,
    reorderThreshold: row.inventory.reorderThreshold,
    isLowStock: quantityAvailable <= row.inventory.reorderThreshold,
    location: row.inventory.location,
    unitCost: row.inventory.unitCost,
    createdAt: row.inventory.createdAt,
    updatedAt: row.inventory.updatedAt,
  };
};

export const findAllInventory = async (
  query: InventoryQueryInput
): Promise<{ items: EnrichedInventoryItem[]; total: number }> => {
  const conditions = [];

  if (query.search) {
    const searchPattern = `%${query.search}%`;
    conditions.push(
      or(
        ilike(itemsTable.partNumber, searchPattern),
        ilike(itemsTable.name, searchPattern),
        ilike(inventoryTable.location, searchPattern)
      )
    );
  }

  if (query.category) {
    conditions.push(ilike(itemsTable.category, query.category));
  }

  if (query.lowStock === "true") {
    conditions.push(
      sql`${inventoryTable.quantityOnHand} - ${inventoryTable.quantityReserved} <= ${inventoryTable.reorderThreshold}`
    );
  } else if (query.lowStock === "false") {
    conditions.push(
      sql`${inventoryTable.quantityOnHand} - ${inventoryTable.quantityReserved} > ${inventoryTable.reorderThreshold}`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalCountResult] = await db
    .select({ count: sql`count(*)::int` })
    .from(inventoryTable)
    .innerJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id))
    .where(whereClause);

  const rows = await db
    .select({
      inventory: inventoryTable,
      items: itemsTable,
    })
    .from(inventoryTable)
    .innerJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id))
    .where(whereClause)
    .limit(query.limit)
    .offset(query.offset);

  return {
    items: rows.map(mapToEnrichedInventoryItem),
    total: Number(totalCountResult?.count || 0),
  };
};

export const findInventoryById = async (id: string): Promise<EnrichedInventoryItem> => {
  const [row] = await db
    .select({
      inventory: inventoryTable,
      items: itemsTable,
    })
    .from(inventoryTable)
    .innerJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id))
    .where(eq(inventoryTable.id, id));

  if (!row) {
    throw new NotFoundError(`Inventory record with ID '${id}' not found`);
  }

  return mapToEnrichedInventoryItem(row);
};

export const addInventoryItem = async (data: AddInventoryItemInput): Promise<EnrichedInventoryItem> => {
  let resolvedItemId = data.itemId;

  if (!resolvedItemId && data.partNumber) {
    const [foundItem] = await db
      .select({ id: itemsTable.id })
      .from(itemsTable)
      .where(eq(itemsTable.partNumber, data.partNumber));

    if (!foundItem) {
      throw new NotFoundError(`Item with part number '${data.partNumber}' not found in master catalog`);
    }

    resolvedItemId = foundItem.id;
  }

  if (!resolvedItemId) {
    throw new BadRequestError("Item ID could not be resolved");
  }

  const [existingRecord] = await db
    .select({ id: inventoryTable.id })
    .from(inventoryTable)
    .where(eq(inventoryTable.itemId, resolvedItemId));

  let inventoryId: string;

  if (existingRecord) {
    const [updated] = await db
      .update(inventoryTable)
      .set({
        quantityOnHand: sql`${inventoryTable.quantityOnHand} + ${data.quantityOnHand}`,
        quantityReserved: data.quantityReserved !== undefined ? data.quantityReserved : undefined,
        reorderThreshold: data.reorderThreshold !== undefined ? data.reorderThreshold : undefined,
        location: data.location || undefined,
        unitCost: data.unitCost !== undefined ? data.unitCost : undefined,
        updatedAt: new Date(),
      })
      .where(eq(inventoryTable.id, existingRecord.id))
      .returning({ id: inventoryTable.id });

    inventoryId = updated.id;
  } else {
    const [inserted] = await db
      .insert(inventoryTable)
      .values({
        itemId: resolvedItemId,
        quantityOnHand: data.quantityOnHand,
        quantityReserved: data.quantityReserved,
        reorderThreshold: data.reorderThreshold,
        location: data.location,
        unitCost: data.unitCost,
      })
      .returning({ id: inventoryTable.id });

    inventoryId = inserted.id;
  }

  return findInventoryById(inventoryId);
};

export const updateInventoryItem = async (
  id: string,
  data: UpdateInventoryItemInput
): Promise<EnrichedInventoryItem> => {
  const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.id, id));

  if (!existing) {
    throw new NotFoundError(`Inventory record with ID '${id}' not found`);
  }

  const nextOnHand = data.quantityOnHand !== undefined ? data.quantityOnHand : existing.quantityOnHand;
  const nextReserved = data.quantityReserved !== undefined ? data.quantityReserved : existing.quantityReserved;

  if (nextReserved > nextOnHand) {
    throw new BadRequestError(`Reserved quantity (${nextReserved}) cannot exceed quantity on hand (${nextOnHand})`);
  }

  await db
    .update(inventoryTable)
    .set({
      quantityOnHand: data.quantityOnHand,
      quantityReserved: data.quantityReserved,
      reorderThreshold: data.reorderThreshold,
      location: data.location,
      unitCost: data.unitCost,
      updatedAt: new Date(),
    })
    .where(eq(inventoryTable.id, id));

  return findInventoryById(id);
};

export const deleteInventoryItem = async (id: string): Promise<{ id: string }> => {
  const [existing] = await db.select().from(inventoryTable).where(eq(inventoryTable.id, id));

  if (!existing) {
    throw new NotFoundError(`Inventory record with ID '${id}' not found`);
  }

  await db.delete(inventoryTable).where(eq(inventoryTable.id, id));

  return { id };
};
