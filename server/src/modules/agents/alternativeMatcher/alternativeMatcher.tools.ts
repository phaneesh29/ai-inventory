import { tool } from "ai";
import { z } from "zod";
import { eq, and, sql, not } from "drizzle-orm";
import { db, itemsTable, inventoryTable } from "../../../db/index.js";

export interface WarehouseCandidateItem {
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

export interface CircuitCombinationCandidate {
  topology: "SERIES" | "PARALLEL";
  componentA: {
    itemId: string;
    partNumber: string;
    name: string;
    value: string;
    quantityAvailable: number;
    location: string;
  };
  componentB: {
    itemId: string;
    partNumber: string;
    name: string;
    value: string;
    quantityAvailable: number;
    location: string;
  };
  effectiveCalculatedValue: number;
  targetValue: number;
  percentageError: number;
  unit: string;
}

export const createAlternativeMatcherTools = () => {
  let searchedCandidates: WarehouseCandidateItem[] = [];
  let calculatedCombinations: CircuitCombinationCandidate[] = [];

  const searchWarehouseInventory = tool({
    description: "Searches warehouse inventory for in-stock parts in the same or related component category.",
    inputSchema: z.object({
      category: z.string().trim().min(1),
      excludeItemId: z.uuid({ error: "Invalid item UUID" }).optional(),
    }),
    execute: async ({ category, excludeItemId }) => {
      const conditions = [
        eq(itemsTable.category, category),
        sql`${inventoryTable.quantityOnHand} - ${inventoryTable.quantityReserved} > 0`,
      ];

      if (excludeItemId) {
        conditions.push(not(eq(itemsTable.id, excludeItemId)));
      }

      const rows = await db
        .select({
          inventory: inventoryTable,
          item: itemsTable,
        })
        .from(inventoryTable)
        .innerJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id))
        .where(and(...conditions))
        .limit(20);

      const candidates: WarehouseCandidateItem[] = rows.map((r) => ({
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

      searchedCandidates = candidates;
      return candidates;
    },
  });

  const computeCircuitCombinations = tool({
    description: "Computes series and parallel circuit combinations from in-stock passives (resistors/capacitors) to match a target value.",
    inputSchema: z.object({
      componentType: z.enum(["Resistor", "Capacitor"]),
      targetValueNumeric: z.number().positive({ error: "Target value must be positive" }),
      unit: z.string().default("Ohm"),
    }),
    execute: async ({ componentType, targetValueNumeric, unit }) => {
      const rows = await db
        .select({
          inventory: inventoryTable,
          item: itemsTable,
        })
        .from(inventoryTable)
        .innerJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id))
        .where(
          and(
            eq(itemsTable.category, componentType),
            sql`${inventoryTable.quantityOnHand} - ${inventoryTable.quantityReserved} > 0`
          )
        );

      const parsedItems: {
        item: typeof itemsTable.$inferSelect;
        available: number;
        location: string;
        numericValue: number | null;
        rawSpec: string;
      }[] = [];

      for (const r of rows) {
        const available = r.inventory.quantityOnHand - r.inventory.quantityReserved;
        const specs = r.item.specifications || {};
        const specStr = String(specs.resistance || specs.capacitance || r.item.name);

        let numericVal: number | null = null;
        const matchK = specStr.match(/(\d+(?:\.\d+)?)\s*k/i);
        const matchM = specStr.match(/(\d+(?:\.\d+)?)\s*M/i);
        const matchU = specStr.match(/(\d+(?:\.\d+)?)\s*u/i);
        const matchN = specStr.match(/(\d+(?:\.\d+)?)\s*n/i);
        const matchP = specStr.match(/(\d+(?:\.\d+)?)\s*p/i);
        const matchNum = specStr.match(/(\d+(?:\.\d+)?)/);

        if (matchK) {
          numericVal = parseFloat(matchK[1]) * 1000;
        } else if (matchM) {
          numericVal = parseFloat(matchM[1]) * 1000000;
        } else if (matchU) {
          numericVal = parseFloat(matchU[1]) * 0.000001;
        } else if (matchN) {
          numericVal = parseFloat(matchN[1]) * 0.000000001;
        } else if (matchP) {
          numericVal = parseFloat(matchP[1]) * 0.000000000001;
        } else if (matchNum) {
          numericVal = parseFloat(matchNum[1]);
        }

        if (numericVal !== null && numericVal > 0) {
          parsedItems.push({
            item: r.item,
            available,
            location: r.inventory.location,
            numericValue: numericVal,
            rawSpec: specStr,
          });
        }
      }

      const combinations: CircuitCombinationCandidate[] = [];

      for (let i = 0; i < parsedItems.length; i++) {
        for (let j = i; j < parsedItems.length; j++) {
          const a = parsedItems[i];
          const b = parsedItems[j];
          if (!a.numericValue || !b.numericValue) continue;

          if (i === j && a.available < 2) continue;

          if (componentType === "Resistor") {
            const seriesVal = a.numericValue + b.numericValue;
            const seriesErr = Math.abs((seriesVal - targetValueNumeric) / targetValueNumeric) * 100;

            if (seriesErr <= 5.0) {
              combinations.push({
                topology: "SERIES",
                componentA: {
                  itemId: a.item.id,
                  partNumber: a.item.partNumber,
                  name: a.item.name,
                  value: a.rawSpec,
                  quantityAvailable: a.available,
                  location: a.location,
                },
                componentB: {
                  itemId: b.item.id,
                  partNumber: b.item.partNumber,
                  name: b.item.name,
                  value: b.rawSpec,
                  quantityAvailable: b.available,
                  location: b.location,
                },
                effectiveCalculatedValue: seriesVal,
                targetValue: targetValueNumeric,
                percentageError: Number(seriesErr.toFixed(2)),
                unit,
              });
            }

            const parallelVal = (a.numericValue * b.numericValue) / (a.numericValue + b.numericValue);
            const parallelErr = Math.abs((parallelVal - targetValueNumeric) / targetValueNumeric) * 100;

            if (parallelErr <= 5.0) {
              combinations.push({
                topology: "PARALLEL",
                componentA: {
                  itemId: a.item.id,
                  partNumber: a.item.partNumber,
                  name: a.item.name,
                  value: a.rawSpec,
                  quantityAvailable: a.available,
                  location: a.location,
                },
                componentB: {
                  itemId: b.item.id,
                  partNumber: b.item.partNumber,
                  name: b.item.name,
                  value: b.rawSpec,
                  quantityAvailable: b.available,
                  location: b.location,
                },
                effectiveCalculatedValue: parallelVal,
                targetValue: targetValueNumeric,
                percentageError: Number(parallelErr.toFixed(2)),
                unit,
              });
            }
          } else if (componentType === "Capacitor") {
            const parallelCapVal = a.numericValue + b.numericValue;
            const parallelCapErr = Math.abs((parallelCapVal - targetValueNumeric) / targetValueNumeric) * 100;

            if (parallelCapErr <= 5.0) {
              combinations.push({
                topology: "PARALLEL",
                componentA: {
                  itemId: a.item.id,
                  partNumber: a.item.partNumber,
                  name: a.item.name,
                  value: a.rawSpec,
                  quantityAvailable: a.available,
                  location: a.location,
                },
                componentB: {
                  itemId: b.item.id,
                  partNumber: b.item.partNumber,
                  name: b.item.name,
                  value: b.rawSpec,
                  quantityAvailable: b.available,
                  location: b.location,
                },
                effectiveCalculatedValue: parallelCapVal,
                targetValue: targetValueNumeric,
                percentageError: Number(parallelCapErr.toFixed(2)),
                unit,
              });
            }
          }
        }
      }

      calculatedCombinations = combinations.slice(0, 5);
      return calculatedCombinations;
    },
  });

  return {
    tools: {
      searchWarehouseInventory,
      computeCircuitCombinations,
    },
    getCachedData: () => ({
      candidates: searchedCandidates,
      combinations: calculatedCombinations,
    }),
  };
};
