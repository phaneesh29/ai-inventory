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

export interface PriceTier {
  minQuantity: number;
  unitPrice: number;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  reliabilityScore: number;
  leadTimeDaysAverage: number;
  paymentTerms: string;
  currency: string;
  totalCatalogItems?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierItem {
  id: string;
  supplierId: string;
  itemId: string;
  partNumber: string;
  name: string;
  category?: string;
  unit?: string;
  specifications?: Record<string, any>;
  supplierPartNumber: string;
  unitPrice: number;
  minimumOrderQuantity: number;
  packageType: string;
  stockAvailable: number;
  leadTimeDays: number;
  priceTiers: PriceTier[];
  isPreferred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  partNumber: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  specifications: Record<string, any>;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderThreshold: number;
  isLowStock: boolean;
  location: string;
  unitCost: number | null;
  totalValuation: number;
  createdAt: string;
  updatedAt: string;
}

export interface LowStockAlertItem extends InventoryItem {
  deficit: number;
  recommendedReorder: number;
}

export interface EnrichedPurchaseOrderItem {
  id: string;
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  supplierPartNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  supplierReliabilityScore: number;
  status: string;
  totalAmount: number;
  currency: string;
  notes: string | null;
  items: EnrichedPurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReceivePurchaseOrderResult {
  purchaseOrder: PurchaseOrder;
  deliveryTimeliness: {
    status: "EARLY" | "ON_TIME" | "LATE";
    daysDifference: number;
    expectedArrivalDate: string;
    actualArrivalDate: string;
  };
  supplierScoreAdjustment: {
    supplierName: string;
    supplierCode: string;
    previousScore: number;
    newScore: number;
    scoreDelta: number;
    reason: string;
  };
  inventoryStockUpdates: {
    itemId: string;
    partNumber: string;
    quantityAdded: number;
    newQuantityOnHand: number;
    location: string;
  }[];
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

export const updateWorkspace = async (id: string, name: string): Promise<Workspace> => {
  const res = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const json: ApiResponse<Workspace> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to update workspace");
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
    description: string | null;
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

export const fetchSuppliers = async (params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ suppliers: Supplier[]; total: number }> => {
  const query = new URLSearchParams();
  if (params?.search) query.append("search", params.search);
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.offset) query.append("offset", params.offset.toString());

  const res = await fetch(`${API_BASE_URL}/suppliers?${query.toString()}`, {
    cache: "no-store",
  });
  const json: ApiResponse<Supplier[]> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch suppliers");
  }
  return {
    suppliers: Array.isArray(json.data) ? json.data : [],
    total: json.pagination?.total || (Array.isArray(json.data) ? json.data.length : 0),
  };
};

export const fetchSupplierById = async (id: string): Promise<Supplier> => {
  const res = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    cache: "no-store",
  });
  const json: ApiResponse<Supplier> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || `Failed to fetch supplier '${id}'`);
  }
  return json.data;
};

export const createSupplier = async (payload: {
  name: string;
  code: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  reliabilityScore?: number;
  leadTimeDaysAverage?: number;
  paymentTerms?: string;
  currency?: string;
}): Promise<Supplier> => {
  const res = await fetch(`${API_BASE_URL}/suppliers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<Supplier> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to create supplier");
  }
  return json.data;
};

export const updateSupplier = async (
  id: string,
  payload: Partial<{
    name: string;
    contactEmail: string | null;
    contactPhone: string | null;
    website: string | null;
    reliabilityScore: number;
    leadTimeDaysAverage: number;
    paymentTerms: string;
    currency: string;
  }>
): Promise<Supplier> => {
  const res = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<Supplier> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to update supplier");
  }
  return json.data;
};

export const deleteSupplier = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: "DELETE",
  });
  const json: ApiResponse = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to delete supplier");
  }
};

export const fetchSupplierItems = async (supplierId: string): Promise<SupplierItem[]> => {
  const res = await fetch(`${API_BASE_URL}/suppliers/${supplierId}/items`, {
    cache: "no-store",
  });
  const json: ApiResponse<SupplierItem[]> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch supplier catalog items");
  }
  return Array.isArray(json.data) ? json.data : [];
};

export const addSupplierItem = async (
  supplierId: string,
  payload: {
    itemId?: string;
    partNumber?: string;
    supplierPartNumber: string;
    unitPrice: number;
    minimumOrderQuantity?: number;
    packageType?: string;
    stockAvailable?: number;
    leadTimeDays?: number;
    priceTiers?: PriceTier[];
    isPreferred?: boolean;
  }
): Promise<SupplierItem> => {
  const res = await fetch(`${API_BASE_URL}/suppliers/${supplierId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<SupplierItem> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to add supplier catalog quote");
  }
  return json.data;
};

export const updateSupplierItem = async (
  supplierId: string,
  itemId: string,
  payload: Partial<{
    supplierPartNumber: string;
    unitPrice: number;
    minimumOrderQuantity: number;
    packageType: string;
    stockAvailable: number;
    leadTimeDays: number;
    priceTiers: PriceTier[];
    isPreferred: boolean;
  }>
): Promise<SupplierItem> => {
  const res = await fetch(`${API_BASE_URL}/suppliers/${supplierId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<SupplierItem> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to update supplier quote");
  }
  return json.data;
};

export const deleteSupplierItem = async (supplierId: string, itemId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/suppliers/${supplierId}/items/${itemId}`, {
    method: "DELETE",
  });
  const json: ApiResponse = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to delete supplier item");
  }
};

