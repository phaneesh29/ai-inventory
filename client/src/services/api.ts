import { API_BASE_URL } from "@/lib/utils";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  partNumber: string;
  name: string;
  description?: string | null;
  category: string;
  unit: string;
  specifications: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealthData {
  status: "ok" | "degraded" | "error";
  latencyMs: number;
  timestamp: string;
  message?: string;
}

export const checkSystemHealth = async (): Promise<SystemHealthData> => {
  const startTime = Date.now();
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      cache: "no-store",
    });
    const latencyMs = Date.now() - startTime;
    const json: ApiResponse<{ status: string; timestamp: string }> = await res.json();
    return {
      status: json.success && json.data?.status === "ok" ? "ok" : "degraded",
      latencyMs,
      timestamp: json.data?.timestamp || new Date().toISOString(),
      message: json.message || "Service operational",
    };
  } catch (err: any) {
    return {
      status: "error",
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      message: err.message || "Cannot connect to server",
    };
  }
};

export const fetchWorkspaces = async (): Promise<Workspace[]> => {
  const res = await fetch(`${API_BASE_URL}/workspaces`, {
    cache: "no-store",
  });
  const json: ApiResponse<any> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch workspaces");
  }
  if (Array.isArray(json.data)) {
    return json.data;
  }
  if (json.data && Array.isArray(json.data.workspaces)) {
    return json.data.workspaces;
  }
  return [];
};

export const fetchWorkspaceById = async (id: string): Promise<Workspace> => {
  const res = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
    cache: "no-store",
  });
  const json: ApiResponse<Workspace> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || `Failed to fetch workspace '${id}'`);
  }
  return json.data;
};

export const createWorkspace = async (name: string): Promise<Workspace> => {
  const res = await fetch(`${API_BASE_URL}/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const json: ApiResponse<Workspace> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to create workspace");
  }
  return json.data;
};

export const deleteWorkspace = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
    method: "DELETE",
  });
  const json: ApiResponse = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to delete workspace");
  }
};

export const fetchItems = async (params?: {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: Item[]; total: number; hasMore: boolean }> => {
  const query = new URLSearchParams();
  if (params?.search) query.append("search", params.search);
  if (params?.category) query.append("category", params.category);
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.offset) query.append("offset", params.offset.toString());

  const res = await fetch(`${API_BASE_URL}/items?${query.toString()}`, {
    cache: "no-store",
  });
  const json: ApiResponse<Item[]> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch items");
  }
  return {
    items: Array.isArray(json.data) ? json.data : [],
    total: json.pagination?.total || 0,
    hasMore: json.pagination?.hasMore || false,
  };
};

export const fetchItemById = async (id: string): Promise<Item> => {
  const res = await fetch(`${API_BASE_URL}/items/${id}`, {
    cache: "no-store",
  });
  const json: ApiResponse<Item> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || `Failed to fetch item '${id}'`);
  }
  return json.data;
};

export const createItem = async (payload: {
  partNumber: string;
  name: string;
  category: string;
  unit?: string;
  description?: string;
  specifications?: Record<string, any>;
}): Promise<Item> => {
  const res = await fetch(`${API_BASE_URL}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<Item> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to create item");
  }
  return json.data;
};

export const updateItem = async (
  id: string,
  payload: Partial<{
    partNumber: string;
    name: string;
    category: string;
    unit: string;
    description: string;
    specifications: Record<string, any>;
  }>
): Promise<Item> => {
  const res = await fetch(`${API_BASE_URL}/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<Item> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to update item");
  }
  return json.data;
};

export const deleteItem = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/items/${id}`, {
    method: "DELETE",
  });
  const json: ApiResponse = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to delete item");
  }
};
