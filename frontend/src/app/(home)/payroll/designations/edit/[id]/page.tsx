"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { ArrowLeft, Save, X, Check, AlertCircle } from "lucide-react";

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
}

const DEFAULT_PERMISSIONS: Permission[] = [
  // Stock/Inventory related
  { id: "stock_journal", name: "Stock Journal", description: "Manage stock journal entries", category: "Stock/Inventory" },
  { id: "stock_adjustment", name: "Stock Adjustment", description: "Adjust stock quantities", category: "Stock/Inventory" },
  { id: "brand", name: "Brand", description: "Manage product brands", category: "Stock/Inventory" },
  { id: "variant", name: "Variant", description: "Manage product variants", category: "Stock/Inventory" },
  { id: "stock_view", name: "View Stock", description: "View stock levels and details", category: "Stock/Inventory" },
  { id: "stock_update", name: "Stock Update", description: "Update stock information", category: "Stock/Inventory" },

  // Supplier/Customer related
  { id: "suppliers", name: "Suppliers", description: "Manage supplier information", category: "Parties" },
  { id: "customers", name: "Customers", description: "Manage customer information", category: "Parties" },
  { id: "customer_advance_payments", name: "Customers Advance Payments", description: "Manage customer advance payments", category: "Parties" },
  { id: "supplier_advance_payments", name: "Supplier Advance Payments", description: "Manage supplier advance payments", category: "Parties" },
  { id: "vendor_creation", name: "Vendor Creation", description: "Create new vendors", category: "Parties" },
  { id: "customer_creation", name: "Customer Creation", description: "Create new customers", category: "Parties" },

  // Purchase related
  { id: "purchase", name: "Purchase", description: "Manage purchases", category: "Purchase" },
  { id: "purchase_order", name: "Purchase Order", description: "Manage purchase orders", category: "Purchase" },
  { id: "purchase_request", name: "Purchase Request", description: "Create purchase requests", category: "Purchase" },
  { id: "purchase_invoice", name: "Purchase Invoice", description: "Manage purchase invoices", category: "Purchase" },
  { id: "purchase_quotation", name: "Purchase Quotation", description: "Manage purchase quotations", category: "Purchase" },
  { id: "purchase_compare", name: "Purchase Compare", description: "Compare purchase options", category: "Purchase" },
  { id: "enquiry_check_purchase", name: "Enquiry Check & Purchase", description: "Check enquiries and process purchases", category: "Purchase" },

  // Sales related
  { id: "quotation", name: "Quotation", description: "Create and manage quotations", category: "Sales" },
  { id: "sales_order", name: "Sales Order", description: "Manage sales orders", category: "Sales" },
  { id: "proforma", name: "Proforma Invoice", description: "Manage proforma invoices", category: "Sales" },
  { id: "delivery_challan", name: "Delivery Challan (DC)", description: "Manage delivery challans", category: "Sales" },
  { id: "sales_invoice", name: "Sales Invoice", description: "Manage sales invoices", category: "Sales" },
  { id: "enquiry", name: "Enquiry", description: "Manage customer enquiries", category: "Sales" },
  { id: "item_compare", name: "Item Compare", description: "Compare items for sales", category: "Sales" },
  { id: "sales_outstanding", name: "Sales Outstanding", description: "View sales outstanding", category: "Sales" },
  { id: "visit_plan", name: "Visit Plan", description: "Manage customer visit plans", category: "Sales" },
  { id: "km_travelled", name: "KM Travelled", description: "Track kilometers travelled", category: "Sales" },

  // Accounting related
  { id: "cash_bank_entries", name: "Cash & Bank Entries", description: "Manage cash and bank transactions", category: "Accounting" },
  { id: "journal", name: "Journal", description: "Manage journal entries", category: "Accounting" },
  { id: "expenses", name: "Expenses", description: "Manage expense records", category: "Accounting" },
  { id: "assets", name: "Assets", description: "Manage company assets", category: "Accounting" },
  { id: "liabilities", name: "Liabilities", description: "Manage liabilities", category: "Accounting" },
  { id: "it_filing", name: "IT Filing", description: "Access tax filing information", category: "Accounting" },

  // Approval related
  { id: "leave_approval", name: "Leave Approval", description: "Approve employee leave requests", category: "Approvals" },
  { id: "permission_approval", name: "Permission Approval", description: "Approve permissions", category: "Approvals" },
  { id: "customer_approval", name: "Customer Approval", description: "Approve customer creation", category: "Approvals" },
  { id: "vendor_approval", name: "Vendor Approval", description: "Approve vendor creation", category: "Approvals" },

  // View only permissions
  { id: "view_quotation", name: "View Quotation", description: "View quotations only", category: "View" },
  { id: "view_dc", name: "View DC", description: "View delivery challans only", category: "View" },
  { id: "view_invoice", name: "View Invoice", description: "View invoices only", category: "View" },
  { id: "view_proforma", name: "View Proforma", description: "View proforma invoices only", category: "View" },
  { id: "view_sales_order", name: "View Sales Order", description: "View sales orders only", category: "View" },
  { id: "view_stock_list", name: "View Stock List", description: "View stock lists only", category: "View" },

  // Admin related
  { id: "process_purchase_rate", name: "Process Purchase Rate", description: "Process to get purchase rates", category: "Administration" },
  { id: "process_quotation_team", name: "Process to Quotation Team", description: "Process to quotation team", category: "Administration" },

  // Menu access (global)
  { id: "payroll_access", name: "Payroll Access", description: "Access payroll module menus", category: "Menu Access" },
  { id: "banking_access", name: "Banking Access", description: "Access banking module menus", category: "Menu Access" },
  { id: "settings_access", name: "Settings Access", description: "Access settings module menus", category: "Menu Access" },
  { id: "reports_access", name: "Reports Access", description: "Access reports module menus", category: "Menu Access" },
];

