"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchWorkspaces, createWorkspace, deleteWorkspace, type Workspace } from "@/services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  ArrowRight,
  Layers,
  Trash2,
  Calendar,
  Search,
  RefreshCw,
  FolderPlus,
} from "lucide-react";

export default function WorkspacePortalPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadWorkspaces = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = await fetchWorkspaces();
      setWorkspaces(list);
    } catch (err: any) {
      setError(err.message || "Failed to load workspaces from backend");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setIsSubmitting(true);
      setCreateError(null);
      await createWorkspace(newName.trim());
      setNewName("");
      setIsCreating(false);
      await loadWorkspaces();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete workspace "${name}"?`)) {
      try {
        await deleteWorkspace(id);
        await loadWorkspaces();
      } catch (err: any) {
        alert(err.message || "Failed to delete workspace");
      }
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

        {error && (
          <div className="rounded-xl bg-[#241414] border border-[#451e1e] p-4 text-xs text-[#f87171] flex items-center justify-between">
            <span>{error}</span>
            <Button variant="danger" size="sm" onClick={loadWorkspaces}>
              Retry Connection
            </Button>
          </div>
        )}

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
                Define an isolated workspace for your hardware team (e.g. UAV Flight Controller, Smart Robotics PCB).
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#d0d6e0]">
                    Workspace Name
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

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={() => {
                      setIsCreating(false);
                      setNewName("");
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
                    <span>Create & Launch</span>
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

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, ws.id, ws.name)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[#8a8f98] hover:text-[#f87171] hover:bg-[#241414] rounded-md transition-all"
                    title="Delete Workspace"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
      </main>
    </div>
  );
}
