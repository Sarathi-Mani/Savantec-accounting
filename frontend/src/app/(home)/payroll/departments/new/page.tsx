"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    send_message: false,
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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <Link
            href="/payroll/departments"
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full 
                     bg-primary text-white 
                     hover:bg-primary/90 
                     transition sm:h-10 sm:w-10"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Department</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create a new department for your payroll setup
            </p>
          </div>
        </div>
      </div>

      <div className="w-full p-0 sm:p-6">
        <div className="rounded-none border-y border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-none sm:rounded-lg sm:border sm:p-6 sm:shadow-sm">
          <form data-ui="sf-form" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Department Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
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
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
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
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
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
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
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

            <hr />

            <div className="overflow-hidden">
              {/* <div className="bg-[#f2f2f2] px-6 py-4 dark:bg-gray-900/40">
                <label className="inline-flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={formData.send_message}
                    onChange={(e) => setFormData({ ...formData, send_message: e.target.checked })}
                    className="h-5 w-5 rounded-sm border-[#d08a3a] bg-[#d08a3a] text-white focus:outline-none focus:ring-0"
                  />
                  <span>Send Message to Customer</span>
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-pink-600 text-[10px] font-semibold text-white">
                    i
                  </span>
                </label>
              </div> */}

              <div className="px-0 py-4 dark:bg-gray-800 sm:px-6 sm:py-5">
                <div className="mx-auto flex w-full max-w-[560px] items-center justify-center gap-4 sm:gap-8">
              <button
                type="submit"
                disabled={saving}
                className="h-9 w-28 rounded-lg bg-primary text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed sm:w-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/payroll/departments")}
                className="h-9 w-28 rounded-lg bg-[#E5E7EB] text-sm font-medium text-black hover:bg-[#e9ebf0] transition-colors dark:bg-dark-3 dark:text-white dark:hover:bg-dark-2 sm:w-60"
              >
                Cancel
              </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
