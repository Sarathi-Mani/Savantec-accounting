import api from "./api";

export interface Sale {
  id: string;
  invoice_number: string;
  invoice_date: string;
  customer_id: string;
  customer_name?: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  company_id: string;
  items?: SaleItem[];
}

export interface SaleCreate {
  company_id: string;
  customer_id: string;
  invoice_date: string;
  due_date?: string;
  place_of_supply: string;
  place_of_supply_name: string;
  invoice_type: string;
  items: SaleItemCreate[];
  notes?: string;
  terms?: string;
  sales_person_id?: string;
  contact_id?: string;
  sales_ticket_id?: string;
}

export interface SaleItemCreate {
  product_id?: string;
  description: string;
  hsn_code?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent?: number;
  gst_rate: number;
  // For GST breakdown if needed
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
}

export interface SalesSummary {
  total_sales: number;
  total_invoices: number;
  pending_amount: number;
  paid_amount: number;
}


export interface SaleItem {
  id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_amount: number;
  total_amount: number;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  order_date: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  total_amount: number;
  company_id: string;
}

export interface ProformaInvoice {
  id: string;
  proforma_number: string;
  proforma_date: string;
  customer_id: string;
  customer_name?: string;
  total_amount: number;
  status: string;
  company_id: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  invoice_number?: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  reference_number: string;
  status: string;
}

export interface SalesReturn {
  id: string;
  return_number: string;
  invoice_id: string;
  invoice_number?: string;
  customer_id: string;
  customer_name?: string;
  return_date: string;
  total_amount: number;
  reason: string;
  status: string;
}

export const salesApi = {
    // Create a new sales invoice (should call your invoices API)
  create: async (companyId: string, data: SaleCreate) => {
    const response = await api.post(`/companies/${companyId}/invoices`, data);
    return response.data;
  },

  // List sales invoices
  list: async (companyId: string, params?: any) => {
    const response = await api.get(`/companies/${companyId}/invoices`, { params });
    return response.data;
  },

  // Get sales summary
  getSummary: async (companyId: string, params?: any) => {
    const response = await api.get(`/companies/${companyId}/dashboard/summary`);
    return response.data;
  },

  // Sales invoices
//   list: async (companyId: string, params?: any) => {
//     const response = await api.get(`/api/companies/${companyId}/sales`, { params });
//     return response.data;
//   },

//   create: async (companyId: string, data: any) => {
//     const response = await api.post(`/api/companies/${companyId}/sales`, data);
//     return response.data;
//   },

  update: async (companyId: string, id: string, data: any) => {
    const response = await api.put(`/api/companies/${companyId}/sales/${id}`, data);
    return response.data;
  },

  delete: async (companyId: string, id: string) => {
    const response = await api.delete(`/api/companies/${companyId}/sales/${id}`);
    return response.data;
  },

  // Sales orders
  listOrders: async (companyId: string, params?: any) => {
    const response = await api.get(`/api/companies/${companyId}/sales-orders`, { params });
    return response.data;
  },

  createOrder: async (companyId: string, data: any) => {
    const response = await api.post(`/api/companies/${companyId}/sales-orders`, data);
    return response.data;
  },

  // Proforma invoices
  listProforma: async (companyId: string, params?: any) => {
    const response = await api.get(`/api/companies/${companyId}/proforma-invoices`, { params });
    return response.data;
  },

  createProforma: async (companyId: string, data: any) => {
    const response = await api.post(`/api/companies/${companyId}/proforma-invoices`, data);
    return response.data;
  },

  // Payments
  listPayments: async (companyId: string, params?: any) => {
    const response = await api.get(`/api/companies/${companyId}/sales-payments`, { params });
    return response.data;
  },

  createPayment: async (companyId: string, data: any) => {
    const response = await api.post(`/api/companies/${companyId}/sales-payments`, data);
    return response.data;
  },

  // Returns
  listReturns: async (companyId: string, params?: any) => {
    const response = await api.get(`/api/companies/${companyId}/sales-returns`, { params });
    return response.data;
  },

  createReturn: async (companyId: string, data: any) => {
    const response = await api.post(`/api/companies/${companyId}/sales-returns`, data);
    return response.data;
  },
};