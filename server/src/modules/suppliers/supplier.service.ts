import { eq, ilike, or, and, sql } from "drizzle-orm";
import { db, suppliersTable, supplierItemsTable, itemsTable, Supplier } from "../../db/index.js";
import { NotFoundError, ConflictError, BadRequestError } from "../../utils/errors.js";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierQueryInput,
  AddSupplierItemInput,
  UpdateSupplierItemInput,
} from "./supplier.schema.js";

export interface EnrichedSupplierItem {
  id: string;
  supplierId: string;
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  unit: string;
  specifications: Record<string, any>;
  supplierPartNumber: string;
  unitPrice: number;
  minimumOrderQuantity: number;
  packageType: string;
  stockAvailable: number;
  leadTimeDays: number;
  priceTiers: { minQuantity: number; unitPrice: number }[];
  isPreferred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierWithStats extends Supplier {
  totalCatalogItems: number;
}

export const findAllSuppliers = async (
  query: SupplierQueryInput
): Promise<{ suppliers: SupplierWithStats[]; total: number }> => {
  const conditions = [];

  if (query.search) {
    const searchPattern = `%${query.search}%`;
    conditions.push(
      or(
        ilike(suppliersTable.name, searchPattern),
        ilike(suppliersTable.code, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db
    .select({ count: sql`count(*)::int` })
    .from(suppliersTable)
    .where(whereClause);

  const rows = await db
    .select({
      supplier: suppliersTable,
      totalCatalogItems: sql<number>`count(${supplierItemsTable.id})::int`,
    })
    .from(suppliersTable)
    .leftJoin(supplierItemsTable, eq(suppliersTable.id, supplierItemsTable.supplierId))
    .where(whereClause)
    .groupBy(suppliersTable.id)
    .limit(query.limit)
    .offset(query.offset);

  return {
    suppliers: rows.map((r) => ({
      ...r.supplier,
      totalCatalogItems: Number(r.totalCatalogItems || 0),
    })),
    total: Number(totalResult?.count || 0),
  };
};

export const findSupplierById = async (id: string): Promise<SupplierWithStats> => {
  const [row] = await db
    .select({
      supplier: suppliersTable,
      totalCatalogItems: sql<number>`count(${supplierItemsTable.id})::int`,
    })
    .from(suppliersTable)
    .leftJoin(supplierItemsTable, eq(suppliersTable.id, supplierItemsTable.supplierId))
    .where(eq(suppliersTable.id, id))
    .groupBy(suppliersTable.id);

  if (!row) {
    throw new NotFoundError(`Supplier with ID '${id}' not found`);
  }

  return {
    ...row.supplier,
    totalCatalogItems: Number(row.totalCatalogItems || 0),
  };
};

export const createSupplier = async (data: CreateSupplierInput): Promise<Supplier> => {
  const [existing] = await db
    .select({ id: suppliersTable.id })
    .from(suppliersTable)
    .where(eq(suppliersTable.code, data.code.toUpperCase()));

  if (existing) {
    throw new ConflictError(`Supplier with code '${data.code}' already exists`);
  }

  const [created] = await db
    .insert(suppliersTable)
    .values({
      name: data.name,
      code: data.code.toUpperCase(),
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      website: data.website,
      reliabilityScore: data.reliabilityScore,
      leadTimeDaysAverage: data.leadTimeDaysAverage,
      paymentTerms: data.paymentTerms,
      currency: data.currency,
    })
    .returning();

  return created;
};

export const updateSupplier = async (
  id: string,
  data: UpdateSupplierInput
): Promise<Supplier> => {
  const [existing] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));

  if (!existing) {
    throw new NotFoundError(`Supplier with ID '${id}' not found`);
  }

  const [updated] = await db
    .update(suppliersTable)
    .set({
      name: data.name,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      website: data.website,
      reliabilityScore: data.reliabilityScore,
      leadTimeDaysAverage: data.leadTimeDaysAverage,
      paymentTerms: data.paymentTerms,
      currency: data.currency,
      updatedAt: new Date(),
    })
    .where(eq(suppliersTable.id, id))
    .returning();

  return updated;
};

export const deleteSupplier = async (id: string): Promise<{ id: string }> => {
  const [existing] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));

  if (!existing) {
    throw new NotFoundError(`Supplier with ID '${id}' not found`);
  }

  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));

  return { id };
};

