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

// Sales Order Interfaces
export interface SalesOrderCreate {
  company_id: string;
  customer_id: string;
  sales_order_date: string;
  expire_date?: string |null;
  status: 'pending' | 'approved' | 'cancelled' | 'completed';
  reference_no?: string |null;
  reference_date?: string |null;
  payment_terms?: string |null;
  sales_person_id?: string;
  contact_person?: string;
  notes?: string;
  terms?: string;
  other_charges?: number;
  discount_on_all?: number;
  subtotal: number;
  total_tax: number;
  total_amount: number;
  send_message?: boolean;
  items: SalesOrderItemCreate[];
}

export interface SalesOrderItemCreate {
  product_id?: string;
  description: string;
  quantity: number;
  
  unit: string;
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  gst_rate: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  taxable_amount: number;
  total_amount: number;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  sales_order_date: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  total_amount: number;
  company_id: string;
  expire_date?: string;
  reference_no?: string;
  reference_date?: string;
  payment_terms?: string;
  sales_person_id?: string;
  contact_person?: string;
  notes?: string;
  terms?: string;
  other_charges?: number;
  discount_on_all?: number;
  subtotal: number;
  total_tax: number;
  items?: SalesOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id?: string;
  product_name?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  taxable_amount: number;
  total_amount: number;
}

// Proforma Invoice Interfaces
export interface ProformaInvoiceCreate {
  company_id: string;
  customer_id: string;
  proforma_date: string;
  due_date?: string;
  reference_no?: string;
  reference_date?: string;
  sales_person_id?: string;
  contact_person?: string;
  bank_account_id?: string;
  notes?: string;
  terms?: string;
  freight_charges?: number;
  pf_charges?: number;
  discount_on_all?: number;
  subtotal: number;
  total_tax: number;
  total_amount: number;
  items: ProformaInvoiceItemCreate[];
}

export interface ProformaInvoiceItemCreate {
  product_id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  gst_rate: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  taxable_amount: number;
  total_amount: number;
}

