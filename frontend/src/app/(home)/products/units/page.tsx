"use client";

import { useAuth } from "@/context/AuthContext";
import { getErrorMessage, productUnitsApi, ProductUnit } from "@/services/api";
import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Trash2,
  Check,
} from "lucide-react";

const PAGE_SIZE = 10;

export default function ProductUnitsPage() {
  const { company } = useAuth();

  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [newUnit, setNewUnit] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitLabel, setEditingUnitLabel] = useState("");

  const companyId =
    company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  const refreshUnits = async () => {
    if (!companyId) {
      setUnits([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await productUnitsApi.list(companyId, { page: 1, page_size: 500 });
      setUnits(response.units || []);
      setError("");
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load units."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUnits();
  }, [companyId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return units;
    return units.filter(
      (unit) =>
        unit.label.toLowerCase().includes(q) || unit.value.toLowerCase().includes(q),
    );
  }, [units, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / PAGE_SIZE));

  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUnits.slice(start, start + PAGE_SIZE);
  }, [filteredUnits, currentPage]);

  const resetMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!companyId) {
      setError("Company not found.");
      return;
    }

    try {
      const createdUnit = await productUnitsApi.create(companyId, newUnit);
      setNewUnit("");
      await refreshUnits();
      setSuccessMessage(`Unit "${createdUnit.label}" added successfully.`);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to add unit."));
    }
  };

  const handleDeleteUnit = async (id: string, label: string) => {
    resetMessages();
    const confirmed = window.confirm(`Delete unit "${label}"?`);
    if (!confirmed) return;

    if (!companyId) {
      setError("Company not found.");
      return;
    }

    try {
      await productUnitsApi.delete(companyId, id);
      await refreshUnits();
      setSuccessMessage(`Unit "${label}" removed successfully.`);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to remove unit."));
    }
  };

  const startEdit = (unit: ProductUnit) => {
    resetMessages();
    setEditingUnitId(unit.id);
    setEditingUnitLabel(unit.label);
  };

  const cancelEdit = () => {
    setEditingUnitId(null);
    setEditingUnitLabel("");
  };

  const handleSaveEdit = async () => {
    if (!editingUnitId || !companyId) return;
    resetMessages();

    try {
      const updatedUnit = await productUnitsApi.update(companyId, editingUnitId, editingUnitLabel);
      await refreshUnits();
      setSuccessMessage(`Unit "${updatedUnit.label}" updated successfully.`);
      cancelEdit();
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to update unit."));
    }
  };

  const handleReset = () => {
    setSearch("");
    setCurrentPage(1);
    cancelEdit();
    resetMessages();
  };

  return (
    <div className="w-full">
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Units</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage custom units for product creation
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <form data-ui="sf-form" onSubmit={handleAddUnit} className="flex flex-col gap-3 sm:flex-row justify-center ">
          <input
            type="text"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            placeholder="Enter unit name (example: Nos, Meter, Carton)"
            className="w-full sm:w-[420px] rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Unit
          </button>
        </form>
      </div>

      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search units..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* <button
              onClick={() => setShowFilters((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button> */}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 border-t border-gray-200 pt-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Custom units only are shown here.
          </div>
        )}
      </div>

      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300">
            {successMessage}
          </div>
        )}

        <div className="overflow-hidden border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-hidden">
            <table className="w-full table-fixed">
              <thead className="bg-gray-200 dark:bg-gray-700/50">
                <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  <th className="w-16 px-3 py-3 text-left">S.No</th>
                  <th className="px-3 py-3 text-left">Unit</th>
                  <th className="w-[220px] px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-700 dark:divide-gray-700 dark:text-gray-300">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                    </td>
                  </tr>
                ) : paginatedUnits.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Ruler className="h-10 w-10 text-gray-400" />
                        <p className="font-medium text-gray-900 dark:text-white">No units found</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {search ? "Try changing search text." : "Add your first unit to get started."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedUnits.map((unit, index) => {
                    const isEditing = editingUnitId === unit.id;
                    return (
                      <tr key={unit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-4">
                          {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="px-3 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingUnitLabel}
                              onChange={(e) => setEditingUnitLabel(e.target.value)}
                              className="w-[260px] max-w-full rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-indigo-700 dark:bg-gray-700 dark:text-white"
                              placeholder="Enter unit name"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Ruler className="h-4 w-4 text-gray-400" />
                              <span>{unit.label}</span>
                            </div>
                          )}
                        </td>
                        <td className="w-[220px] px-3 py-4 text-right align-top">
                          {isEditing ? (
                            <div className="flex flex-nowrap justify-end gap-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="inline-flex min-h-9 items-center gap-1 rounded-md border border-green-200 px-3 py-2 text-xs font-medium text-green-700 transition active:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 dark:border-green-900/40 dark:text-green-300 dark:active:bg-green-900/30"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUnit(unit.id, unit.label)}
                                className="inline-flex min-h-9 items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:border-red-900/40 dark:text-red-300 dark:active:bg-red-900/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-nowrap justify-end gap-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => startEdit(unit)}
                                className="inline-flex min-h-9 items-center gap-1 rounded-md border border-indigo-200 px-3 py-2 text-xs font-medium text-indigo-700 transition active:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 dark:border-indigo-900/40 dark:text-indigo-300 dark:active:bg-indigo-900/30"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUnit(unit.id, unit.label)}
                                className="inline-flex min-h-9 items-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:border-red-900/40 dark:text-red-300 dark:active:bg-red-900/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredUnits.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, filteredUnits.length)} of {filteredUnits.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
