"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { countriesApi, Country, getErrorMessage } from "@/services/api";

export default function CountriesSettingsPage() {
  const { company } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadCountries = async () => {
    if (!company?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await countriesApi.list(company.id);
      setCountries(data);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load countries"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCountries();
  }, [company?.id]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCode("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await countriesApi.update(company.id, editingId, {
          name: name.trim(),
          code: code.trim() || undefined,
        });
      } else {
        await countriesApi.create(company.id, {
          name: name.trim(),
          code: code.trim() || undefined,
        });
      }
      resetForm();
      await loadCountries();
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to save country"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (country: Country) => {
    setEditingId(country.id);
    setName(country.name || "");
    setCode(country.code || "");
  };

  const handleDelete = async (country: Country) => {
    if (!company?.id) return;
    if (!window.confirm(`Delete country "${country.name}"?`)) return;
    setError(null);
    try {
      await countriesApi.delete(company.id, country.id);
      if (editingId === country.id) resetForm();
      await loadCountries();
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to delete country"));
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Countries</h1>
        <p className="text-sm text-dark-6">Manage country master for vendor forms.</p>
      </div>

      <div className="w-full rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Country Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. India"
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Code (Optional)</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={3}
              placeholder="e.g. IND"
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Add Country"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-stroke px-5 py-3 text-sm font-medium text-dark dark:border-dark-3 dark:text-white"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="w-full rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-dark-6">Loading countries...</p>
        ) : (
          <div className="w-full overflow-x-hidden">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((country) => (
                  <tr key={country.id} className="border-b border-stroke/70 dark:border-dark-3/70">
                    <td className="px-3 py-2">{country.name}</td>
                    <td className="px-3 py-2">{country.code || "-"}</td>
                    <td className="px-3 py-2">{country.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="inline-flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(country)}
                          title="Edit country"
                          aria-label="Edit country"
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-stroke text-dark hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(country)}
                          title="Delete country"
                          aria-label="Delete country"
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {countries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-dark-6">
                      No countries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
