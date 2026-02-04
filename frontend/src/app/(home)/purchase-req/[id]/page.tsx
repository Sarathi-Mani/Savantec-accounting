"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { purchaseRequestsApi, getErrorMessage } from "@/services/api";

interface PurchaseRequestItem {
  s_no: number;
  product_id?: string;
  item: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  store_remarks?: string;
  approval_status: "pending" | "approved" | "rejected" | "hold";
  notes?: string;
}

interface PurchaseRequest {
  id: string;
  purchase_req_no: string;
  request_number: string;
  request_date: string;
  customer_id: string;
  customer_name: string;
  items: PurchaseRequestItem[];
  overall_status: "open" | "in_process" | "closed";
  status: "pending" | "approved" | "rejected" | "hold";
  store_remarks: string;
  notes: string;
  additional_notes: string;
  general_notes?: string;
  
  // Approval fields
  approved_by_name?: string;
  approved_at?: string;
  approval_notes?: string;
  
  // Creator info
  created_by_name: string;
  created_at: string;
  updated_at: string;
  
  // Calculated fields
  total_items: number;
  total_quantity: number;
  total_amount: number;
}

interface ActionHistory {
  id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  notes?: string;
}

export default function ViewPurchaseRequestPage() {
  const { id } = useParams();
  const { company, user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseRequest, setPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [actionHistory, setActionHistory] = useState<ActionHistory[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "items" | "history">("details");
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (company?.id && id) {
      fetchPurchaseRequest();
    }
  }, [company?.id, id]);

  const fetchPurchaseRequest = async () => {
    if (!company?.id || !id || typeof id !== "string") return;
    
    setLoading(true);
    setError(null);
    
    try {
      const request = await purchaseRequestsApi.get(company.id, id);
      setPurchaseRequest(request);
      
      // TODO: Fetch action history from API
      // For now, use mock data
      setActionHistory([
        {
          id: "1",
          action: "Created",
          performed_by: request.created_by_name,
          performed_at: request.created_at,
          notes: "Purchase request created"
        },
        {
          id: "2",
          action: "Updated",
          performed_by: "System",
          performed_at: request.updated_at,
          notes: "Request updated"
        }
      ]);
    } catch (error: any) {
      console.error("Error fetching purchase request:", error);
      setError(getErrorMessage(error, "Failed to load purchase request"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!company?.id || !purchaseRequest) return;
    
    setDeleting(true);
    try {
      await purchaseRequestsApi.delete(company.id, purchaseRequest.id);
      router.push("/purchase-req");
    } catch (error: any) {
      console.error("Error deleting purchase request:", error);
      setError(getErrorMessage(error, "Failed to delete purchase request"));
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const updateItemStatus = async (itemIndex: number, newStatus: "pending" | "approved" | "rejected" | "hold") => {
    if (!company?.id || !purchaseRequest || !id) return;
    
    setUpdatingItemId(itemIndex);
    
    try {
      // Find the item
      const item = purchaseRequest.items[itemIndex];
      if (!item) return;
      
      // Call API to update item status
      // Assuming you have an API endpoint for updating item status
      await purchaseRequestsApi.updateItemStatus(
        company.id,
        purchaseRequest.id,
        item.s_no.toString(), // Use s_no as identifier or item ID if available
        { approval_status: newStatus }
      );
      
      // Update local state
      setPurchaseRequest(prev => {
        if (!prev) return prev;
        
        const updatedItems = [...prev.items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          approval_status: newStatus
        };
        
        // Check if all items have same status to update overall status
        const allStatuses = updatedItems.map(item => item.approval_status);
        const isAllApproved = allStatuses.every(status => status === "approved");
        const isAllRejected = allStatuses.every(status => status === "rejected");
        const hasPending = allStatuses.some(status => status === "pending");
        const hasHold = allStatuses.some(status => status === "hold");
        
        let newOverallStatus: "pending" | "approved" | "rejected" | "hold" = prev.status;
        
        if (isAllApproved) {
          newOverallStatus = "approved";
        } else if (isAllRejected) {
          newOverallStatus = "rejected";
        } else if (hasHold) {
          newOverallStatus = "hold";
        } else if (hasPending) {
          newOverallStatus = "pending";
        }
        
        return {
          ...prev,
          items: updatedItems,
          status: newOverallStatus,
          updated_at: new Date().toISOString()
        };
      });
      
      // Show success alert
      setAlertMessage(`Item status updated to "${newStatus}" successfully!`);
      setAlertType("success");
      setShowAlert(true);
      
      // Hide alert after 3 seconds
      setTimeout(() => {
        setShowAlert(false);
      }, 3000);
      
    } catch (error: any) {
      console.error("Error updating item status:", error);
      setAlertMessage(getErrorMessage(error, "Failed to update item status"));
      setAlertType("error");
      setShowAlert(true);
      
      // Hide alert after 5 seconds for errors
      setTimeout(() => {
        setShowAlert(false);
      }, 5000);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "pending":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "open":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      case "in_process":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20";
      case "rejected":
        return "border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20";
      case "hold":
        return "border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      case "pending":
      default:
        return "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <div className="mb-4 text-red-500">⚠️</div>
        <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">Error Loading Request</h3>
        <p className="mb-4 text-dark-6">{error}</p>
        <button
          onClick={() => router.back()}
          className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-opacity-90"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!purchaseRequest) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <div className="mb-4 text-gray-500">📄</div>
        <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">Purchase Request Not Found</h3>
        <p className="mb-4 text-dark-6">The requested purchase request could not be found.</p>
        <Link
          href="/purchase-req"
          className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-opacity-90"
        >
          Back to Purchase Requests
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert for item status updates */}
      {showAlert && (
        <div className={`rounded-lg p-4 ${
          alertType === "success" 
            ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
            : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {alertType === "success" ? (
                <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">{alertMessage}</span>
            </div>
            <button
              onClick={() => setShowAlert(false)}
              className="ml-4 text-lg font-bold opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Purchase Request: {purchaseRequest.purchase_req_no}
          </h1>
          <p className="text-dark-6">
            Request Number: {purchaseRequest.request_number} • Created on{" "}
            {formatDate(purchaseRequest.created_at)}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
          
          <Link
            href="/purchase-req"
            className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </Link>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-3">
       
        <div className={`rounded-full px-4 py-2 text-sm font-medium ${getStatusColor(purchaseRequest.status)}`}>
          Approval: {purchaseRequest.status.toUpperCase()}
        </div>
        <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Items: {purchaseRequest.total_items}
        </div>
        <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Total Qty: {purchaseRequest.total_quantity}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stroke dark:border-dark-3">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-2 text-sm font-medium ${
              activeTab === "details"
                ? "border-b-2 border-primary text-primary dark:text-primary"
                : "text-dark-6 hover:text-dark dark:text-dark-6 dark:hover:text-white"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("items")}
            className={`py-2 text-sm font-medium ${
              activeTab === "items"
                ? "border-b-2 border-primary text-primary dark:text-primary"
                : "text-dark-6 hover:text-dark dark:text-dark-6 dark:hover:text-white"
            }`}
          >
            Items ({purchaseRequest.items.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "details" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Column - Basic Information */}
            <div className="space-y-6">
              <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Basic Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-6 dark:text-dark-6">Request Date</label>
                      <p className="mt-1 text-dark dark:text-white">
                        {formatDate(purchaseRequest.request_date)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-6 dark:text-dark-6">Company_name</label>
                      <p className="mt-1 text-dark dark:text-white">{purchaseRequest.customer_name}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-6 dark:text-dark-6">Created By</label>
                    <p className="mt-1 text-dark dark:text-white">{purchaseRequest.created_by_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-6 dark:text-dark-6">Created At</label>
                    <p className="mt-1 text-dark dark:text-white">{formatDate(purchaseRequest.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Approval Information */}
              {(purchaseRequest.approved_by_name || purchaseRequest.approval_notes) && (
                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                  <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Approval Information</h2>
                  <div className="space-y-4">
                    {purchaseRequest.approved_by_name && (
                      <div>
                        <label className="block text-sm font-medium text-dark-6 dark:text-dark-6">Approved By</label>
                        <p className="mt-1 text-dark dark:text-white">{purchaseRequest.approved_by_name}</p>
                      </div>
                    )}
                    {purchaseRequest.approved_at && (
                      <div>
                        <label className="block text-sm font-medium text-dark-6 dark:text-dark-6">Approved At</label>
                        <p className="mt-1 text-dark dark:text-white">{formatDate(purchaseRequest.approved_at)}</p>
                      </div>
                    )}
                    {purchaseRequest.approval_notes && (
                      <div>
                        <label className="block text-sm font-medium text-dark-6 dark:text-dark-6">Approval Notes</label>
                        <p className="mt-1 text-dark dark:text-white">{purchaseRequest.approval_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Notes */}
            <div className="space-y-6">
              <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Remarks & Notes</h2>
                <div className="space-y-4">
                  {purchaseRequest.store_remarks && (
                    <div>
                      <label className="block text-sm font-medium text-dark-6 dark:text-dark-6">Store Remarks</label>
                      <p className="mt-1 text-dark dark:text-white">{purchaseRequest.store_remarks}</p>
                    </div>
                  )}
                  {purchaseRequest.notes && (
                    <div>
                      <label className="block text-sm font-medium text-dark-6 dark:text-dark-6">General Notes</label>
                      <p className="mt-1 whitespace-pre-wrap text-dark dark:text-white">{purchaseRequest.notes}</p>
                    </div>
                  )}
                  {purchaseRequest.general_notes && (
                    <div>
                      <label className="block text-sm font-medium text-dark-6 dark:text-dark-6">General Notes (Legacy)</label>
                      <p className="mt-1 whitespace-pre-wrap text-dark dark:text-white">{purchaseRequest.general_notes}</p>
                    </div>
                  )}
                  {purchaseRequest.additional_notes && (
                    <div>
                      <label className="block text-sm font-medium text-dark-6 dark:text-dark-6">Additional Notes</label>
                      <p className="mt-1 whitespace-pre-wrap text-dark dark:text-white">{purchaseRequest.additional_notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-dark-6 dark:text-dark-6">Total Items</span>
                    <span className="font-medium text-dark dark:text-white">{purchaseRequest.total_items}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-6 dark:text-dark-6">Total Quantity</span>
                    <span className="font-medium text-dark dark:text-white">{purchaseRequest.total_quantity}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "items" && (
          <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
            <div className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Requested Items</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stroke dark:border-dark-3">
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">#</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">Item Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">Quantity</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">Store Remarks</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">Approval Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">Update Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRequest.items.map((item, index) => (
                      <tr 
                        key={index} 
                        className={`border-b border-stroke last:border-0 dark:border-dark-3 ${getItemStatusColor(item.approval_status)}`}
                      >
                        <td className="px-4 py-3 text-dark dark:text-white">{item.s_no}</td>
                        <td className="px-4 py-3">
                          <div className="text-dark dark:text-white">{item.item}</div>
                          {item.product_id && (
                            <div className="text-xs text-dark-6 dark:text-dark-6">Product ID: {item.product_id}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-dark dark:text-white">{item.quantity}</td>
                        <td className="px-4 py-3 text-dark dark:text-white">
                          {item.store_remarks || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.approval_status)}`}>
                            {item.approval_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <select
                              value=""
                              onChange={(e) => {
                                const newStatus = e.target.value as "pending" | "approved" | "rejected" | "hold";
                                if (newStatus) {
                                  updateItemStatus(index, newStatus);
                                }
                                e.target.value = ""; // Reset dropdown
                              }}
                              disabled={updatingItemId === index}
                              className="appearance-none rounded-lg border border-stroke bg-white px-3 py-1 pr-8 text-sm outline-none focus:border-primary disabled:opacity-50 dark:border-dark-3 dark:bg-dark-3"
                            >
                              <option value="">Select Status</option>
                              <option value="approved" disabled={item.approval_status === "approved"}>
                                Approve
                              </option>
                              <option value="rejected" disabled={item.approval_status === "rejected"}>
                                Reject
                              </option>
                              <option value="hold" disabled={item.approval_status === "hold"}>
                                Put on Hold
                              </option>
                              <option value="pending" disabled={item.approval_status === "pending"}>
                                Mark as Pending
                              </option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                              {updatingItemId === index ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                              ) : (
                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-dark-3">
                      <td colSpan={2} className="px-4 py-3 text-right font-medium text-dark-6 dark:text-dark-6">
                        Totals:
                      </td>
                      <td className="px-4 py-3 font-medium text-dark dark:text-white">
                        {purchaseRequest.total_quantity}
                      </td>
                      <td className="px-4 py-3 text-dark dark:text-white">-</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {/* Bulk Actions Section */}
              <div className="mt-6 flex items-center justify-between border-t border-stroke pt-6 dark:border-dark-3">
                <div className="text-sm text-dark-6 dark:text-dark-6">
                  Bulk update all items to:
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      purchaseRequest.items.forEach((_, index) => {
                        updateItemStatus(index, "approved");
                      });
                    }}
                    disabled={updatingItemId !== null}
                    className="rounded-lg bg-green-100 px-3 py-1 text-sm font-medium text-green-800 transition hover:bg-green-200 disabled:opacity-50 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
                  >
                    Approve All
                  </button>
                  <button
                    onClick={() => {
                      purchaseRequest.items.forEach((_, index) => {
                        updateItemStatus(index, "rejected");
                      });
                    }}
                    disabled={updatingItemId !== null}
                    className="rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-800 transition hover:bg-red-200 disabled:opacity-50 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={() => {
                      purchaseRequest.items.forEach((_, index) => {
                        updateItemStatus(index, "hold");
                      });
                    }}
                    disabled={updatingItemId !== null}
                    className="rounded-lg bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800 transition hover:bg-yellow-200 disabled:opacity-50 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800"
                  >
                    Hold All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-dark">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">Confirm Deletion</h3>
            <p className="mb-6 text-dark-6">
              Are you sure you want to delete purchase request{" "}
              <span className="font-medium text-dark dark:text-white">{purchaseRequest.purchase_req_no}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-stroke px-4 py-2 text-dark hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}