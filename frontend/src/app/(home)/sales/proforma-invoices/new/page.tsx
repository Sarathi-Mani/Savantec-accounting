"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/dist/client/link";

export default function AddProformaInvoicePage() {
  const router = useRouter();
  const { company } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    // Left column fields
    company: "",
    customerName: "",
    customerId: "",
    previousDue: 0,
    referenceNo: "",
    referenceDate: "",
    contactPerson: "",

    // Right column fields
    proformaCode: "PF0551",
    proformaNumber: "551",
    proformaDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    bankDetails: "-None-",
    salesman: "",

    // Charges, Discounts & Remarks
    freightCharges: 0,
    freightType: "fixed",
    pfCharges: 0,
    pfType: "fixed",
    discountOnAll: 0,
    discountType: "percentage",
    remarks: "",

    // Terms and Conditions
    terms: "Standard proforma invoice terms and conditions apply.",
  });

  // Proforma items state
  const [items, setItems] = useState([
    {
      id: 1,
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: "fixed",
      taxAmount: 0,
      taxRate: 18,
      total: 0,
    },
  ]);

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const discount = item.discountType === 'percentage' 
        ? itemTotal * (item.discount / 100)
        : item.discount;
      const taxable = itemTotal - discount;
      const tax = taxable * (item.taxRate / 100);
      
      subtotal += taxable;
      totalTax += tax;
    });

    const freight = formData.freightType === 'percentage' 
      ? subtotal * (formData.freightCharges / 100)
      : formData.freightCharges;
    
    const pf = formData.pfType === 'percentage'
      ? subtotal * (formData.pfCharges / 100)
      : formData.pfCharges;
    
    const discountAll = formData.discountType === 'percentage'
      ? subtotal * (formData.discountOnAll / 100)
      : formData.discountOnAll;
    
    const total = subtotal + totalTax + freight + pf - discountAll;
    const roundOff = Math.round(total) - total;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      freight: Number(freight.toFixed(2)),
      pf: Number(pf.toFixed(2)),
      discountAll: Number(discountAll.toFixed(2)),
      roundOff: Number(roundOff.toFixed(2)),
      grandTotal: Number((total + roundOff).toFixed(2)),
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement API call
      console.log('Submitting proforma invoice:', { formData, items, totals });
      router.push('/sales/proforma-invoices');
    } catch (error) {
      console.error('Failed to create proforma invoice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setItems([...items, {
      id: items.length + 1,
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: "fixed",
      taxAmount: 0,
      taxRate: 18,
      total: 0,
    }]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalculate item total
        const itemTotal = updated.quantity * updated.unitPrice;
        const discount = updated.discountType === 'percentage' 
          ? itemTotal * (updated.discount / 100)
          : updated.discount;
        const taxable = itemTotal - discount;
        const tax = taxable * (updated.taxRate / 100);
        updated.total = taxable + tax;
        
        return updated;
      }
      return item;
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-dark md:p-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 text-sm md:space-x-2">
          <li className="inline-flex items-center">
            <Link href="/" className="inline-flex items-center text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white">
              Home
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <Link href="/sales/proforma-invoices" className="ml-1 text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white md:ml-2">
                Proforma Invoice List
              </Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 font-medium text-dark dark:text-white md:ml-2">New Proforma Invoice</span>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 font-medium text-primary dark:text-primary md:ml-2">Proforma Invoice</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark dark:text-white">Proforma Invoice</h1>
        <p className="text-dark-6">Add / Update Proforma Invoice</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* SECTION 1: Proforma Invoice Basic Details */}
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Company <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                      required
                    >
                      <option value="">Select Company</option>
                      {company && <option value={company.id}>{company.name}</option>}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                        required
                      >
                        <option value="">Select Customer</option>
                        <option value="1">ABC Corporation</option>
                        <option value="2">XYZ Industries</option>
                      </select>
                      <button
                        type="button"
                        className="rounded-lg border border-stroke bg-white px-4 py-2.5 text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-red-600">Previous Due: ₹2,500</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Reference No.
                    </label>
                    <input
                      type="text"
                      value={formData.referenceNo}
                      onChange={(e) => setFormData({...formData, referenceNo: e.target.value})}
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Reference Date
                    </label>
                    <input
                      type="date"
                      value={formData.referenceDate}
                      onChange={(e) => setFormData({...formData, referenceDate: e.target.value})}
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      readOnly
                      className="w-full rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Proforma Invoice Code <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value="PF0551"
                        className="flex-1 rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2"
                        readOnly
                      />
                      <span className="flex items-center px-3 text-dark-6">|</span>
                      <input
                        type="text"
                        value="551"
                        className="w-20 rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2"
                        readOnly
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Proforma Invoice Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.proformaDate}
                      onChange={(e) => setFormData({...formData, proformaDate: e.target.value})}
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Bank Details
                    </label>
                    <select
                      value={formData.bankDetails}
                      onChange={(e) => setFormData({...formData, bankDetails: e.target.value})}
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    >
                      <option value="-None-">-None-</option>
                      <option value="hdfc">HDFC Bank - XXXX5678</option>
                      <option value="icici">ICICI Bank - XXXX1234</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Salesman
                    </label>
                    <select
                      value={formData.salesman}
                      onChange={(e) => setFormData({...formData, salesman: e.target.value})}
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    >
                      <option value="">Select Salesman</option>
                      <option value="1">John Doe</option>
                      <option value="2">Jane Smith</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Item Search */}
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-dark-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Item name / Barcode / Itemcode / Description"
                    className="w-full rounded-lg border border-stroke bg-transparent py-2.5 pl-10 pr-4 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-lg bg-primary px-4 py-2.5 text-white hover:bg-opacity-90"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* SECTION 3: Proforma Items Table */}
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stroke dark:border-dark-3">
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Quantity</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Unit Price</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Discount (₹)</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Tax Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Tax</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Total Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            className="w-full min-w-[150px] rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                            placeholder="Item name"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="w-full min-w-[150px] rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                            placeholder="Description"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                            className="w-20 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                            min="1"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                            className="w-24 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value))}
                            className="w-20 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.taxAmount}
                            onChange={(e) => updateItem(item.id, 'taxAmount', parseFloat(e.target.value))}
                            className="w-20 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.taxRate}
                            onChange={(e) => updateItem(item.id, 'taxRate', parseFloat(e.target.value))}
                            className="w-20 rounded border border-stroke bg-transparent px-2 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          ₹{item.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 4: Charges, Discounts & Remarks */}
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Left Side */}
                <div className="space-y-4">
                  <div className="text-dark-6">
                    Quantity: {items.reduce((sum, item) => sum + item.quantity, 0)}
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Freight Charges
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.freightCharges}
                        onChange={(e) => setFormData({...formData, freightCharges: parseFloat(e.target.value)})}
                        className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                        min="0"
                      />
                      <select
                        value={formData.freightType}
                        onChange={(e) => setFormData({...formData, freightType: e.target.value})}
                        className="w-24 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                      >
                        <option value="fixed">Fixed</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      P & F Charges
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.pfCharges}
                        onChange={(e) => setFormData({...formData, pfCharges: parseFloat(e.target.value)})}
                        className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                        min="0"
                      />
                      <select
                        value={formData.pfType}
                        onChange={(e) => setFormData({...formData, pfType: e.target.value})}
                        className="w-24 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                      >
                        <option value="fixed">Fixed</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Discount on All
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.discountOnAll}
                        onChange={(e) => setFormData({...formData, discountOnAll: parseFloat(e.target.value)})}
                        className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                        min="0"
                      />
                      <select
                        value={formData.discountType}
                        onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                        className="w-24 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">Fixed</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      Remarks
                    </label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                      rows={3}
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 5: Terms and Conditions */}
            <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
              <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
                <h2 className="text-lg font-semibold text-dark dark:text-white">Proforma Invoice Terms and Conditions</h2>
                <button
                  type="button"
                  onClick={() => setShowTerms(!showTerms)}
                  className="rounded p-1 hover:bg-gray-100 dark:hover:bg-dark-3"
                >
                  <svg className={`h-5 w-5 transition-transform ${showTerms ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {showTerms && (
                <div className="p-6">
                  <textarea
                    value={formData.terms}
                    onChange={(e) => setFormData({...formData, terms: e.target.value})}
                    rows={6}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            {/* Total Summary */}
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Total Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-dark-6">Subtotal</span>
                  <span className="font-medium text-dark dark:text-white">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-6">Freight Charges</span>
                  <span className="font-medium text-dark dark:text-white">₹{totals.freight.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-6">P & F Charges</span>
                  <span className="font-medium text-dark dark:text-white">₹{totals.pf.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-6">Discount on All</span>
                  <span className="font-medium text-red-600">-₹{totals.discountAll.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-dark-6">Round Off</span>
                    <button type="button" className="text-dark-6 hover:text-dark dark:text-gray-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                  <span className={`font-medium ${totals.roundOff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Math.abs(totals.roundOff).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="border-t border-stroke pt-3 dark:border-dark-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-dark dark:text-white">Grand Total</span>
                    <span className="text-lg font-bold text-primary">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full rounded-lg border border-stroke bg-orange-100 px-4 py-3 font-medium text-orange-600 transition hover:bg-orange-200 dark:border-orange-900 dark:bg-orange-900/20 dark:text-orange-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}