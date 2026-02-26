"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { payrollApi } from "@/services/api";

export default function NewDepartmentPage() {
  const router = useRouter();
  const { company } = useAuth();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    head_name: "",
    description: "",
    is_active: true,
  });

  const companyId =
    company?.id ||
    (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      setSaving(true);
      await payrollApi.createDepartment(companyId, formData);
      router.push("/payroll/departments");
    } catch (error) {
      console.error("Error creating department:", error);
      alert("Failed to create department");
    } finally {
      setSaving(false);
    }
  };

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-400">Please select a company first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Department</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create a new department for your payroll setup
        </p>
      </div>

      <div className="max-w-2xl p-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Department Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter department name"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Department Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter department code (e.g., HR, IT, FIN)"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Department Head
              </label>
              <input
                type="text"
                value={formData.head_name}
                onChange={(e) => setFormData({ ...formData, head_name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter department head name"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter department description"
              />
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active Department</span>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/payroll/departments")}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
