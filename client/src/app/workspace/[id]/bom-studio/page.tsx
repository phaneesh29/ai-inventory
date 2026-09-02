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
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  Layers,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  Cpu,
  Boxes,
  Truck,
  X,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Copy,
  ExternalLink,
  Zap,
  CheckSquare,
  Square,
  ArrowRight,
} from "lucide-react";

interface AgentStep {
  id: string;
  number: string;
  name: string;
  role: string;
  status: "pending" | "running" | "completed" | "error";
  model: string;
  description: string;
}

const SAMPLE_FLIGHT_CONTROLLER_CSV = `Part Number,Description,Designator,Quantity,Footprint,Category
ESP32-WROOM-32E-N4,Espressif Dual-Core Wi-Fi & BLE MCU Module,U1,1,SMD Module 38-Pin,Microcontroller
STM32F103C8T6,STMicroelectronics ARM Cortex-M3 72MHz MCU,U2,1,LQFP-48,Microcontroller
RC0805FR-0710KL,Yageo 10k Ohm 1% 1/8W SMD Resistor 0805,R1 R2 R3 R4,4,0805,Resistor
CRCW080510K0FKEA,Vishay Dale 10k Ohm 1% 1/8W SMD Resistor 0805,R5 R6,2,0805,Resistor
SSD1306-0.96-OLED-I2C,Solomon Systech 0.96 inch 128x64 I2C OLED Display Module,DISP1,1,4-Pin Breakout,Other
TPS54331DR,Texas Instruments 3A 28V Step Down DC-DC Converter,U3,1,SOIC-8,Power Management
CL21A106KOQNNNE,Samsung 10uF 16V X5R 0805 Ceramic Capacitor,C1 C2 C3,3,0805,Capacitor`;

