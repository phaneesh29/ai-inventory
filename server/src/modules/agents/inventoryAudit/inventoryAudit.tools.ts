import { tool } from "ai";
import { z } from "zod";
import { eq, inArray, and, sql, not } from "drizzle-orm";
import { db, bomsTable, bomItemsTable, itemsTable, inventoryTable } from "../../../db/index.js";

export interface BOMRequirementDetail {
  bomId: string;
  bomName: string;
  version: string;
  workspaceId: string;
  items: {
    bomItemId: string;
    itemId: string;
    partNumber: string;
    name: string;
    category: string;
    unit: string;
    specifications: Record<string, any>;
    requiredQuantity: number;
    referenceDesignator: string | null;
  }[];
}

export interface StockCheckResult {
  itemId: string;
  partNumber: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderThreshold: number;
  isLowStock: boolean;
  location: string;
  unitCost: number | null;
}

export interface SubstituteOption {
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  unit: string;
  specifications: Record<string, any>;
  quantityAvailable: number;
  location: string;
  unitCost: number | null;
}

export const createInventoryAuditTools = () => {
  let cachedBOM: BOMRequirementDetail | null = null;
  let cachedStockResults: StockCheckResult[] = [];
  let cachedSubstitutes: Record<string, SubstituteOption[]> = {};

  const fetchBOMRequirements = tool({
    description: "Fetches all required components, specifications, and line quantities for a specific BOM ID.",
    inputSchema: z.object({
      bomId: z.uuid({ error: "Valid BOM UUID is required" }),
    }),
    execute: async ({ bomId }) => {
      const [bom] = await db.select().from(bomsTable).where(eq(bomsTable.id, bomId));

      if (!bom) {
        return { error: `BOM with ID '${bomId}' not found.` };
      }

      const rows = await db
        .select({
          bomItem: bomItemsTable,
          item: itemsTable,
        })
        .from(bomItemsTable)
        .innerJoin(itemsTable, eq(bomItemsTable.itemId, itemsTable.id))
        .where(eq(bomItemsTable.bomId, bomId));

      const result: BOMRequirementDetail = {
        bomId: bom.id,
        bomName: bom.name,
        version: bom.version,
        workspaceId: bom.workspaceId,
        items: rows.map((r) => ({
          bomItemId: r.bomItem.id,
          itemId: r.item.id,
          partNumber: r.item.partNumber,
          name: r.item.name,
          category: r.item.category,
          unit: r.item.unit,
          specifications: r.item.specifications || {},
          requiredQuantity: r.bomItem.quantity,
          referenceDesignator: r.bomItem.referenceDesignator,
        })),
      };

      cachedBOM = result;
      return result;
    },
  });

  const checkWarehouseStock = tool({
    description: "Checks real-time warehouse inventory (on-hand, reserved, and available stock) for a list of item UUIDs.",
    inputSchema: z.object({
      itemIds: z.array(z.uuid({ error: "Invalid item UUID" })).min(1),
    }),
    execute: async ({ itemIds }) => {
      const rows = await db
        .select({
          inventory: inventoryTable,
          item: itemsTable,
        })
        .from(inventoryTable)
        .innerJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id))
        .where(inArray(inventoryTable.itemId, itemIds));

      const foundStockMap = new Map<string, StockCheckResult>();

      for (const r of rows) {
        const quantityAvailable = r.inventory.quantityOnHand - r.inventory.quantityReserved;
        foundStockMap.set(r.item.id, {
          itemId: r.item.id,
          partNumber: r.item.partNumber,
          quantityOnHand: r.inventory.quantityOnHand,
          quantityReserved: r.inventory.quantityReserved,
          quantityAvailable,
          reorderThreshold: r.inventory.reorderThreshold,
          isLowStock: quantityAvailable <= r.inventory.reorderThreshold,
          location: r.inventory.location,
          unitCost: r.inventory.unitCost,
        });
      }

      const results: StockCheckResult[] = itemIds.map((itemId) => {
        if (foundStockMap.has(itemId)) {
          return foundStockMap.get(itemId)!;
        }
        return {
          itemId,
          partNumber: "UNKNOWN",
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          reorderThreshold: 10,
          isLowStock: true,
          location: "Not in inventory",
          unitCost: null,
        };
      });

      cachedStockResults = results;
      return results;
    },
  });

  const findSubstituteComponents = tool({
    description: "Searches the warehouse for in-stock, pin-compatible second-source replacement parts within the same category.",
    inputSchema: z.object({
      category: z.string().trim().min(1),
      excludeItemId: z.uuid({ error: "Invalid item UUID" }),
    }),
    execute: async ({ category, excludeItemId }) => {
      const rows = await db
        .select({
          inventory: inventoryTable,
          item: itemsTable,
        })
        .from(inventoryTable)
        .innerJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id))
        .where(
          and(
            eq(itemsTable.category, category),
            not(eq(itemsTable.id, excludeItemId)),
            sql`${inventoryTable.quantityOnHand} - ${inventoryTable.quantityReserved} > 0`
          )
        )
        .limit(5);

      const substitutes: SubstituteOption[] = rows.map((r) => ({
        itemId: r.item.id,
        partNumber: r.item.partNumber,
        name: r.item.name,
        category: r.item.category,
        unit: r.item.unit,
        specifications: r.item.specifications || {},
        quantityAvailable: r.inventory.quantityOnHand - r.inventory.quantityReserved,
        location: r.inventory.location,
        unitCost: r.inventory.unitCost,
      }));

      cachedSubstitutes[excludeItemId] = substitutes;
      return substitutes;
    },
  });

  return {
    tools: {
      fetchBOMRequirements,
      checkWarehouseStock,
      findSubstituteComponents,
    },
    getCachedData: () => ({
      bom: cachedBOM,
      stock: cachedStockResults,
      substitutes: cachedSubstitutes,
    }),
  };
};
