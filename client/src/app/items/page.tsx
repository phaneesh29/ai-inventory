"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchItems, createItem, deleteItem, type Item } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Microchip,
  Search,
  Plus,
  RefreshCw,
  LayoutGrid,
  List,
  Copy,
  Check,
  Trash2,
  SlidersHorizontal,
  X,
} from "lucide-react";

export default function ComponentCatalogPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [copiedMpn, setCopiedMpn] = useState<string | null>(null);

  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isRegistering, setIsRegistering] = useState(false);
  const [newPartNumber, setNewPartNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Microcontroller");
  const [newUnit, setNewUnit] = useState("pcs");
  const [newDescription, setNewDescription] = useState("");
  const [newFootprint, setNewFootprint] = useState("");
  const [newManufacturer, setNewManufacturer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCatalog = async () => {
    try {
      setIsLoading(true);
      const res = await fetchItems({ limit: 100 });
      setItems(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      toast.error("Failed to load catalog", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ["All", ...Array.from(set)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        item.partNumber.toLowerCase().includes(searchLower) ||
        item.name.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        (item.specifications?.manufacturer &&
          String(item.specifications.manufacturer).toLowerCase().includes(searchLower));

      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  const handleCopyMpn = (mpn: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mpn);
    setCopiedMpn(mpn);
    toast.info("Copied to Clipboard", mpn);
    setTimeout(() => setCopiedMpn(null), 2000);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      setIsDeleting(true);
      await deleteItem(deletingItem.id);
      toast.success("Component Removed", `"${deletingItem.partNumber}" was deleted.`);
      if (selectedItem?.id === deletingItem.id) setSelectedItem(null);
      setDeletingItem(null);
      await loadCatalog();
    } catch (err: any) {
      toast.error("Delete Failed", err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartNumber.trim() || !newName.trim() || !newCategory.trim()) {
      setFormError("Part number, name, and category are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const specifications: Record<string, any> = {};
      if (newManufacturer.trim()) specifications.manufacturer = newManufacturer.trim();
      if (newFootprint.trim()) specifications.packageFootprint = newFootprint.trim();

      const created = await createItem({
        partNumber: newPartNumber.trim(),
        name: newName.trim(),
        category: newCategory.trim(),
        unit: newUnit.trim() || "pcs",
        description: newDescription.trim() || undefined,
        specifications,
      });

      setNewPartNumber("");
      setNewName("");
      setNewDescription("");
      setNewFootprint("");
      setNewManufacturer("");
      setIsRegistering(false);
      toast.success("Component Registered", `"${created.partNumber}" added to catalog.`);
      await loadCatalog();
    } catch (err: any) {
      setFormError(err.message || "Failed to register component");
      toast.error("Registration Failed", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010102] text-[#f7f8f8]">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#23252a] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98]">
                Enterprise Hardware Repository
              </span>
              <Badge variant="primary">{totalCount} Master Parts</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8] sm:text-3xl mt-1">
              Master Component Catalog
            </h1>
            <p className="text-xs text-[#8a8f98] mt-1 max-w-2xl">
              Centralized electronics parts master with parametric specifications, pinouts, footprint dimensions, and electrical tolerances.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadCatalog}
              isLoading={isLoading}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRegistering(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Component</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0f1011] p-3 rounded-xl border border-[#23252a]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8a8f98]" />
            <Input
              placeholder="Search by Part Number (MPN), Name, or Manufacturer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-8"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-[#010102] border border-[#23252a] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "grid" ? "bg-[#141516] text-[#5e6ad2]" : "text-[#8a8f98] hover:text-[#f7f8f8]"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "table" ? "bg-[#141516] text-[#5e6ad2]" : "text-[#8a8f98] hover:text-[#f7f8f8]"
                }`}
                title="Table View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#5e6ad2] text-white shadow-sm shadow-[#5e6ad2]/20"
                  : "bg-[#0f1011] hover:bg-[#141516] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#23252a]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-[#0f1011] border border-[#23252a] animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#23252a] bg-[#0f1011]/40 p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#141516] border border-[#23252a] text-[#8a8f98]">
              <Microchip className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#f7f8f8]">No Components Found</h3>
            <p className="text-xs text-[#8a8f98] max-w-sm mx-auto">
              {searchQuery || selectedCategory !== "All"
                ? "No electronic components match your filter criteria."
                : "Register your first component in the master catalog."}
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsRegistering(true)} className="mt-2">
              <Plus className="h-3.5 w-3.5" />
              <span>Register Component</span>
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const specs = item.specifications || {};
              const manufacturer = specs.manufacturer || "Standard";
              const footprint = specs.packageFootprint || "SMD";

              return (
                <Card
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group cursor-pointer hover:border-[#5e6ad2]/70 hover:shadow-lg hover:shadow-[#5e6ad2]/10 transition-all duration-150 flex flex-col justify-between"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#f7f8f8] group-hover:text-white transition-colors truncate">
                            {item.partNumber}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyMpn(item.partNumber, e)}
                            className="text-[#8a8f98] hover:text-[#5e6ad2] transition-colors p-0.5"
                            title="Copy MPN"
                          >
                            {copiedMpn === item.partNumber ? (
                              <Check className="h-3 w-3 text-[#4ade80]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <h4 className="text-xs font-medium text-[#8a8f98] line-clamp-1">{item.name}</h4>
                      </div>

                      <Badge variant="neutral" className="shrink-0 text-[10px]">
                        {item.category}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0 text-xs">
                    {item.description && (
                      <p className="text-[11px] text-[#8a8f98] line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="rounded bg-[#141516] border border-[#23252a] px-2 py-0.5 text-[10px] font-mono text-[#d0d6e0]">
                        {manufacturer}
                      </span>
                      <span className="rounded bg-[#141516] border border-[#23252a] px-2 py-0.5 text-[10px] font-mono text-[#8a8f98]">
                        {footprint}
                      </span>
                      {specs.voltage && (
                        <span className="rounded bg-[#14172e] border border-[#282d5c] px-2 py-0.5 text-[10px] font-mono text-[#828fff]">
                          {specs.voltage}
                        </span>
                      )}
                      {specs.tolerance && (
                        <span className="rounded bg-[#0f1f14] border border-[#1b3d26] px-2 py-0.5 text-[10px] font-mono text-[#4ade80]">
                          {specs.tolerance}
                        </span>
                      )}
                      {specs.clockSpeed && (
                        <span className="rounded bg-[#1f1a0e] border border-[#3d3319] px-2 py-0.5 text-[10px] font-mono text-[#facc15]">
                          {specs.clockSpeed}
                        </span>
                      )}
                    </div>

                    <div className="border-t border-[#23252a]/60 pt-2.5 flex items-center justify-between text-[11px] text-[#8a8f98]">
                      <span className="font-mono text-[10px] text-[#62666d]">Unit: {item.unit}</span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingItem(item);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#8a8f98] hover:text-[#f87171] transition-all"
                          title="Delete Component"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <span className="text-[#828fff] text-[11px] font-medium group-hover:underline">
                          View Specs ➔
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-[#23252a] bg-[#0f1011] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#23252a] bg-[#141516] text-[#8a8f98] font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Part Number (MPN)</th>
                  <th className="px-4 py-3">Component Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Manufacturer</th>
                  <th className="px-4 py-3">Footprint</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23252a]/60">
                {filteredItems.map((item) => {
                  const specs = item.specifications || {};
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="hover:bg-[#141516] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-[#f7f8f8]">{item.partNumber}</td>
                      <td className="px-4 py-3 text-[#d0d6e0] max-w-xs truncate">{item.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral">{item.category}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[#8a8f98]">{specs.manufacturer || "Standard"}</td>
                      <td className="px-4 py-3 font-mono text-[#8a8f98]">{specs.packageFootprint || "SMD"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingItem(item);
                          }}
                          className="p-1 text-[#8a8f98] hover:text-[#f87171] transition-colors"
                          title="Delete Component"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {isRegistering && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-100">
            <Card className="w-full max-w-lg border-[#5e6ad2]/70 bg-[#0f1011] shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-[#5e6ad2]" />
                    <CardTitle>Register Master Component</CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    className="p-1 text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <CardDescription>
                  Add a standardized electronic part with manufacturer specs to the enterprise catalog.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Manufacturer Part Number (MPN) *
                    </label>
                    <Input
                      autoFocus
                      placeholder="e.g. ESP32-WROOM-32E-N4 or RC0805FR-0710KL"
                      value={newPartNumber}
                      onChange={(e) => setNewPartNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Component Full Name *
                    </label>
                    <Input
                      placeholder="e.g. Espressif ESP32 4MB Flash Module"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Category *
                      </label>
                      <Input
                        placeholder="e.g. Microcontroller, Resistor"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Unit
                      </label>
                      <Input
                        placeholder="pcs, reel, meter"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Manufacturer
                      </label>
                      <Input
                        placeholder="e.g. Espressif, Yageo, Vishay"
                        value={newManufacturer}
                        onChange={(e) => setNewManufacturer(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#d0d6e0]">
                        Package / Footprint
                      </label>
                      <Input
                        placeholder="e.g. 0805, LQFP-48, SMD-38"
                        value={newFootprint}
                        onChange={(e) => setNewFootprint(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#d0d6e0]">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Component specifications, architecture, and pinout details..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full rounded-lg border border-[#23252a] bg-[#0f1011] p-2.5 text-xs text-[#f7f8f8] placeholder:text-[#8a8f98] focus:border-[#5e6ad2] focus:outline-none focus:ring-1 focus:ring-[#5e6ad2]/50"
                    />
                  </div>

                  {formError && (
                    <p className="text-[11px] text-[#f87171]">{formError}</p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#23252a]">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => setIsRegistering(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={!newPartNumber.trim() || !newName.trim()}
                      isLoading={isSubmitting}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Register Item</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-100">
            <Card className="w-full max-w-xl border-[#23252a] bg-[#0f1011] shadow-2xl">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">
                        {selectedItem.partNumber}
                      </span>
                      <Badge variant="primary">{selectedItem.category}</Badge>
                    </div>
                    <CardTitle className="text-xs font-normal text-[#8a8f98]">
                      {selectedItem.name}
                    </CardTitle>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="p-1 text-[#8a8f98] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-xs">
                {selectedItem.description && (
                  <div className="rounded-lg bg-[#010102] border border-[#23252a] p-3 text-[#d0d6e0] leading-relaxed">
                    {selectedItem.description}
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8f98] flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-[#5e6ad2]" />
                    <span>Parametric Specifications</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#010102] border border-[#23252a] p-3">
                    {Object.entries(selectedItem.specifications || {}).length === 0 ? (
                      <p className="col-span-2 text-[11px] text-[#8a8f98]">No specifications recorded.</p>
                    ) : (
                      Object.entries(selectedItem.specifications).map(([key, val]) => (
                        <div key={key} className="space-y-0.5">
                          <span className="text-[10px] font-medium text-[#8a8f98] uppercase tracking-wider">
                            {key}
                          </span>
                          <p className="font-mono text-[11px] text-[#f7f8f8] truncate">
                            {String(val)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#8a8f98] pt-2 border-t border-[#23252a]">
                  <span className="font-mono text-[10px]">ID: {selectedItem.id}</span>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedItem(null)}>
                    Close Specification
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deletingItem}
          title="Delete Component"
          description={`Are you sure you want to permanently remove "${deletingItem?.partNumber}" from the master catalog?`}
          confirmLabel="Delete Component"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingItem(null)}
        />
      </main>
    </div>
  );
}
