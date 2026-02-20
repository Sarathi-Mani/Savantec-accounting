"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { customerTypesApi, getErrorMessage, CustomerType } from "@/services/api";

export default function CustomerTypesPage() {
  const { company } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);

  const loadCustomerTypes = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const response = await customerTypesApi.list(company.id);
      setCustomerTypes(response.customer_types || []);
      setError(null);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load customer types"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerTypes();
  }, [company?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    const cleaned = name.trim();
    if (!cleaned) {
      setError("Customer type name is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await customerTypesApi.create(company.id, { name: cleaned });
      setName("");
      await loadCustomerTypes();
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to create customer type"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: CustomerType) => {
    if (!company?.id) return;
    const confirmed = window.confirm(`Delete customer type "${type.name}"?`);
    if (!confirmed) return;

    setDeletingId(type.id);
    setError(null);
    try {
      await customerTypesApi.delete(company.id, type.id);
      await loadCustomerTypes();
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to delete customer type"));
    } finally {
      setDeletingId(null);
    }
  };

  if (!company?.id) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <p className="text-dark-6">Please select a company first</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Customer Types</h1>
        <p className="text-sm text-dark-6">Add and manage customer type master data</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Customer Type Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customer type"
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Customer Type"}
          </button>
        </form>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Available Customer Types</h2>
        {loading ? (
          <p className="text-dark-6">Loading...</p>
        ) : customerTypes.length === 0 ? (
          <p className="text-dark-6">No customer types added yet.</p>
        ) : (
          <ul className="space-y-2">
            {customerTypes.map((type) => (
              <li
                key={type.id}
                className="flex items-center justify-between rounded-lg border border-stroke px-4 py-3 text-sm text-dark dark:border-dark-3 dark:text-white"
              >
                <span>{type.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(type)}
                  disabled={deletingId === type.id}
                  className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  {deletingId === type.id ? "Deleting..." : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
