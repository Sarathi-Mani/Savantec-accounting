"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import {
  Pencil,
  Trash2,
  Eye,
  Plus,
  CheckCircle,
  XCircle,
  Users,
} from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export default function RolesPage() {
  const { company } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (company?.id) {
      fetchRoles();
    }
  }, [company]);

  const fetchRoles = async () => {
    try {
      const response = await api.get(
         `/companies/${company?.id}/payroll/designations`
      );
      setRoles(response.data);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    try {
      await api.delete(`/companies/${company?.id}/payroll/designations/${roleId}`);
      fetchRoles();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting role:", error);
    }
  };

  const toggleStatus = async (roleId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/companies/${company?.id}/payroll/designations/${roleId}`, {
        is_active: !currentStatus
      });
      fetchRoles();
    } catch (error) {
      console.error("Error updating role status:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-dark p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-dark-6">Loading roles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-dark p-4 md:p-6">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm">
          <li>
            <Link href="/" className="text-dark-6 hover:text-primary dark:text-gray-400">
              Home
            </Link>
          </li>
          <li className="text-dark-6">/</li>
          <li className="text-dark dark:text-white">Roles</li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Roles Management</h1>
          <p className="text-dark-6 mt-1">Manage user roles and permissions</p>
        </div>
        <div>
          <Link
            href="designations/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Role
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-dark dark:text-white">{roles.length}</p>
              <p className="text-sm text-dark-6 mt-1">Total Roles</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {roles.filter(r => r.is_active).length}
              </p>
              <p className="text-sm text-dark-6 mt-1">Active Roles</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-dark dark:text-white">
                {roles.reduce((sum, role) => sum + role.user_count, 0)}
              </p>
              <p className="text-sm text-dark-6 mt-1">Total Users</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">#</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Role Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Description</th>
                 <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No roles found</p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Create your first role to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                roles.map((role, index) => (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{role.name}</div>
                    
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {role.description || "No description"}
                    </td>
                    
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(role.id, role.is_active)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          role.is_active
                            ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                            : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        }`}
                      >
                        {role.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`designations/${role.id}`}
                          className="p-2 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`designations/edit/${role.id}`}
                          className="p-2 rounded-lg text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(role.id)}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-dark">
            <div className="mb-4 flex items-center gap-3 text-red-600 dark:text-red-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Delete Role</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this role? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}