export const findSupplierItems = async (
  supplierId: string
): Promise<EnrichedSupplierItem[]> => {
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, supplierId));

  if (!supplier) {
    throw new NotFoundError(`Supplier with ID '${supplierId}' not found`);
  }

  const rows = await db
    .select({
      supplierItem: supplierItemsTable,
      item: itemsTable,
    })
    .from(supplierItemsTable)
    .innerJoin(itemsTable, eq(supplierItemsTable.itemId, itemsTable.id))
    .where(eq(supplierItemsTable.supplierId, supplierId));

  return rows.map((r) => ({
    id: r.supplierItem.id,
    supplierId: r.supplierItem.supplierId,
    itemId: r.item.id,
    partNumber: r.item.partNumber,
    name: r.item.name,
    category: r.item.category,
    unit: r.item.unit,
    specifications: r.item.specifications,
    supplierPartNumber: r.supplierItem.supplierPartNumber,
    unitPrice: r.supplierItem.unitPrice,
    minimumOrderQuantity: r.supplierItem.minimumOrderQuantity,
    packageType: r.supplierItem.packageType,
    stockAvailable: r.supplierItem.stockAvailable,
    leadTimeDays: r.supplierItem.leadTimeDays,
    priceTiers: r.supplierItem.priceTiers,
    isPreferred: r.supplierItem.isPreferred,
    createdAt: r.supplierItem.createdAt,
    updatedAt: r.supplierItem.updatedAt,
  }));
};

export const addSupplierItem = async (
  supplierId: string,
  data: AddSupplierItemInput
): Promise<EnrichedSupplierItem> => {
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, supplierId));

  if (!supplier) {
    throw new NotFoundError(`Supplier with ID '${supplierId}' not found`);
  }

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
    throw new BadRequestError("Valid itemId or partNumber must be provided");
  }

  const [existing] = await db
    .select({ id: supplierItemsTable.id })
    .from(supplierItemsTable)
    .where(
      and(
        eq(supplierItemsTable.supplierId, supplierId),
        eq(supplierItemsTable.itemId, resolvedItemId)
      )
    );

  let recordId: string;

  if (existing) {
    const [updated] = await db
      .update(supplierItemsTable)
      .set({
        supplierPartNumber: data.supplierPartNumber,
        unitPrice: data.unitPrice,
        minimumOrderQuantity: data.minimumOrderQuantity,
        packageType: data.packageType,
        stockAvailable: data.stockAvailable,
        leadTimeDays: data.leadTimeDays,
        priceTiers: data.priceTiers,
        isPreferred: data.isPreferred,
        updatedAt: new Date(),
      })
      .where(eq(supplierItemsTable.id, existing.id))
      .returning({ id: supplierItemsTable.id });

    recordId = updated.id;
  } else {
    const [inserted] = await db
      .insert(supplierItemsTable)
      .values({
        supplierId,
        itemId: resolvedItemId,
        supplierPartNumber: data.supplierPartNumber,
        unitPrice: data.unitPrice,
        minimumOrderQuantity: data.minimumOrderQuantity,
        packageType: data.packageType,
        stockAvailable: data.stockAvailable,
        leadTimeDays: data.leadTimeDays,
        priceTiers: data.priceTiers,
        isPreferred: data.isPreferred,
      })
      .returning({ id: supplierItemsTable.id });

    recordId = inserted.id;
  }

  const [enriched] = await db
    .select({
      supplierItem: supplierItemsTable,
      item: itemsTable,
    })
    .from(supplierItemsTable)
    .innerJoin(itemsTable, eq(supplierItemsTable.itemId, itemsTable.id))
    .where(eq(supplierItemsTable.id, recordId));

  return {
    id: enriched.supplierItem.id,
    supplierId: enriched.supplierItem.supplierId,
    itemId: enriched.item.id,
    partNumber: enriched.item.partNumber,
    name: enriched.item.name,
    category: enriched.item.category,
    unit: enriched.item.unit,
    specifications: enriched.item.specifications,
    supplierPartNumber: enriched.supplierItem.supplierPartNumber,
    unitPrice: enriched.supplierItem.unitPrice,
    minimumOrderQuantity: enriched.supplierItem.minimumOrderQuantity,
    packageType: enriched.supplierItem.packageType,
    stockAvailable: enriched.supplierItem.stockAvailable,
    leadTimeDays: enriched.supplierItem.leadTimeDays,
    priceTiers: enriched.supplierItem.priceTiers,
    isPreferred: enriched.supplierItem.isPreferred,
    createdAt: enriched.supplierItem.createdAt,
    updatedAt: enriched.supplierItem.updatedAt,
  };
};