export const fetchSuppliersByItem = async (itemId: string): Promise<SupplierItem[]> => {
  const res = await fetch(`${API_BASE_URL}/suppliers/items/${itemId}`, {
    cache: "no-store",
  });
  const json: ApiResponse<SupplierItem[]> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch suppliers for item");
  }
  return Array.isArray(json.data) ? json.data : [];
};

export const fetchInventory = async (params?: {
  search?: string;
  category?: string;
  lowStock?: "true" | "false";
  limit?: number;
  offset?: number;
}): Promise<{ items: InventoryItem[]; total: number }> => {
  const query = new URLSearchParams();
  if (params?.search) query.append("search", params.search);
  if (params?.category) query.append("category", params.category);
  if (params?.lowStock) query.append("lowStock", params.lowStock);
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.offset) query.append("offset", params.offset.toString());

  const res = await fetch(`${API_BASE_URL}/inventory?${query.toString()}`, {
    cache: "no-store",
  });
  const json: ApiResponse<InventoryItem[]> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch inventory items");
  }
  return {
    items: Array.isArray(json.data) ? json.data : [],
    total: json.pagination?.total || (Array.isArray(json.data) ? json.data.length : 0),
  };
};

export const fetchInventoryById = async (id: string): Promise<InventoryItem> => {
  const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    cache: "no-store",
  });
  const json: ApiResponse<InventoryItem> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || `Failed to fetch inventory item '${id}'`);
  }
  return json.data;
};

export const fetchLowStockAlerts = async (): Promise<{
  alerts: LowStockAlertItem[];
  totalAlerts: number;
}> => {
  const res = await fetch(`${API_BASE_URL}/inventory/alerts`, {
    cache: "no-store",
  });
  const json: ApiResponse<{ alerts: LowStockAlertItem[]; totalAlerts: number }> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch low stock alerts");
  }
  return json.data;
};

export const addInventoryItem = async (payload: {
  itemId?: string;
  partNumber?: string;
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  specifications?: Record<string, any>;
  quantityOnHand?: number;
  quantityReserved?: number;
  reorderThreshold?: number;
  location?: string;
  unitCost?: number;
}): Promise<InventoryItem> => {
  const res = await fetch(`${API_BASE_URL}/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<InventoryItem> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to add inventory item");
  }
  return json.data;
};

export const adjustInventoryStock = async (payload: {
  id?: string;
  itemId?: string;
  delta: number;
  reason?: string;
  location?: string;
  notes?: string;
}): Promise<InventoryItem> => {
  const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<InventoryItem> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to adjust stock");
  }
  return json.data;
};

export const allocateInventoryStock = async (payload: {
  id?: string;
  itemId?: string;
  quantity: number;
  notes?: string;
}): Promise<InventoryItem> => {
  const res = await fetch(`${API_BASE_URL}/inventory/allocate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<InventoryItem> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to allocate stock");
  }
  return json.data;
};

