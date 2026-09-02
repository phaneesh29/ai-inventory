"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  fetchGlobalBOMs,
  fetchGlobalBOMSummary,
  fetchWorkspaces,
  deleteBOM,
  type GlobalBOMItem,
  type GlobalBOMSummary,
  type Workspace,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Layers,
  Search,
  RefreshCw,
  FolderGit2,
  Boxes,
  Microchip,
  ArrowRight,
  Trash2,
} from "lucide-react";

export default function GlobalBOMsPage() {
  const { toast } = useToast();
  const [boms, setBoms] = useState<GlobalBOMItem[]>([]);
  const [summary, setSummary] = useState<GlobalBOMSummary | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState("All");
  const [bomToDelete, setBomToDelete] = useState<GlobalBOMItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [bomsData, summaryData, wsData] = await Promise.all([
        fetchGlobalBOMs(),
        fetchGlobalBOMSummary(),
        fetchWorkspaces(),
      ]);
      setBoms(bomsData);
      setSummary(summaryData);
      setWorkspaces(wsData);
    } catch (err: any) {
      toast.error("Failed to load global BOMs", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredBOMs = useMemo(() => {
    return boms.filter((b) => {
      const matchesWorkspace =
        selectedWorkspaceFilter === "All" || b.workspaceId === selectedWorkspaceFilter;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        b.name.toLowerCase().includes(q) ||
        (b.workspaceName && b.workspaceName.toLowerCase().includes(q)) ||
        b.version.toLowerCase().includes(q);

      return matchesWorkspace && matchesSearch;
    });
  }, [boms, selectedWorkspaceFilter, searchQuery]);

  const handleDelete = async () => {
    if (!bomToDelete) return;
    try {
      setIsDeleting(true);
      await deleteBOM(bomToDelete.id);
      toast.success("BOM Deleted", `Bill of Materials '${bomToDelete.name}' was removed.`);
      setBomToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error("Failed to delete BOM", err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010102] text-[#f7f8f8]">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#23252a] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                Enterprise Hardware Assemblies
              </span>
              <Badge variant="primary">Global Scope</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8] sm:text-3xl mt-1">
              Bill of Materials Directory
            </h1>
            <p className="text-xs text-[#8a8f98] mt-1 max-w-2xl">
              Cross-workspace BOM registry. Track active hardware revisions and total line items across all project workspaces.
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
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Total Active BOMs</span>
              <Layers className="h-4 w-4 text-[#5e6ad2]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#f7f8f8] mt-2">
              {summary?.totalBOMs ?? boms.length} Assemblies
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Assembly Line Items</span>
              <Boxes className="h-4 w-4 text-[#828fff]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#828fff] mt-2">
              {summary?.totalLineItems ?? 0} Placements
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Unique Master Components</span>
              <Microchip className="h-4 w-4 text-[#4ade80]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#4ade80] mt-2">
              {summary?.totalUniqueComponents ?? 0} SKUs
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Active Projects</span>
              <FolderGit2 className="h-4 w-4 text-[#facc15]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#facc15] mt-2">
              {workspaces.length} Workspaces
            </p>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1011] p-3 rounded-xl border border-[#23252a]">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8a8f98]" />
              <Input
                placeholder="Search BOM name, version, or workspace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-8 bg-[#010102]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8a8f98] whitespace-nowrap">Filter Workspace:</span>
            <select
              value={selectedWorkspaceFilter}
              onChange={(e) => setSelectedWorkspaceFilter(e.target.value)}
              className="rounded-lg bg-[#010102] border border-[#23252a] px-2.5 py-1 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            >
              <option value="All">All Workspaces</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
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
            <h3 className="text-sm font-semibold text-[#f7f8f8]">No Bill of Materials Found</h3>
            <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
              BOMs are uploaded and managed inside project workspaces. Open any workspace project to upload PCB BOM files.
            </p>
            <Link href="/">
              <Button variant="primary" size="sm" className="mt-2">
                <FolderGit2 className="h-3.5 w-3.5" />
                <span>Go to Workspaces</span>
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
                    <th className="px-4 py-3">Workspace Project</th>
                    <th className="px-4 py-3 text-right">Line Items</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23252a]/60">
                  {filteredBOMs.map((bom) => (
                    <tr key={bom.id} className="hover:bg-[#141516]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#f7f8f8]">{bom.name}</span>
                          <span className="rounded bg-[#14172e] px-1.5 py-0.5 text-[10px] font-mono text-[#828fff] border border-[#282d5c]">
                            {bom.version}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          href={`/workspace/${bom.workspaceId}`}
                          className="text-xs text-[#828fff] hover:underline flex items-center gap-1.5"
                        >
                          <FolderGit2 className="h-3.5 w-3.5 text-[#8a8f98]" />
                          <span>{bom.workspaceName || "Project Workspace"}</span>
                        </Link>
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
                          <Link href={`/workspace/${bom.workspaceId}`}>
                            <Button variant="secondary" size="sm">
                              <span>Open Project</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBomToDelete(bom)}
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

        <ConfirmModal
          isOpen={!!bomToDelete}
          title="Delete Bill of Materials"
          description={`Are you sure you want to permanently delete BOM '${bomToDelete?.name}'? All associated line item placements will be removed.`}
          confirmLabel="Delete BOM"
          cancelLabel="Cancel"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setBomToDelete(null)}
        />
      </main>
    </div>
  );
}
