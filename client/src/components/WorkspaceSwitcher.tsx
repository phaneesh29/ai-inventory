"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Layers,
  ChevronDown,
  Plus,
  Check,
  Trash2,
  Building2,
  Loader2,
  X,
} from "lucide-react";

export const WorkspaceSwitcher: React.FC = () => {
  const {
    workspaces,
    activeWorkspace,
    isLoading,
    selectWorkspaceById,
    addNewWorkspace,
    removeWorkspace,
  } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await addNewWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName("");
      setIsCreating(false);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to create workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this workspace and all associated data?")) {
      try {
        await removeWorkspace(id);
      } catch (err: any) {
        alert(err.message || "Failed to delete workspace");
      }
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-[#0f1011] hover:bg-[#141516] border border-[#23252a] hover:border-[#34343a] px-3 py-1.5 text-xs text-[#f7f8f8] transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#5e6ad2]"
      >
        <Building2 className="h-3.5 w-3.5 text-[#5e6ad2]" />
        <span className="max-w-[140px] truncate font-medium sm:max-w-[200px]">
          {isLoading ? (
            <span className="text-[#8a8f98]">Connecting to Backend...</span>
          ) : activeWorkspace ? (
            activeWorkspace.name
          ) : (
            <span className="text-[#8a8f98]">No Workspace Selected</span>
          )}
        </span>
        <ChevronDown className={`h-3 w-3 text-[#8a8f98] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-72 origin-top-left rounded-xl bg-[#0f1011] border border-[#23252a] p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-2 border-b border-[#23252a]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#8a8f98]">
                Workspaces
              </span>
              <Badge variant="primary">{workspaces.length} Total</Badge>
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
            {workspaces.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[#8a8f98]">
                No workspaces found. Create your first workspace below.
              </div>
            ) : (
              workspaces.map((ws) => {
                const isActive = activeWorkspace?.id === ws.id;
                return (
                  <div
                    key={ws.id}
                    onClick={() => {
                      selectWorkspaceById(ws.id);
                      setIsOpen(false);
                    }}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#18191a] text-white font-medium"
                        : "text-[#d0d6e0] hover:bg-[#141516] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#5e6ad2]" : "text-[#8a8f98]"}`} />
                      <span className="truncate">{ws.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isActive && <Check className="h-3.5 w-3.5 text-[#5e6ad2]" />}
                      {workspaces.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, ws.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#f87171] transition-opacity cursor-pointer"
                          title="Delete Workspace"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-[#23252a] pt-1.5 mt-1">
            {isCreating ? (
              <form onSubmit={handleCreate} className="p-1 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-medium text-[#f7f8f8]">New Workspace</span>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  autoFocus
                  placeholder="e.g. UAV Flight Controller Matrix"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="h-8 text-xs"
                />
                {error && <p className="text-[10px] text-[#f87171] px-1">{error}</p>}
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!newWorkspaceName.trim()}
                    isLoading={isSubmitting}
                  >
                    Create
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#828fff] hover:bg-[#141516] transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create New Workspace</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
