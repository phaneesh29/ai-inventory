"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  fetchWorkspaceById,
  fetchBOMsByWorkspace,
  fetchBOMById,
  uploadBOMFile,
  approveBOMPlan,
  deleteBOM,
  type Workspace,
  type GlobalBOMItem,
  type EnrichedBOMDetail,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Layers,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  Cpu,
  Boxes,
  Truck,
  FileSpreadsheet,
  X,
  Play,
  Check,
} from "lucide-react";

interface AgentStep {
  name: string;
  role: string;
  status: "pending" | "running" | "completed" | "error";
  model: string;
  details?: string;
}

export default function BOMStudioPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { toast } = useToast();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [boms, setBoms] = useState<GlobalBOMItem[]>([]);
  const [isLoadingBOMs, setIsLoadingBOMs] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bomName, setBomName] = useState("");
  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [instructions, setInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [workflowResult, setWorkflowResult] = useState<any | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalResult, setApprovalResult] = useState<any | null>(null);

  const [activeBOMDetail, setActiveBOMDetail] = useState<EnrichedBOMDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [deletingBOM, setDeletingBOM] = useState<GlobalBOMItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeTab, setActiveTab] = useState<"studio" | "registry">("studio");

  const [agentPipeline, setAgentPipeline] = useState<AgentStep[]>([
    {
      name: "Document Ingestion Agent",
      role: "Parser & Normalizer",
      status: "pending",
      model: "codestral-latest",
      details: "Extracts tabular MPNs, designators, and quantities",
    },
    {
      name: "Inventory Audit Agent",
      role: "Stock Gap Detector",
      status: "pending",
      model: "mistral-small-latest",
      details: "Matches master catalog and identifies stock deficits",
    },
    {
      name: "Alternative Sourcing Agent",
      role: "Parametric Substitute Finder",
      status: "pending",
      model: "mistral-large-latest",
      details: "Discovers pin-compatible replacements for shortages",
    },
    {
      name: "Distributor Matrix Agent",
      role: "Price & MOQ Optimizer",
      status: "pending",
      model: "mistral-medium-latest",
      details: "Benchmarks quotes across DigiKey, Mouser, and LCSC",
    },
    {
      name: "Plan Formulation Agent",
      role: "Procurement Architect",
      status: "pending",
      model: "codestral-latest",
      details: "Calculates lot sizes, order splits, and total cost",
    },
    {
      name: "Human-In-The-Loop Agent",
      role: "Execution Guardrail",
      status: "pending",
      model: "Deterministic Engine",
      details: "Awaits user confirmation to lock inventory & draft POs",
    },
  ]);

  const loadData = async () => {
    try {
      setIsLoadingBOMs(true);
      const [ws, list] = await Promise.all([
        fetchWorkspaceById(workspaceId),
        fetchBOMsByWorkspace(workspaceId),
      ]);
      setWorkspace(ws);
      setBoms(list);
    } catch (err: any) {
      toast.error("Failed to load workspace BOMs", err.message);
    } finally {
      setIsLoadingBOMs(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  }, [workspaceId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExts = [".csv", ".xlsx", ".xls"];
      const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

      if (!hasValidExt) {
        toast.error("Invalid File Type", "Please upload a .csv, .xlsx, or .xls file.");
        return;
      }

      setSelectedFile(file);
      if (!bomName) {
        setBomName(file.name.replace(/\.[^/.]+$/, "") + " Assembly");
      }
    }
  };

  const runPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("File Required", "Please select a BOM file to process.");
      return;
    }

    setIsProcessing(true);
    setWorkflowResult(null);
    setApprovalResult(null);

    setAgentPipeline((prev) =>
      prev.map((step, idx) => ({
        ...step,
        status: idx === 0 ? "running" : "pending",
      }))
    );

    const timer = setInterval(() => {
      setAgentPipeline((prev) => {
        const runningIdx = prev.findIndex((s) => s.status === "running");
        if (runningIdx === -1) return prev;
        if (runningIdx < prev.length - 1) {
          return prev.map((s, i) => {
            if (i === runningIdx) return { ...s, status: "completed" };
            if (i === runningIdx + 1) return { ...s, status: "running" };
            return s;
          });
        }
        return prev;
      });
    }, 600);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("workspaceId", workspaceId);
      formData.append("name", bomName.trim() || `${workspace?.name || "Project"} BOM`);
      formData.append("version", "v1.0");
      formData.append("batchQuantity", String(batchQuantity || 1));
      if (instructions.trim()) {
        formData.append("instructions", instructions.trim());
      }

      const result = await uploadBOMFile(formData);
      clearInterval(timer);

      setAgentPipeline((prev) =>
        prev.map((s) => ({ ...s, status: "completed" }))
      );

      setWorkflowResult(result);
      toast.success("BOM Audited Successfully", "6-agent analysis complete. Review execution plan below.");
      await loadData();
    } catch (err: any) {
      clearInterval(timer);
      setAgentPipeline((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "error" } : s))
      );
      toast.error("Pipeline Error", err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!workflowResult || !workflowResult.plan) return;

    try {
      setIsApproving(true);
      const res = await approveBOMPlan(workflowResult.bomId, {
        bomId: workflowResult.bomId,
        workspaceId,
        plan: workflowResult.plan,
      });

      setApprovalResult(res);
      toast.success("Plan Executed", "Warehouse stock allocated and Purchase Orders drafted.");
      await loadData();
    } catch (err: any) {
      toast.error("Execution Failed", err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleViewDetail = async (bomId: string) => {
    try {
      setIsLoadingDetail(true);
      const detail = await fetchBOMById(bomId);
      setActiveBOMDetail(detail);
    } catch (err: any) {
      toast.error("Failed to fetch BOM details", err.message);
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
                Autonomous Hardware Engine
              </span>
              <Badge variant="primary">6-Agent Pipeline</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8] sm:text-3xl mt-1">
              BOM Workflow Studio
            </h1>
            <p className="text-xs text-[#8a8f98] mt-1 max-w-2xl">
              Autonomous ingestion, stock gap audits, distributor price benchmark, and purchase order formulation for {workspace?.name || "this workspace"}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/workspace/${workspaceId}`}>
              <Button variant="secondary" size="sm">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Project</span>
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              isLoading={isLoadingBOMs}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Target Project</span>
              <Layers className="h-4 w-4 text-[#5e6ad2]" />
            </div>
            <p className="text-base font-bold font-mono text-[#f7f8f8] mt-2 truncate">
              {workspace?.name || "Hardware Project"}
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Active Assemblies</span>
              <Boxes className="h-4 w-4 text-[#828fff]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#828fff] mt-2">
              {boms.length} BOMs
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Distributor Sourcing</span>
              <Truck className="h-4 w-4 text-[#facc15]" />
            </div>
            <p className="text-sm font-bold font-mono text-[#facc15] mt-2">
              DigiKey • Mouser • LCSC
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Pipeline Status</span>
              <Sparkles className="h-4 w-4 text-[#4ade80]" />
            </div>
            <p className="text-sm font-bold font-mono text-[#4ade80] mt-2">
              {isProcessing ? "Executing Agents..." : "Ready for Ingestion"}
            </p>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1011] p-3 rounded-xl border border-[#23252a]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("studio")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "studio"
                  ? "bg-[#5e6ad2] text-white"
                  : "bg-[#010102] border border-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8]"
              }`}
            >
              AI Ingestion Studio
            </button>
            <button
              onClick={() => setActiveTab("registry")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "registry"
                  ? "bg-[#5e6ad2] text-white"
                  : "bg-[#010102] border border-[#23252a] text-[#8a8f98] hover:text-[#f7f8f8]"
              }`}
            >
              Workspace Assemblies ({boms.length})
            </button>
          </div>
        </div>

        {activeTab === "studio" && (
          <div className="space-y-6">
            <Card className="border-[#23252a] bg-[#0f1011]">
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#828fff]" />
                    <span>Upload & Audit Electronic Bill of Materials</span>
                  </div>
                </CardTitle>
                <CardDescription>
                  Upload your CAD/EDA BOM file. Our 6-agent system parses line items, checks live warehouse stock, and calculates procurement purchase orders.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={runPipeline} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        BOM Name / Assembly Tag <span className="text-[#f87171]">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Flight Controller Mainboard Rev 2"
                        value={bomName}
                        onChange={(e) => setBomName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Target Batch Production Quantity <span className="text-[#f87171]">*</span>
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={batchQuantity}
                        onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Special Assembly Directives & Constraints (Optional)
                    </label>
                    <Input
                      placeholder="e.g. SMT Automotive grade AEC-Q200 only; prefer DigiKey for passives."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      BOM File (.csv, .xlsx, .xls) <span className="text-[#f87171]">*</span>
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {!selectedFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-[#23252a] hover:border-[#5e6ad2]/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#010102]/60 hover:bg-[#141516]"
                      >
                        <UploadCloud className="h-8 w-8 text-[#8a8f98] mx-auto mb-2" />
                        <p className="text-xs font-semibold text-[#f7f8f8]">
                          Click to browse or drop Bill of Materials file
                        </p>
                        <p className="text-[10px] text-[#8a8f98] mt-1">
                          Supports standard export schemas from Altium Designer, KiCad, Eagle, OrCAD, and Excel
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-xl bg-[#14172e] border border-[#282d5c] p-3.5 text-xs">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileCheck className="h-5 w-5 text-[#4ade80] shrink-0" />
                          <div className="overflow-hidden">
                            <span className="font-semibold text-[#f7f8f8] block truncate">
                              {selectedFile.name}
                            </span>
                            <span className="text-[10px] text-[#8a8f98]">
                              {(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI Multi-Agent Audit
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="p-1.5 text-[#8a8f98] hover:text-[#f87171] hover:bg-[#241414] rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={!selectedFile || isProcessing}
                      isLoading={isProcessing}
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Execute 6-Agent AI Audit</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {(isProcessing || workflowResult) && (
              <Card className="border-[#23252a] bg-[#0f1011]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-[#5e6ad2]" />
                        <span>Autonomous 6-Agent Execution Pipeline</span>
                      </div>
                    </CardTitle>
                    <Badge variant={workflowResult ? "success" : "primary"}>
                      {workflowResult ? "Pipeline Completed" : "Pipeline Active"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {agentPipeline.map((agent, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-3.5 space-y-2 transition-all ${
                          agent.status === "running"
                            ? "border-[#5e6ad2] bg-[#14172e]/60 ring-1 ring-[#5e6ad2]"
                            : agent.status === "completed"
                            ? "border-[#23252a] bg-[#010102]"
                            : "border-[#23252a]/40 bg-[#090a0f] opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-[#8a8f98]">
                            Agent 0{i + 1}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#141516] border border-[#23252a] text-[#828fff]">
                            {agent.model}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            {agent.status === "completed" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#4ade80] shrink-0" />
                            ) : agent.status === "running" ? (
                              <RefreshCw className="h-3.5 w-3.5 text-[#5e6ad2] animate-spin shrink-0" />
                            ) : (
                              <div className="h-3.5 w-3.5 rounded-full border border-[#3e3e44] shrink-0" />
                            )}
                            <h4 className="text-xs font-semibold text-[#f7f8f8] truncate">
                              {agent.name}
                            </h4>
                          </div>
                          <p className="text-[10px] text-[#8a8f98] mt-0.5">{agent.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {workflowResult && (
              <Card className="border-[#5e6ad2]/60 bg-[#0f1011]">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Audit Complete</Badge>
                        <span className="text-xs text-[#8a8f98]">
                          Target: {batchQuantity} units
                        </span>
                      </div>
                      <CardTitle className="mt-1">Formulated Procurement & Allocation Plan</CardTitle>
                    </div>

                    {!approvalResult && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleApprovePlan}
                        isLoading={isApproving}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve & Execute Plan</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {approvalResult && (
                    <div className="rounded-xl border border-[#14532d] bg-[#0d2e16]/80 p-4 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-[#4ade80] font-bold">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Plan Executed & Locked in Database</span>
                      </div>
                      <p className="text-[#d0d6e0] leading-relaxed">
                        Warehouse inventory has been reserved, and Purchase Orders have been generated for all missing stock.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-[#010102] border border-[#23252a]">
                      <span className="text-[10px] text-[#8a8f98] block">Total BOM Items</span>
                      <span className="text-base font-bold text-[#f7f8f8]">
                        {workflowResult.totalItems || workflowResult.plan?.summary?.totalLineItems || 0} Line Items
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#010102] border border-[#23252a]">
                      <span className="text-[10px] text-[#8a8f98] block">Warehouse Stock Covered</span>
                      <span className="text-base font-bold text-[#4ade80]">
                        {workflowResult.plan?.stockAllocations?.length || 0} Allocated
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#010102] border border-[#23252a]">
                      <span className="text-[10px] text-[#8a8f98] block">Purchase Orders Required</span>
                      <span className="text-base font-bold text-[#facc15]">
                        {workflowResult.plan?.purchaseOrders?.length || 0} POs Drafted
                      </span>
                    </div>
                  </div>

                  {workflowResult.plan?.purchaseOrders && workflowResult.plan.purchaseOrders.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-[#f7f8f8] flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-[#5e6ad2]" />
                        <span>Proposed Purchase Orders</span>
                      </h4>

                      <div className="overflow-x-auto rounded-xl border border-[#23252a]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#141516] text-[#8a8f98] border-b border-[#23252a]">
                            <tr>
                              <th className="p-2.5 font-semibold">Supplier</th>
                              <th className="p-2.5 font-semibold">Part Number</th>
                              <th className="p-2.5 font-semibold">Quantity</th>
                              <th className="p-2.5 font-semibold">Unit Price</th>
                              <th className="p-2.5 font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#23252a] text-[#d0d6e0]">
                            {workflowResult.plan.purchaseOrders.map((po: any, pIdx: number) => (
                              <tr key={pIdx} className="hover:bg-[#141516]/50">
                                <td className="p-2.5 font-bold text-[#828fff]">
                                  {po.supplierCode || po.supplierName}
                                </td>
                                <td className="p-2.5 font-mono">{po.partNumber}</td>
                                <td className="p-2.5">{po.orderQuantity} pcs</td>
                                <td className="p-2.5">${po.unitPrice?.toFixed(3)}</td>
                                <td className="p-2.5 font-semibold text-[#f7f8f8]">
                                  ${(po.orderQuantity * po.unitPrice).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "registry" && (
          <div className="space-y-4">
            {isLoadingBOMs ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-[#0f1011] border border-[#23252a] animate-pulse" />
                ))}
              </div>
            ) : boms.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#23252a] bg-[#0f1011]/40 p-12 text-center space-y-3">
                <Layers className="mx-auto h-8 w-8 text-[#8a8f98]" />
                <h3 className="text-sm font-semibold text-[#f7f8f8]">No Bill of Materials in this Workspace</h3>
                <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
                  Switch to the AI Ingestion Studio tab to upload your first BOM file.
                </p>
                <Button variant="primary" size="sm" onClick={() => setActiveTab("studio")} className="mt-2">
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Go to Ingestion Studio</span>
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#23252a] bg-[#141516] text-[#8a8f98] font-semibold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Assembly Name</th>
                        <th className="px-4 py-3">Revision</th>
                        <th className="px-4 py-3 text-right">Line Items</th>
                        <th className="px-4 py-3">Created Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#23252a]/60">
                      {boms.map((b) => (
                        <tr key={b.id} className="hover:bg-[#141516]/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-[#f7f8f8]">{b.name}</td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-[#14172e] px-1.5 py-0.5 text-[10px] font-mono text-[#828fff] border border-[#282d5c]">
                              {b.version}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[#f7f8f8]">
                            {b.totalItems} components
                          </td>
                          <td className="px-4 py-3 text-[#8a8f98] font-mono text-[11px]">
                            {new Date(b.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewDetail(b.id)}
                                className="p-1.5 text-[#8a8f98] hover:text-[#828fff] hover:bg-[#14172e] rounded-md transition-colors cursor-pointer"
                                title="Inspect Line Items"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingBOM(b)}
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
