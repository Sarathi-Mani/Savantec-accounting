"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { companiesApi, User, Company, LoginRequest, RegisterRequest } from "@/services/api";

// Extended User interface to include employee data
interface ExtendedUser extends User {
  is_employee?: boolean;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  department?: any;
  designation?: any;
  company_name?: string;
  company_id?: string;
}

// Use the existing Company interface and extend it
interface ExtendedCompany extends Company {
  is_employee_company?: boolean;
}

interface AuthContextType {
  user: ExtendedUser | null;
  company: ExtendedCompany | null;
  companies: ExtendedCompany[];
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmployee: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  selectCompany: (company: ExtendedCompany) => void;
  refreshCompanies: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [company, setCompany] = useState<ExtendedCompany | null>(null);
  const [companies, setCompanies] = useState<ExtendedCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmployee, setIsEmployee] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = pathname?.startsWith("/auth");

  // Helper function to get appropriate token
  const getToken = (): string | null => {
    const userType = localStorage.getItem("user_type");
    if (userType === "employee") {
      return localStorage.getItem("employee_token");
    } else {
      return localStorage.getItem("access_token");
    }
  };

  // Helper function to create minimal company from employee data
  const createMinimalCompanyFromEmployee = (employeeData: ExtendedUser): ExtendedCompany => {
    // Create a minimal company object with required properties
    // You need to check what properties are actually required in your Company type
    const minimalCompany: any = {
      id: employeeData.company_id || '',
      name: employeeData.company_name || 'My Company',
      is_employee_company: true,
      // Add other required properties with default values
      user_id: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      // Add other properties that might be required
      country: 'India',
      invoice_prefix: 'INV',
      invoice_counter: 0,
      bank_accounts: [],
    };
    
    return minimalCompany as ExtendedCompany;
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const userType = localStorage.getItem("user_type");
        
        if (userType === "employee") {
          const employeeToken = localStorage.getItem("employee_token");
          const storedEmployee = localStorage.getItem("employee_data");
          
          if (employeeToken && storedEmployee) {
            const parsedEmployee = JSON.parse(storedEmployee);
            setUser(parsedEmployee);
            setIsEmployee(true);
            
            // For employees, create company from employee data
            if (parsedEmployee.company_id && parsedEmployee.company_name) {
              const employeeCompany = createMinimalCompanyFromEmployee(parsedEmployee);
              setCompany(employeeCompany);
              setCompanies([employeeCompany]);
              localStorage.setItem("company_id", employeeCompany.id);
            } else {
              // Fallback if employee data doesn't have company info
              const fallbackCompany = createMinimalCompanyFromEmployee({
                ...parsedEmployee,
                company_id: 'employee-company',
                company_name: 'My Company'
              });
              setCompany(fallbackCompany);
              setCompanies([fallbackCompany]);
              localStorage.setItem("company_id", fallbackCompany.id);
            }
          }
        } else {
          const token = localStorage.getItem("access_token");
          const storedUser = localStorage.getItem("user");
          const storedCompanyId = localStorage.getItem("company_id");

          if (token && storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setIsEmployee(false);

            // Fetch companies for regular users
            try {
              const companiesList = await companiesApi.list();
              setCompanies(companiesList);

              // Restore selected company or select first one
              if (storedCompanyId && companiesList.length > 0) {
                const savedCompany = companiesList.find((c) => c.id === storedCompanyId);
                if (savedCompany) {
                  setCompany(savedCompany);
                } else if (companiesList.length > 0) {
                  setCompany(companiesList[0]);
                  localStorage.setItem("company_id", companiesList[0].id);
                }
              } else if (companiesList.length > 0) {
                setCompany(companiesList[0]);
                localStorage.setItem("company_id", companiesList[0].id);
              }
            } catch (error) {
              console.error("Failed to fetch companies:", error);
            }
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Clear all auth data
  const clearAuth = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("employee_token");
    localStorage.removeItem("employee_data");
    localStorage.removeItem("user_type");
    localStorage.removeItem("company_id");
    setUser(null);
    setCompany(null);
    setCompanies([]);
    setIsEmployee(false);
  };

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;

    if (!user && !isPublicRoute) {
      router.push("/auth/sign-in");
    } else if (user && isPublicRoute) {
      // Redirect based on user type
      if (isEmployee) {
        router.push("/");
      } else {
        router.push("/");
      }
    }
  }, [user, isLoading, isPublicRoute, router, isEmployee]);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api";
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Login failed");
      }

      // Handle different user types
     // In your AuthContext login function, update the employee section:

