"use client";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  primary_unit: string;
  standard_cost: number;
}

interface Godown {
  id: string;
  name: string;
  code: string | null;
}

interface BOM {
  id: string;
  name: string;
  finished_item_id: string;
  output_quantity: number;
}

interface SourceItem {
  product_id: string;
  product_name?: string;
  quantity: number;
  rate: number;
  godown_id: string;
  unit?: string;
}

interface DestinationItem {
  product_id: string;
  product_name?: string;
  quantity: number;
  rate: number;
  godown_id: string;
  unit?: string;
}

const journalTypes = [
  { value: "transfer", label: "Inter-Godown Transfer", description: "Move stock from one location to another" },
  { value: "manufacturing", label: "Manufacturing/Assembly", description: "Consume raw materials to produce finished goods" },
  { value: "disassembly", label: "Disassembly", description: "Break down finished goods into components" },
  { value: "repackaging", label: "Repackaging", description: "Repack product A as product B" },
  { value: "conversion", label: "Product Conversion", description: "Convert/sell product A as product B" },
  { value: "adjustment", label: "Stock Adjustment", description: "Adjust stock for damage, expiry, samples" },
];

export default function NewStockJournalPage() {
  const { company } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedType = searchParams.get("type") || "";

  const [journalType, setJournalType] = useState(preselectedType);
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState("");
  const [notes, setNotes] = useState("");
  const [fromGodownId, setFromGodownId] = useState("");
  const [toGodownId, setToGodownId] = useState("");
  const [bomId, setBomId] = useState("");
  const [outputQuantity, setOutputQuantity] = useState<number>(1);
  const [additionalCost, setAdditionalCost] = useState<number>(0);
  
  const [sourceItems, setSourceItems] = useState<SourceItem[]>([]);
  const [destinationItems, setDestinationItems] = useState<DestinationItem[]>([]);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("employee_token") || localStorage.getItem("access_token") : null;

  // Load products and godowns
  useEffect(() => {
    const fetchData = async () => {
      const token = getToken();
      if (!company?.id || !token) return;

      setLoading(true);
      try {
        const [productsRes, godownsRes, bomsRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/products`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/inventory/godowns`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/inventory/bom`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(Array.isArray(data) ? data : data.items || []);
        }
        if (godownsRes.ok) {
          const data = await godownsRes.json();
          setGodowns(Array.isArray(data) ? data : data.items || []);
        }
        if (bomsRes.ok) {
          const data = await bomsRes.json();
          setBoms(Array.isArray(data) ? data : data.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [company?.id]);

  const addSourceItem = () => {
    setSourceItems([
      ...sourceItems,
      { product_id: "", quantity: 1, rate: 0, godown_id: fromGodownId || "" },
    ]);
  };

  const addDestinationItem = () => {
    setDestinationItems([
      ...destinationItems,
      { product_id: "", quantity: 1, rate: 0, godown_id: toGodownId || "" },
    ]);
  };

  const updateSourceItem = (index: number, field: keyof SourceItem, value: any) => {
    const updated = [...sourceItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill rate from product
    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].rate = product.standard_cost || 0;
        updated[index].unit = product.primary_unit;
        updated[index].product_name = product.name;
      }
    }
    
    setSourceItems(updated);
  };

  const updateDestinationItem = (index: number, field: keyof DestinationItem, value: any) => {
    const updated = [...destinationItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill rate from product
    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].rate = product.standard_cost || 0;
        updated[index].unit = product.primary_unit;
        updated[index].product_name = product.name;
      }
    }
    
    setDestinationItems(updated);
  };

  const removeSourceItem = (index: number) => {
    setSourceItems(sourceItems.filter((_, i) => i !== index));
  };

  const removeDestinationItem = (index: number) => {
    setDestinationItems(destinationItems.filter((_, i) => i !== index));
  };

  // For simple transfers, auto-sync destination item
  useEffect(() => {
    if (journalType === "transfer" && sourceItems.length === 1) {
      setDestinationItems([
        {
          product_id: sourceItems[0].product_id,
          product_name: sourceItems[0].product_name,
          quantity: sourceItems[0].quantity,
          rate: sourceItems[0].rate,
          godown_id: toGodownId || "",
          unit: sourceItems[0].unit,
        },
      ]);
    }
  }, [journalType, sourceItems, toGodownId]);

  const handleSave = async (autoConfirm: boolean = false) => {
    const token = getToken();
    if (!company?.id || !token) return;

    if (!journalType) {
      setError("Please select a journal type");
      return;
    }

    // Validation
    if (journalType === "transfer" || journalType === "conversion" || journalType === "repackaging") {
      if (sourceItems.length === 0) {
        setError("Please add at least one source item");
        return;
      }
      if (destinationItems.length === 0) {
        setError("Please add at least one destination item");
        return;
      }
    } else if (journalType === "manufacturing" && bomId) {
      // Using BOM - will be handled differently
    } else if (journalType === "adjustment") {
      if (sourceItems.length === 0 && destinationItems.length === 0) {
        setError("Please add items to adjust");
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      let url: string;
      let body: any;

      // Use quick endpoints for simple operations
      if (journalType === "transfer" && sourceItems.length === 1 && fromGodownId && toGodownId) {
        url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals/transfer`;
        body = {
          product_id: sourceItems[0].product_id,
          quantity: sourceItems[0].quantity,
          from_godown_id: fromGodownId,
          to_godown_id: toGodownId,
          voucher_date: voucherDate ? new Date(voucherDate).toISOString() : null,
          narration: narration || null,
          auto_confirm: autoConfirm,
        };
      } else if (journalType === "conversion" && sourceItems.length === 1 && destinationItems.length === 1) {
        url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals/conversion`;
        body = {
          source_product_id: sourceItems[0].product_id,
          source_quantity: sourceItems[0].quantity,
          destination_product_id: destinationItems[0].product_id,
          destination_quantity: destinationItems[0].quantity,
          godown_id: fromGodownId || toGodownId || null,
          voucher_date: voucherDate ? new Date(voucherDate).toISOString() : null,
          narration: narration || null,
          auto_confirm: autoConfirm,
        };
      } else if (journalType === "manufacturing" && bomId) {
        url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals/manufacturing`;
        body = {
          bom_id: bomId,
          output_quantity: outputQuantity,
          godown_id: toGodownId || null,
          voucher_date: voucherDate ? new Date(voucherDate).toISOString() : null,
          narration: narration || null,
          additional_cost: additionalCost,
          auto_confirm: autoConfirm,
        };
      } else if (journalType === "adjustment" && (sourceItems.length > 0 || destinationItems.length > 0)) {
        // For adjustment, if only source items -> decrease, if only dest items -> increase
        if (sourceItems.length > 0 && destinationItems.length === 0) {
          url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals/adjustment`;
          body = {
            product_id: sourceItems[0].product_id,
            quantity: sourceItems[0].quantity,
            adjustment_type: "decrease",
            godown_id: sourceItems[0].godown_id || null,
            reason: narration || null,
            voucher_date: voucherDate ? new Date(voucherDate).toISOString() : null,
            auto_confirm: autoConfirm,
          };
        } else if (destinationItems.length > 0 && sourceItems.length === 0) {
          url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals/adjustment`;
          body = {
            product_id: destinationItems[0].product_id,
            quantity: destinationItems[0].quantity,
            adjustment_type: "increase",
            godown_id: destinationItems[0].godown_id || null,
            reason: narration || null,
            voucher_date: voucherDate ? new Date(voucherDate).toISOString() : null,
            auto_confirm: autoConfirm,
          };
        } else {
          // Mixed adjustment - use generic endpoint
          url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals`;
          body = {
            journal_type: journalType,
            source_items: sourceItems.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              rate: item.rate,
              godown_id: item.godown_id || null,
            })),
            destination_items: destinationItems.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              rate: item.rate,
              godown_id: item.godown_id || null,
            })),
            voucher_date: voucherDate ? new Date(voucherDate).toISOString() : null,
            from_godown_id: fromGodownId || null,
            to_godown_id: toGodownId || null,
            narration: narration || null,
            notes: notes || null,
            additional_cost: additionalCost,
            auto_confirm: autoConfirm,
          };
        }
      } else {
        // Use generic endpoint
        url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals`;
        body = {
          journal_type: journalType,
          source_items: sourceItems.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            rate: item.rate,
            godown_id: item.godown_id || null,
          })),
          destination_items: destinationItems.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            rate: item.rate,
            godown_id: item.godown_id || null,
          })),
          voucher_date: voucherDate ? new Date(voucherDate).toISOString() : null,
          from_godown_id: fromGodownId || null,
          to_godown_id: toGodownId || null,
          bom_id: bomId || null,
          narration: narration || null,
          notes: notes || null,
          additional_cost: additionalCost,
          auto_confirm: autoConfirm,
        };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/inventory/stock-journal/${result.id}`);
      } else {
        const err = await response.json();
        setError(err.detail || "Failed to create stock journal");
      }
    } catch (err) {
      console.error("Save error:", err);
      setError("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const getTypeDescription = () => {
    const type = journalTypes.find((t) => t.value === journalType);
    return type?.description || "";
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark dark:text-white">New Stock Journal</h1>
        <p className="text-sm text-dark-6">Create a stock journal entry for transfers, manufacturing, or adjustments</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Journal Type Selection */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Journal Type</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {journalTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  setJournalType(type.value);
                  setSourceItems([]);
                  setDestinationItems([]);
                }}
                className={cn(
                  "rounded-lg border p-4 text-left transition",
                  journalType === type.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-stroke hover:border-primary/50 dark:border-dark-3"
                )}
              >
                <p className="font-medium text-dark dark:text-white">{type.label}</p>
                <p className="mt-1 text-xs text-dark-6">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Basic Details */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Voucher Date
              </label>
              <input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Narration/Description
              </label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Enter description..."
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
              />
            </div>
          </div>
        </div>

        {/* Transfer-specific: Godown Selection */}
        {journalType === "transfer" && (
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Godown Selection</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  From Godown
                </label>
                <select
                  value={fromGodownId}
                  onChange={(e) => setFromGodownId(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                >
                  <option value="">Select source godown</option>
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.code ? `(${g.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  To Godown
                </label>
                <select
                  value={toGodownId}
                  onChange={(e) => setToGodownId(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                >
                  <option value="">Select destination godown</option>
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.code ? `(${g.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Manufacturing: BOM Selection */}
        {journalType === "manufacturing" && (
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Bill of Materials</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Select BOM
                </label>
                <select
                  value={bomId}
                  onChange={(e) => setBomId(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                >
                  <option value="">Select Bill of Materials</option>
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Output Quantity
                </label>
                <input
                  type="number"
                  value={outputQuantity}
                  onChange={(e) => setOutputQuantity(Number(e.target.value))}
                  min="1"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Godown
                </label>
                <select
                  value={toGodownId}
                  onChange={(e) => setToGodownId(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                >
                  <option value="">Select godown</option>
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.code ? `(${g.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Additional Cost (Manufacturing Overhead)
                </label>
                <input
                  type="number"
                  value={additionalCost}
                  onChange={(e) => setAdditionalCost(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>
            </div>
          </div>
        )}

        {/* Source Items (Consumption) */}
        {journalType && journalType !== "manufacturing" && (
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark dark:text-white">
                {journalType === "adjustment" ? "Stock Decrease (Outward)" : "Source Items (Consumption)"}
              </h2>
              <button
                onClick={addSourceItem}
                className="text-sm text-primary hover:underline"
              >
                + Add Item
              </button>
            </div>
            
            {sourceItems.length === 0 ? (
              <p className="text-sm text-dark-6 py-4 text-center">
                No items added. Click "+ Add Item" to add products.
              </p>
            ) : (
              <div className="space-y-3">
                {sourceItems.map((item, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-dark-6">Product</label>
                      <select
                        value={item.product_id}
                        onChange={(e) => updateSourceItem(index, "product_id", e.target.value)}
                        className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3"
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.current_stock || 0})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="mb-1 block text-xs text-dark-6">Qty</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateSourceItem(index, "quantity", Number(e.target.value))}
                        min="0.001"
                        step="0.001"
                        className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3"
                      />
                    </div>
                    <div className="w-24">
                      <label className="mb-1 block text-xs text-dark-6">Rate</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateSourceItem(index, "rate", Number(e.target.value))}
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3"
                      />
                    </div>
                    {godowns.length > 0 && journalType !== "transfer" && (
                      <div className="w-40">
                        <label className="mb-1 block text-xs text-dark-6">Godown</label>
                        <select
                          value={item.godown_id}
                          onChange={(e) => updateSourceItem(index, "godown_id", e.target.value)}
                          className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3"
                        >
                          <option value="">Select</option>
                          {godowns.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      onClick={() => removeSourceItem(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded dark:hover:bg-red-900/30"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Destination Items (Production) - Show for all types except simple adjustment decrease */}
        {journalType && journalType !== "manufacturing" && journalType !== "transfer" && (
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark dark:text-white">
                {journalType === "adjustment" ? "Stock Increase (Inward)" : "Destination Items (Production)"}
              </h2>
              <button
                onClick={addDestinationItem}
                className="text-sm text-primary hover:underline"
              >
                + Add Item
              </button>
            </div>
            
            {destinationItems.length === 0 ? (
              <p className="text-sm text-dark-6 py-4 text-center">
                No items added. Click "+ Add Item" to add products.
              </p>
            ) : (
              <div className="space-y-3">
                {destinationItems.map((item, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-dark-6">Product</label>
                      <select
                        value={item.product_id}
                        onChange={(e) => updateDestinationItem(index, "product_id", e.target.value)}
                        className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3"
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="mb-1 block text-xs text-dark-6">Qty</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateDestinationItem(index, "quantity", Number(e.target.value))}
                        min="0.001"
                        step="0.001"
                        className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3"
                      />
                    </div>
                    <div className="w-24">
                      <label className="mb-1 block text-xs text-dark-6">Rate</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateDestinationItem(index, "rate", Number(e.target.value))}
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3"
                      />
                    </div>
                    {godowns.length > 0 && (
                      <div className="w-40">
                        <label className="mb-1 block text-xs text-dark-6">Godown</label>
                        <select
                          value={item.godown_id}
                          onChange={(e) => updateDestinationItem(index, "godown_id", e.target.value)}
                          className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3"
                        >
                          <option value="">Select</option>
                          {godowns.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      onClick={() => removeDestinationItem(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded dark:hover:bg-red-900/30"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Additional Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Enter any additional notes..."
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-stroke px-6 py-2.5 font-medium transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !journalType}
            className="rounded-lg border border-primary px-6 py-2.5 font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !journalType}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