export const releaseInventoryStock = async (payload: {
  id?: string;
  itemId?: string;
  quantity: number;
  notes?: string;
}): Promise<InventoryItem> => {
  const res = await fetch(`${API_BASE_URL}/inventory/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<InventoryItem> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to release stock");
  }
  return json.data;
};

export const updateInventoryItem = async (
  id: string,
  payload: Partial<{
    quantityOnHand: number;
    quantityReserved: number;
    reorderThreshold: number;
    location: string;
    unitCost: number | null;
  }>
): Promise<InventoryItem> => {
  const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<InventoryItem> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to update inventory item");
  }
  return json.data;
};

export const deleteInventoryItem = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: "DELETE",
  });
  const json: ApiResponse = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to delete inventory item");
  }
};

export const fetchPurchaseOrders = async (params?: {
  status?: string;
  supplierId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ purchaseOrders: PurchaseOrder[]; total: number }> => {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.supplierId) query.append("supplierId", params.supplierId);
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.offset) query.append("offset", params.offset.toString());

  const res = await fetch(`${API_BASE_URL}/purchase-orders?${query.toString()}`, {
    cache: "no-store",
  });
  const json: ApiResponse<PurchaseOrder[]> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch purchase orders");
  }
  return {
    purchaseOrders: Array.isArray(json.data) ? json.data : [],
    total: json.pagination?.total || (Array.isArray(json.data) ? json.data.length : 0),
  };
};

export const fetchPurchaseOrderById = async (id: string): Promise<PurchaseOrder> => {
  const res = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
    cache: "no-store",
  });
  const json: ApiResponse<PurchaseOrder> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || `Failed to fetch purchase order '${id}'`);
  }
  return json.data;
};

export const createPurchaseOrder = async (payload: {
  supplierId: string;
  currency?: string;
  notes?: string;
  status?: string;
  items: Array<{
    itemId: string;
    supplierPartNumber: string;
    quantity: number;
    unitPrice: number;
  }>;
}): Promise<PurchaseOrder> => {
  const res = await fetch(`${API_BASE_URL}/purchase-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<PurchaseOrder> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to create purchase order");
  }
  return json.data;
};

export const updatePurchaseOrderStatus = async (
  id: string,
  payload: {
    status: string;
    notes?: string;
  }
): Promise<PurchaseOrder> => {
  const res = await fetch(`${API_BASE_URL}/purchase-orders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<PurchaseOrder> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to update purchase order status");
  }
  return json.data;
};

export const receivePurchaseOrder = async (
  id: string,
  payload?: {
    deliveryDate?: string;
    location?: string;
    notes?: string;
  }
): Promise<ReceivePurchaseOrderResult> => {
  const res = await fetch(`${API_BASE_URL}/purchase-orders/${id}/receive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const json: ApiResponse<ReceivePurchaseOrderResult> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to receive purchase order");
  }
  return json.data;
};

export const deletePurchaseOrder = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
    method: "DELETE",
  });
  const json: ApiResponse = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to delete purchase order");
  }
};

export interface ComponentDemandForecast {
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderThreshold: number;
  unitCost: number | null;
  totalActiveBOMDemand: number;
  dailyBurnRate: number;
  daysOfSupplyRemaining: number;
  projectedStockoutDate: string | null;
  reorderDeadlineDate: string | null;
  depletionUrgency: "CRITICAL" | "HIGH" | "MODERATE" | "HEALTHY";
}

export interface SupplyChainAnomaly {
  anomalyType:
    | "CRITICAL_STOCKOUT_RISK"
    | "SINGLE_SOURCE_VULNERABILITY"
    | "PRICE_SURGE_ANOMALY"
    | "LONG_LEAD_TIME_BOTTLENECK"
    | "EXCESS_IDLE_STOCK";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  itemId: string;
  partNumber: string;
  name: string;
  category: string;
  message: string;
  metrics: Record<string, any>;
  recommendedAction: string;
}

export interface VendorLeaderboardEntry {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  reliabilityScore: number;
  averageLeadTimeDays: number;
  catalogCoverageCount: number;
  priceCompetitivenessScore: number;
  compositeVendorScore: number;
  tierRanking: "TIER_1_PREFERRED" | "TIER_2_QUALIFIED" | "TIER_3_MONITORED";
  paymentTerms: string;
  currency: string;
}

export interface SupplyChainInsightsResult {
  overviewKPIs: {
    totalCatalogComponents: number;
    totalWarehouseStockValueUSD: number;
    totalActiveAnomalies: number;
    criticalDepletionCount: number;
    singleSourceVulnerabilitiesCount: number;
    averageSupplierReliability: number;
  };
  demandForecasts: ComponentDemandForecast[];
  anomalies: SupplyChainAnomaly[];
  vendorLeaderboard: VendorLeaderboardEntry[];
  executiveAIBrief?: string;
}

