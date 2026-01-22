"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Briefcase,
  CreditCard,
  Shield,
  Users,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Printer,
  Download,
  Edit,
  Mail,
  Home,
  Heart,
  Banknote,
  PhoneCall,
  Building,
  Wallet,
  BadgeDollarSign
} from "lucide-react";
import { payrollApi, Employee } from "@/services/api";

export default function EmployeeDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedCompanyId = localStorage.getItem("company_id");
    if (!storedCompanyId) {
      router.push("/company");
      return;
    }
    setCompanyId(storedCompanyId);

    if (params.id) {
      loadEmployee(storedCompanyId, params.id as string);
    }
  }, [router, params.id]);

  const loadEmployee = async (companyId: string, employeeId: string) => {
    try {
      setLoading(true);
      const emp = await payrollApi.getEmployee(companyId, employeeId);
      setEmployee(emp);
    } catch (err) {
      console.error("Error loading employee:", err);
      setError("Failed to load employee details");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/payroll/employees"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Details</h1>
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error || "Employee not found"}
        </div>
        <Link
          href="/payroll/employees"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Employees
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/payroll/employees"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Details</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {employee.employee_code} • {employee.full_name || `${employee.first_name} ${employee.last_name || ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
          <Link
            href={`/payroll/employees/edit/${employee.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Edit className="w-5 h-5" />
            Edit Employee
          </Link>
        </div>
      </div>

      {/* Employee Summary Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {employee.photo_url ? (
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20">
                  <img
                    src={employee.photo_url}
                    alt={employee.full_name || `${employee.first_name} ${employee.last_name || ""}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const initialsDiv = document.createElement('div');
                        initialsDiv.className = 'w-full h-full flex items-center justify-center bg-primary/10';
                        const firstName = employee.first_name || '';
                        const lastName = employee.last_name || '';
                        initialsDiv.innerHTML = `<span class="text-xl font-bold text-primary">${firstName.charAt(0)}${lastName.charAt(0)}</span>`;
                        parent.appendChild(initialsDiv);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                  <span className="text-2xl font-bold text-primary">
                    {employee.first_name.charAt(0)}
                    {employee.last_name?.charAt(0) || ""}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {employee.full_name || `${employee.first_name} ${employee.last_name || ""}`}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{employee.employee_code}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {employee.designation?.name || "No designation"}
              </p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {employee.department?.name || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${employee.status === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : employee.status === "inactive"
                  ? "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}>
                {employee.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Date of Joining</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDate(employee.date_of_joining)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">CTC</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(employee.ctc)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Other Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Details</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</p>
              <p className="text-gray-900 dark:text-white">{formatDate(employee.date_of_birth)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gender</p>
              <p className="text-gray-900 dark:text-white">{employee.gender || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Marital Status</p>
              <p className="text-gray-900 dark:text-white">{employee.marital_status || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Blood Group</p>
              <p className="text-gray-900 dark:text-white">{employee.blood_group || "-"}</p>
            </div>
          </div>
        </div>

        {/* Family Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2" >
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Family Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6  items-stretch">
            {/* Primary Family */}

            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Parents
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Father's Name</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {employee.father_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Mother's Name</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {employee.mother_name || "-"}
                  </p>
                </div>
              </div>
            </div>


            {/* Spouse Details */}
            {employee.marital_status === "married" && (

              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Spouse Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Spouse Name</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {employee.spouse_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Occupation</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {employee.spouse_occupation || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Number of Children</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {employee.children_count || "0"}
                    </p>
                  </div>
                </div>
              </div>

            )}

            {/* Emergency Contact */}

            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <PhoneCall className="w-4 h-4" />
                Emergency Contact
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Contact Name</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {employee.emergency_contact_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Relation</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {employee.emergency_contact_relation || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {employee.emergency_contact_phone || "-"}
                  </p>
                </div>
              </div>
            </div>



          </div>
        </div>

        {/* Employment Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employment Details</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Employee Type</p>
              <p className="text-gray-900 dark:text-white">{employee.employee_type || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">PF Applicable</p>
              <p className="text-gray-900 dark:text-white">{employee.pf_applicable ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ESI Applicable</p>
              <p className="text-gray-900 dark:text-white">{employee.esi_applicable ? "Yes" : "No"}</p>
            </div>
          </div>
        </div>

        {/* Statutory Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Statutory Details</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">PAN</p>
              <p className="text-gray-900 dark:text-white">{employee.pan || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aadhaar</p>
              <p className="text-gray-900 dark:text-white">{employee.aadhaar || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">UAN</p>
              <p className="text-gray-900 dark:text-white">{employee.uan || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">PF Number</p>
              <p className="text-gray-900 dark:text-white">{employee.pf_number || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ESI Number</p>
              <p className="text-gray-900 dark:text-white">{employee.esi_number || "-"}</p>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Details</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bank Name</p>
              <p className="text-gray-900 dark:text-white">{employee.bank_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bank Branch</p>
              <p className="text-gray-900 dark:text-white">{employee.bank_branch || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Account Holder Name</p>
              <p className="text-gray-900 dark:text-white">{employee.account_holder_name || "-"}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Account Number</p>
                <p className="text-gray-900 dark:text-white">{employee.bank_account_number || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">IFSC Code</p>
                <p className="text-gray-900 dark:text-white">{employee.bank_ifsc || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Phone className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Contact Details
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 items-stretch">
            {/* Official Contact */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg h-full">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Official Contact
              </h4>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Primary Email</p>
                  <p className="text-gray-900 dark:text-white font-medium break-all">
                    {employee.email || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Official Email</p>
                  <p className="text-gray-900 dark:text-white font-medium break-all">
                    {employee.official_email || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Official Phone</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {employee.official_phone || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Contact */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg h-full">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Personal Contact
              </h4>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Personal Email</p>
                  <p className="text-gray-900 dark:text-white font-medium break-all">
                    {employee.personal_email || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Personal Phone</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {employee.personal_phone || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Alternate Phone</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {employee.alternate_phone || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Address Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Permanent Address</h4>
              <p className="text-gray-900 dark:text-white whitespace-pre-line">
                {employee.permanent_address || "-"}
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Current Address</h4>
              <p className="text-gray-900 dark:text-white whitespace-pre-line">
                {employee.current_address || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Width Sections */}
      <div className="space-y-6">
        {/* Salary Structure - Full Width */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Salary Structure</h3>
          </div>

          {/* Annual and Monthly Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Annual Salary */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Annual Salary (CTC)
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total CTC</span>
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(employee.ctc)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Gross Salary</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(
                      (employee.basic_salary || 0) +
                      (employee.hra || 0) +
                      (employee.special_allowance || 0) +
                      (employee.conveyance_allowance || 0) +
                      (employee.medical_allowance || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Salary */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
              <h4 className="font-medium text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Monthly Salary
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Gross</span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(
                      ((employee.basic_salary || 0) +
                        (employee.hra || 0) +
                        (employee.special_allowance || 0) +
                        (employee.conveyance_allowance || 0) +
                        (employee.medical_allowance || 0)) / 12
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Net</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(
                      ((employee.basic_salary || 0) +
                        (employee.hra || 0) +
                        (employee.special_allowance || 0) +
                        (employee.conveyance_allowance || 0) +
                        (employee.medical_allowance || 0)) / 12
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Salary Components */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Basic Salary */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <BadgeDollarSign className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-gray-900 dark:text-white">Basic Salary</h4>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Annual</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(employee.basic_salary)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monthly</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatCurrency(employee.basic_salary ? employee.basic_salary / 12 : 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* HRA */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-gray-900 dark:text-white">HRA</h4>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Annual</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(employee.hra)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monthly</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatCurrency(employee.hra ? employee.hra / 12 : 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Special Allowance */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Banknote className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-gray-900 dark:text-white">Special Allowance</h4>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Annual</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(employee.special_allowance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monthly</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatCurrency(employee.special_allowance ? employee.special_allowance / 12 : 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Conveyance Allowance */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-gray-900 dark:text-white">Conveyance</h4>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Annual</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(employee.conveyance_allowance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monthly</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatCurrency(employee.conveyance_allowance ? employee.conveyance_allowance / 12 : 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Medical Allowance */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-gray-900 dark:text-white">Medical</h4>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Annual</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(employee.medical_allowance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monthly</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatCurrency(employee.medical_allowance ? employee.medical_allowance / 12 : 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Back Button */}
      <div className="flex justify-center">
        <Link
          href="/payroll/employees"
          className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Employees
        </Link>
      </div>
    </div>
  );
}