if (result.user_type === "employee") {
  console.log('Employee login successful:', result);
  
  // Employee login
  localStorage.setItem("employee_token", result.access_token);
  localStorage.setItem("employee_data", JSON.stringify(result.user_data));
  localStorage.setItem("user_type", "employee");
  
  setUser(result.user_data);
  setIsEmployee(true);
  
  // Use the REAL company ID from employee data
  const companyId = result.user_data.company_id;
  const companyName = result.user_data.company_name || 'My Company';
  
  if (!companyId) {
    throw new Error('Employee data missing company_id');
  }
  
  console.log('Using real company ID:', companyId);
  console.log('Company name:', companyName);
  
  // Create company object with real ID
  const employeeCompany: any = {
    id: companyId,  // REAL company ID
    name: companyName,
    is_employee_company: true,
  };
  
  setCompany(employeeCompany);
  setCompanies([employeeCompany]);
  localStorage.setItem("company_id", companyId);  // Store real ID
  
  console.log('Company set for employee:', employeeCompany);
  
  // Redirect to dashboard
  router.push("/");
} else {
        // Regular user login (existing logic)
        console.log('User login successful:', result.user_data);
        
        localStorage.setItem("access_token", result.access_token);
        if (result.refresh_token) {
          localStorage.setItem("refresh_token", result.refresh_token);
        }
        localStorage.setItem("user", JSON.stringify(result.user_data));
        localStorage.setItem("user_type", "user");
        
        setUser(result.user_data);
        setIsEmployee(false);

        // Fetch companies after login
        try {
          const companiesList = await companiesApi.list();
          setCompanies(companiesList);
          
          if (companiesList.length > 0) {
            setCompany(companiesList[0]);
            localStorage.setItem("company_id", companiesList[0].id);
          }
        } catch (error) {
          console.error("Failed to fetch companies after login:", error);
        }

        router.push("/");
      }
    } catch (error: any) {
      throw new Error(error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api";
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Registration failed");
      }

      // Regular user registration (employees don't register)
      localStorage.setItem("access_token", result.access_token);
      if (result.refresh_token) {
        localStorage.setItem("refresh_token", result.refresh_token);
      }
      localStorage.setItem("user", JSON.stringify(result.user));
      localStorage.setItem("user_type", "user");
      
      setUser(result.user);
      setIsEmployee(false);
      router.push("/");
    } catch (error: any) {
      throw new Error(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    clearAuth();
    router.push("/auth/sign-in");
  }, [router]);

  const selectCompany = (selectedCompany: ExtendedCompany) => {
    setCompany(selectedCompany);
    localStorage.setItem("company_id", selectedCompany.id);
  };

  const refreshCompanies = async () => {
    try {
      // For employees, we can't refresh companies list
      if (isEmployee) {
        console.log('Employees cannot refresh companies list');
        return;
      }
      
      const companiesList = await companiesApi.list();
      setCompanies(companiesList);
      
      // Update selected company if it was removed
      if (company && !companiesList.find((c) => c.id === company.id)) {
        if (companiesList.length > 0) {
          setCompany(companiesList[0]);
          localStorage.setItem("company_id", companiesList[0].id);
        } else {
          setCompany(null);
          localStorage.removeItem("company_id");
        }
      }
    } catch (error) {
      console.error("Failed to refresh companies:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        companies,
        isLoading,
        isAuthenticated: !!user,
        isEmployee,
        login,
        register,
        logout,
        selectCompany,
        refreshCompanies,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}