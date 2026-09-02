"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  fetchPurchaseOrders,
  fetchPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
  deletePurchaseOrder,
  fetchSuppliers,
  fetchItems,
  type PurchaseOrder,
  type Supplier,
  type Item,
  type ReceivePurchaseOrderResult,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  PackageCheck,
  DollarSign,
  X,
  Trash2,
} from "lucide-react";

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const [deletingPO, setDeletingPO] = useState<PurchaseOrder | null>(null);
  const [isDeletingPO, setIsDeletingPO] = useState(false);

  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poCurrency, setPoCurrency] = useState("USD");
  const [poNotes, setPoNotes] = useState("");
  const [poStatus, setPoStatus] = useState("DRAFT");
  const [poLines, setPoLines] = useState<
    Array<{ itemId: string; supplierPartNumber: string; quantity: number; unitPrice: number }>
  >([]);
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);
  const [poFormError, setPoFormError] = useState<string | null>(null);

  const [isReceivingPO, setIsReceivingPO] = useState(false);
  const [receiveLocation, setReceiveLocation] = useState("Main Warehouse - Shelf A1");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false);
  const [receiveResult, setReceiveResult] = useState<ReceivePurchaseOrderResult | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [poRes, supRes, itemRes] = await Promise.all([
        fetchPurchaseOrders({ limit: 100 }),
        fetchSuppliers({ limit: 50 }),
        fetchItems({ limit: 100 }),
      ]);
      setPurchaseOrders(poRes.purchaseOrders);
      setTotalCount(poRes.total);
      setSuppliers(supRes.suppliers);
      setItems(itemRes.items);
    } catch (err: any) {
      toast.error("Failed to load purchase orders", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesStatus =
        statusFilter === "All" ||
        po.status.toLowerCase() === statusFilter.toLowerCase();

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        po.poNumber.toLowerCase().includes(q) ||
        po.supplierName.toLowerCase().includes(q) ||
        po.supplierCode.toLowerCase().includes(q) ||
        po.items.some(
          (it) =>
            it.partNumber.toLowerCase().includes(q) ||
            it.name.toLowerCase().includes(q) ||
            it.supplierPartNumber.toLowerCase().includes(q)
        );

      return matchesStatus && matchesSearch;
    });
  }, [purchaseOrders, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const totalSpend = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
    const deliveredCount = purchaseOrders.filter((p) => p.status === "DELIVERED").length;
    const activeCount = purchaseOrders.filter((p) => p.status !== "DELIVERED" && p.status !== "CANCELLED").length;
    return { totalSpend, deliveredCount, activeCount };
  }, [purchaseOrders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <Badge variant="success">Delivered</Badge>;
      case "APPROVED_AND_ISSUED":
      case "ISSUED":
        return <Badge variant="primary">Issued</Badge>;
      case "SHIPPED":
        return <Badge variant="warning">In Transit</Badge>;
      case "CONFIRMED":
        return <Badge variant="tier-2">Confirmed</Badge>;
      case "CANCELLED":
        return <Badge variant="danger">Cancelled</Badge>;
      case "DRAFT":
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  };

  const handleOpenCreatePO = () => {
    if (suppliers.length > 0) {
      setPoSupplierId(suppliers[0].id);
    }
    setPoCurrency("USD");
    setPoNotes("");
    setPoStatus("DRAFT");
    if (items.length > 0) {
      setPoLines([
        {
          itemId: items[0].id,
          supplierPartNumber: `SKU-${items[0].partNumber.slice(0, 8)}`,
          quantity: 100,
          unitPrice: 1.5,
        },
      ]);
    } else {
      setPoLines([]);
    }
    setPoFormError(null);
    setIsCreatingPO(true);
  };

  const handleAddLineItem = () => {
    const firstItem = items[0];
    if (!firstItem) return;
    setPoLines((prev) => [
      ...prev,
      {
        itemId: firstItem.id,
        supplierPartNumber: `SKU-${firstItem.partNumber.slice(0, 8)}`,
        quantity: 50,
        unitPrice: 2.0,
      },
    ]);
  };

  const handleUpdateLine = (
    index: number,
    field: "itemId" | "supplierPartNumber" | "quantity" | "unitPrice",
    value: any
  ) => {
    setPoLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === "itemId") {
        const itemObj = items.find((it) => it.id === value);
        if (itemObj) {
          copy[index].supplierPartNumber = `SKU-${itemObj.partNumber.slice(0, 8)}`;
        }
      }
      return copy;
    });
  };

  const handleRemoveLine = (index: number) => {
    setPoLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId) {
      setPoFormError("Please select a vendor.");
      return;
    }
    if (poLines.length === 0) {
      setPoFormError("Please add at least one line item.");
      return;
    }

    try {
      setIsSubmittingPO(true);
      setPoFormError(null);

      const created = await createPurchaseOrder({
        supplierId: poSupplierId,
        currency: poCurrency,
        notes: poNotes.trim() || undefined,
        status: poStatus,
        items: poLines.map((l) => ({
          itemId: l.itemId,
          supplierPartNumber: l.supplierPartNumber.trim(),
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      });

      toast.success("Purchase Order Created", `PO ${created.poNumber} created successfully.`);
      setIsCreatingPO(false);
      await loadData();
    } catch (err: any) {
      setPoFormError(err.message || "Failed to create purchase order");
      toast.error("Creation Failed", err.message);
    } finally {
      setIsSubmittingPO(false);
    }
  };

  const handleStatusChange = async (poId: string, nextStatus: string) => {
    try {
      const updated = await updatePurchaseOrderStatus(poId, { status: nextStatus });
      toast.success("Status Updated", `${updated.poNumber} marked as ${nextStatus}.`);
      if (selectedPO?.id === poId) setSelectedPO(updated);
      await loadData();
    } catch (err: any) {
      toast.error("Status Update Failed", err.message);
    }
  };

  const handleConfirmDeletePO = async () => {
    if (!deletingPO) return;

    try {
      setIsDeletingPO(true);
      await deletePurchaseOrder(deletingPO.id);
      toast.success("Purchase Order Deleted", `${deletingPO.poNumber} was deleted.`);
      if (selectedPO?.id === deletingPO.id) setSelectedPO(null);
      setDeletingPO(null);
      await loadData();
    } catch (err: any) {
      toast.error("Delete Failed", err.message);
    } finally {
      setIsDeletingPO(false);
    }
  };

  const handleReceivePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    try {
      setIsSubmittingReceive(true);
      const res = await receivePurchaseOrder(selectedPO.id, {
        location: receiveLocation.trim(),
        notes: receiveNotes.trim() || undefined,
      });

      setReceiveResult(res);
      setIsReceivingPO(false);
      toast.success(
        "Dock Receiving Complete",
        `Received ${res.inventoryStockUpdates.length} items into ${receiveLocation}.`
      );
      setSelectedPO(res.purchaseOrder);
      await loadData();
    } catch (err: any) {
      toast.error("Receiving Failed", err.message);
    } finally {
      setIsSubmittingReceive(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010102] text-[#f7f8f8]">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#23252a] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                Global Procurement & Dock Logistics
              </span>
              <Badge variant="primary">{totalCount} Purchase Orders</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8] sm:text-3xl mt-1">
              Purchase Orders & Receiving
            </h1>
            <p className="text-xs text-[#8a8f98] mt-1 max-w-2xl">
              Track vendor orders, execute multi-line purchase requests, and perform physical dock receiving with automated inventory stock synchronizations.
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
              onClick={handleOpenCreatePO}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Purchase Order</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Total Procurement Spend</span>
              <DollarSign className="h-4 w-4 text-[#5e6ad2]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#f7f8f8] mt-2">
              ${metrics.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Active / In-Flight Orders</span>
              <Clock className="h-4 w-4 text-[#facc15]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#facc15] mt-2">
              {metrics.activeCount} Orders
            </p>
          </Card>

          <Card className="bg-[#0f1011] border-[#23252a] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8a8f98] font-medium">Delivered & Received</span>
              <PackageCheck className="h-4 w-4 text-[#4ade80]" />
            </div>
            <p className="text-xl font-bold font-mono text-[#4ade80] mt-2">
              {metrics.deliveredCount} Orders
            </p>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0f1011] p-3 rounded-xl border border-[#23252a]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8a8f98]" />
            <Input
              placeholder="Search by PO number, vendor, or MPN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-8"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {["All", "DRAFT", "APPROVED_AND_ISSUED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                    statusFilter === st
                      ? "bg-[#5e6ad2] text-white"
                      : "bg-[#010102] hover:bg-[#141516] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#23252a]"
                  }`}
                >
                  {st === "APPROVED_AND_ISSUED" ? "ISSUED" : st}
                </button>
              )
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-[#0f1011] border border-[#23252a] animate-pulse" />
            ))}
          </div>
        ) : filteredPOs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#23252a] bg-[#0f1011]/40 p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#141516] border border-[#23252a] text-[#8a8f98]">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#f7f8f8]">No Purchase Orders Found</h3>
            <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
              Create a new purchase order manually or launch an autonomous BOM pipeline to generate POs automatically.
            </p>
            <Button variant="primary" size="sm" onClick={handleOpenCreatePO} className="mt-2">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Purchase Order</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPOs.map((po) => {
              const isSelected = selectedPO?.id === po.id;
              return (
                <div
                  key={po.id}
                  onClick={() => {
                    setSelectedPO(po);
                    setReceiveResult(null);
                  }}
                  className={`group rounded-xl border p-4 transition-all duration-150 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? "bg-[#141516] border-[#5e6ad2] shadow-lg shadow-[#5e6ad2]/10 ring-1 ring-[#5e6ad2]/50"
                      : "bg-[#0f1011] border-[#23252a] hover:border-[#5e6ad2]/60 hover:bg-[#141516]/70"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#14172e] border border-[#282d5c] text-[#828fff] mt-0.5">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-white group-hover:text-[#828fff] transition-colors">
                          {po.poNumber}
                        </span>
                        {getStatusBadge(po.status)}
                        <span className="font-mono text-[10px] text-[#828fff] bg-[#14172e] px-2 py-0.5 rounded border border-[#282d5c]">
                          {po.supplierCode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#8a8f98]">
                        <span className="font-medium text-[#d0d6e0]">{po.supplierName}</span>
                        <span>•</span>
                        <span>{po.items.length} Line Item{po.items.length !== 1 ? "s" : ""}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">
                          {new Date(po.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-[#23252a]/60 pt-2 md:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] text-[#8a8f98] uppercase block">Total Spend</span>
                      <span className="font-mono text-sm font-bold text-[#4ade80]">
                        ${po.totalAmount.toFixed(2)} {po.currency}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#828fff] text-xs font-medium group-hover:underline flex items-center gap-1">
                        <span>Inspect</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedPO && (
          <Card className="border-[#23252a] bg-[#0f1011] shadow-2xl animate-in fade-in duration-100">
            <CardHeader className="border-b border-[#23252a] pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-mono">{selectedPO.poNumber}</CardTitle>
                    {getStatusBadge(selectedPO.status)}
                    <span className="font-mono text-xs text-[#828fff] bg-[#14172e] px-2 py-0.5 rounded border border-[#282d5c]">
                      {selectedPO.supplierCode}
                    </span>
                  </div>
                  <CardDescription>
                    Vendor: {selectedPO.supplierName} (Reliability: {selectedPO.supplierReliabilityScore.toFixed(1)}%) • Created on {new Date(selectedPO.createdAt).toLocaleString()}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedPO.status !== "DELIVERED" && selectedPO.status !== "CANCELLED" && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => {
                        setReceiveResult(null);
                        setIsReceivingPO(true);
                      }}
                    >
                      <PackageCheck className="h-3.5 w-3.5" />
                      <span>Receive at Dock</span>
                    </Button>
                  )}

                  <div className="flex items-center gap-1 bg-[#010102] border border-[#23252a] rounded-lg p-1">
                    <span className="text-[10px] text-[#8a8f98] px-2">Status:</span>
                    {["DRAFT", "APPROVED_AND_ISSUED", "SHIPPED", "CANCELLED"].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(selectedPO.id, st)}
                        disabled={selectedPO.status === st || selectedPO.status === "DELIVERED"}
                        className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors cursor-pointer ${
                          selectedPO.status === st
                            ? "bg-[#5e6ad2] text-white"
                            : "text-[#8a8f98] hover:text-[#f7f8f8] disabled:opacity-40 disabled:cursor-not-allowed"
                        }`}
                      >
                        {st === "APPROVED_AND_ISSUED" ? "ISSUED" : st}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeletingPO(selectedPO)}
                    className="p-1.5 text-[#8a8f98] hover:text-[#f87171] hover:bg-[#241414] rounded-lg transition-colors"
                    title="Delete Purchase Order"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPO(null);
                      setReceiveResult(null);
                    }}
                    className="p-1.5 text-[#8a8f98] hover:text-white rounded-lg hover:bg-[#141516]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-6">
              {receiveResult && (
                <div className="rounded-xl bg-[#0f1f14] border border-[#1b3d26] p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-[#4ade80]">
                    <CheckCircle2 className="h-4 w-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Dock Receiving & Stock Synchronized!
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg bg-[#010102]/60 p-2.5 space-y-0.5">
                      <span className="text-[10px] text-[#8a8f98]">Timeliness Assessment</span>
                      <p className="font-bold text-[#4ade80]">
                        {receiveResult.deliveryTimeliness.status} ({receiveResult.deliveryTimeliness.daysDifference === 0 ? "On Time" : `${Math.abs(receiveResult.deliveryTimeliness.daysDifference)} days early`})
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#010102]/60 p-2.5 space-y-0.5">
                      <span className="text-[10px] text-[#8a8f98]">Vendor Score Adjustment</span>
                      <p className="font-bold text-[#828fff]">
                        {receiveResult.supplierScoreAdjustment.previousScore.toFixed(1)}% ➔ {receiveResult.supplierScoreAdjustment.newScore.toFixed(1)}% ({receiveResult.supplierScoreAdjustment.scoreDelta >= 0 ? `+${receiveResult.supplierScoreAdjustment.scoreDelta}` : receiveResult.supplierScoreAdjustment.scoreDelta}%)
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#010102]/60 p-2.5 space-y-0.5">
                      <span className="text-[10px] text-[#8a8f98]">Warehouse Location</span>
                      <p className="font-bold text-[#f7f8f8]">
                        {receiveResult.inventoryStockUpdates[0]?.location || "Main Warehouse"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                  Line Items & Specifications
                </h4>

                <div className="rounded-xl border border-[#23252a] bg-[#010102] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#23252a] bg-[#141516] text-[#8a8f98] font-semibold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Component Part Number</th>
                        <th className="px-4 py-3">Vendor SKU</th>
                        <th className="px-4 py-3 text-right">Quantity</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#23252a]/60">
                      {selectedPO.items.map((it) => (
                        <tr key={it.id} className="hover:bg-[#141516]/50">
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-[#f7f8f8] block">
                              {it.partNumber}
                            </span>
                            <span className="text-[11px] text-[#8a8f98]">{it.name}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[#828fff]">{it.supplierPartNumber}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[#f7f8f8]">
                            {it.quantity.toLocaleString()} pcs
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[#8a8f98]">
                            ${it.unitPrice.toFixed(3)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[#4ade80]">
                            ${it.totalPrice.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-[#23252a] bg-[#141516]/60 text-xs font-bold">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-[#8a8f98] uppercase">
                          Grand Total ({selectedPO.currency}):
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-[#4ade80]">
                          ${selectedPO.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {selectedPO.notes && (
                <div className="rounded-lg bg-[#010102] border border-[#23252a] p-3 text-xs text-[#8a8f98]">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-[#62666d] block mb-1">
                    Notes & Audit Trail:
                  </span>
                  {selectedPO.notes}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isCreatingPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
            <Card className="w-full max-w-2xl border-[#5e6ad2]/70 bg-[#0f1011] shadow-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-[#5e6ad2]" />
                    <CardTitle>Create New Purchase Order</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingPO(false)}
                    className="p-1 text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardDescription>
                  Issue a standardized PO to an electronics distributor with multi-line components.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleCreatePOSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Distributor / Vendor *
                      </label>
                      <select
                        value={poSupplierId}
                        onChange={(e) => setPoSupplierId(e.target.value)}
                        className="w-full rounded-lg border border-[#23252a] bg-[#0f1011] p-2.5 text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:outline-none"
                      >
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code}) - {s.reliabilityScore.toFixed(1)}% Reliability
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Initial Status
                      </label>
                      <select
                        value={poStatus}
                        onChange={(e) => setPoStatus(e.target.value)}
                        className="w-full rounded-lg border border-[#23252a] bg-[#0f1011] p-2.5 text-xs text-[#f7f8f8] focus:border-[#5e6ad2] focus:outline-none"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="APPROVED_AND_ISSUED">APPROVED_AND_ISSUED</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl bg-[#010102] border border-[#23252a] p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                        Order Line Items ({poLines.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleAddLineItem}
                        className="text-[11px] font-medium text-[#828fff] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Line Item</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {poLines.map((line, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-12 gap-2 items-center bg-[#0f1011] p-2.5 rounded-lg border border-[#23252a]"
                        >
                          <div className="col-span-4">
                            <span className="text-[9px] text-[#8a8f98] uppercase block mb-0.5">Component</span>
                            <select
                              value={line.itemId}
                              onChange={(e) => handleUpdateLine(idx, "itemId", e.target.value)}
                              className="w-full rounded bg-[#141516] border border-[#23252a] p-1.5 text-[11px] text-[#f7f8f8] focus:outline-none"
                            >
                              {items.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.partNumber}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-3">
                            <span className="text-[9px] text-[#8a8f98] uppercase block mb-0.5">SKU</span>
                            <Input
                              value={line.supplierPartNumber}
                              onChange={(e) => handleUpdateLine(idx, "supplierPartNumber", e.target.value)}
                              className="h-7 text-xs font-mono"
                            />
                          </div>

                          <div className="col-span-2">
                            <span className="text-[9px] text-[#8a8f98] uppercase block mb-0.5">Qty</span>
                            <Input
                              type="number"
                              value={line.quantity}
                              onChange={(e) => handleUpdateLine(idx, "quantity", parseInt(e.target.value, 10) || 1)}
                              className="h-7 text-xs font-mono"
                            />
                          </div>

                          <div className="col-span-2">
                            <span className="text-[9px] text-[#8a8f98] uppercase block mb-0.5">Price ($)</span>
                            <Input
                              type="number"
                              step="0.001"
                              value={line.unitPrice}
                              onChange={(e) => handleUpdateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs font-mono text-[#4ade80]"
                            />
                          </div>

                          <div className="col-span-1 text-center pt-3">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="p-1 text-[#8a8f98] hover:text-[#f87171] transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2 text-xs font-mono">
                      <span className="text-[#8a8f98] mr-2">Estimated PO Total:</span>
                      <span className="font-bold text-[#4ade80]">
                        ${poLines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0).toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Purchase Order Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Special shipping instructions, production project reference..."
                      value={poNotes}
                      onChange={(e) => setPoNotes(e.target.value)}
                      className="w-full rounded-lg border border-[#23252a] bg-[#0f1011] p-2.5 text-xs text-[#f7f8f8] placeholder:text-[#8a8f98] focus:border-[#5e6ad2] focus:outline-none"
                    />
                  </div>

                  {poFormError && (
                    <p className="text-[11px] text-[#f87171]">{poFormError}</p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#23252a]">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => setIsCreatingPO(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={poLines.length === 0}
                      isLoading={isSubmittingPO}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Issue Purchase Order</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {isReceivingPO && selectedPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
            <Card className="w-full max-w-md border-[#4ade80]/60 bg-[#0f1011] shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-[#4ade80]" />
                    <CardTitle>Receive at Dock: {selectedPO.poNumber}</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReceivingPO(false)}
                    className="p-1 text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardDescription>
                  Confirm physical arrival at loading dock to automatically increase warehouse stock.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleReceivePOSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Warehouse Inbound Location / Bin *
                    </label>
                    <Input
                      autoFocus
                      placeholder="e.g. Main Warehouse - Shelf A1"
                      value={receiveLocation}
                      onChange={(e) => setReceiveLocation(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Receiving Audit Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Inspected by QA lead, ESD bags sealed, zero package damages..."
                      value={receiveNotes}
                      onChange={(e) => setReceiveNotes(e.target.value)}
                      className="w-full rounded-lg border border-[#23252a] bg-[#0f1011] p-2.5 text-xs text-[#f7f8f8] placeholder:text-[#8a8f98] focus:border-[#5e6ad2] focus:outline-none"
                    />
                  </div>

                  <div className="rounded-lg bg-[#010102] border border-[#23252a] p-3 text-[11px] text-[#8a8f98] space-y-1">
                    <p className="font-semibold text-[#f7f8f8]">Dock Action will:</p>
                    <p>• Increase warehouse on-hand stock for {selectedPO.items.length} component types.</p>
                    <p>• Automatically update {selectedPO.supplierName}&apos;s vendor reliability score.</p>
                    <p>• Mark this PO permanently as <span className="text-[#4ade80] font-bold">DELIVERED</span>.</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#23252a]">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => setIsReceivingPO(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="success"
                      size="sm"
                      isLoading={isSubmittingReceive}
                    >
                      <PackageCheck className="h-3.5 w-3.5" />
                      <span>Confirm & Update Stock</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deletingPO}
          title="Delete Purchase Order"
          description={`Are you sure you want to permanently delete purchase order "${deletingPO?.poNumber}"? All line items and associated allocations will be removed.`}
          confirmLabel="Delete Purchase Order"
          isLoading={isDeletingPO}
          onConfirm={handleConfirmDeletePO}
          onCancel={() => setDeletingPO(null)}
        />
      </main>
    </div>
  );
}
