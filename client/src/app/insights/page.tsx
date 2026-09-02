"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  fetchSupplyChainInsights,
  type SupplyChainInsightsResult,
  type SupplyChainAnomaly,
  type ComponentDemandForecast,
  type VendorLeaderboardEntry,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  TrendingUp,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldAlert,
  Clock,
  DollarSign,
  Truck,
  Boxes,
  Zap,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Award,
  Flame,
} from "lucide-react";

export default function InsightsPage() {
  const { toast } = useToast();
  const [insights, setInsights] = useState<SupplyChainInsightsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"anomalies" | "forecasts" | "vendors">("anomalies");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBriefExpanded, setIsBriefExpanded] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchSupplyChainInsights();
      setInsights(data);
    } catch (err: any) {
      toast.error("Failed to generate AI insights", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAnomalies = useMemo(() => {
    if (!insights) return [];
    return insights.anomalies.filter((a) => {
      const matchesSeverity =
        severityFilter === "All" || a.severity.toLowerCase() === severityFilter.toLowerCase();

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        a.partNumber.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.anomalyType.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q);

      return matchesSeverity && matchesSearch;
    });
  }, [insights, severityFilter, searchQuery]);

  const filteredForecasts = useMemo(() => {
    if (!insights) return [];
    const q = searchQuery.toLowerCase();
    return insights.demandForecasts.filter(
      (d) =>
        !searchQuery ||
        d.partNumber.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
  }, [insights, searchQuery]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <Badge variant="danger">Critical</Badge>;
      case "HIGH":
        return <Badge variant="warning">High Priority</Badge>;
      case "MEDIUM":
        return <Badge variant="tier-2">Medium</Badge>;
      case "LOW":
      default:
        return <Badge variant="neutral">Notice</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "CRITICAL":
        return <Badge variant="danger">Critical (&lt;7d)</Badge>;
      case "HIGH":
        return <Badge variant="warning">High (&lt;14d)</Badge>;
      case "MODERATE":
        return <Badge variant="tier-2">Moderate (&lt;30d)</Badge>;
      case "HEALTHY":
      default:
        return <Badge variant="success">Healthy Stock</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "TIER_1_PREFERRED":
        return <Badge variant="success">Tier 1 Preferred</Badge>;
      case "TIER_2_QUALIFIED":
        return <Badge variant="primary">Tier 2 Qualified</Badge>;
      case "TIER_3_MONITORED":
      default:
        return <Badge variant="warning">Tier 3 Monitored</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#010102] text-[#f7f8f8]">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#23252a] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                Autonomous Supply Chain Intelligence
              </span>
              <Badge variant="primary">InvenAI Analytics v2.0</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8] sm:text-3xl mt-1">
              AI Insights & Anomaly Forecasting
            </h1>
            <p className="text-xs text-[#8a8f98] mt-1 max-w-2xl">
              Predict stockout horizons, detect single-source bottlenecks, benchmark distributor price surges, and review executive briefing recommendations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              isLoading={isLoading}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Re-Analyze</span>
            </Button>
          </div>
        </div>

        {insights?.executiveAIBrief && (
          <Card className="border-[#5e6ad2]/50 bg-[#0f1017] shadow-xl overflow-hidden">
            <div
              onClick={() => setIsBriefExpanded(!isBriefExpanded)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#141726]/60 transition-colors border-b border-[#23252a]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5e6ad2]/20 border border-[#5e6ad2]/40 text-[#828fff]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#f7f8f8] flex items-center gap-2">
                    <span>Chief Supply Chain AI • Executive Briefing</span>
                    <Badge variant="primary">Live Synthesized</Badge>
                  </h3>
                  <p className="text-[11px] text-[#8a8f98]">
                    Generated by Mistral AI analyzing active demand curves and distributor lead times.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="p-1 text-[#8a8f98] hover:text-white"
              >
                {isBriefExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {isBriefExpanded && (
              <CardContent className="p-4 sm:p-6 bg-[#090a0f] max-h-[500px] overflow-y-auto">
                <div className="bg-[#010102] p-4 sm:p-5 rounded-xl border border-[#23252a]">
                  <MarkdownRenderer content={insights.executiveAIBrief} />
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {insights && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-[#0f1011] border-[#23252a] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8a8f98] font-medium">Total Active Anomalies</span>
                <ShieldAlert className="h-4 w-4 text-[#f87171]" />
              </div>
              <p className="text-xl font-bold font-mono text-[#f87171] mt-2">
                {insights.overviewKPIs.totalActiveAnomalies} Detected
              </p>
            </Card>

            <Card className="bg-[#0f1011] border-[#23252a] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8a8f98] font-medium">Critical Stockout Depletion</span>
                <Flame className="h-4 w-4 text-[#facc15]" />
              </div>
              <p className="text-xl font-bold font-mono text-[#facc15] mt-2">
                {insights.overviewKPIs.criticalDepletionCount} SKUs (&lt;7d)
              </p>
            </Card>

            <Card className="bg-[#0f1011] border-[#23252a] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8a8f98] font-medium">Single-Source Vulnerabilities</span>
                <AlertTriangle className="h-4 w-4 text-[#828fff]" />
              </div>
              <p className="text-xl font-bold font-mono text-[#828fff] mt-2">
                {insights.overviewKPIs.singleSourceVulnerabilitiesCount} Components
              </p>
            </Card>

            <Card className="bg-[#0f1011] border-[#23252a] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8a8f98] font-medium">Avg Vendor Reliability</span>
                <Award className="h-4 w-4 text-[#4ade80]" />
              </div>
              <p className="text-xl font-bold font-mono text-[#4ade80] mt-2">
                {insights.overviewKPIs.averageSupplierReliability}% Score
              </p>
            </Card>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0f1011] p-3 rounded-xl border border-[#23252a]">
          <div className="flex items-center gap-1 bg-[#010102] border border-[#23252a] rounded-lg p-1">
            <button
              onClick={() => setActiveTab("anomalies")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "anomalies"
                  ? "bg-[#5e6ad2] text-white"
                  : "text-[#8a8f98] hover:text-[#f7f8f8]"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Anomalies ({insights?.anomalies.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("forecasts")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "forecasts"
                  ? "bg-[#5e6ad2] text-white"
                  : "text-[#8a8f98] hover:text-[#f7f8f8]"
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Depletion Forecasts ({insights?.demandForecasts.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("vendors")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "vendors"
                  ? "bg-[#5e6ad2] text-white"
                  : "text-[#8a8f98] hover:text-[#f7f8f8]"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Vendor Matrix ({insights?.vendorLeaderboard.length || 0})</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "anomalies" && (
              <div className="flex items-center gap-1">
                {["All", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2 py-0.5 text-[10px] rounded-full font-medium transition-colors cursor-pointer ${
                      severityFilter === sev
                        ? "bg-[#5e6ad2] text-white"
                        : "bg-[#010102] hover:bg-[#141516] text-[#8a8f98] border border-[#23252a]"
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            )}

            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8a8f98]" />
              <Input
                placeholder="Filter predictions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-8"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-[#0f1011] border border-[#23252a] animate-pulse" />
            ))}
          </div>
        ) : activeTab === "anomalies" ? (
          filteredAnomalies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#23252a] bg-[#0f1011]/40 p-12 text-center space-y-3">
              <CheckCircle2 className="mx-auto h-8 w-8 text-[#4ade80]" />
              <h3 className="text-sm font-semibold text-[#f7f8f8]">No Supply Chain Anomalies Found</h3>
              <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
                All component inventories, lead times, and distributor pricing fall within normal baseline parameters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnomalies.map((a, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#23252a] bg-[#0f1011] p-4 hover:border-[#5e6ad2]/50 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#f7f8f8]">{a.partNumber}</span>
                      {getSeverityBadge(a.severity)}
                      <span className="font-mono text-[10px] text-[#828fff] bg-[#14172e] px-2 py-0.5 rounded border border-[#282d5c]">
                        {a.anomalyType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8a8f98]">{a.category}</span>
                  </div>

                  <p className="text-xs text-[#d0d6e0]">{a.message}</p>

                  <div className="rounded-lg bg-[#010102] border border-[#23252a] p-3 text-xs flex items-start gap-2.5">
                    <Zap className="h-4 w-4 text-[#5e6ad2] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#828fff] block">
                        Recommended Action:
                      </span>
                      <p className="text-[#f7f8f8] mt-0.5">{a.recommendedAction}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === "forecasts" ? (
          <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#23252a] bg-[#141516] text-[#8a8f98] font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Component Part Number</th>
                    <th className="px-4 py-3 text-right">Available Stock</th>
                    <th className="px-4 py-3 text-right">Active Demand</th>
                    <th className="px-4 py-3 text-right">Daily Burn</th>
                    <th className="px-4 py-3 text-right">Supply Left</th>
                    <th className="px-4 py-3">Projected Stockout</th>
                    <th className="px-4 py-3">Reorder Deadline</th>
                    <th className="px-4 py-3 text-center">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23252a]/60">
                  {filteredForecasts.map((d) => (
                    <tr key={d.itemId} className="hover:bg-[#141516]/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-[#f7f8f8] block">{d.partNumber}</span>
                        <span className="text-[11px] text-[#8a8f98]">{d.name}</span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-[#f7f8f8]">
                        {d.quantityAvailable.toLocaleString()} pcs
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-[#facc15]">
                        {d.totalActiveBOMDemand.toLocaleString()} pcs
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-[#8a8f98]">
                        {d.dailyBurnRate}/day
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span
                          className={
                            d.daysOfSupplyRemaining <= 7
                              ? "text-[#f87171]"
                              : d.daysOfSupplyRemaining <= 14
                              ? "text-[#facc15]"
                              : "text-[#4ade80]"
                          }
                        >
                          {d.daysOfSupplyRemaining >= 999 ? "∞ Stable" : `${d.daysOfSupplyRemaining} days`}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-[#d0d6e0]">
                        {d.projectedStockoutDate || "N/A (>1 Year)"}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-[#828fff]">
                        {d.reorderDeadlineDate || "N/A"}
                      </td>

                      <td className="px-4 py-3 text-center">{getUrgencyBadge(d.depletionUrgency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights?.vendorLeaderboard.map((v) => (
              <Card key={v.supplierId} className="border-[#23252a] bg-[#0f1011] p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#f7f8f8]">{v.supplierCode}</span>
                      {getTierBadge(v.tierRanking)}
                    </div>
                    <h3 className="text-xs text-[#8a8f98] mt-0.5">{v.supplierName}</h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#8a8f98] uppercase block">Composite</span>
                    <span className="font-mono text-lg font-bold text-[#828fff]">
                      {v.compositeVendorScore}/100
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-[#010102] p-2.5 space-y-0.5 border border-[#23252a]">
                    <span className="text-[10px] text-[#8a8f98]">Reliability Score</span>
                    <p className="font-mono font-bold text-[#4ade80]">{v.reliabilityScore}%</p>
                  </div>

                  <div className="rounded-lg bg-[#010102] p-2.5 space-y-0.5 border border-[#23252a]">
                    <span className="text-[10px] text-[#8a8f98]">Avg Lead Time</span>
                    <p className="font-mono font-bold text-[#f7f8f8]">{v.averageLeadTimeDays} days</p>
                  </div>

                  <div className="rounded-lg bg-[#010102] p-2.5 space-y-0.5 border border-[#23252a]">
                    <span className="text-[10px] text-[#8a8f98]">Price Competitiveness</span>
                    <p className="font-mono font-bold text-[#828fff]">{v.priceCompetitivenessScore}%</p>
                  </div>

                  <div className="rounded-lg bg-[#010102] p-2.5 space-y-0.5 border border-[#23252a]">
                    <span className="text-[10px] text-[#8a8f98]">Payment Terms</span>
                    <p className="font-mono text-[11px] text-[#d0d6e0]">{v.paymentTerms}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
