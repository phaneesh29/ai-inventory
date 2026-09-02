import { sql } from "drizzle-orm";
import {
  db,
  itemsTable,
  inventoryTable,
  suppliersTable,
  supplierItemsTable,
  bomItemsTable,
} from "../../db/index.js";

export interface ComponentDemandForecast {
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderThreshold: number;
  unitCost: number | null;
  totalActiveBOMDemand: number;
  dailyBurnRate: number;
  daysOfSupplyRemaining: number;
  projectedStockoutDate: string | null;
  reorderDeadlineDate: string | null;
  depletionUrgency: "CRITICAL" | "HIGH" | "MODERATE" | "HEALTHY";
}

export interface SupplyChainAnomaly {
  anomalyType:
    | "CRITICAL_STOCKOUT_RISK"
    | "SINGLE_SOURCE_VULNERABILITY"
    | "PRICE_SURGE_ANOMALY"
    | "LONG_LEAD_TIME_BOTTLENECK"
    | "EXCESS_IDLE_STOCK";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  message: string;
  metrics: Record<string, any>;
  recommendedAction: string;
}

export interface VendorLeaderboardEntry {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  reliabilityScore: number;
  averageLeadTimeDays: number;
  catalogCoverageCount: number;
  priceCompetitivenessScore: number;
  compositeVendorScore: number;
  tierRanking: "TIER_1_PREFERRED" | "TIER_2_QUALIFIED" | "TIER_3_MONITORED";
  paymentTerms: string;
  currency: string;
}

export interface SupplyChainInsightsResult {
  overviewKPIs: {
    totalCatalogComponents: number;
    totalWarehouseStockValueUSD: number;
    totalActiveAnomalies: number;
    criticalDepletionCount: number;
    singleSourceVulnerabilitiesCount: number;
    averageSupplierReliability: number;
  };
  demandForecasts: ComponentDemandForecast[];
  anomalies: SupplyChainAnomaly[];
  vendorLeaderboard: VendorLeaderboardEntry[];
}

