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
} from "@/services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Truck,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Mail,
  Trash2,
  Clock,
  ShieldCheck,
  Building2,
  TrendingUp,
  Layers,
  X,
  CreditCard,
  DollarSign,
  Package,
} from "lucide-react";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierItems, setSupplierItems] = useState<SupplierItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

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
  const [quoteUnitPrice, setQuoteUnitPrice] = useState("");
  const [quoteStock, setQuoteStock] = useState("1000");
  const [quoteLeadTime, setQuoteLeadTime] = useState("3");
  const [quoteMoq, setQuoteMoq] = useState("1");
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [quoteFormError, setQuoteFormError] = useState<string | null>(null);

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchSuppliers({ limit: 50 });
      setSuppliers(res.suppliers);
      setTotalCount(res.total);
    } catch (err: any) {
      setError(err.message || "Failed to load suppliers");
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
      console.error("Failed to load catalog items for supplier:", err);
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

      await createSupplier({
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
      await loadSuppliers();
    } catch (err: any) {
      setSupplierFormError(err.message || "Failed to create supplier");
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  const handleDeleteSupplier = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Remove supplier "${name}" from matrix?`)) {
      try {
        await deleteSupplier(id);
        if (selectedSupplier?.id === id) {
          setSelectedSupplier(null);
          setSupplierItems([]);
        }
        await loadSuppliers();
      } catch (err: any) {
        alert(err.message || "Failed to delete supplier");
      }
    }
  };

  const handleAddQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    if (!quotePartNumber.trim() || !quoteSupplierSku.trim() || !quoteUnitPrice.trim()) {
      setQuoteFormError("Part number, SKU, and unit price are required.");
      return;
    }

    try {
      setIsSubmittingQuote(true);
      setQuoteFormError(null);

      const basePrice = parseFloat(quoteUnitPrice);
      const priceTiers = [
        { minQuantity: 1, unitPrice: basePrice },
        { minQuantity: 50, unitPrice: Number((basePrice * 0.9).toFixed(3)) },
        { minQuantity: 500, unitPrice: Number((basePrice * 0.8).toFixed(3)) },
      ];

      await addSupplierItem(selectedSupplier.id, {
        partNumber: quotePartNumber.trim(),
        supplierPartNumber: quoteSupplierSku.trim(),
        unitPrice: basePrice,
        stockAvailable: parseInt(quoteStock, 10) || 0,
        leadTimeDays: parseFloat(quoteLeadTime) || 3,
        minimumOrderQuantity: parseInt(quoteMoq, 10) || 1,
        priceTiers,
      });

      setQuotePartNumber("");
      setQuoteSupplierSku("");
      setQuoteUnitPrice("");
      setIsAddingQuote(false);

      const updated = await fetchSupplierItems(selectedSupplier.id);
      setSupplierItems(updated);
      await loadSuppliers();
    } catch (err: any) {
      setQuoteFormError(err.message || "Failed to add quote to catalog");
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const handleDeleteQuote = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!selectedSupplier) return;
    if (confirm("Remove this catalog quote?")) {
      try {
        await deleteSupplierItem(selectedSupplier.id, itemId);
        const updated = await fetchSupplierItems(selectedSupplier.id);
        setSupplierItems(updated);
      } catch (err: any) {
        alert(err.message || "Failed to delete catalog item");
      }
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

        {error && (
          <div className="rounded-xl bg-[#241414] border border-[#451e1e] p-4 text-xs text-[#f87171] flex items-center justify-between">
            <span>{error}</span>
            <Button variant="danger" size="sm" onClick={loadSuppliers}>
              Retry
            </Button>
          </div>
        )}

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
                          onClick={(e) => handleDeleteSupplier(e, sup.id, sup.name)}
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
                    onClick={() => setIsAddingQuote(true)}
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
                    onClick={() => setIsAddingQuote(true)}
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
                            onClick={(e) => handleDeleteQuote(e, item.itemId)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[#8a8f98] hover:text-[#f87171] transition-all"
                            title="Delete Quote"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-lg bg-[#0f1011] border border-[#23252a] p-2.5 space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98] block">
                          Volume Price Breaks
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                          {(item.priceTiers || []).map((tier, idx) => (
                            <div key={idx} className="rounded bg-[#141516] border border-[#23252a] p-1">
                              <span className="text-[#8a8f98] block">{tier.minQuantity}+ pcs</span>
                              <span className="font-bold text-[#4ade80]">${tier.unitPrice.toFixed(3)}</span>
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
            <Card className="w-full max-w-md border-[#5e6ad2]/70 bg-[#0f1011] shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-[#5e6ad2]" />
                    <CardTitle>Add Quote for {selectedSupplier.code}</CardTitle>
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
                  Link a master component with distributor pricing and tiered discounts.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleAddQuoteSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Master Part Number (MPN) *
                    </label>
                    <Input
                      autoFocus
                      placeholder="e.g. ESP32-WROOM-32E-N4 or SSD1306-0.96-OLED-I2C"
                      value={quotePartNumber}
                      onChange={(e) => setQuotePartNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Distributor SKU / Part Number *
                    </label>
                    <Input
                      placeholder="e.g. DIGIKEY-ESP32-32E-ND"
                      value={quoteSupplierSku}
                      onChange={(e) => setQuoteSupplierSku(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Unit Base Price ($) *
                      </label>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="e.g. 2.10"
                        value={quoteUnitPrice}
                        onChange={(e) => setQuoteUnitPrice(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Stock Available
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 50000"
                        value={quoteStock}
                        onChange={(e) => setQuoteStock(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Lead Time (Days)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 2"
                        value={quoteLeadTime}
                        onChange={(e) => setQuoteLeadTime(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Minimum Order Qty (MOQ)
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 1"
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
                      disabled={!quotePartNumber.trim() || !quoteUnitPrice.trim()}
                      isLoading={isSubmittingQuote}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Save Quote</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
