"use client";

import { useAuth } from "@/context/AuthContext";
import { customersApi, Customer } from "@/services/api";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CustomerViewPage() {
  const { company } = useAuth();
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
  };

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!company?.id || !customerId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await customersApi.get(company.id, customerId);
        setCustomer(data);
      } catch (err: any) {
        console.error("Failed to fetch customer:", err);
        setError(err.message || "Failed to load customer");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [company?.id, customerId]);

  const handleDelete = async () => {
    if (
      !company?.id ||
      !customerId ||
      !confirm("Are you sure you want to delete this customer?")
    )
      return;
    try {
      await customersApi.delete(company.id, customerId);
      router.push("/customers");
    } catch (err) {
      console.error("Failed to delete customer:", err);
      alert("Failed to delete customer");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link
          href="/customers"
          className="mt-4 inline-block text-primary hover:underline"
        >
          ← Back to Customers
        </Link>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-12 text-center">
        <svg
          className="mx-auto mb-4 h-16 w-16 text-dark-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-dark-6">Customer not found</p>
        <Link
          href="/customers"
          className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
        >
          ← Back to Customers
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/customers"
              className="text-dark-6 hover:text-dark dark:text-gray-400 dark:hover:text-white"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-dark dark:text-white">
              {customer.name}
            </h1>
          </div>
          <p className="mt-1 text-sm text-dark-6">
            Customer Code:{" "}
            <span className="font-mono font-medium">
              {customer.customer_code || "N/A"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/customers/${customer.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white transition hover:bg-opacity-90"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Customer
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Status Badge */}
      {typeof customer.is_active === "boolean" && (
        <div className="mb-8">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              customer.is_active
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {customer.is_active ? "Active" : "Inactive"} Customer
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Basic & Tax & Address */}
        <div className="lg:col-span-2">
          {/* Basic Information */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              Basic Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  Customer Name
                </label>
                <p className="text-lg font-medium text-dark dark:text-white">
                  {customer.name}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  Customer Code
                </label>
                <p className="font-mono text-dark dark:text-white">
                  {customer.customer_code || "N/A"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  Primary Contact
                </label>
                <p className="text-dark dark:text-white">
                  {formatPhoneNumber(customer.contact)}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  Mobile
                </label>
                <p className="text-dark dark:text-white">
                  {customer.mobile
                    ? formatPhoneNumber(customer.mobile)
                    : "N/A"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  Email
                </label>
                <p className="text-dark dark:text-white">
                  {customer.email || "N/A"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  Created Date
                </label>
                <p className="text-dark dark:text-white">
                  {formatDate(customer.created_at || "")}
                </p>
              </div>
              {customer.customer_type && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-dark-6">
                    Customer Type
                  </label>
                  <p className="text-dark dark:text-white">
                    {customer.customer_type}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tax Information */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              Tax Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  GST Number
                </label>
                <p className="font-mono text-dark dark:text-white">
                  {customer.tax_number ||
                    (customer as any).gstin ||
                    "N/A"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  PAN Number
                </label>
                <p className="font-mono text-dark dark:text-white">
                  {customer.pan_number || (customer as any).pan || "N/A"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  GST Registration Type
                </label>
                <p className="text-dark dark:text-white">
                  {customer.gst_registration_type || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              Address Information
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-medium text-dark dark:text-white">
                  Billing Address
                </h3>
                <div className="space-y-2 text-dark-6">
                  <p>{customer.billing_address || "N/A"}</p>
                  {customer.billing_city && <p>{customer.billing_city}</p>}
                  {customer.billing_state && <p>{customer.billing_state}</p>}
                  {customer.billing_country && <p>{customer.billing_country}</p>}
                  {(customer.billing_zip || (customer as any).billing_pincode) && (
                    <p>
                      {customer.billing_zip ||
                        (customer as any).billing_pincode}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="mb-3 font-medium text-dark dark:text-white">
                  Shipping Address
                </h3>
                <div className="space-y-2 text-dark-6">
                  <p>
                    {customer.shipping_address || "Same as billing" || "N/A"}
                  </p>
                  {customer.shipping_city && <p>{customer.shipping_city}</p>}
                  {customer.shipping_state && <p>{customer.shipping_state}</p>}
                  {customer.shipping_country && <p>{customer.shipping_country}</p>}
                  {(customer.shipping_zip ||
                    (customer as any).shipping_pincode) && (
                    <p>
                      {customer.shipping_zip ||
                        (customer as any).shipping_pincode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Financial & Contact Persons */}
        <div>
          {/* Financial Information */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              Financial Information
            </h2>
            <div className="space-y-4">
              {typeof customer.outstanding_balance === "number" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-dark-6">
                    Outstanding Balance
                  </label>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(customer.outstanding_balance)}
                  </p>
                </div>
              )}
              {typeof customer.advance_balance === "number" &&
                customer.advance_balance !== 0 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-dark-6">
                      Advance Balance
                    </label>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(customer.advance_balance)}
                    </p>
                  </div>
                )}
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  Opening Balance
                </label>
                <p
                  className={`text-2xl font-bold ${
                    customer.opening_balance_type === "outstanding"
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {formatCurrency(customer.opening_balance || 0)}
                </p>
                <p className="text-sm text-dark-6">
                  {customer.opening_balance_type === "outstanding"
                    ? "Outstanding (Customer owes you)"
                    : "Advance (You owe customer)"}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  Credit Limit
                </label>
                <p className="text-xl font-medium text-dark dark:text-white">
                  {formatCurrency(customer.credit_limit || 0)}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-6">
                  Credit Days
                </label>
                <p className="text-xl font-medium text-dark dark:text-white">
                  {customer.credit_days ?? 0} days
                </p>
              </div>
            </div>
          </div>

          {/* Contact Person (single) or Contact Persons list */}
          {customer.contact_person_name && (
            <div className="mb-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                Contact Person
              </h2>
              <p className="text-dark dark:text-white">
                {customer.contact_person_name}
              </p>
            </div>
          )}

          {customer.contact_persons &&
            customer.contact_persons.length > 0 && (
              <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-dark dark:text-white">
                    Contact Persons
                  </h2>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {customer.contact_persons.length}
                  </span>
                </div>
                <div className="space-y-4">
                  {customer.contact_persons.map((person, index) => (
                    <div
                      key={person.id || index}
                      className="rounded-lg border border-stroke p-4 dark:border-dark-3"
                    >
                      <p className="font-medium text-dark dark:text-white">
                        {person.name}
                      </p>
                      {(person as any).designation && (
                        <p className="text-sm text-dark-6">
                          {(person as any).designation}
                        </p>
                      )}
                      {(person.email || person.phone) && (
                        <div className="mt-3 space-y-1 text-sm">
                          {person.email && (
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-4 w-4 text-dark-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                              <span className="text-dark-6">{person.email}</span>
                            </div>
                          )}
                          {person.phone && (
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-4 w-4 text-dark-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                              </svg>
                              <span className="text-dark-6">
                                {formatPhoneNumber(person.phone)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Opening Balance Items (if split mode) */}
      {customer.opening_balance_mode === "split" &&
        customer.opening_balance_items &&
        customer.opening_balance_items.length > 0 && (
          <div className="mt-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
              Opening Balance Items
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stroke dark:border-dark-3">
                    <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">
                      Voucher Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">
                      Days
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customer.opening_balance_items.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className="border-b border-stroke last:border-0 dark:border-dark-3"
                    >
                      <td className="px-4 py-3">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-4 py-3 text-dark dark:text-white">
                        {item.voucher_name}
                      </td>
                      <td className="px-4 py-3 text-dark dark:text-white">
                        {item.days ?? "N/A"}
                      </td>
                      <td className="px-4 py-3 font-medium text-dark dark:text-white">
                        {formatCurrency(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-stroke font-medium dark:border-dark-3">
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-right text-dark dark:text-white"
                    >
                      Total Opening Balance:
                    </td>
                    <td className="px-4 py-3 text-xl font-bold text-dark dark:text-white">
                      {formatCurrency(customer.opening_balance || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}
