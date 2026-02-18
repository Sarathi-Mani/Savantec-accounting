"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { vendorsApi, productsApi } from "@/services/api";
import api from "@/services/api";

interface Vendor {
  id: string;
  name: string;
  gstin?: string;
}

interface Product {
  id: string;
  name: string;
  purchase_price?: number;
  unit_price?: number;
  gst_rate?: number | string;
}

interface LineItem {
  product_id: string;
  product_name: string;
  quantity: number;
  rate: number;
  gst_rate: number;
  amount: number;
}

type CurrencyOption = {
  code: string;
  label: string;
  symbol: string;
  defaultRate: number;
};

export default function NewPurchaseInvoicePage() {
  const { company } = useAuth();
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([
    { code: "INR", label: "Indian Rupee", symbol: "Rs. ", defaultRate: 1 },
    { code: "USD", label: "US Dollar", symbol: "$", defaultRate: 83.5 },
    { code: "EUR", label: "Euro", symbol: "EUR ", defaultRate: 89.2 },
    { code: "GBP", label: "British Pound", symbol: "GBP ", defaultRate: 104.8 },
    { code: "AED", label: "UAE Dirham", symbol: "AED ", defaultRate: 22.7 },
  ]);
  const [showAddCurrencyModal, setShowAddCurrencyModal] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: "", name: "" });
  
  const [formData, setFormData] = useState({
    vendor_id: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    currency: "INR",
    exchange_rate: 1,
    notes: "",
  });
  const [exchangeRateInput, setExchangeRateInput] = useState("1");
  
  const [items, setItems] = useState<LineItem[]>([
    { product_id: "", product_name: "", quantity: 1, rate: 0, gst_rate: 18, amount: 0 }
  ]);

  useEffect(() => {
    if (company?.id) {
      fetchVendors();
      fetchProducts();
    }
  }, [company]);

  const fetchVendors = async () => {
    if (!company?.id) return;
    try {
      const data = await vendorsApi.list(company.id, { page_size: 100 });
      setVendors(((data as any).vendors || data.customers || []) as Vendor[]);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      setVendors([]);
    }
  };

  const fetchProducts = async () => {
    if (!company?.id) return;
    try {
      const data = await productsApi.list(company.id, { page_size: 100 });
      setProducts((data.products || []) as unknown as Product[]);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };

  const addItem = () => {
    setItems([...items, { product_id: "", product_name: "", quantity: 1, rate: 0, gst_rate: 18, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "product_id") {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].rate = product.purchase_price || product.unit_price || 0;
        newItems[index].gst_rate = typeof product.gst_rate === 'string' ? parseFloat(product.gst_rate) || 0 : product.gst_rate || 0;
      }
    }
    
    const qty = Number(newItems[index].quantity) || 0;
    const rate = Number(newItems[index].rate) || 0;
    newItems[index].amount = qty * rate;
    setItems(newItems);
  };

  const handleCurrencyChange = (currencyCode: string) => {
    if (currencyCode === "add_new") {
      setShowAddCurrencyModal(true);
      return;
    }

    const selected = currencies.find((c) => c.code === currencyCode);
    setFormData((prev) => ({
      ...prev,
      currency: currencyCode,
      exchange_rate: selected?.defaultRate || 1,
    }));
    setExchangeRateInput(String(selected?.defaultRate || 1));
  };

  const handleSaveCurrency = () => {
    const code = newCurrency.code.trim().toUpperCase();
    const name = newCurrency.name.trim();

    if (!code || !name) {
      alert("Please fill all currency fields");
      return;
    }

    if (currencies.some((currency) => currency.code === code)) {
      alert("Currency code already exists");
      return;
    }

    const addedCurrency: CurrencyOption = {
      code,
      label: name,
      symbol: `${code} `,
      defaultRate: 1,
    };

    setCurrencies((prev) => [...prev, addedCurrency]);
    setFormData((prev) => ({ ...prev, currency: code, exchange_rate: 1 }));
    setExchangeRateInput("1");
    setNewCurrency({ code: "", name: "" });
    setShowAddCurrencyModal(false);
  };

  const currencyPrefix =
    currencies.find((c) => c.code === formData.currency)?.symbol || `${formData.currency} `;

  const formatAmount = (amount: number) =>
    `${currencyPrefix}${(Number(amount) || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = () => {
    return items.reduce((sum, item) => sum + (item.amount * item.gst_rate / 100), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post(
        `/companies/${company?.id}/purchases`,
        {
          ...formData,
          items: items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            rate: item.rate,
            gst_rate: item.gst_rate,
          }))
        }
      );
      router.push("/purchase/invoices");
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert("Error creating invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showAddCurrencyModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-dark">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">Add New Currency</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Currency Code <span className="text-meta-1">*</span>
                </label>
                <input
                  type="text"
                  value={newCurrency.code}
                  onChange={(e) => setNewCurrency((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                  placeholder="e.g., USD"
                  maxLength={3}
                />
              </div>

              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Currency Name <span className="text-meta-1">*</span>
                </label>
                <input
                  type="text"
                  value={newCurrency.name}
                  onChange={(e) => setNewCurrency((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                  placeholder="e.g., US Dollar"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddCurrencyModal(false);
                  setNewCurrency({ code: "", name: "" });
                }}
                className="rounded border border-stroke px-6 py-2 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCurrency}
                className="rounded bg-primary px-6 py-2 font-medium text-gray hover:bg-opacity-90"
              >
                Add Currency
              </button>
            </div>
          </div>
        </div>
      )}

      <Breadcrumb pageName="Create Purchase Invoice" />

      <form onSubmit={handleSubmit}>
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">Invoice Details</h3>
          </div>
          <div className="p-6.5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Vendor <span className="text-meta-1">*</span>
                </label>
                <select
                  value={formData.vendor_id}
                  onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                  required
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Invoice Number <span className="text-meta-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  required
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                />
              </div>
              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Invoice Date <span className="text-meta-1">*</span>
                </label>
                <input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  required
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                />
              </div>
              <div>
                <label className="mb-2.5 block text-black dark:text-white">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                />
              </div>
              <div>
                <label className="mb-2.5 block text-black dark:text-white">
                  Payment Type / Currency <span className="text-meta-1">*</span>
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.label}
                    </option>
                  ))}
                  <option value="add_new">+ Add New Currency</option>
                </select>
              </div>
              <div>
                <label className="mb-2.5 block text-black dark:text-white">Exchange Rate</label>
                <input
                  type="number"
                  value={exchangeRateInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setExchangeRateInput(raw);
                    const parsed = parseFloat(raw);
                    if (!Number.isNaN(parsed)) {
                      setFormData((prev) => ({ ...prev, exchange_rate: parsed }));
                    }
                  }}
                  onBlur={() => {
                    const parsed = parseFloat(exchangeRateInput);
                    const safeRate = !Number.isNaN(parsed) && parsed > 0 ? parsed : 1;
                    setFormData((prev) => ({ ...prev, exchange_rate: safeRate }));
                    setExchangeRateInput(String(safeRate));
                  }}
                  min="0.0001"
                  step="0.0001"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark flex justify-between items-center">
            <h3 className="font-medium text-black dark:text-white">Line Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="text-primary hover:underline"
            >
              + Add Item
            </button>
          </div>
          <div className="p-6.5">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 dark:bg-meta-4">
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-right">GST %</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, "product_id", e.target.value)}
                        className="w-full rounded border border-stroke px-3 py-2 dark:border-strokedark dark:bg-form-input"
                      >
                        <option value="">Select Product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value))}
                        className="w-20 rounded border border-stroke px-3 py-2 text-right dark:border-strokedark dark:bg-form-input"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(index, "rate", parseFloat(e.target.value))}
                        className="w-24 rounded border border-stroke px-3 py-2 text-right dark:border-strokedark dark:bg-form-input"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.gst_rate}
                        onChange={(e) => updateItem(index, "gst_rate", parseFloat(e.target.value))}
                        className="w-16 rounded border border-stroke px-3 py-2 text-right dark:border-strokedark dark:bg-form-input"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatAmount(item.amount)}
                    </td>
                    <td className="px-4 py-2">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-danger hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-stroke dark:border-strokedark">
                  <td colSpan={4} className="px-4 py-2 text-right font-medium">Subtotal:</td>
                  <td className="px-4 py-2 text-right">{formatAmount(calculateTotal())}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right font-medium">Tax:</td>
                  <td className="px-4 py-2 text-right">{formatAmount(calculateTax())}</td>
                  <td></td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={4} className="px-4 py-2 text-right">Total:</td>
                  <td className="px-4 py-2 text-right">{formatAmount(calculateTotal() + calculateTax())}</td>
                  <td></td>
                </tr>
                {formData.currency !== "INR" && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm text-body">
                      INR Total (at rate {formData.exchange_rate})
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-body">
                      Rs. {((calculateTotal() + calculateTax()) * (formData.exchange_rate || 1)).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td></td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border border-stroke px-6 py-2 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-primary px-6 py-2 font-medium text-gray hover:bg-opacity-90"
          >
            {loading ? "Saving..." : "Save Invoice"}
          </button>
        </div>
      </form>
    </>
  );
}


