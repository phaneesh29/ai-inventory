"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Building2,
  Plus,
  Layers,
  Trash2,
  CheckCircle2,
  Calendar,
  KeyRound,
  RefreshCw,
} from "lucide-react";

export default function HomePage() {
  const {
    workspaces,
    activeWorkspace,
    isLoading,
    error,
    selectWorkspaceById,
    addNewWorkspace,
    removeWorkspace,
    refreshWorkspaces,
  } = useWorkspace();

  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setIsSubmitting(true);
      setCreateError(null);
      await addNewWorkspace(newName.trim());
      setNewName("");
    } catch (err: any) {
      setCreateError(err.message || "Failed to create workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete workspace "${name}"?`)) {
      try {
        await removeWorkspace(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete workspace");
      }
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#23252a] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Workspace Environment
            </span>
            <Badge variant="primary">Active</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f7f8f8] sm:text-3xl mt-1">
            {activeWorkspace ? activeWorkspace.name : "Select a Workspace"}
          </h1>
          <p className="text-xs text-[#8a8f98] mt-1">
            Manage your hardware production environments, active BOM runs, and isolated component catalogs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refreshWorkspaces()}
            isLoading={isLoading}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync with DB</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[#241414] border border-[#451e1e] p-3 text-xs text-[#f87171] flex items-center justify-between">
          <span>{error}</span>
          <Button variant="danger" size="sm" onClick={() => refreshWorkspaces()}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#5e6ad2]" />
              <span>Available Workspaces ({workspaces.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaces.map((ws) => {
              const isActive = activeWorkspace?.id === ws.id;
              return (
                <Card
                  key={ws.id}
                  className={`transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#141516] border-[#5e6ad2]/70 shadow-md shadow-[#5e6ad2]/10"
                      : "hover:border-[#34343a]"
                  }`}
                  onClick={() => selectWorkspaceById(ws.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className={`h-4 w-4 ${isActive ? "text-[#5e6ad2]" : "text-[#8a8f98]"}`} />
                        <span className="text-xs font-semibold text-[#f7f8f8] truncate max-w-[180px]">
                          {ws.name}
                        </span>
                      </div>
                      {isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Button
                          variant="tertiary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectWorkspaceById(ws.id);
                          }}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 pt-2 border-t border-[#23252a]/60 text-[11px] text-[#8a8f98]">
                    <div className="flex items-center gap-1.5 truncate">
                      <KeyRound className="h-3 w-3 shrink-0" />
                      <span className="font-mono text-[10px] truncate">{ws.id}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(ws.createdAt).toLocaleDateString()}</span>
                      </div>

                      {workspaces.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ws.id, ws.name);
                          }}
                          className="text-[#8a8f98] hover:text-[#f87171] p-1 transition-colors"
                          title="Delete Workspace"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[#5e6ad2]" />
                  <span>Create Workspace</span>
                </div>
              </CardTitle>
              <CardDescription>
                Add a new project workspace for isolating BOM uploads, procurement runs, and component allocations.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-[#d0d6e0]">
                    Workspace Name
                  </label>
                  <Input
                    placeholder="e.g. Autonomous Drone Matrix v2"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  {createError && (
                    <p className="text-[11px] text-[#f87171] pt-1">{createError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={!newName.trim()}
                  isLoading={isSubmitting}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Workspace</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {activeWorkspace && (
            <div className="mt-4 rounded-xl bg-[#0f1011] border border-[#23252a] p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-[#4ade80]">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-semibold">Workspace Context Connected</span>
              </div>
              <p className="text-[#8a8f98] text-[11px]">
                All upcoming BOM processing, inventory audits, and supplier purchase orders will be scoped to <strong>{activeWorkspace.name}</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
