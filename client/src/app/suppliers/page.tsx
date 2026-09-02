"use client";

import React, { useState, useEffect } from "react";
import {
  fetchSuppliers,
  createSupplier,
  deleteSupplier,
  fetchSupplierItems,
  addSupplierItem,
  deleteSupplierItem,
  type Supplier,
  type SupplierItem,
  type PriceTier,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Truck,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Trash2,
  Clock,
  ShieldCheck,
  X,
  CreditCard,
  DollarSign,
  Tag,
} from "lucide-react";

export default function SuppliersPage() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierItems, setSupplierItems] = useState<SupplierItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);

  const [deletingQuoteItemId, setDeletingQuoteItemId] = useState<string | null>(null);
  const [isDeletingQuote, setIsDeletingQuote] = useState(false);

  const [isRegisteringSupplier, setIsRegisteringSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupCode, setNewSupCode] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupWebsite, setNewSupWebsite] = useState("");
  const [newSupLeadTime, setNewSupLeadTime] = useState("3");
  const [newSupScore, setNewSupScore] = useState("95");
  const [newSupPayment, setNewSupPayment] = useState("Net 30");
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [supplierFormError, setSupplierFormError] = useState<string | null>(null);

  const [isAddingQuote, setIsAddingQuote] = useState(false);
  const [quotePartNumber, setQuotePartNumber] = useState("");
  const [quoteSupplierSku, setQuoteSupplierSku] = useState("");
  const [quoteBasePrice, setQuoteBasePrice] = useState("");
  const [customPriceTiers, setCustomPriceTiers] = useState<PriceTier[]>([
    { minQuantity: 1, unitPrice: 0 },
    { minQuantity: 50, unitPrice: 0 },
    { minQuantity: 500, unitPrice: 0 },
  ]);
  const [quoteStock, setQuoteStock] = useState("1000");
  const [quoteLeadTime, setQuoteLeadTime] = useState("3");
  const [quoteMoq, setQuoteMoq] = useState("1");
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [quoteFormError, setQuoteFormError] = useState<string | null>(null);

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      const res = await fetchSuppliers({ limit: 50 });
      setSuppliers(res.suppliers);
      setTotalCount(res.total);
    } catch (err: any) {
      toast.error("Failed to load suppliers", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSelectSupplier = async (sup: Supplier) => {
    setSelectedSupplier(sup);
    try {
      setIsLoadingItems(true);
      const items = await fetchSupplierItems(sup.id);
      setSupplierItems(items);
    } catch (err: any) {
      toast.error("Failed to load quotes", err.message);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim() || !newSupCode.trim()) {
      setSupplierFormError("Supplier name and code are required.");
      return;
    }

    try {
      setIsSubmittingSupplier(true);
      setSupplierFormError(null);

      const created = await createSupplier({
        name: newSupName.trim(),
        code: newSupCode.trim().toUpperCase(),
        contactEmail: newSupEmail.trim() || undefined,
        website: newSupWebsite.trim() || undefined,
        leadTimeDaysAverage: parseFloat(newSupLeadTime) || 3.0,
        reliabilityScore: parseFloat(newSupScore) || 95.0,
        paymentTerms: newSupPayment.trim() || "Net 30",
        currency: "USD",
      });

      setNewSupName("");
      setNewSupCode("");
      setNewSupEmail("");
      setNewSupWebsite("");
      setIsRegisteringSupplier(false);
      toast.success("Supplier Registered", `"${created.name}" (${created.code}) added to matrix.`);
      await loadSuppliers();
    } catch (err: any) {
      setSupplierFormError(err.message || "Failed to create supplier");
      toast.error("Registration Failed", err.message);
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  const handleConfirmDeleteSupplier = async () => {
    if (!deletingSupplier) return;

    try {
      setIsDeletingSupplier(true);
      await deleteSupplier(deletingSupplier.id);
      toast.success("Supplier Removed", `"${deletingSupplier.name}" was deleted.`);
      if (selectedSupplier?.id === deletingSupplier.id) {
        setSelectedSupplier(null);
        setSupplierItems([]);
      }
      setDeletingSupplier(null);
      await loadSuppliers();
    } catch (err: any) {
      toast.error("Delete Failed", err.message);
    } finally {
      setIsDeletingSupplier(false);
    }
  };

  const handleBasePriceChange = (val: string) => {
    setQuoteBasePrice(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setCustomPriceTiers([
        { minQuantity: 1, unitPrice: num },
        { minQuantity: 50, unitPrice: Number((num * 0.9).toFixed(3)) },
        { minQuantity: 500, unitPrice: Number((num * 0.8).toFixed(3)) },
      ]);
    }
  };

  const handleUpdateTierQuantity = (index: number, qty: number) => {
    setCustomPriceTiers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], minQuantity: qty };
      return copy;
    });
  };

  const handleUpdateTierPrice = (index: number, price: number) => {
    setCustomPriceTiers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], unitPrice: price };
      return copy;
    });
  };

  const handleAddTierRow = () => {
    const lastTier = customPriceTiers[customPriceTiers.length - 1];
    const newQty = lastTier ? lastTier.minQuantity * 5 : 1000;
    const newPrice = lastTier ? Number((lastTier.unitPrice * 0.9).toFixed(3)) : 1.0;
    setCustomPriceTiers((prev) => [...prev, { minQuantity: newQty, unitPrice: newPrice }]);
  };

  const handleRemoveTierRow = (index: number) => {
    if (customPriceTiers.length <= 1) return;
    setCustomPriceTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    if (!quotePartNumber.trim() || !quoteSupplierSku.trim()) {
      setQuoteFormError("Part number and SKU are required.");
      return;
    }

    const validTiers = customPriceTiers.filter((t) => t.minQuantity > 0 && t.unitPrice > 0);
    if (validTiers.length === 0) {
      setQuoteFormError("Please provide at least one valid price tier with quantity and unit price.");
      return;
    }

    try {
      setIsSubmittingQuote(true);
      setQuoteFormError(null);

      const basePrice = validTiers[0].unitPrice;

      await addSupplierItem(selectedSupplier.id, {
        partNumber: quotePartNumber.trim(),
        supplierPartNumber: quoteSupplierSku.trim(),
        unitPrice: basePrice,
        stockAvailable: parseInt(quoteStock, 10) || 0,
        leadTimeDays: parseFloat(quoteLeadTime) || 3,
        minimumOrderQuantity: parseInt(quoteMoq, 10) || 1,
        priceTiers: validTiers,
      });

      setQuotePartNumber("");
      setQuoteSupplierSku("");
      setQuoteBasePrice("");
      setIsAddingQuote(false);
      toast.success("Quote Added", `Added custom volume quote for "${quotePartNumber}" under ${selectedSupplier.code}.`);

      const updated = await fetchSupplierItems(selectedSupplier.id);
      setSupplierItems(updated);
      await loadSuppliers();
    } catch (err: any) {
      setQuoteFormError(err.message || "Failed to add quote to catalog");
      toast.error("Quote Failed", err.message);
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const handleConfirmDeleteQuote = async () => {
    if (!selectedSupplier || !deletingQuoteItemId) return;

    try {
      setIsDeletingQuote(true);
      await deleteSupplierItem(selectedSupplier.id, deletingQuoteItemId);
      toast.success("Quote Deleted", "Catalog quote was removed.");
      setDeletingQuoteItemId(null);
      const updated = await fetchSupplierItems(selectedSupplier.id);
      setSupplierItems(updated);
    } catch (err: any) {
      toast.error("Delete Failed", err.message);
    } finally {
      setIsDeletingQuote(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.contactEmail && s.contactEmail.toLowerCase().includes(q))
    );
  });

  const getTierBadge = (score: number) => {
    if (score >= 95) return <Badge variant="tier-1">Tier 1 Preferred</Badge>;
    if (score >= 90) return <Badge variant="tier-2">Tier 2 Qualified</Badge>;
    return <Badge variant="tier-3">Tier 3 Monitored</Badge>;
  };

  return (
    <div className="min-h-screen bg-[#010102] text-[#f7f8f8]">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#23252a] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                Global Procurement & Vendor Matrix
              </span>
              <Badge variant="primary">{totalCount} Distributors</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8] sm:text-3xl mt-1">
              Supplier Matrix & Quotes
            </h1>
            <p className="text-xs text-[#8a8f98] mt-1 max-w-2xl">
              Multi-distributor catalog pricing, volume discount tiers (DigiKey, Mouser, LCSC), lead times, and dynamic reliability scorecards.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadSuppliers}
              isLoading={isLoading}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRegisteringSupplier(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Supplier</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#0f1011] p-3 rounded-xl border border-[#23252a]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8a8f98]" />
            <Input
              placeholder="Search distributors by name or code (e.g. DIGIKEY, MOUSER, LCSC)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-8"
            />
          </div>
          <span className="text-xs text-[#8a8f98]">
            {filteredSuppliers.length} active suppliers
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-[#0f1011] border border-[#23252a] animate-pulse" />
            ))}
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#23252a] bg-[#0f1011]/40 p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#141516] border border-[#23252a] text-[#8a8f98]">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#f7f8f8]">No Suppliers Found</h3>
            <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
              Register global distributors like DigiKey, Mouser, or LCSC to start comparing quotes.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsRegisteringSupplier(true)} className="mt-2">
              <Plus className="h-3.5 w-3.5" />
              <span>Register Supplier</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredSuppliers.map((sup) => {
              const isSelected = selectedSupplier?.id === sup.id;
              return (
                <Card
                  key={sup.id}
                  onClick={() => handleSelectSupplier(sup)}
                  className={`group cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#141516] border-[#5e6ad2] shadow-lg shadow-[#5e6ad2]/10 ring-1 ring-[#5e6ad2]/50"
                      : "hover:border-[#5e6ad2]/60 hover:shadow-sm"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#828fff] bg-[#14172e] px-2 py-0.5 rounded border border-[#282d5c]">
                            {sup.code}
                          </span>
                          <h3 className="text-sm font-semibold text-[#f7f8f8] group-hover:text-white transition-colors truncate max-w-[180px]">
                            {sup.name}
                          </h3>
                        </div>
                      </div>

                      {getTierBadge(sup.reliabilityScore)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0 text-xs">
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#010102] border border-[#23252a] p-2.5 text-[11px]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-[#8a8f98] uppercase tracking-wider">
                          Reliability
                        </span>
                        <div className="flex items-center gap-1 font-mono font-bold text-[#4ade80]">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{sup.reliabilityScore.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-[#8a8f98] uppercase tracking-wider">
                          Avg Lead Time
                        </span>
                        <div className="flex items-center gap-1 font-mono font-bold text-[#f7f8f8]">
                          <Clock className="h-3.5 w-3.5 text-[#5e6ad2]" />
                          <span>~{sup.leadTimeDaysAverage} Days</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#8a8f98] pt-1">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3 w-3" />
                        <span>{sup.paymentTerms} ({sup.currency})</span>
                      </div>

                      {sup.website && (
                        <a
                          href={sup.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-[#828fff] hover:underline"
                        >
                          <span>Portal</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <div className="border-t border-[#23252a]/60 pt-2.5 flex items-center justify-between text-[11px] text-[#8a8f98]">
                      <span>{sup.totalCatalogItems ?? 0} Catalog Items</span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingSupplier(sup);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#8a8f98] hover:text-[#f87171] transition-all"
                          title="Delete Supplier"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <span className="text-[#828fff] font-medium group-hover:underline">
                          Inspect Quotes ➔
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedSupplier && (
          <Card className="border-[#23252a] bg-[#0f1011] shadow-xl animate-in fade-in duration-100">
            <CardHeader className="border-b border-[#23252a] pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14172e] border border-[#282d5c] text-[#828fff]">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{selectedSupplier.name}</CardTitle>
                      <span className="font-mono text-xs font-bold text-[#828fff] bg-[#14172e] px-2 py-0.5 rounded border border-[#282d5c]">
                        {selectedSupplier.code}
                      </span>
                    </div>
                    <CardDescription className="mt-0.5">
                      Distributor Catalog Quotes • {supplierItems.length} Quoted Components
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setQuoteBasePrice("");
                      setCustomPriceTiers([
                        { minQuantity: 1, unitPrice: 0 },
                        { minQuantity: 50, unitPrice: 0 },
                        { minQuantity: 500, unitPrice: 0 },
                      ]);
                      setIsAddingQuote(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Catalog Quote</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => setSelectedSupplier(null)}
                    className="p-1.5 text-[#8a8f98] hover:text-white rounded-lg hover:bg-[#141516]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {isLoadingItems ? (
                <div className="p-8 text-center text-xs text-[#8a8f98]">
                  Loading catalog quotes...
                </div>
              ) : supplierItems.length === 0 ? (
                <div className="p-8 text-center space-y-2 border border-dashed border-[#23252a] rounded-xl bg-[#010102]">
                  <p className="text-xs text-[#8a8f98]">No catalog quotes recorded for {selectedSupplier.name}.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuoteBasePrice("");
                      setCustomPriceTiers([
                        { minQuantity: 1, unitPrice: 0 },
                        { minQuantity: 50, unitPrice: 0 },
                        { minQuantity: 500, unitPrice: 0 },
                      ]);
                      setIsAddingQuote(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add First Quote</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supplierItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-[#010102] border border-[#23252a] p-4 space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-[#f7f8f8]">
                            {item.partNumber}
                          </span>
                          <h5 className="text-xs text-[#8a8f98] line-clamp-1">{item.name}</h5>
                          <span className="text-[10px] font-mono text-[#5e6ad2]">
                            SKU: {item.supplierPartNumber}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Badge variant="primary">${item.unitPrice.toFixed(3)}</Badge>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingQuoteItemId(item.itemId);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[#8a8f98] hover:text-[#f87171] transition-all"
                            title="Delete Quote"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-lg bg-[#0f1011] border border-[#23252a] p-2.5 space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98] block">
                          Volume Price Breaks (Qty ➔ Price)
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                          {(item.priceTiers || []).map((tier, idx) => (
                            <div key={idx} className="rounded bg-[#141516] border border-[#23252a] p-1.5">
                              <span className="text-[#8a8f98] block">{tier.minQuantity}+ pcs</span>
                              <span className="font-bold text-[#4ade80] text-xs">${tier.unitPrice.toFixed(3)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] text-[#8a8f98] font-mono pt-1">
                        <div>
                          <span className="text-[#62666d] block uppercase">Stock</span>
                          <span className="text-[#f7f8f8]">{item.stockAvailable.toLocaleString()} pcs</span>
                        </div>
                        <div>
                          <span className="text-[#62666d] block uppercase">Lead Time</span>
                          <span className="text-[#f7f8f8]">~{item.leadTimeDays} Days</span>
                        </div>
                        <div>
                          <span className="text-[#62666d] block uppercase">MOQ</span>
                          <span className="text-[#f7f8f8]">{item.minimumOrderQuantity} pcs</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isRegisteringSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-100">
            <Card className="w-full max-w-md border-[#5e6ad2]/70 bg-[#0f1011] shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-[#5e6ad2]" />
                    <CardTitle>Register Global Supplier</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRegisteringSupplier(false)}
                    className="p-1 text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardDescription>
                  Add a major electronics distributor to the multi-quote comparison engine.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleCreateSupplier} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Supplier Name *
                    </label>
                    <Input
                      autoFocus
                      placeholder="e.g. DigiKey Electronics, Mouser"
                      value={newSupName}
                      onChange={(e) => setNewSupName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Distributor Code *
                      </label>
                      <Input
                        placeholder="e.g. DIGIKEY, MOUSER"
                        value={newSupCode}
                        onChange={(e) => setNewSupCode(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Average Lead Time (Days)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 2"
                        value={newSupLeadTime}
                        onChange={(e) => setNewSupLeadTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Contact Email
                    </label>
                    <Input
                      type="email"
                      placeholder="e.g. orders@distributor.com"
                      value={newSupEmail}
                      onChange={(e) => setNewSupEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Website Portal URL
                    </label>
                    <Input
                      type="url"
                      placeholder="e.g. https://www.digikey.com"
                      value={newSupWebsite}
                      onChange={(e) => setNewSupWebsite(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Initial Reliability Score (%)
                      </label>
                      <Input
                        type="number"
                        placeholder="95.0"
                        value={newSupScore}
                        onChange={(e) => setNewSupScore(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Payment Terms
                      </label>
                      <Input
                        placeholder="Net 30, Prepaid"
                        value={newSupPayment}
                        onChange={(e) => setNewSupPayment(e.target.value)}
                      />
                    </div>
                  </div>

                  {supplierFormError && (
                    <p className="text-[11px] text-[#f87171]">{supplierFormError}</p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#23252a]">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => setIsRegisteringSupplier(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={!newSupName.trim() || !newSupCode.trim()}
                      isLoading={isSubmittingSupplier}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Register Supplier</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {isAddingQuote && selectedSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-100">
            <Card className="w-full max-w-lg border-[#5e6ad2]/70 bg-[#0f1011] shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-[#5e6ad2]" />
                    <CardTitle>Add Custom Volume Quote ({selectedSupplier.code})</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingQuote(false)}
                    className="p-1 text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardDescription>
                  Specify exact custom prices for any order volume breaks.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleAddQuoteSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Master Part Number (MPN) *
                      </label>
                      <Input
                        autoFocus
                        placeholder="e.g. ESP32-WROOM-32E-N4"
                        value={quotePartNumber}
                        onChange={(e) => setQuotePartNumber(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Distributor SKU *
                      </label>
                      <Input
                        placeholder="e.g. DIGIKEY-ESP32-ND"
                        value={quoteSupplierSku}
                        onChange={(e) => setQuoteSupplierSku(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl bg-[#010102] border border-[#23252a] p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98] flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-[#5e6ad2]" />
                        <span>Volume Price Breaks (Custom Tiers)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAddTierRow}
                        className="text-[11px] font-medium text-[#828fff] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Tier</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {customPriceTiers.map((tier, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-28">
                            <span className="text-[10px] text-[#8a8f98] block mb-0.5">Min Qty</span>
                            <Input
                              type="number"
                              value={tier.minQuantity}
                              onChange={(e) => handleUpdateTierQuantity(idx, parseInt(e.target.value, 10) || 1)}
                              className="h-7 text-xs font-mono"
                            />
                          </div>

                          <div className="flex-1">
                            <span className="text-[10px] text-[#8a8f98] block mb-0.5">Unit Price ($)</span>
                            <Input
                              type="number"
                              step="0.001"
                              value={tier.unitPrice || ""}
                              onChange={(e) => handleUpdateTierPrice(idx, parseFloat(e.target.value) || 0)}
                              placeholder="0.000"
                              className="h-7 text-xs font-mono text-[#4ade80]"
                            />
                          </div>

                          {customPriceTiers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTierRow(idx)}
                              className="p-1 text-[#8a8f98] hover:text-[#f87171] transition-colors mt-4"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Stock Available
                      </label>
                      <Input
                        type="number"
                        placeholder="50000"
                        value={quoteStock}
                        onChange={(e) => setQuoteStock(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Lead Time (Days)
                      </label>
                      <Input
                        type="number"
                        placeholder="2"
                        value={quoteLeadTime}
                        onChange={(e) => setQuoteLeadTime(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        MOQ
                      </label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={quoteMoq}
                        onChange={(e) => setQuoteMoq(e.target.value)}
                      />
                    </div>
                  </div>

                  {quoteFormError && (
                    <p className="text-[11px] text-[#f87171]">{quoteFormError}</p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#23252a]">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => setIsAddingQuote(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={!quotePartNumber.trim()}
                      isLoading={isSubmittingQuote}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Save Custom Quote</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deletingSupplier}
          title="Delete Supplier"
          description={`Are you sure you want to permanently delete supplier "${deletingSupplier?.name}" and all associated catalog quotes?`}
          confirmLabel="Delete Supplier"
          isLoading={isDeletingSupplier}
          onConfirm={handleConfirmDeleteSupplier}
          onCancel={() => setDeletingSupplier(null)}
        />

        <ConfirmModal
          isOpen={!!deletingQuoteItemId}
          title="Delete Catalog Quote"
          description="Are you sure you want to delete this distributor pricing quote?"
          confirmLabel="Delete Quote"
          isLoading={isDeletingQuote}
          onConfirm={handleConfirmDeleteQuote}
          onCancel={() => setDeletingQuoteItemId(null)}
        />
      </main>
    </div>
  );
}
