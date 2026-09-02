import { generateText } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { SupplyChainInsightsResult } from "./insights.service.js";

export const generateExecutiveAIBrief = async (
  insights: SupplyChainInsightsResult
): Promise<string> => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const topDepletions = insights.demandForecasts
    .filter((d) => d.depletionUrgency === "CRITICAL" || d.depletionUrgency === "HIGH")
    .slice(0, 5)
    .map(
      (d) =>
        `• ${d.partNumber} (${d.name}): Avail: ${d.quantityAvailable} | Daily Burn: ${d.dailyBurnRate}/day | Days Left: ${d.daysOfSupplyRemaining} days`
    )
    .join("\n");

  const topAnomalies = insights.anomalies
    .slice(0, 5)
    .map((a) => `• [${a.severity}] ${a.partNumber}: ${a.message} (Action: ${a.recommendedAction})`)
    .join("\n");

  const vendorHighlights = insights.vendorLeaderboard
    .map(
      (v) =>
        `• ${v.supplierName} (${v.supplierCode}): Score ${v.compositeVendorScore}/100 [${v.tierRanking}] | Lead Time: ${v.averageLeadTimeDays}d | Reliability: ${v.reliabilityScore}%`
    )
    .join("\n");

  const prompt = `You are the Chief Supply Chain & Inventory Operations AI.
Current Date: ${currentDate}

Synthesize the following live metrics into a visually clean, scannable, and actionable Executive Summary:

Overview KPIs:
- Total Catalog Components: ${insights.overviewKPIs.totalCatalogComponents}
- Total Warehouse Valuation: $${insights.overviewKPIs.totalWarehouseStockValueUSD.toLocaleString()} USD
- Active Anomalies: ${insights.overviewKPIs.totalActiveAnomalies}
- Critical Stockout Risks: ${insights.overviewKPIs.criticalDepletionCount}
- Supplier Reliability: ${insights.overviewKPIs.averageSupplierReliability}%

Critical Shortages / Depletions:
${topDepletions || "None. All stock buffers are healthy."}

Supply Chain Anomalies:
${topAnomalies || "None."}

Distributor Performance:
${vendorHighlights}

STRICT VISUAL & FORMATTING RULES:
- Format for MAXIMUM readability and instant visual comprehension. Avoid dense walls of text or deep nested bullet points.
- Use clean Markdown tables for action items and supplier routing.
- Directly start your response with "## 1. Executive Summary & Warehouse Health Index".
- Do NOT output any preamble, fake classification headers, bracketed placeholders (like '[Your Name]'), or signature footers at the end.
- Structure into exactly 3 visually distinct sections:

## 1. Executive Summary & Warehouse Health Index
- State the overall status clearly (e.g. **Status: 🔴 CRITICAL / 🟡 WARNING / 🟢 HEALTHY**).
- List 2 to 3 concise summary takeaways with bold key numbers.

## 2. Immediate Action Matrix (Next 24–48 Hours)
Format as a single clean markdown table:
| Priority | Component MPN | Action Required | Quantity | Recommended Vendor | Window |
(Fill with the top 3-5 urgent action items based on real shortages and excess inventory).

## 3. Strategic Procurement & Distributor Directives
Format as a clean markdown table:
| Distributor | Tier Status | Strategic Role | Recommendation |
(Summarize DigiKey, Mouser, LCSC with their lead times and role).`;

  const response = await generateText({
    model: mistral("mistral-small-latest"),
    prompt,
  });

  let text = (response.text || "").trim();
  text = text.replace(/(?:---|___)?\s*\n*(?:\*\*|###|\*)?\s*(?:Next Review|Prepared by|Distribution|Classification|Sign-off)[\s\S]*$/i, "").trim();
  text = text.replace(/\[(?:Your\s+|Insert\s+|Company\s+|Date).*?\]/gi, "").trim();

  return text || "Executive supply chain brief generated successfully.";
};