const SAMPLE_IOT_SENSOR_TXT = `Part Number	Description	Designator	Quantity	Footprint	Category
ESP32-S3-WROOM-1-N8R8	Espressif ESP32-S3 AI Vector MCU 8MB Flash 8MB PSRAM	U1	1	SMD Module 41-Pin	Microcontroller
SSD1306-0.96-OLED-I2C	Solomon Systech 0.96 inch 128x64 I2C OLED Display Module	DISP1	1	4-Pin Header	Other
RC0805FR-0710KL	Yageo 10k Ohm 1% 1/8W SMD Resistor 0805	R1 R2	2	0805	Resistor
CRCW080510K0FKEA	Vishay Dale 10k Ohm 1% 1/8W SMD Resistor 0805	R3 R4 R5	3	0805	Resistor
BME280	Bosch Digital Humidity Pressure and Temperature Sensor	U2	1	LGA-8	Sensor`;

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

  const [confirmReserveStock, setConfirmReserveStock] = useState(true);
  const [confirmDraftPOs, setConfirmDraftPOs] = useState(true);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>({
    "01": true,
    "02": true,
    "03": true,
    "04": true,
    "05": true,
    "06": true,
  });

  const [activeBOMDetail, setActiveBOMDetail] = useState<EnrichedBOMDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [deletingBOM, setDeletingBOM] = useState<GlobalBOMItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeTab, setActiveTab] = useState<"studio" | "registry">("studio");

  const [agentPipeline, setAgentPipeline] = useState<AgentStep[]>([
    {
      id: "01",
      number: "01",
      name: "Document Ingestion Agent",
      role: "Parser, Normalizer & Schema Validator",
      status: "pending",
      model: "codestral-latest",
      description: "Extracts tabular MPNs, designators, footprints, and technical specs into unified database records.",
    },
    {
      id: "02",
      number: "02",
      name: "Inventory Audit Agent",
      role: "Stock Gap & Deficit Auditor",
      status: "pending",
      model: "codestral-latest",
      description: "Performs real-time warehouse inventory cross-referencing and calculates buildable batch ratios.",
    },
    {
      id: "03",
      number: "03",
      name: "Alternative Sourcing Agent",
      role: "Parametric Replacement & Circuit Synthesizer",
      status: "pending",
      model: "codestral-latest",
      description: "Discovers in-stock drop-in replacements, parametric upgrades, and series/parallel resistor combinations.",
    },
    {
      id: "04",
      number: "04",
      name: "Distributor Matrix Agent",
      role: "Multi-Vendor Price & MOQ Optimizer",
      status: "pending",
      model: "codestral-latest",
      description: "Benchmarks real-time distributor catalog pricing and lead times across DigiKey, Mouser, and LCSC.",
    },
    {
      id: "05",
      number: "05",
      name: "Plan Formulation Agent",
      role: "Procurement Architect",
      status: "pending",
      model: "codestral-latest",
      description: "Formulates optimal PO lot sizes, order splits, total cost calculations, and allocation schedules.",
    },
    {
      id: "06",
      number: "06",
      name: "Human-In-The-Loop (HITL) Guardrail",
      role: "Deterministic Execution Authority",
      status: "pending",
      model: "HITL Engine",
      description: "Awaits direct human approval to commit warehouse stock reservations and emit live supplier Purchase Orders.",
    },
  ]);

  const toggleAgentExpand = (id: string) => {
    setExpandedAgents((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAllAgents = () => {
    setExpandedAgents({
      "01": true,
      "02": true,
      "03": true,
      "04": true,
      "05": true,
      "06": true,
    });
  };

  const collapseAllAgents = () => {
    setExpandedAgents({
      "01": false,
      "02": false,
      "03": false,
      "04": false,
      "05": false,
      "06": false,
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success("Copied to Clipboard", text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const loadSampleFile = (type: "csv" | "txt") => {
    if (type === "csv") {
      const blob = new Blob([SAMPLE_FLIGHT_CONTROLLER_CSV], { type: "text/csv" });
      const file = new File([blob], "flight_controller_mainboard.csv", { type: "text/csv" });
      setSelectedFile(file);
      setBomName("Flight Controller Mainboard Rev 2");
      toast.success("Sample Loaded", "Flight Controller CSV loaded with 7 components.");
    } else {
      const blob = new Blob([SAMPLE_IOT_SENSOR_TXT], { type: "text/plain" });
      const file = new File([blob], "iot_sensor_module.txt", { type: "text/plain" });
      setSelectedFile(file);
      setBomName("IoT Environmental Sensor Rev 1");
      toast.success("Sample Loaded", "IoT Sensor TXT loaded with 5 components.");
    }
  };

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
      const validExts = [".csv", ".xlsx", ".xls", ".txt"];
      const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

      if (!hasValidExt) {
        toast.error("Invalid File Type", "Please upload a .csv, .xlsx, .xls, or .txt file.");
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
    }, 700);

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
        prev.map((s, i) => ({
          ...s,
          status: i === 5 ? (approvalResult ? "completed" : "running") : "completed",
        }))
      );

      setWorkflowResult(result);
      expandAllAgents();

      toast.success("BOM Audited Successfully", "6-agent pipeline complete. Review outputs and HITL approval below.");
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
    if (!workflowResult) return;

    const bomId = workflowResult.bom?.id || workflowResult.bomId;
    const plan = workflowResult.processPlan || workflowResult.plan;

    if (!bomId || !plan) {
      toast.error("Execution Error", "No active plan found to approve.");
      return;
    }

    try {
      setIsApproving(true);
      const res = await approveBOMPlan(bomId, {
        bomId,
        workspaceId,
        plan,
      });

      setApprovalResult(res);
      setAgentPipeline((prev) =>
        prev.map((s) => ({ ...s, status: "completed" }))
      );

      toast.success("HITL Plan Executed", "Warehouse stock locked and supplier Purchase Orders generated.");
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

  const renderLollipopNodeIcon = (agent: AgentStep) => {
    if (agent.status === "completed") {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#14532d] border-2 border-[#4ade80] text-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.35)] transition-all">
          <CheckCircle2 className="h-5 w-5" />
        </div>
      );
    }
    if (agent.status === "running") {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#14172e] border-2 border-[#5e6ad2] text-[#828fff] shadow-[0_0_15px_rgba(94,106,210,0.5)] animate-pulse transition-all">
          <RefreshCw className="h-4 w-4 animate-spin" />
        </div>
      );
    }
    if (agent.status === "error") {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#241414] border-2 border-[#f87171] text-[#f87171] shadow-[0_0_12px_rgba(248,113,113,0.35)] transition-all">
          <AlertTriangle className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#141516] border-2 border-[#23252a] text-[#8a8f98] transition-all">
        <span className="font-mono text-xs font-bold">{agent.number}</span>
      </div>
    );
  };

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
              {isProcessing ? "Executing Agents..." : workflowResult ? "Audit Ready for HITL" : "Ready for Ingestion"}
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
              AI Ingestion Studio & Pipeline
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
          <div className="space-y-8">
            <Card className="border-[#23252a] bg-[#0f1011]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#828fff]" />
                        <span>Upload & Trigger 6-Agent Hardware Audit</span>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Upload your CAD/EDA BOM file. The 6-agent system standardizes MPNs, audits inventory gaps, benchmarks distributor quotes, and awaits your Human-In-The-Loop approval.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#8a8f98] font-medium hidden sm:inline">1-Click Test:</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => loadSampleFile("csv")}
                      className="text-[11px]"
                    >
                      <Zap className="h-3 w-3 text-[#facc15]" />
                      <span>Drone BOM (.csv)</span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => loadSampleFile("txt")}
                      className="text-[11px]"
                    >
                      <Zap className="h-3 w-3 text-[#4ade80]" />
                      <span>IoT Sensor (.txt)</span>
                    </Button>
                  </div>
                </div>
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
                      BOM File (.csv, .xlsx, .xls, .txt) <span className="text-[#f87171]">*</span>
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,.txt"
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
                          Click to browse or drop Bill of Materials file (.csv, .txt, .xlsx)
                        </p>
                        <p className="text-[10px] text-[#8a8f98] mt-1">
                          Supports standard export schemas from Altium Designer, KiCad, Eagle, OrCAD, and plain text tab/comma delimited formats
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
                      <span>Execute 6-Agent Audit</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#23252a] pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-[#5e6ad2]" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#f7f8f8]">
                    Autonomous Agent Execution Tree
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={expandAllAgents}
                    className="text-[10px] text-[#8a8f98] hover:text-white px-2 py-1 rounded hover:bg-[#141516] transition-colors cursor-pointer"
                  >
                    Expand All
                  </button>
                  <span className="text-[#3e3e44] text-[10px]">•</span>
                  <button
                    onClick={collapseAllAgents}
                    className="text-[10px] text-[#8a8f98] hover:text-white px-2 py-1 rounded hover:bg-[#141516] transition-colors cursor-pointer"
                  >
                    Collapse All
                  </button>

                  <Badge variant={workflowResult ? "success" : "primary"}>
                    {workflowResult ? "Pipeline Completed • HITL Active" : isProcessing ? "Executing Pipeline..." : "Pipeline Standing By"}
                  </Badge>
                </div>
              </div>

              <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-[17px] sm:before:left-[21px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b before:from-[#5e6ad2] before:via-[#828fff] before:to-[#4ade80]">
                
                <div className="relative group">
                  <div className="absolute -left-[35px] sm:-left-[41px] top-1">
                    {renderLollipopNodeIcon(agentPipeline[0])}
                  </div>

                  <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden shadow-lg">
                    <div
                      onClick={() => toggleAgentExpand("01")}
                      className="flex items-center justify-between p-4 bg-[#141516]/80 cursor-pointer hover:bg-[#141516] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#010102] border border-[#23252a] text-[#828fff]">
                          Agent 01
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-[#f7f8f8]">
                            Document Ingestion Agent
                          </h4>
                          <span className="text-[10px] text-[#8a8f98]">
                            {agentPipeline[0].role} • Model: <span className="font-mono text-[#828fff]">{agentPipeline[0].model}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={agentPipeline[0].status === "completed" ? "success" : "neutral"}>
                          {agentPipeline[0].status.toUpperCase()}
                        </Badge>
                        {expandedAgents["01"] ? (
                          <ChevronUp className="h-4 w-4 text-[#8a8f98]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#8a8f98]" />
                        )}
                      </div>
                    </div>

                    {expandedAgents["01"] && (
                      <div className="p-4 border-t border-[#23252a] space-y-4 bg-[#090a0f]">
                        <MarkdownRenderer
                          content={workflowResult?.bomAgentSummary || agentPipeline[0].description}
                        />

                        {workflowResult?.bom?.items && (
                          <div className="overflow-x-auto rounded-lg border border-[#23252a]">
                            <table className="w-full text-left text-[11px]">
                              <thead className="bg-[#141516] text-[#8a8f98] border-b border-[#23252a]">
                                <tr>
                                  <th className="p-2">Part Number</th>
                                  <th className="p-2">Name / Description</th>
                                  <th className="p-2">Category</th>
                                  <th className="p-2">Designator</th>
                                  <th className="p-2 text-right">Required Qty</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#23252a]/60 text-[#d0d6e0]">
                                {workflowResult.bom.items.map((it: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-[#141516]/40">
                                    <td className="p-2 font-mono font-bold text-[#828fff]">
                                      <div className="flex items-center gap-1.5">
                                        <span>{it.partNumber}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopy(it.partNumber)}
                                          className="text-[#8a8f98] hover:text-white p-0.5"
                                          title="Copy MPN"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </td>
                                    <td className="p-2 truncate max-w-xs">{it.name}</td>
                                    <td className="p-2">
                                      <span className="rounded bg-[#141516] px-1.5 py-0.5 text-[9px] border border-[#23252a]">
                                        {it.category}
                                      </span>
                                    </td>
                                    <td className="p-2 font-mono text-[10px]">
                                      {it.referenceDesignator || "-"}
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-[#f7f8f8]">
                                      {it.quantity} {it.unit || "pcs"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -left-[35px] sm:-left-[41px] top-1">
                    {renderLollipopNodeIcon(agentPipeline[1])}
                  </div>

                  <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden shadow-lg">
                    <div
                      onClick={() => toggleAgentExpand("02")}
                      className="flex items-center justify-between p-4 bg-[#141516]/80 cursor-pointer hover:bg-[#141516] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#010102] border border-[#23252a] text-[#828fff]">
                          Agent 02
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-[#f7f8f8]">
                            Inventory Audit Agent
                          </h4>
                          <span className="text-[10px] text-[#8a8f98]">
                            {agentPipeline[1].role} • Model: <span className="font-mono text-[#828fff]">{agentPipeline[1].model}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={agentPipeline[1].status === "completed" ? "success" : "neutral"}>
                          {agentPipeline[1].status.toUpperCase()}
                        </Badge>
                        {expandedAgents["02"] ? (
                          <ChevronUp className="h-4 w-4 text-[#8a8f98]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#8a8f98]" />
                        )}
                      </div>
                    </div>

                    {expandedAgents["02"] && (
                      <div className="p-4 border-t border-[#23252a] space-y-4 bg-[#090a0f]">
                        <MarkdownRenderer
                          content={workflowResult?.audit?.agentSummary || agentPipeline[1].description}
                        />

                        {workflowResult?.audit && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-[#010102] border border-[#23252a]">
                              <span className="text-[10px] text-[#8a8f98] block">Readiness Score</span>
                              <span className="text-lg font-bold text-[#4ade80]">
                                {workflowResult.audit.readinessScore}%
                              </span>
                            </div>

                            <div className="p-3 rounded-lg bg-[#010102] border border-[#23252a]">
                              <span className="text-[10px] text-[#8a8f98] block">In-Stock Coverage</span>
                              <span className="text-lg font-bold text-[#f7f8f8]">
                                {workflowResult.audit.inStockLineItems} / {workflowResult.audit.totalLineItems} Lines
                              </span>
                            </div>

                            <div className="p-3 rounded-lg bg-[#010102] border border-[#23252a]">
                              <span className="text-[10px] text-[#8a8f98] block">Shortage Deficits</span>
                              <span className="text-lg font-bold text-[#f87171]">
                                {workflowResult.audit.deficitLineItems} Deficits
                              </span>
                            </div>
                          </div>
                        )}

                        {workflowResult?.audit?.deficitItems && workflowResult.audit.deficitItems.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-[#f87171]">
                              Identified Component Shortages:
                            </span>
                            <div className="overflow-x-auto rounded-lg border border-[#3e1b1b] bg-[#1a0a0a]">
                              <table className="w-full text-left text-[11px]">
                                <thead className="bg-[#2a1010] text-[#fca5a5] border-b border-[#3e1b1b]">
                                  <tr>
                                    <th className="p-2">Part Number</th>
                                    <th className="p-2">Category</th>
                                    <th className="p-2 text-right">Required</th>
                                    <th className="p-2 text-right">Warehouse Available</th>
                                    <th className="p-2 text-right">Deficit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#3e1b1b] text-[#fca5a5]">
                                  {workflowResult.audit.deficitItems.map((d: any, dIdx: number) => (
                                    <tr key={dIdx}>
                                      <td className="p-2 font-mono font-bold">{d.partNumber}</td>
                                      <td className="p-2">{d.category}</td>
                                      <td className="p-2 text-right">{d.requiredQuantity}</td>
                                      <td className="p-2 text-right">{d.availableQuantity}</td>
                                      <td className="p-2 text-right font-bold text-[#f87171]">
                                        -{d.deficitQuantity}
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
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -left-[35px] sm:-left-[41px] top-1">
                    {renderLollipopNodeIcon(agentPipeline[2])}
                  </div>

                  <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden shadow-lg">
                    <div
                      onClick={() => toggleAgentExpand("03")}
                      className="flex items-center justify-between p-4 bg-[#141516]/80 cursor-pointer hover:bg-[#141516] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#010102] border border-[#23252a] text-[#828fff]">
                          Agent 03
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-[#f7f8f8]">
                            Alternative Sourcing Agent
                          </h4>
                          <span className="text-[10px] text-[#8a8f98]">
                            {agentPipeline[2].role} • Model: <span className="font-mono text-[#828fff]">{agentPipeline[2].model}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={agentPipeline[2].status === "completed" ? "success" : "neutral"}>
                          {agentPipeline[2].status.toUpperCase()}
                        </Badge>
                        {expandedAgents["03"] ? (
                          <ChevronUp className="h-4 w-4 text-[#8a8f98]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#8a8f98]" />
                        )}
                      </div>
                    </div>

                    {expandedAgents["03"] && (
                      <div className="p-4 border-t border-[#23252a] space-y-4 bg-[#090a0f]">
                        <MarkdownRenderer
                          content={workflowResult?.alternatives?.agentSummary || agentPipeline[2].description}
                        />

                        {workflowResult?.alternatives?.matches && workflowResult.alternatives.matches.length > 0 ? (
                          <div className="space-y-2">
                            {workflowResult.alternatives.matches.map((m: any, mIdx: number) => (
                              <div key={mIdx} className="rounded-lg border border-[#23252a] bg-[#010102] p-3 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-[#f7f8f8]">{m.partNumber}</span>
                                  <Badge variant={m.hasMatches ? "success" : "neutral"}>
                                    {m.hasMatches ? `${m.recommendations?.length || 0} Alternatives Found` : "No Direct Warehouse Alternative"}
                                  </Badge>
                                </div>

                                {m.recommendations?.map((rec: any, rIdx: number) => (
                                  <div key={rIdx} className="rounded bg-[#141516] p-2 border border-[#23252a] text-[11px] space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-[#828fff]">{rec.title}</span>
                                      <span className="text-[#4ade80] font-mono">{rec.confidenceScore}% Confidence</span>
                                    </div>
                                    <p className="text-[#8a8f98]">{rec.engineeringNotes}</p>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-[#010102] border border-[#23252a] text-center text-xs text-[#8a8f98]">
                            No active shortage items required alternative matching.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -left-[35px] sm:-left-[41px] top-1">
                    {renderLollipopNodeIcon(agentPipeline[3])}
                  </div>

                  <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden shadow-lg">
                    <div
                      onClick={() => toggleAgentExpand("04")}
                      className="flex items-center justify-between p-4 bg-[#141516]/80 cursor-pointer hover:bg-[#141516] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#010102] border border-[#23252a] text-[#828fff]">
                          Agent 04
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-[#f7f8f8]">
                            Distributor Matrix Agent
                          </h4>
                          <span className="text-[10px] text-[#8a8f98]">
                            {agentPipeline[3].role} • Model: <span className="font-mono text-[#828fff]">{agentPipeline[3].model}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={agentPipeline[3].status === "completed" ? "success" : "neutral"}>
                          {agentPipeline[3].status.toUpperCase()}
                        </Badge>
                        {expandedAgents["04"] ? (
                          <ChevronUp className="h-4 w-4 text-[#8a8f98]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#8a8f98]" />
                        )}
                      </div>
                    </div>

                    {expandedAgents["04"] && (
                      <div className="p-4 border-t border-[#23252a] space-y-4 bg-[#090a0f]">
                        <MarkdownRenderer
                          content={workflowResult?.supplierDiscovery?.agentSummary || agentPipeline[3].description}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg bg-[#010102] border border-[#23252a]">
                            <span className="text-[10px] text-[#8a8f98] block">DigiKey Express</span>
                            <span className="text-xs font-bold text-[#828fff]">Avg 2.0 days • Reliability 98.5%</span>
                          </div>
                          <div className="p-3 rounded-lg bg-[#010102] border border-[#23252a]">
                            <span className="text-[10px] text-[#8a8f98] block">Mouser Global</span>
                            <span className="text-xs font-bold text-[#828fff]">Avg 3.0 days • Reliability 97.0%</span>
                          </div>
                          <div className="p-3 rounded-lg bg-[#010102] border border-[#23252a]">
                            <span className="text-[10px] text-[#8a8f98] block">LCSC Volume</span>
                            <span className="text-xs font-bold text-[#828fff]">Avg 7.0 days • Reliability 92.0%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -left-[35px] sm:-left-[41px] top-1">
                    {renderLollipopNodeIcon(agentPipeline[4])}
                  </div>

                  <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden shadow-lg">
                    <div
                      onClick={() => toggleAgentExpand("05")}
                      className="flex items-center justify-between p-4 bg-[#141516]/80 cursor-pointer hover:bg-[#141516] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#010102] border border-[#23252a] text-[#828fff]">
                          Agent 05
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-[#f7f8f8]">
                            Plan Formulation Agent
                          </h4>
                          <span className="text-[10px] text-[#8a8f98]">
                            {agentPipeline[4].role} • Model: <span className="font-mono text-[#828fff]">{agentPipeline[4].model}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={agentPipeline[4].status === "completed" ? "success" : "neutral"}>
                          {agentPipeline[4].status.toUpperCase()}
                        </Badge>
                        {expandedAgents["05"] ? (
                          <ChevronUp className="h-4 w-4 text-[#8a8f98]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#8a8f98]" />
                        )}
                      </div>
                    </div>

                    {expandedAgents["05"] && (
                      <div className="p-4 border-t border-[#23252a] space-y-4 bg-[#090a0f]">
                        <MarkdownRenderer
                          content={workflowResult?.purchaseOrderPlan?.agentSummary || agentPipeline[4].description}
                        />

                        {workflowResult?.processPlan?.purchaseOrders && workflowResult.processPlan.purchaseOrders.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-[#f7f8f8] flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5 text-[#5e6ad2]" />
                              <span>Formulated Purchase Orders:</span>
                            </span>

                            <div className="overflow-x-auto rounded-lg border border-[#23252a]">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-[#141516] text-[#8a8f98] border-b border-[#23252a]">
                                  <tr>
                                    <th className="p-2.5">Supplier</th>
                                    <th className="p-2.5">Part Number</th>
                                    <th className="p-2.5">Lot Quantity</th>
                                    <th className="p-2.5">Unit Price</th>
                                    <th className="p-2.5 text-right">Total Line Cost</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#23252a] text-[#d0d6e0]">
                                  {workflowResult.processPlan.purchaseOrders.map((po: any, pIdx: number) => (
                                    <tr key={pIdx} className="hover:bg-[#141516]/50">
                                      <td className="p-2.5 font-bold text-[#828fff]">
                                        {po.supplierCode || po.supplierName}
                                      </td>
                                      <td className="p-2.5 font-mono">{po.partNumber}</td>
                                      <td className="p-2.5">{po.orderQuantity} pcs</td>
                                      <td className="p-2.5">${po.unitPrice?.toFixed(3)}</td>
                                      <td className="p-2.5 text-right font-semibold text-[#f7f8f8]">
                                        ${(po.orderQuantity * po.unitPrice).toFixed(2)}
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
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -left-[35px] sm:-left-[41px] top-1">
                    {renderLollipopNodeIcon(agentPipeline[5])}
                  </div>

                  <div className="rounded-xl border-2 border-[#5e6ad2] bg-[#0f1011] overflow-hidden shadow-2xl ring-1 ring-[#5e6ad2]/50">
                    <div
                      onClick={() => toggleAgentExpand("06")}
                      className="flex items-center justify-between p-4 bg-[#14172e] cursor-pointer hover:bg-[#1a1e3a] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#5e6ad2] text-white font-bold">
                          HITL Node 06
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-[#f7f8f8] flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-[#4ade80]" />
                            <span>Human-In-The-Loop (HITL) Execution Guardrail</span>
                          </h4>
                          <span className="text-[10px] text-[#8a8f98]">
                            Deterministic Governance • Awaits User Authorization
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={approvalResult ? "success" : workflowResult ? "primary" : "neutral"}>
                          {approvalResult ? "EXECUTED & LOCKED" : workflowResult ? "AWAITING USER APPROVAL" : "PENDING"}
                        </Badge>
                        {expandedAgents["06"] ? (
                          <ChevronUp className="h-4 w-4 text-[#8a8f98]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#8a8f98]" />
                        )}
                      </div>
                    </div>

                    {expandedAgents["06"] && (
                      <div className="p-5 border-t border-[#282d5c] space-y-4 bg-[#0d0e17]">
                        {approvalResult ? (
                          <div className="rounded-xl border border-[#14532d] bg-[#0d2e16] p-4 text-xs space-y-3">
                            <div className="flex items-center gap-2 text-[#4ade80] font-bold text-sm">
                              <CheckCircle2 className="h-5 w-5" />
                              <span>Human-In-The-Loop Execution Authorized & Completed</span>
                            </div>
                            <p className="text-[#d0d6e0] leading-relaxed">
                              Warehouse inventory has been reserved in PostgreSQL, and formal Purchase Orders have been generated in the system.
                            </p>
                            <div className="flex items-center gap-3 pt-1">
                              <Link href="/purchase-orders">
                                <Button variant="secondary" size="sm">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>View Purchase Orders</span>
                                </Button>
                              </Link>
                              <Link href="/inventory">
                                <Button variant="secondary" size="sm">
                                  <Boxes className="h-3.5 w-3.5" />
                                  <span>View Warehouse Stock</span>
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {workflowResult?.processPlan?.agentSummary && (
                              <div className="p-3.5 rounded-xl border border-[#23252a] bg-[#010102]">
                                <MarkdownRenderer content={workflowResult.processPlan.agentSummary} />
                              </div>
                            )}

                            <p className="text-xs text-[#d0d6e0] leading-relaxed">
                              As the Human Engineer, review and authorize the execution actions below:
                            </p>

                            <div className="space-y-2.5 bg-[#010102] p-3.5 rounded-xl border border-[#23252a]">
                              <label
                                onClick={() => setConfirmReserveStock(!confirmReserveStock)}
                                className="flex items-center gap-2.5 cursor-pointer text-xs text-[#f7f8f8]"
                              >
                                {confirmReserveStock ? (
                                  <CheckSquare className="h-4 w-4 text-[#4ade80]" />
                                ) : (
                                  <Square className="h-4 w-4 text-[#8a8f98]" />
                                )}
                                <span>Reserve and allocate matching warehouse inventory in database</span>
                              </label>

                              <label
                                onClick={() => setConfirmDraftPOs(!confirmDraftPOs)}
                                className="flex items-center gap-2.5 cursor-pointer text-xs text-[#f7f8f8]"
                              >
                                {confirmDraftPOs ? (
                                  <CheckSquare className="h-4 w-4 text-[#4ade80]" />
                                ) : (
                                  <Square className="h-4 w-4 text-[#8a8f98]" />
                                )}
                                <span>Commit proposed supplier Purchase Orders to the procurement pipeline</span>
                              </label>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={!workflowResult || isApproving || (!confirmReserveStock && !confirmDraftPOs)}
                                isLoading={isApproving}
                                onClick={handleApprovePlan}
                                className="px-6 py-2"
                              >
                                <Check className="h-4 w-4 mr-1.5" />
                                <span>Authorize & Execute HITL Plan</span>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
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
