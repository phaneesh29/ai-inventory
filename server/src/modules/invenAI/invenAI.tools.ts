import { tool } from "ai";
import { z } from "zod";
import { eq, ilike, or, and, sql, lte } from "drizzle-orm";
import {
  db,
  itemsTable,
  inventoryTable,
  suppliersTable,
  supplierItemsTable,
  bomsTable,
  bomItemsTable,
} from "../../db/index.js";

export const createInvenAITools = () => {
  const searchComponents = tool({
    description: "Searches the master component catalog by part number, name, category, or specifications.",
    inputSchema: z.object({
      query: z.string().min(1, { error: "Search query is required" }),
      category: z.string().optional(),
      limit: z.number().int().positive().max(50).default(10),
    }),
    execute: async ({ query, category, limit }) => {
      const searchPattern = `%${query}%`;
      const baseFilter = or(
        ilike(itemsTable.partNumber, searchPattern),
        ilike(itemsTable.name, searchPattern),
        ilike(itemsTable.description, searchPattern)
      );

      const filter = category
        ? and(baseFilter, eq(itemsTable.category, category))
        : baseFilter;

      const items = await db
        .select()
        .from(itemsTable)
        .where(filter)
        .limit(limit);

      return {
        totalMatches: items.length,
        items,
      };
    },
  });

  const queryInventoryStock = tool({
    description: "Queries warehouse inventory stock levels, available quantities, physical shelf locations, and unit costs.",
    inputSchema: z.object({
      partNumber: z.string().optional(),
      itemId: z.uuid({ error: "Invalid item UUID" }).optional(),
      location: z.string().optional(),
      limit: z.number().int().positive().max(50).default(10),
    }),
    execute: async ({ partNumber, itemId, location, limit }) => {
      let query = db
        .select({
          itemId: itemsTable.id,
          partNumber: itemsTable.partNumber,
          name: itemsTable.name,
          category: itemsTable.category,
          unit: itemsTable.unit,
          quantityOnHand: inventoryTable.quantityOnHand,
          quantityReserved: inventoryTable.quantityReserved,
          quantityAvailable: sql<number>`${inventoryTable.quantityOnHand} - ${inventoryTable.quantityReserved}`,
          reorderThreshold: inventoryTable.reorderThreshold,
          location: inventoryTable.location,
          unitCost: inventoryTable.unitCost,
        })
        .from(inventoryTable)
        .innerJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id));

      const conditions = [];

      if (itemId) {
        conditions.push(eq(inventoryTable.itemId, itemId));
      }
      if (partNumber) {
        conditions.push(ilike(itemsTable.partNumber, `%${partNumber}%`));
      }
      if (location) {
        conditions.push(ilike(inventoryTable.location, `%${location}%`));
      }

      const rows = conditions.length > 0
        ? await query.where(and(...conditions)).limit(limit)
        : await query.limit(limit);

      return {
        totalRecords: rows.length,
        inventory: rows,
      };
    },
  });

  const querySupplierCatalog = tool({
    description: "Queries supplier quotes, pricing tiers, MOQ, available distributor stock, and lead times across suppliers.",
    inputSchema: z.object({
      partNumber: z.string().optional(),
      supplierCode: z.string().optional(),
      limit: z.number().int().positive().max(50).default(15),
    }),
    execute: async ({ partNumber, supplierCode, limit }) => {
      let query = db
        .select({
          supplierId: suppliersTable.id,
          supplierName: suppliersTable.name,
          supplierCode: suppliersTable.code,
          supplierPartNumber: supplierItemsTable.supplierPartNumber,
          masterPartNumber: itemsTable.partNumber,
          masterItemName: itemsTable.name,
          unitPrice: supplierItemsTable.unitPrice,
          minimumOrderQuantity: supplierItemsTable.minimumOrderQuantity,
          stockAvailable: supplierItemsTable.stockAvailable,
          leadTimeDays: supplierItemsTable.leadTimeDays,
          priceTiers: supplierItemsTable.priceTiers,
          isPreferred: supplierItemsTable.isPreferred,
          reliabilityScore: suppliersTable.reliabilityScore,
        })
        .from(supplierItemsTable)
        .innerJoin(suppliersTable, eq(supplierItemsTable.supplierId, suppliersTable.id))
        .innerJoin(itemsTable, eq(supplierItemsTable.itemId, itemsTable.id));

      const conditions = [];

      if (partNumber) {
        conditions.push(ilike(itemsTable.partNumber, `%${partNumber}%`));
      }
      if (supplierCode) {
        conditions.push(ilike(suppliersTable.code, `%${supplierCode}%`));
      }

      const rows = conditions.length > 0
        ? await query.where(and(...conditions)).limit(limit)
        : await query.limit(limit);

      return {
        totalQuotes: rows.length,
        quotes: rows,
      };
    },
  });

  const listLowStockAlerts = tool({
    description: "Retrieves all warehouse inventory components where available stock is below the reorder threshold.",
    inputSchema: z.object({
      limit: z.number().int().positive().max(50).default(20),
    }),
    execute: async ({ limit }) => {
      const rows = await db
        .select({
          itemId: itemsTable.id,
          partNumber: itemsTable.partNumber,
          name: itemsTable.name,
          category: itemsTable.category,
          quantityOnHand: inventoryTable.quantityOnHand,
          quantityReserved: inventoryTable.quantityReserved,
          quantityAvailable: sql<number>`${inventoryTable.quantityOnHand} - ${inventoryTable.quantityReserved}`,
          reorderThreshold: inventoryTable.reorderThreshold,
          location: inventoryTable.location,
          unitCost: inventoryTable.unitCost,
        })
        .from(inventoryTable)
        .innerJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id))
        .where(
          lte(
            sql`${inventoryTable.quantityOnHand} - ${inventoryTable.quantityReserved}`,
            inventoryTable.reorderThreshold
          )
        )
        .limit(limit);

      return {
        totalLowStockItems: rows.length,
        items: rows,
      };
    },
  });

  const getBOMDetails = tool({
    description: "Fetches details and line items for a specific Bill of Materials (BOM).",
    inputSchema: z.object({
      bomId: z.uuid({ error: "Invalid BOM UUID" }).optional(),
      bomName: z.string().optional(),
    }),
    execute: async ({ bomId, bomName }) => {
      const filter = bomId
        ? eq(bomsTable.id, bomId)
        : bomName
        ? ilike(bomsTable.name, `%${bomName}%`)
        : undefined;

      if (!filter) {
        return { error: "Either bomId or bomName must be provided" };
      }

      const [bom] = await db.select().from(bomsTable).where(filter).limit(1);
      if (!bom) {
        return { error: "BOM not found" };
      }

      const items = await db
        .select({
          bomItemId: bomItemsTable.id,
          itemId: itemsTable.id,
          partNumber: itemsTable.partNumber,
          name: itemsTable.name,
          category: itemsTable.category,
          quantity: bomItemsTable.quantity,
          referenceDesignator: bomItemsTable.referenceDesignator,
          notes: bomItemsTable.notes,
        })
        .from(bomItemsTable)
        .innerJoin(itemsTable, eq(bomItemsTable.itemId, itemsTable.id))
        .where(eq(bomItemsTable.bomId, bom.id));

      return {
        bom,
        totalItems: items.length,
        items,
      };
    },
  });

  const insertMasterComponent = tool({
    description: "Adds a new component to the master parts catalog. Requires user approval.",
    inputSchema: z.object({
      partNumber: z.string().min(1, { error: "Part number is required" }),
      name: z.string().min(1, { error: "Component name is required" }),
      description: z.string().optional(),
      category: z.string().min(1, { error: "Category is required" }),
      unit: z.string().default("pcs"),
      specifications: z.record(z.string(), z.any()).default({}),
    }),
    execute: async (input) => {
      const [created] = await db
        .insert(itemsTable)
        .values({
          partNumber: input.partNumber,
          name: input.name,
          description: input.description,
          category: input.category,
          unit: input.unit,
          specifications: input.specifications,
        })
        .returning();

      return {
        status: "COMPONENT_INSERTED_SUCCESSFULLY",
        component: created,
      };
    },
  });

  const addWarehouseStock = tool({
    description: "Creates an inventory record for a component with initial stock and location. Requires user approval.",
    inputSchema: z.object({
      itemId: z.uuid({ error: "Invalid item UUID" }),
      partNumber: z.string().min(1),
      quantityOnHand: z.number().min(0),
      reorderThreshold: z.number().min(0).default(10),
      location: z.string().default("Main Warehouse"),
      unitCost: z.number().min(0).optional(),
    }),
    execute: async (input) => {
      const [created] = await db
        .insert(inventoryTable)
        .values({
          itemId: input.itemId,
          quantityOnHand: input.quantityOnHand,
          quantityReserved: 0,
          reorderThreshold: input.reorderThreshold,
          location: input.location,
          unitCost: input.unitCost,
        })
        .returning();

      return {
        status: "WAREHOUSE_STOCK_RECORD_CREATED",
        stock: created,
      };
    },
  });

  const registerSupplier = tool({
    description: "Registers a new supplier in the database. Requires user approval.",
    inputSchema: z.object({
      name: z.string().min(1, { error: "Supplier name is required" }),
      code: z.string().min(1, { error: "Supplier code is required" }),
      contactEmail: z.string().email().optional(),
      website: z.string().optional(),
      leadTimeDaysAverage: z.number().positive().default(3.0),
      paymentTerms: z.string().default("Net 30"),
      currency: z.string().default("USD"),
    }),
    execute: async (input) => {
      const [created] = await db
        .insert(suppliersTable)
        .values({
          name: input.name,
          code: input.code.toUpperCase(),
          contactEmail: input.contactEmail,
          website: input.website,
          leadTimeDaysAverage: input.leadTimeDaysAverage,
          paymentTerms: input.paymentTerms,
          currency: input.currency,
        })
        .returning();

      return {
        status: "SUPPLIER_REGISTERED_SUCCESSFULLY",
        supplier: created,
      };
    },
  });

  const addSupplierCatalogItem = tool({
    description: "Adds a pricing and stock catalog entry linking a supplier to a component. Requires user approval.",
    inputSchema: z.object({
      supplierId: z.uuid({ error: "Invalid supplier UUID" }),
      itemId: z.uuid({ error: "Invalid item UUID" }),
      supplierPartNumber: z.string().min(1),
      unitPrice: z.number().positive(),
      minimumOrderQuantity: z.number().positive().default(1),
      stockAvailable: z.number().min(0).default(0),
      leadTimeDays: z.number().positive().default(3.0),
      priceTiers: z.array(z.object({ minQuantity: z.number(), unitPrice: z.number() })).default([]),
      isPreferred: z.boolean().default(false),
    }),
    execute: async (input) => {
      const [created] = await db
        .insert(supplierItemsTable)
        .values({
          supplierId: input.supplierId,
          itemId: input.itemId,
          supplierPartNumber: input.supplierPartNumber,
          unitPrice: input.unitPrice,
          minimumOrderQuantity: input.minimumOrderQuantity,
          stockAvailable: input.stockAvailable,
          leadTimeDays: input.leadTimeDays,
          priceTiers: input.priceTiers,
          isPreferred: input.isPreferred,
        })
        .returning();

      return {
        status: "SUPPLIER_CATALOG_ITEM_ADDED",
        catalogItem: created,
      };
    },
  });

  return {
    searchComponents,
    queryInventoryStock,
    querySupplierCatalog,
    listLowStockAlerts,
    getBOMDetails,
    insertMasterComponent,
    addWarehouseStock,
    registerSupplier,
    addSupplierCatalogItem,
  };
};
