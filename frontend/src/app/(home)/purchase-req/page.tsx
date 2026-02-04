"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { purchaseRequestsApi, getErrorMessage } from "@/services/api";
import Link from "next/link";

interface PurchaseRequest {
  id: string;
  purchase_req_no: string;
  customer_id: string;
  customer_name: string;
  request_date: string;
  status: "pending" | "open" | "in_progress" | "closed";
  total_items: number;
  total_quantity: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function PurchaseRequestsPage() {
  const { company } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{
    id: string;
    purchase_req_no: string;
    customer_name: string;
    currentStatus: string;
    newStatus: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const pageSize = 10;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    open: "Open",
    in_progress: "In Progress ",
    closed: "Closed"
  };

  // ADDED: Function to show confirmation modal
  const showStatusUpdateConfirmation = (
    id: string,
    purchase_req_no: string,
    customer_name: string,
    currentStatus: string,
    newStatus: string
  ) => {
    setSelectedRequest({
      id,
      purchase_req_no,
      customer_name,
      currentStatus,
      newStatus
    });
    setShowConfirmModal(true);
  };

  // ADDED: Function to execute status update after confirmation
  const executeStatusUpdate = async () => {
    if (!selectedRequest || !company?.id) return;
    
    await updateRequestStatus(
      selectedRequest.id,
      selectedRequest.newStatus as "pending" | "open" | "in_progress" | "closed"
    );
    
    setShowConfirmModal(false);
    setSelectedRequest(null);
  };

  const fetchPurchaseRequests = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {
        page: currentPage,
        page_size: pageSize
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      
      const response = await purchaseRequestsApi.list(company.id, params);
      setPurchaseRequests(response.purchase_requests || []);
      setTotalPages(Math.ceil(response.total / pageSize));
      setTotalCount(response.total);
    } catch (error: any) {
      console.error("Error fetching purchase requests:", error);
      setError(getErrorMessage(error, "Failed to load purchase requests"));
      setPurchaseRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: "pending" | "open" | "in_progress" | "closed") => {
    if (!company?.id) return;
    
    setUpdatingStatusId(requestId);
    
    try {
      // FIX: Use approval_status instead of status for API request
      await purchaseRequestsApi.updateStatus(company.id, requestId, { 
        approval_status: status  // Changed from 'status' to 'approval_status'
      });
      
      // Update local state - use status for local state (matches API response)
      setPurchaseRequests(prev =>
        prev.map(req =>
          req.id === requestId ? { ...req, status, updated_at: new Date().toISOString() } : req
        )
      );
      
      // Show success alert
      const newStatusLabel = statusLabels[status];
      setAlertMessage(`Request status updated to "${newStatusLabel}" successfully!`);
      setAlertType("success");
      setShowAlert(true);
      
      // Hide alert after 3 seconds
      setTimeout(() => {
        setShowAlert(false);
      }, 3000);
      
    } catch (error: any) {
      console.error("Error updating request status:", error);
      setAlertMessage(getErrorMessage(error, "Failed to update status"));
      setAlertType("error");
      setShowAlert(true);
      
      // Hide alert after 5 seconds for errors
      setTimeout(() => {
        setShowAlert(false);
      }, 5000);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPurchaseRequests();
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (company?.id) {
      fetchPurchaseRequests();
    }
  }, [company?.id, currentPage, statusFilter]);

  if (!company) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <p className="text-dark-6">Please select a company first</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Purchase Requests</h1>
          <p className="text-sm text-dark-6">Manage customer purchase requests</p>
        </div>
        <Link
          href="/purchase-req/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
        >
          <span>+</span> New Purchase Request
        </Link>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-dark">
            <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              Confirm Status Update
            </h3>
            
            <div className="mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-dark-6 dark:text-dark-6">Request No:</span>
                <span className="font-medium text-dark dark:text-white">
                  {selectedRequest.purchase_req_no}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-6 dark:text-dark-6">Customer:</span>
                <span className="font-medium text-dark dark:text-white">
                  {selectedRequest.customer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-6 dark:text-dark-6">Current Status:</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  statusColors[selectedRequest.currentStatus]
                }`}>
                  {statusLabels[selectedRequest.currentStatus] || selectedRequest.currentStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-6 dark:text-dark-6">New Status:</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  statusColors[selectedRequest.newStatus]
                }`}>
                  {statusLabels[selectedRequest.newStatus] || selectedRequest.newStatus}
                </span>
              </div>
            </div>
            
