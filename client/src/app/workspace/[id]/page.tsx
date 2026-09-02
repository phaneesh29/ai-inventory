"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  fetchWorkspaceById,
  fetchBOMsByWorkspace,
  fetchBOMById,
  deleteBOM,
  type Workspace,
  type GlobalBOMItem,
  type EnrichedBOMDetail,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Layers,
  ArrowRight,
  Calendar,
  KeyRound,
  Cpu,
  Plus,
  Trash2,
  Eye,
  Download,
  X,
  Search,
  RefreshCw,
  Boxes,
  Microchip,
  Sparkles,
} from "lucide-react";

export default function WorkspaceOverviewPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { toast } = useToast();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [boms, setBoms] = useState<GlobalBOMItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeBOMDetail, setActiveBOMDetail] = useState<EnrichedBOMDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [deletingBOM, setDeletingBOM] = useState<GlobalBOMItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setIsLoading(true);
      const [ws, bomList] = await Promise.all([
        fetchWorkspaceById(workspaceId),
        fetchBOMsByWorkspace(workspaceId),
      ]);
      setWorkspace(ws);
      setBoms(bomList);
    } catch (err: any) {
      toast.error("Failed to load workspace", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const filteredBOMs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return boms;
    return boms.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.version.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q)
    );
  }, [boms, searchQuery]);

  const handleViewDetail = async (bomId: string) => {
    try {
      setIsLoadingDetail(true);
      const detail = await fetchBOMById(bomId);
      setActiveBOMDetail(detail);
    } catch (err: any) {
      toast.error("Failed to load BOM detail", err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingBOM) return;

    try {
      setIsDeleting(true);
      await deleteBOM(deletingBOM.id);
      toast.success("BOM Deleted", `"${deletingBOM.name}" was removed.`);
      setDeletingBOM(null);
      await loadData();
    } catch (err: any) {
      toast.error("Delete Failed", err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const exportBOMToCSV = (bom: EnrichedBOMDetail) => {
    const headers = [
      "Part Number",
      "Name",
      "Category",
      "Quantity Required",
      "Designator",
      "On Hand",
      "Available",
      "Unit Cost ($)",
      "Total Cost ($)",
    ];

    const rows = bom.items.map((i) => [
      `"${i.partNumber}"`,
      `"${i.name}"`,
      `"${i.category}"`,
      i.quantity,
      `"${i.referenceDesignator || ""}"`,
      i.quantityOnHand || 0,
      i.quantityAvailable || 0,
      i.unitCost ? i.unitCost.toFixed(3) : "0.000",
      i.totalCost ? i.totalCost.toFixed(2) : "0.00",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${bom.name.replace(/\s+/g, "_")}_${bom.version}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalComponentsCount = boms.reduce((acc, b) => acc + (b.totalItems || 0), 0);

  return (
    <div className="min-h-screen bg-[#010102] text-[#f7f8f8]">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#23252a] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                Hardware Project Workspace
              </span>
              <Badge variant="primary">Active Project</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8] sm:text-3xl mt-1">
              {isLoading ? "Loading Workspace..." : workspace?.name || "Hardware Workspace"}
            </h1>
            <p className="text-xs text-[#8a8f98] mt-1 max-w-2xl">
              Isolated hardware environment for Bill of Materials ingestion, stock gap audits, and supplier purchase orders.
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
              <span>Refresh</span>
            </Button>

            <Link href={`/workspace/${workspaceId}/bom-studio`}>
              <Button variant="primary" size="sm">
                <Cpu className="h-3.5 w-3.5" />
                <span>Launch BOM Studio</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Active BOM Assemblies</span>
              <Layers className="h-4 w-4 text-[#5e6ad2]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#f7f8f8] mt-2">
              {isLoading ? "..." : `${boms.length} Assemblies`}
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Assembly Components</span>
              <Boxes className="h-4 w-4 text-[#828fff]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#828fff] mt-2">
              {isLoading ? "..." : `${totalComponentsCount} Placements`}
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">AI Audit Pipeline</span>
              <Sparkles className="h-4 w-4 text-[#4ade80]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#4ade80] mt-2">
              6-Agent Loop
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Workspace Identifier</span>
              <KeyRound className="h-4 w-4 text-[#facc15]" />
            </div>
            <p className="text-xs font-mono font-semibold text-[#facc15] mt-2 truncate">
              {workspace ? `${workspace.id.slice(0, 12)}...` : "Loading..."}
            </p>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1011] p-3 rounded-xl border border-[#23252a]">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8a8f98]" />
              <Input
                placeholder="Search BOMs by assembly name or version..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-8 bg-[#010102]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/workspace/${workspaceId}/bom-studio`}>
              <Button variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5" />
                <span>Upload BOM</span>
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-[#0f1011] border border-[#23252a] animate-pulse" />
            ))}
          </div>
        ) : filteredBOMs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#23252a] bg-[#0f1011]/40 p-12 text-center space-y-3">
            <Layers className="mx-auto h-8 w-8 text-[#8a8f98]" />
            <h3 className="text-sm font-semibold text-[#f7f8f8]">No Bill of Materials in this Workspace</h3>
            <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
              Upload an electronic CAD/EDA BOM file (.csv, .xlsx, .xls) to run inventory gap analysis and automated procurement.
            </p>
            <Link href={`/workspace/${workspaceId}/bom-studio`}>
              <Button variant="primary" size="sm" className="mt-2">
                <Cpu className="h-3.5 w-3.5" />
                <span>Open BOM Studio</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#23252a] bg-[#141516] text-[#8a8f98] font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Bill of Materials</th>
                    <th className="px-4 py-3">Revision</th>
                    <th className="px-4 py-3 text-right">Line Items</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23252a]/60">
                  {filteredBOMs.map((bom) => (
                    <tr key={bom.id} className="hover:bg-[#141516]/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#f7f8f8]">{bom.name}</td>

                      <td className="px-4 py-3">
                        <span className="rounded bg-[#14172e] px-1.5 py-0.5 text-[10px] font-mono text-[#828fff] border border-[#282d5c]">
                          {bom.version}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-[#f7f8f8]">
                        {bom.totalItems} components
                      </td>

                      <td className="px-4 py-3 text-[#8a8f98] font-mono text-[11px]">
                        {new Date(bom.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetail(bom.id)}
                            className="p-1.5 text-[#8a8f98] hover:text-[#828fff] hover:bg-[#14172e] rounded-md transition-colors cursor-pointer"
                            title="Inspect Line Items"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <Link href={`/workspace/${workspaceId}/bom-studio`}>
                            <Button variant="secondary" size="sm">
                              <span>Open Studio</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingBOM(bom)}
                            className="text-[#8a8f98] hover:text-[#f87171]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeBOMDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-[#23252a] bg-[#0f1011] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#23252a] p-4 bg-[#141516]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5e6ad2]/20 border border-[#5e6ad2]/40 text-[#828fff]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#f7f8f8]">{activeBOMDetail.name}</h3>
                      <Badge variant="primary">{activeBOMDetail.version}</Badge>
                    </div>
                    <p className="text-[10px] text-[#8a8f98]">
                      {activeBOMDetail.items.length} line items • Total Assembly Valuation: ${activeBOMDetail.totalCost?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => exportBOMToCSV(activeBOMDetail)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </Button>

                  <button
                    onClick={() => setActiveBOMDetail(null)}
                    className="p-1.5 text-[#8a8f98] hover:text-white hover:bg-[#010102] rounded-md transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="overflow-x-auto rounded-xl border border-[#23252a]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#141516] text-[#8a8f98] border-b border-[#23252a]">
                      <tr>
                        <th className="p-2.5 font-semibold">Part Number</th>
                        <th className="p-2.5 font-semibold">Name</th>
                        <th className="p-2.5 font-semibold">Category</th>
                        <th className="p-2.5 font-semibold">Qty</th>
                        <th className="p-2.5 font-semibold">On Hand</th>
                        <th className="p-2.5 font-semibold">Available</th>
                        <th className="p-2.5 font-semibold">Unit Cost</th>
                        <th className="p-2.5 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#23252a] text-[#d0d6e0]">
                      {activeBOMDetail.items.map((item) => (
                        <tr key={item.id} className="hover:bg-[#141516]/50">
                          <td className="p-2.5 font-mono font-bold text-[#828fff]">
                            {item.partNumber}
                          </td>
                          <td className="p-2.5 max-w-xs truncate">{item.name}</td>
                          <td className="p-2.5">
                            <span className="rounded bg-[#141516] px-1.5 py-0.5 text-[10px] border border-[#23252a]">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-[#f7f8f8]">{item.quantity}</td>
                          <td className="p-2.5">{item.quantityOnHand ?? 0}</td>
                          <td className="p-2.5">
                            <span
                              className={`font-semibold ${
                                (item.quantityAvailable || 0) >= item.quantity
                                  ? "text-[#4ade80]"
                                  : "text-[#f87171]"
                              }`}
                            >
                              {item.quantityAvailable ?? 0}
                            </span>
                          </td>
                          <td className="p-2.5">
                            ${item.unitCost ? item.unitCost.toFixed(3) : "0.000"}
                          </td>
                          <td className="p-2.5 font-bold text-[#f7f8f8]">
                            ${item.totalCost ? item.totalCost.toFixed(2) : "0.00"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deletingBOM}
          title="Delete Bill of Materials"
          description={`Are you sure you want to permanently delete BOM '${deletingBOM?.name}'? All associated line item placements will be removed.`}
          confirmLabel="Delete BOM"
          cancelLabel="Cancel"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingBOM(null)}
        />
      </main>
    </div>
  );
}