export const fetchSupplyChainInsights = async (): Promise<SupplyChainInsightsResult> => {
  const res = await fetch(`${API_BASE_URL}/insights`, {
    cache: "no-store",
  });
  const json: ApiResponse<SupplyChainInsightsResult> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch supply chain insights");
  }
  return json.data;
};

export interface GlobalBOMItem {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  name: string;
  version: string;
  totalItems: number;
  totalCost?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedBOMItemDetail {
  id: string;
  itemId: string;
  partNumber: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  specifications: Record<string, any>;
  quantity: number;
  referenceDesignator: string | null;
  notes: string | null;
  quantityOnHand?: number;
  quantityReserved?: number;
  quantityAvailable?: number;
  unitCost?: number | null;
  totalCost?: number;
}

export interface EnrichedBOMDetail {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  name: string;
  version: string;
  totalCost?: number;
  items: EnrichedBOMItemDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface GlobalBOMSummary {
  totalBOMs: number;
  totalLineItems: number;
  totalUniqueComponents: number;
}

export const fetchGlobalBOMs = async (): Promise<GlobalBOMItem[]> => {
  const res = await fetch(`${API_BASE_URL}/boms`, {
    cache: "no-store",
  });
  const json: ApiResponse<GlobalBOMItem[]> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch global BOMs");
  }
  return Array.isArray(json.data) ? json.data : [];
};

export const fetchGlobalBOMSummary = async (): Promise<GlobalBOMSummary> => {
  const res = await fetch(`${API_BASE_URL}/boms/summary`, {
    cache: "no-store",
  });
  const json: ApiResponse<GlobalBOMSummary> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch BOM summary");
  }
  return json.data;
};

export const fetchBOMsByWorkspace = async (workspaceId: string): Promise<GlobalBOMItem[]> => {
  const res = await fetch(`${API_BASE_URL}/boms/workspace/${workspaceId}`, {
    cache: "no-store",
  });
  const json: ApiResponse<GlobalBOMItem[]> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || `Failed to fetch BOMs for workspace '${workspaceId}'`);
  }
  return Array.isArray(json.data) ? json.data : [];
};

export const fetchBOMById = async (id: string): Promise<EnrichedBOMDetail> => {
  const res = await fetch(`${API_BASE_URL}/boms/${id}`, {
    cache: "no-store",
  });
  const json: ApiResponse<EnrichedBOMDetail> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || `Failed to fetch BOM '${id}'`);
  }
  return json.data;
};

export const uploadBOMFile = async (formData: FormData): Promise<any> => {
  const res = await fetch(`${API_BASE_URL}/boms/upload`, {
    method: "POST",
    body: formData,
  });
  const json: ApiResponse<any> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to upload and audit BOM file");
  }
  return json.data;
};

export const approveBOMPlan = async (bomId: string, payload: any): Promise<any> => {
  const res = await fetch(`${API_BASE_URL}/boms/${bomId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<any> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to approve BOM plan");
  }
  return json.data;
};

export const createBOM = async (payload: {
  workspaceId: string;
  name: string;
  version?: string;
  items?: any[];
}): Promise<EnrichedBOMDetail> => {
  const res = await fetch(`${API_BASE_URL}/boms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspaceId: payload.workspaceId,
      name: payload.name,
      version: payload.version || "v1.0",
      items: payload.items || [],
    }),
  });
  const json: ApiResponse<EnrichedBOMDetail> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to create BOM");
  }
  return json.data;
};

export const deleteBOM = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/boms/${id}`, {
    method: "DELETE",
  });
  const json: ApiResponse = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to delete BOM");
  }
};

export interface InvenAIChatMessage {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
}

export interface InvenAIToolCall {
  type: string;
  toolCallId: string;
  toolName: string;
  input: Record<string, any>;
}

export interface InvenAIToolResult {
  type: string;
  toolCallId: string;
  toolName: string;
  input: Record<string, any>;
  output: any;
}

export interface InvenAIStep {
  text: string;
  toolCalls: InvenAIToolCall[];
  toolResults: InvenAIToolResult[];
  finishReason: string;
}

export interface InvenAIChatResult {
  text: string;
  toolApprovalRequests: any[];
  steps: InvenAIStep[];
  usage?: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
  };
}

export const sendInvenAIChat = async (
  messages: Array<{ role: string; content: string }>
): Promise<InvenAIChatResult> => {
  const res = await fetch(`${API_BASE_URL}/inven-ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const json: ApiResponse<InvenAIChatResult> = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to generate InvenAI response");
  }
  return json.data;
};




