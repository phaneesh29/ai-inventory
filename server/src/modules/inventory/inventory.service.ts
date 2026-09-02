import { eq, ilike, or, and, sql } from "drizzle-orm";
import { db, inventoryTable, itemsTable } from "../../db/index.js";
import { NotFoundError, BadRequestError } from "../../utils/errors.js";
import type {
  AddInventoryItemInput,
  UpdateInventoryItemInput,
  AdjustStockInput,
  AllocateStockInput,
  ReleaseStockInput,
  InventoryQueryInput,
} from "./inventory.schema.js";

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
  totalValuation: number;
  createdAt: Date;
  updatedAt: Date;
}

const mapToEnrichedInventoryItem = (row: {
  inventory: typeof inventoryTable.$inferSelect;
  items: typeof itemsTable.$inferSelect;
}): EnrichedInventoryItem => {
  const quantityAvailable = row.inventory.quantityOnHand - row.inventory.quantityReserved;
  const unitCost = row.inventory.unitCost || 0;
  const totalValuation = Number((row.inventory.quantityOnHand * unitCost).toFixed(2));

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
    totalValuation,
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

export const findLowStockAlerts = async (): Promise<{
  alerts: Array<EnrichedInventoryItem & { deficit: number; recommendedReorder: number }>;
  totalAlerts: number;
}> => {
  const rows = await db
    .select({
      inventory: inventoryTable,
      items: itemsTable,
    })
    .from(inventoryTable)
    .innerJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id))
    .where(
      sql`${inventoryTable.quantityOnHand} - ${inventoryTable.quantityReserved} <= ${inventoryTable.reorderThreshold}`
    );

  const enriched = rows.map((r) => {
    const item = mapToEnrichedInventoryItem(r);
    const deficit = Math.max(0, item.reorderThreshold - item.quantityAvailable);
    const recommendedReorder = deficit > 0 ? deficit + item.reorderThreshold * 2 : item.reorderThreshold;
    return {
      ...item,
      deficit,
      recommendedReorder,
    };
  });

  return {
    alerts: enriched,
    totalAlerts: enriched.length,
  };
};

export const addInventoryItem = async (data: AddInventoryItemInput): Promise<EnrichedInventoryItem> => {
  let resolvedItemId = data.itemId;

  if (!resolvedItemId && data.partNumber) {
    const [foundItem] = await db
      .select({ id: itemsTable.id })
      .from(itemsTable)
      .where(eq(itemsTable.partNumber, data.partNumber));

    if (foundItem) {
      resolvedItemId = foundItem.id;
    } else {
      const [createdItem] = await db
        .insert(itemsTable)
        .values({
          partNumber: data.partNumber,
          name: data.name || data.partNumber,
          description: data.description || null,
          category: data.category || "Other",
          unit: data.unit || "pcs",
          specifications: data.specifications || {},
        })
        .returning({ id: itemsTable.id });

      resolvedItemId = createdItem.id;
    }
  }

  if (!resolvedItemId) {
    throw new BadRequestError("Item ID or Part Number must be provided");
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

export const adjustStock = async (data: AdjustStockInput): Promise<EnrichedInventoryItem> => {
  const whereClause = data.id
    ? eq(inventoryTable.id, data.id)
    : eq(inventoryTable.itemId, data.itemId!);

  const [existing] = await db.select().from(inventoryTable).where(whereClause);

  if (!existing) {
    throw new NotFoundError("Inventory record not found for adjustment");
  }

  const newOnHand = existing.quantityOnHand + data.delta;
  if (newOnHand < 0) {
    throw new BadRequestError(`Cannot reduce quantity below 0. Current on hand: ${existing.quantityOnHand}`);
  }
  if (newOnHand < existing.quantityReserved) {
    throw new BadRequestError(
      `New on-hand quantity (${newOnHand}) would be less than reserved quantity (${existing.quantityReserved})`
    );
  }

  const [updated] = await db
    .update(inventoryTable)
    .set({
      quantityOnHand: newOnHand,
      location: data.location || existing.location,
      updatedAt: new Date(),
    })
    .where(eq(inventoryTable.id, existing.id))
    .returning();

  return findInventoryById(updated.id);
};

export const allocateStock = async (data: AllocateStockInput): Promise<EnrichedInventoryItem> => {
  const whereClause = data.id
    ? eq(inventoryTable.id, data.id)
    : eq(inventoryTable.itemId, data.itemId!);

  const [existing] = await db.select().from(inventoryTable).where(whereClause);

  if (!existing) {
    throw new NotFoundError("Inventory record not found for allocation");
  }

  const available = existing.quantityOnHand - existing.quantityReserved;
  if (data.quantity > available) {
    throw new BadRequestError(
      `Insufficient available stock for allocation. Requested: ${data.quantity}, Available: ${available} (On Hand: ${existing.quantityOnHand}, Already Reserved: ${existing.quantityReserved})`
    );
  }

  const [updated] = await db
    .update(inventoryTable)
    .set({
      quantityReserved: existing.quantityReserved + data.quantity,
      updatedAt: new Date(),
    })
    .where(eq(inventoryTable.id, existing.id))
    .returning();

  return findInventoryById(updated.id);
};

export const releaseStock = async (data: ReleaseStockInput): Promise<EnrichedInventoryItem> => {
  const whereClause = data.id
    ? eq(inventoryTable.id, data.id)
    : eq(inventoryTable.itemId, data.itemId!);

  const [existing] = await db.select().from(inventoryTable).where(whereClause);

  if (!existing) {
    throw new NotFoundError("Inventory record not found for release");
  }

  const newReserved = Math.max(0, existing.quantityReserved - data.quantity);

  const [updated] = await db
    .update(inventoryTable)
    .set({
      quantityReserved: newReserved,
      updatedAt: new Date(),
    })
    .where(eq(inventoryTable.id, existing.id))
    .returning();

  return findInventoryById(updated.id);
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