export default function EditRolePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { company } = useAuth();

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    is_active: true,
  });

  useEffect(() => {
    if (company?.id && id) {
      fetchRole();
    }
  }, [company?.id, id]);

  const fetchRole = async () => {
    try {
      const response = await api.get(`/companies/${company?.id}/payroll/designations/${id}`);
      const role = response.data?.data || response.data;
      setFormData({
        name: role?.name || "",
        description: role?.description || "",
        permissions: Array.isArray(role?.permissions) ? role.permissions : [],
        is_active: role?.is_active ?? true,
      });
    } catch (error) {
      console.error("Error fetching role:", error);
      alert("Failed to load role. Please try again.");
    } finally {
      setPageLoading(false);
    }
  };

  const categories = Array.from(new Set(DEFAULT_PERMISSIONS.map((p) => p.category)));

  const filteredPermissions = DEFAULT_PERMISSIONS.filter((permission) => {
    const matchesTab = activeTab === "all" || permission.category === activeTab;
    const matchesSearch =
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const key = permission.subCategory || permission.category;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData((prev) => {
      const newPermissions = prev.permissions.includes(permissionId)
        ? prev.permissions.filter((id) => id !== permissionId)
        : [...prev.permissions, permissionId];

      return {
        ...prev,
        permissions: newPermissions,
      };
    });
  };

  const handleSelectAllInCategory = (category: string) => {
    const categoryPermissions = DEFAULT_PERMISSIONS.filter((p) => p.category === category).map((p) => p.id);

    setFormData((prev) => {
      const allSelected = categoryPermissions.every((id) => prev.permissions.includes(id));

      const newPermissions = allSelected
        ? prev.permissions.filter((id) => !categoryPermissions.includes(id))
        : [...prev.permissions, ...categoryPermissions.filter((id) => !prev.permissions.includes(id))];

      return {
        ...prev,
        permissions: newPermissions,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Please enter a role name");
      return;
    }

    if (formData.permissions.length === 0) {
      alert("Please select at least one permission");
      return;
    }

    setLoading(true);
    try {
      await api.put(`/companies/${company?.id}/payroll/designations/${id}`, {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
        is_active: formData.is_active,
      });

      router.push("/payroll/designations");
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-dark p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-dark-6">Loading role...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-dark p-4 md:p-6">
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm">
          <li>
            <Link href="/" className="text-dark-6 hover:text-primary dark:text-gray-400">
              Home
            </Link>
          </li>
          <li className="text-dark-6">/</li>
          <li>
            <Link href="/payroll/designations" className="text-dark-6 hover:text-primary dark:text-gray-400">
              Roles
            </Link>
          </li>
          <li className="text-dark-6">/</li>
          <li className="text-dark dark:text-white">Edit Role</li>
        </ol>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/payroll/designations"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-dark dark:text-white">Edit Role</h1>
            <p className="text-dark-6 mt-1">Update permissions and access levels</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">Role Information</h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Sales Manager"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Describe the role's responsibilities..."
                  />
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selected Permissions
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {formData.permissions.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {formData.permissions.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No permissions selected
                      </p>
                    ) : (
                      DEFAULT_PERMISSIONS
                        .filter((p) => formData.permissions.includes(p.id))
                        .map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                          >
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                              {permission.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handlePermissionToggle(permission.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Update Role
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2 p-4">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "all"
                      ? "bg-primary text-white"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  All Permissions
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveTab(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === category
                        ? "bg-primary text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {Object.entries(groupedPermissions).map(([group, permissions]) => (
                <div key={group} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold text-dark dark:text-white capitalize">
                      {group.replace("_", " ")}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const category = permissions[0].category;
                        handleSelectAllInCategory(category);
                      }}
                      className="text-sm text-primary hover:text-opacity-80"
                    >
                      {permissions.every((p) => formData.permissions.includes(p.id))
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map((permission) => {
                      const isSelected = formData.permissions.includes(permission.id);
                      return (
                        <div
                          key={permission.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                          onClick={() => handlePermissionToggle(permission.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${
                                isSelected ? "bg-primary border-primary" : "border-gray-300 dark:border-gray-600"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className={`${isSelected ? "text-primary" : "text-dark dark:text-white"} font-medium`}>
                                  {permission.name}
                                </h4>
                                <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                  {permission.category}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredPermissions.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No permissions found matching your search</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