            <p className="mb-6 text-dark-6 dark:text-dark-6">
              Are you sure you want to update the status of this purchase request?
              This action will be recorded in the request history.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedRequest(null);
                }}
                className="rounded-lg border border-stroke px-4 py-2 text-dark hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                disabled={updatingStatusId === selectedRequest.id}
              >
                Cancel
              </button>
              <button
                onClick={executeStatusUpdate}
                className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-opacity-90 disabled:opacity-50"
                disabled={updatingStatusId === selectedRequest.id}
              >
                {updatingStatusId === selectedRequest.id ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Updating...
                  </>
                ) : (
                  "Confirm Update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert for status updates */}
      {showAlert && (
        <div className={`mb-6 rounded-lg p-4 ${
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

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by request number, customer, or item..."
                className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-dark-3"
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-opacity-90"
              >
                Search
              </button>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                    fetchPurchaseRequests();
                  }}
                  className="rounded-lg border border-stroke px-4 py-2 text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          <div className="flex items-center gap-4">
            <div>
              <label className="mr-2 text-sm font-medium text-dark dark:text-white">Status:</label>
              <select
                value={statusFilter}
                onChange={handleFilterChange}
                className="rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-dark-3"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Requests List */}
      <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : purchaseRequests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-dark-6">No purchase requests found</p>
            <Link
              href="/purchase-req/new"
              className="mt-2 inline-block text-primary hover:underline"
            >
              Create your first purchase request
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stroke dark:border-dark-3">
                    <th className="px-6 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">
                      Request #
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-dark-6 dark:text-dark-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-stroke hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-dark dark:text-white">
                          {request.purchase_req_no || `PR-${request.id.slice(0, 8)}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-dark dark:text-white">
                          {request.customer_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-dark-6 dark:text-dark-6">
                          {new Date(request.request_date || request.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-dark-6 dark:text-dark-6">
                          {request.total_items || "N/A"} items
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusColors[request.status]}`}
                        >
                          {statusLabels[request.status] || request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/purchase-req/${request.id}`}
                            className="rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-600 transition hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                          >
                            View
                          </Link>
                          
                          {/* Status Actions Dropdown - Show for pending and hold requests */}
                          {(request.status === "pending" || request.status === "in_progress") && (
                            <div className="relative">
                              <select
                                onChange={(e) => {
                                  const newStatus = e.target.value as "pending" | "open" | "in_progress" | "hold";
                                  if (newStatus) {
                                    // Show confirmation modal instead of directly updating
                                    showStatusUpdateConfirmation(
                                      request.id,
                                      request.purchase_req_no || `PR-${request.id.slice(0, 8)}`,
                                      request.customer_name,
                                      request.status,
                                      newStatus
                                    );
                                  }
                                  e.target.value = ""; // Reset dropdown
                                }}
                                disabled={updatingStatusId === request.id}
                                className="appearance-none rounded-lg border border-stroke bg-white px-3 py-1 pr-8 text-sm outline-none focus:border-primary disabled:opacity-50 dark:border-dark-3 dark:bg-dark-3"
                              >
                                <option value="">Update Status</option>
                                {request.status !== "open" && <option value="open">Open</option>}
                                {request.status !== "in_progress" && <option value="in_progress">In Progress</option>}
                                {request.status !== "closed" && <option value="closed">Closed</option>}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                {updatingStatusId === request.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                ) : (
                                  <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-stroke px-6 py-4 dark:border-dark-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-dark-6 dark:text-dark-6">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} requests
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-stroke px-3 py-1 text-sm transition hover:bg-gray-100 disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-3"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`rounded-lg px-3 py-1 text-sm transition ${
                            currentPage === pageNum
                              ? "bg-primary text-white"
                              : "border border-stroke hover:bg-gray-100 dark:border-dark-3 dark:hover:bg-dark-3"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-stroke px-3 py-1 text-sm transition hover:bg-gray-100 disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-3"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}