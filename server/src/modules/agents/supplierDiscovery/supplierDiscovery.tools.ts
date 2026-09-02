import { inArray, eq } from "drizzle-orm";
import {
  db,
  suppliersTable,
  supplierItemsTable,
  itemsTable,
} from "../../../db/index.js";

export interface SupplierQuoteEntry {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  supplierPartNumber: string;
  baseUnitPrice: number;
  minimumOrderQuantity: number;
  stockAvailable: number;
  leadTimeDays: number;
  reliabilityScore: number;
  priceTiers: { minQuantity: number; unitPrice: number }[];
  isPreferred: boolean;
}

export interface ComponentSupplierMarketData {
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  deficitQuantity: number;
  availableSuppliers: SupplierQuoteEntry[];
}

export const fetchAllSupplierQuotesForDeficits = async (
  deficitItems: { itemId: string; partNumber: string; name: string; category: string; deficitQuantity: number }[]
): Promise<ComponentSupplierMarketData[]> => {
  const itemIds = deficitItems.map((d) => d.itemId);

  const rows = await db
    .select({
      supplierItem: supplierItemsTable,
      supplier: suppliersTable,
      item: itemsTable,
    })
    .from(supplierItemsTable)
    .innerJoin(suppliersTable, eq(supplierItemsTable.supplierId, suppliersTable.id))
    .innerJoin(itemsTable, eq(supplierItemsTable.itemId, itemsTable.id))
    .where(inArray(supplierItemsTable.itemId, itemIds));

  const marketDataMap = new Map<string, ComponentSupplierMarketData>();

  for (const deficit of deficitItems) {
    marketDataMap.set(deficit.itemId, {
      itemId: deficit.itemId,
      partNumber: deficit.partNumber,
      name: deficit.name,
      category: deficit.category,
      deficitQuantity: deficit.deficitQuantity,
      availableSuppliers: [],
    });
  }

  for (const r of rows) {
    const entry = marketDataMap.get(r.item.id);
    if (!entry) continue;

    entry.availableSuppliers.push({
      supplierId: r.supplier.id,
      supplierName: r.supplier.name,
      supplierCode: r.supplier.code,
      supplierPartNumber: r.supplierItem.supplierPartNumber,
      baseUnitPrice: r.supplierItem.unitPrice,
      minimumOrderQuantity: r.supplierItem.minimumOrderQuantity || 1,
      stockAvailable: r.supplierItem.stockAvailable,
      leadTimeDays: r.supplierItem.leadTimeDays,
      reliabilityScore: r.supplier.reliabilityScore,
      priceTiers: Array.isArray(r.supplierItem.priceTiers) ? r.supplierItem.priceTiers : [],
      isPreferred: r.supplierItem.isPreferred,
    });
  }

  return Array.from(marketDataMap.values());
};
