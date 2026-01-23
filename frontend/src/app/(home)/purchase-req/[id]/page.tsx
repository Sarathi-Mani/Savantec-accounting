"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { purchaseRequestsApi, getErrorMessage } from "@/services/api";
import Link from "next/link";

interface PurchaseRequest {
  id: string;
  request_number: string;
  customer_id: string;
  customer_name: string;
  request_date: string;
  status: "pending" | "approved" | "hold" | "rejected";
  total_items: number;
  total_quantity: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: Array<{
    id: string;
    item: string;
    quantity: number;
    product_id?: string;
    make?: string;
    created_at: string;
  }>;
}

export default function ViewPurchaseRequestPage() {
  const { company } = useAuth();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseRequest, setPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    hold: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    hold: "On Hold",
    rejected: "Rejected"
  };

  const fetchPurchaseRequest = async () => {
    if (!company?.id || !requestId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await purchaseRequestsApi.get(company.id, requestId);
      setPurchaseRequest(response);
    } catch (error: any) {
      console.error("Error fetching purchase request:", error);
      setError(getErrorMessage(error, "Failed to load purchase request"));
      setPurchaseRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (status: "pending" | "approved" | "hold" | "rejected") => {
    if (!company?.id || !requestId) return;
    
    setUpdating(true);
    try {
      await purchaseRequestsApi.updateStatus(company.id, requestId, { status });
      
      // Update local state
      setPurchaseRequest(prev => 
        prev ? { ...prev, status, updated_at: new Date().toISOString() } : null
      );
    } catch (error: any) {
      console.error("Error updating request status:", error);
      setError(getErrorMessage(error, "Failed to update status"));
    } finally {
      setUpdating(false);
    }
  };

  const deleteRequest = async () => {
    if (!company?.id || !requestId) return;
    
    try {
      await purchaseRequestsApi.delete(company.id, requestId);
      router.push("/purchase-req");
    } catch (error: any) {
      console.error("Error deleting purchase request:", error);
      setError(getErrorMessage(error, "Failed to delete purchase request"));
    }
  };

  useEffect(() => {
    if (company?.id && requestId) {
      fetchPurchaseRequest();
    }
  }, [company?.id, requestId]);

  if (!company) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <p className="text-dark-6">Please select a company first</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error && !purchaseRequest) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link
          href="/purchase-req"
          className="mt-4 inline-block text-primary hover:underline"
        >
          ← Back to Purchase Requests
        </Link>
      </div>
    );
  }

  if (!purchaseRequest) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <p className="text-dark-6">Purchase request not found</p>
        <Link
          href="/purchase-req"
          className="mt-4 inline-block text-primary hover:underline"
        >
          ← Back to Purchase Requests
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/purchase-req"
              className="text-primary hover:underline"
            >
              ← Back
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-dark dark:text-white">
            Purchase Request: {purchaseRequest.request_number || `PR-${purchaseRequest.id.slice(0, 8)}`}
          </h1>
          <p className="text-sm text-dark-6">View and manage purchase request details</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Status Update Dropdown */}
          {purchaseRequest.status === "pending" && (
            <div className="relative">
              <select
                onChange={(e) => {
                  const newStatus = e.target.value as "approved" | "hold" | "rejected";
                  if (newStatus) {
                    updateRequestStatus(newStatus);
                  }
                  e.target.value = ""; // Reset dropdown
                }}
                disabled={updating}
                className="appearance-none rounded-lg border border-stroke bg-white px-4 py-2 pr-10 text-sm outline-none focus:border-primary disabled:opacity-50 dark:border-dark-3 dark:bg-dark-3"
              >
                <option value="">Update Status</option>
                <option value="approved">Approve</option>
                <option value="hold">Put on Hold</option>
                <option value="rejected">Reject</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setShowDeleteModal(true)}
            className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-600 transition hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {updating && (
        <div className="mb-6 rounded-lg bg-blue-50 p-4 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
          Updating status...
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Request Details</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-medium text-dark dark:text-white">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-dark-6 dark:text-dark-6">Customer Name</div>
                  <div className="font-medium text-dark dark:text-white">
                    {purchaseRequest.customer_name}
                  </div>
                </div>
                <div>
                
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-medium text-dark dark:text-white">Request Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-dark-6 dark:text-dark-6">Request Number</div>
                  <div className="font-medium text-dark dark:text-white">
                    {purchaseRequest.request_number || `PR-${purchaseRequest.id.slice(0, 8)}`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-dark-6 dark:text-dark-6">Request Date</div>
                  <div className="font-medium text-dark dark:text-white">
                    {new Date(purchaseRequest.request_date || purchaseRequest.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-dark-6 dark:text-dark-6">Status</div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusColors[purchaseRequest.status]}`}
                  >
                    {statusLabels[purchaseRequest.status] || purchaseRequest.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Request Items */}
          <div className="mt-8">
            <h3 className="mb-4 font-medium text-dark dark:text-white">Requested Items</h3>
            {purchaseRequest.items && purchaseRequest.items.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-stroke dark:border-dark-3">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-3">
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">
                        Item Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">
                        Quantity
                      </th>
                    
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRequest.items.map((item, index) => (
                      <tr
                        key={item.id || index}
                        className="border-b border-stroke last:border-0 dark:border-dark-3"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-dark dark:text-white">{item.item}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-dark dark:text-white">{item.quantity}</div>
                        </td>
                      
                    
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-stroke p-4 text-center dark:border-dark-3">
                <p className="text-dark-6">No items found for this request</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {purchaseRequest.notes && (
            <div className="mt-8">
              <h3 className="mb-3 font-medium text-dark dark:text-white">Notes</h3>
              <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                <p className="text-dark-6 dark:text-dark-6 whitespace-pre-wrap">{purchaseRequest.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Timeline & Info */}
        <div className="space-y-6">
          {/* Request Summary */}
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h3 className="mb-4 font-medium text-dark dark:text-white">Request Summary</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-dark-6 dark:text-dark-6">Total Items</div>
                <div className="text-lg font-medium text-dark dark:text-white">
                  {purchaseRequest.total_items || purchaseRequest.items?.length || 0}
                </div>
              </div>
             
            
            </div>
          </div>

    
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-dark">
            <h2 className="text-lg font-bold text-dark dark:text-white">Confirm Delete</h2>
            <p className="mt-2 text-dark-6 dark:text-dark-6">
              Are you sure you want to delete this purchase request? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-stroke px-4 py-2 transition hover:bg-gray-100 dark:border-dark-3 dark:hover:bg-dark-3"
              >
                Cancel
              </button>
              <button
                onClick={deleteRequest}
                className="rounded-lg bg-red-500 px-4 py-2 text-white transition hover:bg-red-600"
              >
                Delete Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}