import { tool } from "ai";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db, inventoryTable, bomItemsTable } from "../../../db/index.js";

export const StockReservationItemSchema = z.object({
  itemId: z.uuid({ error: "Invalid item UUID" }),
  partNumber: z.string().min(1),
  quantityToReserve: z.number().positive({ error: "Quantity to reserve must be greater than 0" }),
  location: z.string().optional(),
});

export const ComponentSubstitutionItemSchema = z.object({
  bomId: z.uuid({ error: "Invalid BOM UUID" }),
  originalItemId: z.uuid({ error: "Invalid original item UUID" }),
  originalPartNumber: z.string().min(1),
  replacementItemId: z.uuid({ error: "Invalid replacement item UUID" }),
  replacementPartNumber: z.string().min(1),
  substitutionTier: z.enum([
    "TIER_1_DROP_IN",
    "TIER_2_PARAMETRIC_UPGRADE",
    "TIER_3_CIRCUIT_COMBINATION",
  ]),
  circuitTopology: z.enum(["SINGLE", "SERIES", "PARALLEL"]).default("SINGLE"),
  engineeringNotes: z.string().min(1),
});

export type StockReservationItem = z.infer<typeof StockReservationItemSchema>;
export type ComponentSubstitutionItem = z.infer<typeof ComponentSubstitutionItemSchema>;

export const reserveStockInDB = async (reservations: StockReservationItem[]) => {
  const executed = [];

  for (const res of reservations) {
    const [updated] = await db
      .update(inventoryTable)
      .set({
        quantityReserved: sql`${inventoryTable.quantityReserved} + ${res.quantityToReserve}`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryTable.itemId, res.itemId))
      .returning();

    if (updated) {
      executed.push({
        itemId: res.itemId,
        partNumber: res.partNumber,
        reservedQuantity: res.quantityToReserve,
        totalQuantityReserved: updated.quantityReserved,
        location: updated.location,
      });
    }
  }

  return {
    status: "STOCK_RESERVED_SUCCESSFULLY",
    totalItemsReserved: executed.length,
    reservations: executed,
  };
};

export const applySubstitutionsInDB = async (substitutions: ComponentSubstitutionItem[]) => {
  const executed = [];

  for (const sub of substitutions) {
    const [updated] = await db
      .update(bomItemsTable)
      .set({
        itemId: sub.replacementItemId,
        notes: `Substituted with ${sub.replacementPartNumber} (${sub.substitutionTier}, ${sub.circuitTopology}): ${sub.engineeringNotes}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bomItemsTable.bomId, sub.bomId),
          eq(bomItemsTable.itemId, sub.originalItemId)
        )
      )
      .returning();

    if (updated) {
      executed.push({
        bomItemId: updated.id,
        originalPartNumber: sub.originalPartNumber,
        replacementPartNumber: sub.replacementPartNumber,
        substitutionTier: sub.substitutionTier,
        circuitTopology: sub.circuitTopology,
        notes: sub.engineeringNotes,
      });
    }
  }

  return {
    status: "SUBSTITUTIONS_APPLIED_SUCCESSFULLY",
    totalSubstitutionsApplied: executed.length,
    substitutions: executed,
  };
};

export const createProcessExecutionTools = () => {
  const reserveWarehouseStock = tool({
    description: "Allocates and reserves warehouse inventory quantities for production batch assembly.",
    inputSchema: z.object({
      reservations: z.array(StockReservationItemSchema).min(1),
    }),
    execute: async ({ reservations }) => {
      return reserveStockInDB(reservations);
    },
  });

  const applyComponentSubstitutions = tool({
    description: "Applies approved component substitutions directly into the BOM line items in PostgreSQL.",
    inputSchema: z.object({
      substitutions: z.array(ComponentSubstitutionItemSchema).min(1),
    }),
    execute: async ({ substitutions }) => {
      return applySubstitutionsInDB(substitutions);
    },
  });

  return {
    reserveWarehouseStock,
    applyComponentSubstitutions,
  };
};
