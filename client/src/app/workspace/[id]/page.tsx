"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchWorkspaceById, type Workspace } from "@/services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Layers,
  Boxes,
  Truck,
  FileSpreadsheet,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Calendar,
  KeyRound,
  Cpu,
} from "lucide-react";

export default function WorkspaceOverviewPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    fetchWorkspaceById(workspaceId)
      .then((data) => setWorkspace(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [workspaceId]);

  const quickActionCards = [
    {
      title: "BOM Workflow Studio",
      description: "Upload electronic BOM files (CSV, PDF, Images). Run the autonomous 6-agent analysis pipeline.",
      href: `/workspace/${workspaceId}/bom-studio`,
      icon: Layers,
      accent: "text-[#828fff]",
      tag: "6 AI Agents",
    },
    {
      title: "Warehouse Inventory",
      description: "Inspect on-hand and reserved warehouse stock, reorder thresholds, and bin/rack storage locations.",
      href: `/workspace/${workspaceId}/inventory`,
      icon: Boxes,
      accent: "text-[#4ade80]",
      tag: "Real-time Stock",
    },
    {
      title: "Supplier Matrix & Quotes",
      description: "Multi-distributor pricing matrices across DigiKey, Mouser, and LCSC with volume tier discounts.",
      href: `/workspace/${workspaceId}/suppliers`,
      icon: Truck,
      accent: "text-[#facc15]",
      tag: "Tier 1-3 Vendors",
    },
    {
      title: "Purchase Orders & Receiving",
      description: "Issue draft POs, track shipment timelines, and receive dock shipments with dynamic vendor scoring.",
      href: `/workspace/${workspaceId}/purchase-orders`,
      icon: FileSpreadsheet,
      accent: "text-[#60a5fa]",
      tag: "Score Tracking",
    },
    {
      title: "AI Insights & Forecasting",
      description: "Demand burn rates, projected stockout dates, single-source vulnerabilities, and price surge anomalies.",
      href: `/workspace/${workspaceId}/insights`,
      icon: TrendingUp,
      accent: "text-[#c084fc]",
      tag: "Math + LLM Brief",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#23252a] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Hardware Production Workspace
            </span>
            <Badge variant="primary">Active Context</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8] sm:text-3xl mt-1">
            {isLoading ? "Loading Workspace..." : workspace?.name || "Hardware Workspace"}
          </h1>
          <p className="text-xs text-[#8a8f98] mt-1">
            Scoped environment for hardware manufacturing, parametric substitutions, and procurement workflows.
          </p>
        </div>

        {workspace && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#8a8f98] bg-[#0f1011] border border-[#23252a] px-3 py-2 rounded-xl">
            <div className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-[#5e6ad2]" />
              <span className="font-mono text-[11px]">{workspace.id}</span>
            </div>
            <span className="text-[#3e3e44]">•</span>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(workspace.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {quickActionCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group block rounded-xl bg-[#0f1011] hover:bg-[#141516] border border-[#23252a] hover:border-[#5e6ad2]/70 p-5 transition-all duration-150 shadow-sm hover:shadow-lg hover:shadow-[#5e6ad2]/10 relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#34343a]/40 to-transparent group-hover:via-[#5e6ad2]/80 transition-colors" />

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#141516] group-hover:bg-[#14172e] border border-[#23252a] group-hover:border-[#282d5c] transition-colors">
                  <Icon className={`h-5 w-5 ${card.accent}`} />
                </div>
                <Badge variant="neutral">{card.tag}</Badge>
              </div>

              <h3 className="text-sm font-semibold text-[#f7f8f8] group-hover:text-white transition-colors mb-1">
                {card.title}
              </h3>
              <p className="text-xs text-[#8a8f98] line-clamp-2 leading-relaxed mb-4">
                {card.description}
              </p>

              <div className="border-t border-[#23252a]/60 pt-3 flex items-center justify-between text-xs text-[#828fff] font-medium">
                <span>Launch Tool</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <Card className="border-[#282d5c]/60 bg-[#0f1011] relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#14172e] border border-[#282d5c] text-[#828fff]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#f7f8f8]">
                  Autonomous Agent Pipeline Armed
                </h4>
                <p className="text-xs text-[#8a8f98] mt-0.5">
                  Codestral Ingestion • Mistral Small Audit • Mistral Large Alternative Matcher • PO Optimization
                </p>
              </div>
            </div>

            <Link
              href={`/workspace/${workspaceId}/bom-studio`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#5e6ad2] hover:bg-[#828fff] text-white px-4 py-2 text-xs font-semibold shadow-md shadow-[#5e6ad2]/20 transition-colors shrink-0"
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>Start BOM Processing</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