export const updateSupplierItem = async (
  supplierId: string,
  itemId: string,
  data: UpdateSupplierItemInput
): Promise<EnrichedSupplierItem> => {
  const [existing] = await db
    .select()
    .from(supplierItemsTable)
    .where(
      and(
        eq(supplierItemsTable.supplierId, supplierId),
        eq(supplierItemsTable.itemId, itemId)
      )
    );

  if (!existing) {
    throw new NotFoundError(`Supplier item link not found for supplier '${supplierId}' and item '${itemId}'`);
  }

  await db
    .update(supplierItemsTable)
    .set({
      supplierPartNumber: data.supplierPartNumber,
      unitPrice: data.unitPrice,
      minimumOrderQuantity: data.minimumOrderQuantity,
      packageType: data.packageType,
      stockAvailable: data.stockAvailable,
      leadTimeDays: data.leadTimeDays,
      priceTiers: data.priceTiers,
      isPreferred: data.isPreferred,
      updatedAt: new Date(),
    })
    .where(eq(supplierItemsTable.id, existing.id));

  const [enriched] = await db
    .select({
      supplierItem: supplierItemsTable,
      item: itemsTable,
    })
    .from(supplierItemsTable)
    .innerJoin(itemsTable, eq(supplierItemsTable.itemId, itemsTable.id))
    .where(eq(supplierItemsTable.id, existing.id));

  return {
    id: enriched.supplierItem.id,
    supplierId: enriched.supplierItem.supplierId,
    itemId: enriched.item.id,
    partNumber: enriched.item.partNumber,
    name: enriched.item.name,
    category: enriched.item.category,
    unit: enriched.item.unit,
    specifications: enriched.item.specifications,
    supplierPartNumber: enriched.supplierItem.supplierPartNumber,
    unitPrice: enriched.supplierItem.unitPrice,
    minimumOrderQuantity: enriched.supplierItem.minimumOrderQuantity,
    packageType: enriched.supplierItem.packageType,
    stockAvailable: enriched.supplierItem.stockAvailable,
    leadTimeDays: enriched.supplierItem.leadTimeDays,
    priceTiers: enriched.supplierItem.priceTiers,
    isPreferred: enriched.supplierItem.isPreferred,
    createdAt: enriched.supplierItem.createdAt,
    updatedAt: enriched.supplierItem.updatedAt,
  };
};

export const deleteSupplierItem = async (
  supplierId: string,
  itemId: string
): Promise<{ supplierId: string; itemId: string }> => {
  const [existing] = await db
    .select()
    .from(supplierItemsTable)
    .where(
      and(
        eq(supplierItemsTable.supplierId, supplierId),
        eq(supplierItemsTable.itemId, itemId)
      )
    );

  if (!existing) {
    throw new NotFoundError(`Supplier item link not found`);
  }

  await db.delete(supplierItemsTable).where(eq(supplierItemsTable.id, existing.id));

  return { supplierId, itemId };
};

export const findSuppliersByItem = async (itemId: string) => {
  const rows = await db
    .select({
      supplier: suppliersTable,
      supplierItem: supplierItemsTable,
    })
    .from(supplierItemsTable)
    .innerJoin(suppliersTable, eq(supplierItemsTable.supplierId, suppliersTable.id))
    .where(eq(supplierItemsTable.itemId, itemId));

  return rows.map((r) => ({
    supplierId: r.supplier.id,
    supplierName: r.supplier.name,
    supplierCode: r.supplier.code,
    reliabilityScore: r.supplier.reliabilityScore,
    supplierPartNumber: r.supplierItem.supplierPartNumber,
    unitPrice: r.supplierItem.unitPrice,
    minimumOrderQuantity: r.supplierItem.minimumOrderQuantity,
    stockAvailable: r.supplierItem.stockAvailable,
    leadTimeDays: r.supplierItem.leadTimeDays,
    priceTiers: r.supplierItem.priceTiers,
    isPreferred: r.supplierItem.isPreferred,
  }));
};
