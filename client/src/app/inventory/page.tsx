"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  fetchInventory,
  fetchLowStockAlerts,
  addInventoryItem,
  adjustInventoryStock,
  allocateInventoryStock,
  releaseInventoryStock,
  updateInventoryItem,
  deleteInventoryItem,
  fetchItems,
  type InventoryItem,
  type LowStockAlertItem,
  type Item,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Boxes,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  ArrowRight,
  Package,
  Layers,
  DollarSign,
  X,
  SlidersHorizontal,
  Lock,
  Unlock,
  Pencil,
  Trash2,
  CheckCircle2,
  MapPin,
  TrendingDown,
  Warehouse,
} from "lucide-react";

export default function InventoryPage() {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlertItem[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"all" | "low_stock">("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddingStock, setIsAddingStock] = useState(false);
  const [newItemId, setNewItemId] = useState("");
  const [newOnHand, setNewOnHand] = useState(100);
  const [newReserved, setNewReserved] = useState(0);
  const [newReorderThreshold, setNewReorderThreshold] = useState(20);
  const [newLocation, setNewLocation] = useState("Main Warehouse - Shelf A1");
  const [newUnitCost, setNewUnitCost] = useState(1.5);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("Physical Cycle Count");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const [allocatingItem, setAllocatingItem] = useState<InventoryItem | null>(null);
  const [allocateQty, setAllocateQty] = useState<number>(10);
  const [allocateNotes, setAllocateNotes] = useState("");
  const [isSubmittingAllocate, setIsSubmittingAllocate] = useState(false);

  const [releasingItem, setReleasingItem] = useState<InventoryItem | null>(null);
  const [releaseQty, setReleaseQty] = useState<number>(10);
  const [isSubmittingRelease, setIsSubmittingRelease] = useState(false);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editLocation, setEditLocation] = useState("");
  const [editThreshold, setEditThreshold] = useState(10);
  const [editUnitCost, setEditUnitCost] = useState(0);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [invRes, alertRes, itemRes] = await Promise.all([
        fetchInventory({ limit: 100 }),
        fetchLowStockAlerts(),
        fetchItems({ limit: 100 }),
      ]);
      setInventory(invRes.items);
      setTotalCount(invRes.total);
      setAlerts(alertRes.alerts);
      setItems(itemRes.items);
      if (itemRes.items.length > 0) {
        setNewItemId(itemRes.items[0].id);
      }
    } catch (err: any) {
      toast.error("Failed to load warehouse inventory", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ["All", ...Array.from(set)];
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const list = activeTab === "low_stock" ? alerts : inventory;
    return list.filter((item) => {
      const matchesCategory =
        categoryFilter === "All" ||
        item.category.toLowerCase() === categoryFilter.toLowerCase();

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        item.partNumber.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [inventory, alerts, activeTab, categoryFilter, searchQuery]);

  const metrics = useMemo(() => {
    const totalValuation = inventory.reduce((sum, it) => sum + it.totalValuation, 0);
    const totalPartsOnHand = inventory.reduce((sum, it) => sum + it.quantityOnHand, 0);
    const totalReserved = inventory.reduce((sum, it) => sum + it.quantityReserved, 0);
    return {
      totalValuation,
      totalPartsOnHand,
      totalReserved,
      lowStockCount: alerts.length,
    };
  }, [inventory, alerts]);

  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemId) {
      toast.error("Validation Error", "Please select a component from the catalog.");
      return;
    }

    try {
      setIsSubmittingAdd(true);
      const res = await addInventoryItem({
        itemId: newItemId,
        quantityOnHand: newOnHand,
        quantityReserved: newReserved,
        reorderThreshold: newReorderThreshold,
        location: newLocation.trim(),
        unitCost: newUnitCost,
      });

      toast.success("Stock Added", `${res.partNumber} is now tracked at ${res.location}.`);
      setIsAddingStock(false);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to Add Stock", err.message);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    if (adjustDelta === 0) {
      toast.error("Invalid Delta", "Adjustment delta cannot be 0.");
      return;
    }

    try {
      setIsSubmittingAdjust(true);
      const res = await adjustInventoryStock({
        id: adjustingItem.id,
        delta: adjustDelta,
        reason: adjustReason,
        notes: adjustNotes.trim() || undefined,
      });

      toast.success(
        "Stock Adjusted",
        `${res.partNumber} on-hand updated to ${res.quantityOnHand.toLocaleString()} pcs.`
      );
      setAdjustingItem(null);
      await loadData();
    } catch (err: any) {
      toast.error("Adjustment Failed", err.message);
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingItem) return;

    try {
      setIsSubmittingAllocate(true);
      const res = await allocateInventoryStock({
        id: allocatingItem.id,
        quantity: allocateQty,
        notes: allocateNotes.trim() || undefined,
      });

      toast.success(
        "Stock Allocated",
        `Reserved ${allocateQty} pcs of ${res.partNumber}. ${res.quantityAvailable} pcs remaining available.`
      );
      setAllocatingItem(null);
      await loadData();
    } catch (err: any) {
      toast.error("Allocation Failed", err.message);
    } finally {
      setIsSubmittingAllocate(false);
    }
  };

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releasingItem) return;

    try {
      setIsSubmittingRelease(true);
      const res = await releaseInventoryStock({
        id: releasingItem.id,
        quantity: releaseQty,
      });

      toast.success(
        "Stock Released",
        `Released ${releaseQty} pcs of ${res.partNumber} back to available stock.`
      );
      setReleasingItem(null);
      await loadData();
    } catch (err: any) {
      toast.error("Release Failed", err.message);
    } finally {
      setIsSubmittingRelease(false);
    }
  };

  const handleOpenEdit = (it: InventoryItem) => {
    setEditingItem(it);
    setEditLocation(it.location);
    setEditThreshold(it.reorderThreshold);
    setEditUnitCost(it.unitCost || 0);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setIsSubmittingEdit(true);
      const res = await updateInventoryItem(editingItem.id, {
        location: editLocation.trim(),
        reorderThreshold: editThreshold,
        unitCost: editUnitCost,
      });

      toast.success("Settings Updated", `${res.partNumber} warehouse settings updated.`);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      toast.error("Update Failed", err.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      setIsDeleting(true);
      await deleteInventoryItem(deletingItem.id);
      toast.success("Inventory Removed", `${deletingItem.partNumber} removed from warehouse inventory.`);
      setDeletingItem(null);
      await loadData();
    } catch (err: any) {
      toast.error("Delete Failed", err.message);
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
                Global Supply Chain & Warehouse
              </span>
              <Badge variant="primary">{totalCount} SKUs Tracked</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8] sm:text-3xl mt-1">
              Warehouse Inventory & Stock
            </h1>
            <p className="text-xs text-[#8a8f98] mt-1 max-w-2xl">
              Track on-hand physical hardware components, manage bin locations, execute cycle count adjustments, and reserve stock for production builds.
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

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setNewOnHand(100);
                setNewReserved(0);
                setNewReorderThreshold(20);
                setNewLocation("Main Warehouse - Shelf A1");
                setNewUnitCost(1.5);
                setIsAddingStock(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Component Stock</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Total Warehouse Valuation</span>
              <DollarSign className="h-4 w-4 text-[#5e6ad2]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#f7f8f8] mt-2">
              ${metrics.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Total Physical On-Hand</span>
              <Warehouse className="h-4 w-4 text-[#828fff]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#828fff] mt-2">
              {metrics.totalPartsOnHand.toLocaleString()} pcs
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Allocated / Reserved Stock</span>
              <Lock className="h-4 w-4 text-[#facc15]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#facc15] mt-2">
              {metrics.totalReserved.toLocaleString()} pcs
            </p>
          </Card>

          <Card
            onClick={() => setActiveTab("low_stock")}
            className={`p-4 transition-colors cursor-pointer ${
              metrics.lowStockCount > 0
                ? "bg-[#241414] border-[#dc2626]/50 hover:border-[#dc2626]"
                : "bg-[#0f1011] border-[#23252a]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#f87171] font-medium">Low Stock Alerts</span>
              <AlertTriangle className="h-4 w-4 text-[#f87171]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#f87171] mt-2">
              {metrics.lowStockCount} SKUs Breached
            </p>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0f1011] p-3 rounded-xl border border-[#23252a]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#010102] border border-[#23252a] rounded-lg p-1">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  activeTab === "all"
                    ? "bg-[#5e6ad2] text-white"
                    : "text-[#8a8f98] hover:text-[#f7f8f8]"
                }`}
              >
                All Stock ({inventory.length})
              </button>
              <button
                onClick={() => setActiveTab("low_stock")}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "low_stock"
                    ? "bg-[#dc2626] text-white"
                    : "text-[#8a8f98] hover:text-[#f7f8f8]"
                }`}
              >
                <AlertTriangle className="h-3 w-3" />
                <span>Low Stock ({alerts.length})</span>
              </button>
            </div>

            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8a8f98]" />
              <Input
                placeholder="Search MPN, component name, bin location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-8"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-[#5e6ad2] text-white"
                    : "bg-[#010102] hover:bg-[#141516] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#23252a]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-[#0f1011] border border-[#23252a] animate-pulse" />
            ))}
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#23252a] bg-[#0f1011]/40 p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#141516] border border-[#23252a] text-[#8a8f98]">
              <Boxes className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#f7f8f8]">
              {activeTab === "low_stock" ? "No Low Stock Alerts" : "No Inventory Records Found"}
            </h3>
            <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
              {activeTab === "low_stock"
                ? "All components are currently stocked above their defined safety thresholds."
                : "Add component stock or execute a Purchase Order receiving process."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#23252a] bg-[#141516] text-[#8a8f98] font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Component / MPN</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-right">On Hand</th>
                    <th className="px-4 py-3 text-right">Reserved</th>
                    <th className="px-4 py-3 text-right">Available</th>
                    <th className="px-4 py-3 text-right">Threshold</th>
                    <th className="px-4 py-3 text-right">Valuation</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23252a]/60">
                  {filteredInventory.map((it) => (
                    <tr key={it.id} className="hover:bg-[#141516]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#f7f8f8]">{it.partNumber}</span>
                          {it.isLowStock && <Badge variant="danger">Low Stock</Badge>}
                          <span className="text-[10px] text-[#8a8f98] bg-[#010102] px-1.5 py-0.5 rounded border border-[#23252a]">
                            {it.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8a8f98] mt-0.5 line-clamp-1">{it.name}</p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#828fff]">
                          <MapPin className="h-3 w-3" />
                          <span>{it.location}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-[#f7f8f8]">
                        {it.quantityOnHand.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-[#facc15]">
                        {it.quantityReserved.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-[#4ade80]">
                        {it.quantityAvailable.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-[#8a8f98]">
                        {it.reorderThreshold.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-[#f7f8f8]">
                        ${it.totalValuation.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingItem(it);
                              setAdjustDelta(0);
                              setAdjustNotes("");
                            }}
                            className="p-1.5 text-[#8a8f98] hover:text-[#828fff] hover:bg-[#14172e] rounded-md transition-colors"
                            title="Adjust Stock Quantity (+/-)"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAllocatingItem(it);
                              setAllocateQty(Math.min(10, it.quantityAvailable));
                              setAllocateNotes("");
                            }}
                            className="p-1.5 text-[#8a8f98] hover:text-[#facc15] hover:bg-[#2e2614] rounded-md transition-colors"
                            title="Allocate / Reserve for Build"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </button>

                          {it.quantityReserved > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setReleasingItem(it);
                                setReleaseQty(it.quantityReserved);
                              }}
                              className="p-1.5 text-[#8a8f98] hover:text-[#4ade80] hover:bg-[#142e1a] rounded-md transition-colors"
                              title="Release Reserved Stock"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(it)}
                            className="p-1.5 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[#23252a] rounded-md transition-colors"
                            title="Edit Bin Location & Threshold"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingItem(it)}
                            className="p-1.5 text-[#8a8f98] hover:text-[#f87171] hover:bg-[#241414] rounded-md transition-colors"
                            title="Delete Stock Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isAddingStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
            <Card className="w-full max-w-md border-[#5e6ad2]/70 bg-[#0f1011] shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-[#5e6ad2]" />
                    <CardTitle>Add Warehouse Stock</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingStock(false)}
                    className="p-1 text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardDescription>
                  Track on-hand stock and warehouse locations for catalog components.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleAddStockSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Component Part *
                    </label>
                    <select
                      value={newItemId}
                      onChange={(e) => setNewItemId(e.target.value)}
                      className="w-full rounded-lg border border-[#23252a] bg-[#0f1011] p-2.5 text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:outline-none"
                    >
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.partNumber} — {it.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Initial On-Hand *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={newOnHand}
                        onChange={(e) => setNewOnHand(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Reorder Threshold *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={newReorderThreshold}
                        onChange={(e) => setNewReorderThreshold(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Unit Cost ($)
                      </label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={newUnitCost}
                        onChange={(e) => setNewUnitCost(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Bin / Shelf Location *
                      </label>
                      <Input
                        placeholder="e.g. Warehouse Shelf A-1"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23252a]">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => setIsAddingStock(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSubmittingAdd}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Save Stock Record</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {adjustingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
            <Card className="w-full max-w-md border-[#828fff]/70 bg-[#0f1011] shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-[#828fff]" />
                    <CardTitle>Adjust Stock: {adjustingItem.partNumber}</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdjustingItem(null)}
                    className="p-1 text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardDescription>
                  Current on-hand: {adjustingItem.quantityOnHand} pcs. Enter positive delta to increase or negative to reduce.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleAdjustSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Quantity Delta (+ / -) *
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. +50 or -10"
                      value={adjustDelta}
                      onChange={(e) => setAdjustDelta(parseInt(e.target.value, 10) || 0)}
                      autoFocus
                    />
                    <span className="text-[10px] text-[#8a8f98] block">
                      New Total: {adjustingItem.quantityOnHand + adjustDelta} pcs
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Adjustment Reason *
                    </label>
                    <select
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full rounded-lg border border-[#23252a] bg-[#0f1011] p-2.5 text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:outline-none"
                    >
                      <option value="Physical Cycle Count">Physical Cycle Count Recount</option>
                      <option value="Damaged / Scrap">Damaged / Scrap Quarantine</option>
                      <option value="Returned to Vendor">Returned to Vendor</option>
                      <option value="Manual Correction">Manual Discrepancy Correction</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Notes / Audit Trail
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Audit log reference or bin recount notes..."
                      value={adjustNotes}
                      onChange={(e) => setAdjustNotes(e.target.value)}
                      className="w-full rounded-lg border border-[#23252a] bg-[#0f1011] p-2.5 text-xs text-[#f7f8f8] placeholder:text-[#8a8f98] focus:border-[#5e6ad2] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23252a]">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => setAdjustingItem(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSubmittingAdjust}
                    >
                      <span>Confirm Adjustment</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {allocatingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
            <Card className="w-full max-w-md border-[#facc15]/70 bg-[#0f1011] shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#facc15]" />
                    <CardTitle>Allocate Stock: {allocatingItem.partNumber}</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllocatingItem(null)}
                    className="p-1 text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardDescription>
                  Reserve units for an upcoming build or active production order. Available: {allocatingItem.quantityAvailable} pcs.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleAllocateSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Quantity to Allocate *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max={allocatingItem.quantityAvailable}
                      value={allocateQty}
                      onChange={(e) => setAllocateQty(parseInt(e.target.value, 10) || 1)}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Build / Project Reference
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Reserved for UAV Flight Controller Batch 100x"
                      value={allocateNotes}
                      onChange={(e) => setAllocateNotes(e.target.value)}
                      className="w-full rounded-lg border border-[#23252a] bg-[#0f1011] p-2.5 text-xs text-[#f7f8f8] placeholder:text-[#8a8f98] focus:border-[#5e6ad2] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23252a]">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => setAllocatingItem(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSubmittingAllocate}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Reserve Stock</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {releasingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
            <Card className="w-full max-w-md border-[#4ade80]/70 bg-[#0f1011] shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Unlock className="h-4 w-4 text-[#4ade80]" />
                    <CardTitle>Release Stock: {releasingItem.partNumber}</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReleasingItem(null)}
                    className="p-1 text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardDescription>
                  Unreserve stock back to general warehouse availability. Currently reserved: {releasingItem.quantityReserved} pcs.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleReleaseSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Quantity to Release *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max={releasingItem.quantityReserved}
                      value={releaseQty}
                      onChange={(e) => setReleaseQty(parseInt(e.target.value, 10) || 1)}
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23252a]">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => setReleasingItem(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="success"
                      size="sm"
                      isLoading={isSubmittingRelease}
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      <span>Release to General Stock</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
            <Card className="w-full max-w-md border-[#5e6ad2]/70 bg-[#0f1011] shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-[#5e6ad2]" />
                    <CardTitle>Edit Settings: {editingItem.partNumber}</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="p-1 text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardDescription>
                  Update bin storage location, unit cost, and safety stock threshold.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Bin / Shelf Location *
                    </label>
                    <Input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Reorder Threshold *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={editThreshold}
                        onChange={(e) => setEditThreshold(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Unit Cost ($)
                      </label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={editUnitCost}
                        onChange={(e) => setEditUnitCost(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23252a]">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => setEditingItem(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSubmittingEdit}
                    >
                      <span>Save Changes</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deletingItem}
          title="Delete Stock Record"
          description={`Are you sure you want to stop tracking warehouse inventory for "${deletingItem?.partNumber}"? Current on-hand quantity of ${deletingItem?.quantityOnHand} pcs will be removed.`}
          confirmLabel="Delete Stock Record"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingItem(null)}
        />
      </main>
    </div>
  );
}