export const generateSupplyChainInsights = async (): Promise<SupplyChainInsightsResult> => {
  const allItems = await db.select().from(itemsTable);
  const allInventory = await db
    .select({
      itemId: inventoryTable.itemId,
      quantityOnHand: inventoryTable.quantityOnHand,
      quantityReserved: inventoryTable.quantityReserved,
      quantityAvailable: sql<number>`${inventoryTable.quantityOnHand} - ${inventoryTable.quantityReserved}`,
      reorderThreshold: inventoryTable.reorderThreshold,
      location: inventoryTable.location,
      unitCost: inventoryTable.unitCost,
    })
    .from(inventoryTable);

  const allBOMItems = await db.select().from(bomItemsTable);
  const allSuppliers = await db.select().from(suppliersTable);
  const allSupplierItems = await db.select().from(supplierItemsTable);

  const inventoryMap = new Map(allInventory.map((inv) => [inv.itemId, inv]));
  const supplierMap = new Map(allSuppliers.map((s) => [s.id, s]));

  const bomDemandMap = new Map<string, number>();
  for (const bomItem of allBOMItems) {
    const current = bomDemandMap.get(bomItem.itemId) || 0;
    bomDemandMap.set(bomItem.itemId, current + bomItem.quantity);
  }

  const supplierItemsByItem = new Map<string, typeof allSupplierItems>();
  for (const si of allSupplierItems) {
    const existing = supplierItemsByItem.get(si.itemId) || [];
    existing.push(si);
    supplierItemsByItem.set(si.itemId, existing);
  }

  const demandForecasts: ComponentDemandForecast[] = [];
  const anomalies: SupplyChainAnomaly[] = [];
  const now = new Date();

  let totalWarehouseStockValue = 0;
  let criticalDepletionCount = 0;
  let singleSourceCount = 0;

  for (const item of allItems) {
    const inv = inventoryMap.get(item.id);
    const onHand = inv?.quantityOnHand || 0;
    const reserved = inv?.quantityReserved || 0;
    const available = Math.max(0, onHand - reserved);
    const threshold = inv?.reorderThreshold || 10;
    const unitCost = inv?.unitCost || 0;

    totalWarehouseStockValue += onHand * unitCost;

    const totalActiveDemand = bomDemandMap.get(item.id) || 0;
    const estimatedDailyBurn = totalActiveDemand > 0 ? Number((totalActiveDemand / 14).toFixed(2)) : 0.5;

    const daysRemaining =
      estimatedDailyBurn > 0 ? Math.round(available / estimatedDailyBurn) : 999;

    let urgency: "CRITICAL" | "HIGH" | "MODERATE" | "HEALTHY" = "HEALTHY";
    let projectedStockoutDate: string | null = null;
    let reorderDeadlineDate: string | null = null;

    if (daysRemaining <= 7 || available === 0) {
      urgency = "CRITICAL";
      criticalDepletionCount++;
    } else if (daysRemaining <= 14) {
      urgency = "HIGH";
    } else if (daysRemaining <= 30) {
      urgency = "MODERATE";
    }

    if (daysRemaining < 365) {
      const stockout = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
      projectedStockoutDate = stockout.toISOString().split("T")[0];

      const leadTimeDays = 3;
      const reorderDeadline = new Date(stockout.getTime() - leadTimeDays * 24 * 60 * 60 * 1000);
      reorderDeadlineDate = reorderDeadline.toISOString().split("T")[0];
    }

    demandForecasts.push({
      itemId: item.id,
      partNumber: item.partNumber,
      name: item.name,
      category: item.category,
      quantityOnHand: onHand,
      quantityReserved: reserved,
      quantityAvailable: available,
      reorderThreshold: threshold,
      unitCost: inv?.unitCost || null,
      totalActiveBOMDemand: totalActiveDemand,
      dailyBurnRate: estimatedDailyBurn,
      daysOfSupplyRemaining: daysRemaining,
      projectedStockoutDate,
      reorderDeadlineDate,
      depletionUrgency: urgency,
    });

    if (available <= threshold) {
      anomalies.push({
        anomalyType: "CRITICAL_STOCKOUT_RISK",
        severity: available === 0 ? "CRITICAL" : "HIGH",
        itemId: item.id,
        partNumber: item.partNumber,
        name: item.name,
        category: item.category,
        message: `Available stock (${available}) is at or below reorder threshold (${threshold}).`,
        metrics: { onHand, reserved, available, threshold, daysRemaining },
        recommendedAction: `Initiate supplier purchase order immediately to prevent production bottleneck.`,
      });
    }

    const quotes = supplierItemsByItem.get(item.id) || [];
    if (quotes.length === 1) {
      singleSourceCount++;
      const s = supplierMap.get(quotes[0].supplierId);
      anomalies.push({
        anomalyType: "SINGLE_SOURCE_VULNERABILITY",
        severity: "MEDIUM",
        itemId: item.id,
        partNumber: item.partNumber,
        name: item.name,
        category: item.category,
        message: `Component relies exclusively on a single distributor (${s?.name || "Single Supplier"}).`,
        metrics: { totalSuppliers: 1, supplierName: s?.name, leadTimeDays: quotes[0].leadTimeDays },
        recommendedAction: `Qualify a secondary alternative distributor to mitigate supply chain disruption risks.`,
      });
    }

    if (quotes.length > 1) {
      const prices = quotes.map((q) => q.unitPrice);
      const minPrice = Math.min(...prices);

      for (const q of quotes) {
        if (q.unitPrice > minPrice * 1.25) {
          const s = supplierMap.get(q.supplierId);
          const percentHigher = Math.round(((q.unitPrice - minPrice) / minPrice) * 100);
          anomalies.push({
            anomalyType: "PRICE_SURGE_ANOMALY",
            severity: "LOW",
            itemId: item.id,
            partNumber: item.partNumber,
            name: item.name,
            category: item.category,
            message: `${s?.name} is charging $${q.unitPrice} (+${percentHigher}% above lowest quote of $${minPrice}).`,
            metrics: {
              supplierName: s?.name,
              quotedPrice: q.unitPrice,
              benchmarkPrice: minPrice,
              percentPremium: percentHigher,
            },
            recommendedAction: `Route purchase orders to benchmark distributor to save ${percentHigher}% per unit.`,
          });
        }
      }
    }

    for (const q of quotes) {
      if (q.leadTimeDays >= 7) {
        const s = supplierMap.get(q.supplierId);
        anomalies.push({
          anomalyType: "LONG_LEAD_TIME_BOTTLENECK",
          severity: "MEDIUM",
          itemId: item.id,
          partNumber: item.partNumber,
          name: item.name,
          category: item.category,
          message: `${s?.name} has an extended delivery lead time of ${q.leadTimeDays} days.`,
          metrics: { supplierName: s?.name, leadTimeDays: q.leadTimeDays },
          recommendedAction: `Place orders in advance or evaluate faster regional distributors.`,
        });
      }
    }

    if (onHand > threshold * 10 && totalActiveDemand === 0) {
      anomalies.push({
        anomalyType: "EXCESS_IDLE_STOCK",
        severity: "LOW",
        itemId: item.id,
        partNumber: item.partNumber,
        name: item.name,
        category: item.category,
        message: `Excess inventory of ${onHand} units exceeds 10x reorder threshold with 0 active project demand.`,
        metrics: { onHand, threshold, capitalTiedUpUSD: Number((onHand * unitCost).toFixed(2)) },
        recommendedAction: `Review holding costs and avoid reordering until current stock is utilized.`,
      });
    }
  }

  const supplierItemsBySupplier = new Map<string, typeof allSupplierItems>();
  for (const si of allSupplierItems) {
    const existing = supplierItemsBySupplier.get(si.supplierId) || [];
    existing.push(si);
    supplierItemsBySupplier.set(si.supplierId, existing);
  }

  const vendorLeaderboard: VendorLeaderboardEntry[] = [];
  let totalReliability = 0;

  for (const s of allSuppliers) {
    totalReliability += s.reliabilityScore;
    const catalog = supplierItemsBySupplier.get(s.id) || [];
    const count = catalog.length;

    const avgLead =
      count > 0
        ? catalog.reduce((acc, c) => acc + c.leadTimeDays, 0) / count
        : s.leadTimeDaysAverage;

    const priceCompetitiveness = s.code === "LCSC" ? 95 : s.code === "DIGIKEY" ? 88 : 84;
    const speedScore = Math.max(50, 100 - avgLead * 5);

    const compositeScore = Number(
      (s.reliabilityScore * 0.4 + speedScore * 0.3 + priceCompetitiveness * 0.3).toFixed(1)
    );

    let tier: "TIER_1_PREFERRED" | "TIER_2_QUALIFIED" | "TIER_3_MONITORED" = "TIER_2_QUALIFIED";
    if (compositeScore >= 90) {
      tier = "TIER_1_PREFERRED";
    } else if (compositeScore < 80) {
      tier = "TIER_3_MONITORED";
    }

    vendorLeaderboard.push({
      supplierId: s.id,
      supplierName: s.name,
      supplierCode: s.code,
      reliabilityScore: s.reliabilityScore,
      averageLeadTimeDays: Number(avgLead.toFixed(1)),
      catalogCoverageCount: count,
      priceCompetitivenessScore: priceCompetitiveness,
      compositeVendorScore: compositeScore,
      tierRanking: tier,
      paymentTerms: s.paymentTerms,
      currency: s.currency,
    });
  }

  vendorLeaderboard.sort((a, b) => b.compositeVendorScore - a.compositeVendorScore);

  const avgSupplierReliability =
    allSuppliers.length > 0
      ? Number((totalReliability / allSuppliers.length).toFixed(1))
      : 95.0;

  return {
    overviewKPIs: {
      totalCatalogComponents: allItems.length,
      totalWarehouseStockValueUSD: Number(totalWarehouseStockValue.toFixed(2)),
      totalActiveAnomalies: anomalies.length,
      criticalDepletionCount,
      singleSourceVulnerabilitiesCount: singleSourceCount,
      averageSupplierReliability: avgSupplierReliability,
    },
    demandForecasts: demandForecasts.sort(
      (a, b) => a.daysOfSupplyRemaining - b.daysOfSupplyRemaining
    ),
    anomalies,
    vendorLeaderboard,
  };
};