export interface ProformaInvoice {
  id: string;
  proforma_number: string;
  proforma_date: string;
  customer_id: string;
  customer_name?: string;
  total_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'converted' | 'cancelled';
  company_id: string;
  due_date?: string;
  reference_no?: string;
  reference_date?: string;
  sales_person_id?: string;
  contact_person?: string;
  bank_account_id?: string;
  notes?: string;
  terms?: string;
  freight_charges?: number;
  pf_charges?: number;
  discount_on_all?: number;
  subtotal: number;
  total_tax: number;
  items?: ProformaInvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface ProformaInvoiceItem {
  id: string;
  proforma_invoice_id: string;
  product_id?: string;
  product_name?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  taxable_amount: number;
  total_amount: number;
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
  // Sales invoices
  create: async (companyId: string, data: SaleCreate) => {
    const response = await api.post(`/companies/${companyId}/invoices`, data);
    return response.data;
  },

  list: async (companyId: string, params?: any) => {
    const response = await api.get(`/companies/${companyId}/invoices`, { params });
    return response.data;
  },

  get: async (companyId: string, invoiceId: string) => {
    const response = await api.get(`/companies/${companyId}/invoices/${invoiceId}`);
    return response.data;
  },

  update: async (companyId: string, invoiceId: string, data: Partial<SaleCreate>) => {
    const response = await api.put(`/companies/${companyId}/invoices/${invoiceId}`, data);
    return response.data;
  },

  delete: async (companyId: string, invoiceId: string) => {
    const response = await api.delete(`/companies/${companyId}/invoices/${invoiceId}`);
    return response.data;
  },

  // Sales summary
  getSummary: async (companyId: string, params?: any) => {
    const response = await api.get(`/companies/${companyId}/dashboard/summary`, { params });
    return response.data;
  },

  // Sales orders
  listOrders: async (companyId: string, params?: any) => {
    const response = await api.get(`/companies/${companyId}/sales-orders`, { params });
    return response.data;
  },

  createOrder: async (companyId: string, data: SalesOrderCreate) => {
    const response = await api.post(`/companies/${companyId}/sales-orders`, data);
    return response.data;
  },

  getOrder: async (companyId: string, orderId: string) => {
    const response = await api.get(`/companies/${companyId}/sales-orders/${orderId}`);
    return response.data;
  },

  updateOrder: async (companyId: string, orderId: string, data: Partial<SalesOrderCreate>) => {
    const response = await api.put(`/companies/${companyId}/sales-orders/${orderId}`, data);
    return response.data;
  },

  deleteOrder: async (companyId: string, orderId: string) => {
    const response = await api.delete(`/companies/${companyId}/sales-orders/${orderId}`);
    return response.data;
  },

  updateOrderStatus: async (companyId: string, orderId: string, status: string) => {
    const response = await api.patch(`/companies/${companyId}/sales-orders/${orderId}/status`, { status });
    return response.data;
  },

  // Proforma invoices
  listProforma: async (companyId: string, params?: any) => {
    const response = await api.get(`/companies/${companyId}/proforma-invoices`, { params });
    return response.data;
  },

  createProforma: async (companyId: string, data: ProformaInvoiceCreate) => {
    const response = await api.post(`/companies/${companyId}/proforma-invoices`, data);
    return response.data;
  },

  getProforma: async (companyId: string, proformaId: string) => {
    const response = await api.get(`/companies/${companyId}/proforma-invoices/${proformaId}`);
    return response.data;
  },

  updateProforma: async (companyId: string, proformaId: string, data: Partial<ProformaInvoiceCreate>) => {
    const response = await api.put(`/companies/${companyId}/proforma-invoices/${proformaId}`, data);
    return response.data;
  },

  deleteProforma: async (companyId: string, proformaId: string) => {
    const response = await api.delete(`/companies/${companyId}/proforma-invoices/${proformaId}`);
    return response.data;
  },

  updateProformaStatus: async (companyId: string, proformaId: string, status: string) => {
    const response = await api.patch(`/companies/${companyId}/proforma-invoices/${proformaId}/status`, { status });
    return response.data;
  },

  convertProformaToInvoice: async (companyId: string, proformaId: string, data?: any) => {
    const response = await api.post(`/companies/${companyId}/proforma-invoices/${proformaId}/convert-to-invoice`, data);
    return response.data;
  },

  // Payments
  listPayments: async (companyId: string, params?: any) => {
    const response = await api.get(`/companies/${companyId}/payments`, { params });
    return response.data;
  },

  createPayment: async (companyId: string, data: any) => {
    const response = await api.post(`/companies/${companyId}/payments`, data);
    return response.data;
  },

  // Returns
  listReturns: async (companyId: string, params?: any) => {
    const response = await api.get(`/companies/${companyId}/sales-returns`, { params });
    return response.data;
  },

  createReturn: async (companyId: string, data: any) => {
    const response = await api.post(`/companies/${companyId}/sales-returns`, data);
    return response.data;
  },
};

// Separate API objects for modular imports
export const salesOrdersApi = {
  list: async (companyId: string, params?: any) => {
    const response = await api.get(`/companies/${companyId}/sales-orders`, { params });
    return response.data;
  },

  create: async (companyId: string, data: SalesOrderCreate) => {
    const response = await api.post(`/companies/${companyId}/orders/sales`, data);
    return response.data;
  },

  get: async (companyId: string, orderId: string) => {
    const response = await api.get(`/companies/${companyId}/sales-orders/${orderId}`);
    return response.data;
  },

  update: async (companyId: string, orderId: string, data: Partial<SalesOrderCreate>) => {
    const response = await api.put(`/companies/${companyId}/sales-orders/${orderId}`, data);
    return response.data;
  },

  delete: async (companyId: string, orderId: string) => {
    const response = await api.delete(`/companies/${companyId}/sales-orders/${orderId}`);
    return response.data;
  },

  updateStatus: async (companyId: string, orderId: string, status: string) => {
    const response = await api.patch(`/companies/${companyId}/sales-orders/${orderId}/status`, { status });
    return response.data;
  },
};

export const proformaInvoicesApi = {
  list: async (companyId: string, params?: any) => {
    const response = await api.get(`/companies/${companyId}/proforma-invoices`, { params });
    return response.data;
  },

  create: async (companyId: string, data: ProformaInvoiceCreate) => {
    const response = await api.post(`/companies/${companyId}/proforma-invoices`, data);
    return response.data;
  },

  get: async (companyId: string, proformaId: string) => {
    const response = await api.get(`/companies/${companyId}/proforma-invoices/${proformaId}`);
    return response.data;
  },

  update: async (companyId: string, proformaId: string, data: Partial<ProformaInvoiceCreate>) => {
    const response = await api.put(`/companies/${companyId}/proforma-invoices/${proformaId}`, data);
    return response.data;
  },

  delete: async (companyId: string, proformaId: string) => {
    const response = await api.delete(`/companies/${companyId}/proforma-invoices/${proformaId}`);
    return response.data;
  },

  updateStatus: async (companyId: string, proformaId: string, status: string) => {
    const response = await api.patch(`/companies/${companyId}/proforma-invoices/${proformaId}/status`, { status });
    return response.data;
  },

  convertToInvoice: async (companyId: string, proformaId: string, data?: any) => {
    const response = await api.post(`/companies/${companyId}/proforma-invoices/${proformaId}/convert-to-invoice`, data);
    return response.data;
  },

  sendEmail: async (companyId: string, proformaId: string, emailData: any) => {
    const response = await api.post(`/companies/${companyId}/proforma-invoices/${proformaId}/send-email`, emailData);
    return response.data;
  },

  downloadPDF: async (companyId: string, proformaId: string) => {
    const response = await api.get(`/companies/${companyId}/proforma-invoices/${proformaId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },
};