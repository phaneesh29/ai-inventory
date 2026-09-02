import { generateText } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { SupplyChainInsightsResult } from "./insights.service.js";

export const generateExecutiveAIBrief = async (
  insights: SupplyChainInsightsResult
): Promise<string> => {
  const topDepletions = insights.demandForecasts
    .filter((d) => d.depletionUrgency === "CRITICAL" || d.depletionUrgency === "HIGH")
    .slice(0, 5)
    .map(
      (d) =>
        `• ${d.partNumber} (${d.name}): Avail: ${d.quantityAvailable} | Burn: ${d.dailyBurnRate}/day | Days Remaining: ${d.daysOfSupplyRemaining} days (Stockout: ${d.projectedStockoutDate || "Immediate"})`
    )
    .join("\n");

  const topAnomalies = insights.anomalies
    .slice(0, 5)
    .map((a) => `• [${a.severity}] ${a.partNumber}: ${a.message} (Action: ${a.recommendedAction})`)
    .join("\n");

  const vendorHighlights = insights.vendorLeaderboard
    .map(
      (v) =>
        `• ${v.supplierName} (${v.supplierCode}): Score ${v.compositeVendorScore}/100 [${v.tierRanking}] | Avg Lead Time: ${v.averageLeadTimeDays}d | Reliability: ${v.reliabilityScore}%`
    )
    .join("\n");

  const prompt = `You are the Chief Supply Chain & Inventory Operations AI.
Synthesize the following live warehouse statistical metrics, demand depletion curves, and supplier anomalies into a crisp, high-impact Executive Intelligence Brief for management:

Overview KPIs:
- Total Catalog Components: ${insights.overviewKPIs.totalCatalogComponents}
- Total Warehouse Valuation: $${insights.overviewKPIs.totalWarehouseStockValueUSD.toLocaleString()} USD
- Total Active Supply Chain Anomalies: ${insights.overviewKPIs.totalActiveAnomalies}
- Critical Stockout Depletion Risks: ${insights.overviewKPIs.criticalDepletionCount}
- Average Supplier Reliability: ${insights.overviewKPIs.averageSupplierReliability}%

Top Critical Depletion / Stockout Forecasts:
${topDepletions || "All components have healthy stock buffers (>30 days)."}

Top Supply Chain Anomalies Detected:
${topAnomalies || "No active supply chain anomalies detected."}

Distributor Performance Leaderboard:
${vendorHighlights}

Write a structured executive brief with:
1. Executive Summary & Warehouse Health Index
2. Immediate Action Items (Next 48 Hours)
3. Strategic Procurement & Distributor Optimizations`;

  const response = await generateText({
    model: mistral("mistral-small-latest"),
    prompt,
  });

  return response.text || "Executive supply chain brief generated successfully.";
};
