"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  uploadBOMFile,
  type Workspace,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Plus,
  ArrowRight,
  Layers,
  Trash2,
  Calendar,
  Search,
  RefreshCw,
  FolderPlus,
  Pencil,
  X,
  FileSpreadsheet,
  UploadCloud,
  FileCheck,
} from "lucide-react";

export default function WorkspacePortalPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [instructions, setInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editName, setEditName] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadWorkspaces = async () => {
    try {
      setIsLoading(true);
      const list = await fetchWorkspaces();
      setWorkspaces(list);
    } catch (err: any) {
      toast.error("Failed to load workspaces", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

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
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setIsSubmitting(true);
      setCreateError(null);

      const created = await createWorkspace(newName.trim());

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("workspaceId", created.id);
        formData.append("name", `${created.name} BOM`);
        formData.append("version", "v1.0");
        formData.append("batchQuantity", String(batchQuantity || 1));
        if (instructions.trim()) {
          formData.append("instructions", instructions.trim());
        }

        await uploadBOMFile(formData);
        toast.success(
          "Workspace & BOM Created",
          `"${created.name}" created and BOM uploaded with AI audit.`
        );
      } else {
        toast.success("Workspace Created", `"${created.name}" is ready for BOM runs.`);
      }

      setNewName("");
      setSelectedFile(null);
      setBatchQuantity(1);
      setInstructions("");
      setIsCreating(false);

      router.push(`/workspace/${created.id}`);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create workspace");
      toast.error("Creation Failed", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (ws: Workspace, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingWorkspace(ws);
    setEditName(ws.name);
    setEditError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace || !editName.trim()) return;

    try {
      setIsSubmittingEdit(true);
      setEditError(null);
      await updateWorkspace(editingWorkspace.id, editName.trim());
      toast.success("Workspace Renamed", `Updated to "${editName.trim()}".`);
      setEditingWorkspace(null);
      await loadWorkspaces();
    } catch (err: any) {
      setEditError(err.message || "Failed to update workspace");
      toast.error("Update Failed", err.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingWorkspace) return;

    try {
      setIsDeleting(true);
      await deleteWorkspace(deletingWorkspace.id);
      toast.success("Workspace Deleted", `"${deletingWorkspace.name}" was removed.`);
      setDeletingWorkspace(null);
      await loadWorkspaces();
    } catch (err: any) {
      toast.error("Delete Failed", err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#010102] text-[#f7f8f8]">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#23252a] pb-6">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Autonomous Supply Chain & BOM Intelligence
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8] sm:text-3xl mt-1">
              Select a Workspace
            </h1>
            <p className="text-xs text-[#8a8f98] mt-1 max-w-xl">
              Each workspace provides an isolated hardware environment with its own Bills of Materials, warehouse inventory allocations, and supplier purchase orders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadWorkspaces}
              isLoading={isLoading}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Workspace</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8a8f98]" />
            <Input
              placeholder="Search workspaces by name or UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
          <span className="text-xs text-[#8a8f98]">
            {filteredWorkspaces.length} of {workspaces.length} workspaces
          </span>
        </div>

        {isCreating && (
          <Card className="border-[#5e6ad2]/60 bg-[#0f1011] shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <FolderPlus className="h-4 w-4 text-[#5e6ad2]" />
                  <span>Create New Hardware Workspace</span>
                </div>
              </CardTitle>
              <CardDescription>
                Define an isolated workspace for your hardware team. You can also optionally attach your initial BOM file right now.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#d0d6e0]">
                    Workspace Name <span className="text-[#f87171]">*</span>
                  </label>
                  <Input
                    autoFocus
                    placeholder="e.g. Autonomous Drone Matrix v2"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  {createError && (
                    <p className="text-[11px] text-[#f87171] pt-1">{createError}</p>
                  )}
                </div>

                <div className="rounded-xl border border-[#23252a] bg-[#090a0f] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-[#828fff]" />
                      <span className="text-xs font-semibold text-[#f7f8f8]">
                        Initial BOM File <span className="text-[10px] text-[#8a8f98] font-normal">(Optional)</span>
                      </span>
                    </div>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-[10px] text-[#8a8f98] hover:text-[#f87171] flex items-center gap-1 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                        <span>Remove File</span>
                      </button>
                    )}
                  </div>

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
                      className="border border-dashed border-[#23252a] hover:border-[#5e6ad2]/60 rounded-xl p-4 text-center cursor-pointer transition-colors bg-[#010102]/60 hover:bg-[#141516]"
                    >
                      <UploadCloud className="h-6 w-6 text-[#8a8f98] mx-auto mb-1.5" />
                      <p className="text-xs font-medium text-[#f7f8f8]">
                        Click to browse or drop Bill of Materials
                      </p>
                      <p className="text-[10px] text-[#8a8f98] mt-0.5">
                        Supports standard .CSV, .TXT, .XLSX, or .XLS exports (Altium, KiCad, Eagle, Excel)
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg bg-[#14172e] border border-[#282d5c] p-3 text-xs">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileCheck className="h-4 w-4 text-[#4ade80] shrink-0" />
                        <div className="overflow-hidden">
                          <span className="font-semibold text-[#f7f8f8] block truncate">
                            {selectedFile.name}
                          </span>
                          <span className="text-[10px] text-[#8a8f98]">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI Pipeline
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedFile && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-[#8a8f98]">
                          Target Batch Units
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={batchQuantity}
                          onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-[#8a8f98]">
                          Assembly Directives (Optional)
                        </label>
                        <Input
                          placeholder="e.g. High-temperature reflow, AEC-Q200 only"
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={() => {
                      setIsCreating(false);
                      setNewName("");
                      setSelectedFile(null);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!newName.trim()}
                    isLoading={isSubmitting}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{selectedFile ? "Create & Upload BOM" : "Create & Launch"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {editingWorkspace && (
          <Card className="border-[#5e6ad2]/60 bg-[#0f1011] shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-[#5e6ad2]" />
                  <CardTitle>Edit Workspace Details</CardTitle>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingWorkspace(null)}
                  className="p-1 text-[#8a8f98] hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardDescription>
                Update the name and metadata for this hardware project workspace.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#d0d6e0]">
                    Workspace Name
                  </label>
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  {editError && (
                    <p className="text-[11px] text-[#f87171] pt-1">{editError}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={() => setEditingWorkspace(null)}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!editName.trim()}
                    isLoading={isSubmittingEdit}
                  >
                    <span>Save Changes</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-[#0f1011] border border-[#23252a] animate-pulse" />
            ))}
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#23252a] bg-[#0f1011]/40 p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#141516] border border-[#23252a] text-[#8a8f98]">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#f7f8f8]">No Workspaces Found</h3>
            <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
              {searchQuery ? "No workspaces match your search criteria." : "Get started by creating your first hardware workspace."}
            </p>
            {!isCreating && (
              <Button variant="primary" size="sm" onClick={() => setIsCreating(true)} className="mt-2">
                <Plus className="h-3.5 w-3.5" />
                <span>Create Workspace</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkspaces.map((ws) => (
              <Link
                key={ws.id}
                href={`/workspace/${ws.id}`}
                className="group block rounded-xl bg-[#0f1011] hover:bg-[#141516] border border-[#23252a] hover:border-[#5e6ad2]/70 p-5 transition-all duration-150 shadow-sm hover:shadow-lg hover:shadow-[#5e6ad2]/10 relative overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#34343a]/40 to-transparent group-hover:via-[#5e6ad2]/80 transition-colors" />

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#141516] group-hover:bg-[#14172e] border border-[#23252a] group-hover:border-[#282d5c] text-[#8a8f98] group-hover:text-[#828fff] transition-colors">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#f7f8f8] group-hover:text-white transition-colors line-clamp-1">
                        {ws.name}
                      </h3>
                      <span className="text-[10px] text-[#8a8f98] font-mono">
                        {ws.id.slice(0, 8)}...{ws.id.slice(-4)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(ws, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-[#8a8f98] hover:text-[#5e6ad2] hover:bg-[#14172e] rounded-md transition-all cursor-pointer"
                      title="Edit Workspace"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeletingWorkspace(ws);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-[#8a8f98] hover:text-[#f87171] hover:bg-[#241414] rounded-md transition-all cursor-pointer"
                      title="Delete Workspace"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#23252a]/60 pt-3 flex items-center justify-between text-[11px] text-[#8a8f98]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(ws.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[#828fff] font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Enter</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <ConfirmModal
          isOpen={!!deletingWorkspace}
          title="Delete Workspace"
          description={`Are you sure you want to permanently delete workspace "${deletingWorkspace?.name}"? All associated BOMs and allocations will be removed.`}
          confirmLabel="Delete Workspace"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingWorkspace(null)}
        />
      </main>
    </div>
  );
}
