"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchWorkspaces, createWorkspace, deleteWorkspace, type Workspace } from "@/services/api";

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  setActiveWorkspace: (workspace: Workspace) => void;
  selectWorkspaceById: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
  addNewWorkspace: (name: string) => Promise<Workspace>;
  removeWorkspace: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "invenai_active_workspace_id";

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = await fetchWorkspaces();
      setWorkspaces(list);

      const savedId = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
      if (savedId) {
        const found = list.find((w) => w.id === savedId);
        if (found) {
          setActiveWorkspaceState(found);
          return;
        }
      }

      if (list.length > 0) {
        setActiveWorkspaceState(list[0]);
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEY, list[0].id);
        }
      } else {
        setActiveWorkspaceState(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load workspaces from server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, workspace.id);
    }
  };

  const selectWorkspaceById = (id: string) => {
    const found = workspaces.find((w) => w.id === id);
    if (found) {
      setActiveWorkspace(found);
    }
  };

  const addNewWorkspace = async (name: string): Promise<Workspace> => {
    const created = await createWorkspace(name);
    await refreshWorkspaces();
    setActiveWorkspace(created);
    return created;
  };

  const removeWorkspace = async (id: string) => {
    await deleteWorkspace(id);
    await refreshWorkspaces();
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        isLoading,
        error,
        setActiveWorkspace,
        selectWorkspaceById,
        refreshWorkspaces,
        addNewWorkspace,
        removeWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
