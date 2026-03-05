"use client";

import { useAuth } from "@/context/AuthContext";
import { categoriesApi, getErrorMessage } from "@/services/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewCategoryPage() {
  const { company } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    if (!formData.name.trim()) {
      setError("Category name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await categoriesApi.create(company.id, {
        ...formData,
        description: formData.description || undefined,
      });
      router.push("/products/categories");
    } catch (error: any) {
      setError(getErrorMessage(error, "Failed to create category"));
    } finally {
      setLoading(false);
    }
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-yellow-800 dark:text-yellow-400">Please select a company first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
        <div className="flex items-start gap-3">
          <Link
            href="/products/categories"
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full 
                     bg-primary text-white 
                     transition hover:bg-primary/90 sm:h-10 sm:w-10"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Category</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create a new product category
            </p>
          </div>
        </div>
      </div>

      <div className="w-full p-0 sm:p-6">
        <div className="rounded-none border-y border-gray-200 bg-white p-4 shadow-none dark:border-gray-700 dark:bg-gray-800 sm:rounded-lg sm:border sm:p-6 sm:shadow-sm">
          <form data-ui="sf-form" onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter category name"
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
              />
            </div>

            <div className="mb-4 mt-1">
              <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Category description"
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
              />
            </div>

            <hr />

            <div className="overflow-hidden">
              <div className="px-0 py-4 dark:bg-gray-800 sm:px-6 sm:py-5">
                <div className="mx-auto flex w-full max-w-[560px] items-center justify-center gap-4 sm:gap-8">
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-9 w-28 rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-60"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/products/categories")}
                    className="h-9 w-28 rounded-lg bg-[#E5E7EB] text-sm font-medium text-black transition-colors hover:bg-[#e9ebf0] dark:bg-dark-3 dark:text-white dark:hover:bg-dark-2 sm:w-60"
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
