"use client";

import { useAuth } from "@/context/AuthContext";
import { customersApi, productsApi, salesmenApi, quotationsApi } from "@/services/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import Select from "react-select";

interface QuotationItem {
  id?: string;
  product_id?: string;
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  gst_rate: number;
}

interface OtherCharge {
  id: string;
  name: string;
  amount: number;
  type: "fixed" | "percentage";
  tax: number;
}

interface ExcelCell {
  id: string;
  value: string;
  isFormula: boolean;
  formula?: string;
  computedValue?: number | string;
  row: number;
  col: number;
}

interface FormData {
  quotation_code: string;
  quotation_date: string;
  validity_days: number;
  customer_id?: string;
  notes: string;
  terms: string;
  subject?: string;
  tax_regime?: "cgst_sgst" | "igst";
  status?: "open" | "closed" | "po_converted" | "lost";
  salesman_id?: string;
  reference?: string;
  reference_no?: string;
  reference_date?: string;
  payment_terms?: string;
  place_of_supply?: string;
  remarks?: string;
  contact_person?: string;
}

// Toast component (same as in create page)
const Toast = ({ message, type = "success", onClose }: { 
  message: string; 
  type?: "success" | "error" | "info" | "warning";
  onClose: () => void;
}) => {
  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500"
  }[type];

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
          ×
        </button>
      </div>
    </div>
  );
};

// Helper functions for Excel grid
const getColumnIndex = (colLetter: string): number => {
  if (!colLetter || typeof colLetter !== 'string') return 0;
  
  let index = 0;
  for (let i = 0; i < colLetter.length; i++) {
    const charCode = colLetter.charCodeAt(i);
    if (charCode >= 65 && charCode <= 90) {
      index = index * 26 + (charCode - 64);
    } else if (charCode >= 97 && charCode <= 122) {
      index = index * 26 + (charCode - 96);
    }
  }
  return index - 1;
};

const getColumnLetter = (index: number): string => {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode(65 + (index % 26)) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
};

export default function EditQuotationPage() {
  const { company } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quotationId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [contactPersons, setContactPersons] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedContactPerson, setSelectedContactPerson] = useState<any>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "info" | "warning" }>>([]);
  const [activeCell, setActiveCell] = useState<{row: number, col: number} | null>(null);
  
  // Standard Terms Template
  const standardTermsTemplate = `1. Packing/Forwarding: Nil\n2. Freight: Actual\n3. Payment: 30 Days\n4. Delivery: 4 Weeks\n5. Validity: 30 days\n6. Taxes: All taxes as applicable\n7. Installation: At actual\n8. Warranty: As per product warranty`;

  const [formData, setFormData] = useState<FormData>({
    quotation_code: "",
    quotation_date: new Date().toISOString().split("T")[0],
    validity_days: 30,
    customer_id: "",
    notes: "",
    terms: "",
    subject: "",
    place_of_supply: "",
    tax_regime: undefined,
    status: "open",
    salesman_id: "",
    reference: "",
    reference_no: "",
    reference_date: "",
    payment_terms: standardTermsTemplate,
    remarks: "",
    contact_person: ""
  });

  const [items, setItems] = useState<QuotationItem[]>([
    { 
      product_id: "", 
      hsn_code: "", 
      description: "", 
      quantity: 1, 
      unit: "unit", 
      unit_price: 0, 
      discount_percent: 0, 
      gst_rate: 18 
    }
  ]);

  const [otherCharges, setOtherCharges] = useState<OtherCharge[]>([
    { id: Date.now().toString(), name: "", amount: 0, type: "fixed", tax: 18 }
  ]);

  const [globalDiscount, setGlobalDiscount] = useState({
    value: 0,
    type: "percentage" as "percentage" | "fixed"
  });

  // Excel Grid State
  const [excelGrid, setExcelGrid] = useState<ExcelCell[][]>(() => {
    const initialRows = 10;
    const initialCols = 10;
    const grid: ExcelCell[][] = [];
    
    for (let r = 0; r < initialRows; r++) {
      const row: ExcelCell[] = [];
      for (let c = 0; c < initialCols; c++) {
        row.push({
          id: `${r}_${c}`,
          value: '',
          isFormula: false,
          row: r,
          col: c,
          computedValue: ''
        });
      }
      grid.push(row);
    }
    return grid;
  });

  const [gridRows, setGridRows] = useState(10);
  const [gridCols, setGridCols] = useState(10);
  const [totalRows, setTotalRows] = useState(10);
  const [totalCols, setTotalCols] = useState(10);

  // Helper functions
  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const getOrCreateCell = (grid: ExcelCell[][], row: number, col: number): ExcelCell => {
    while (grid.length <= row) {
      const newRow: ExcelCell[] = [];
      for (let c = 0; c < Math.max(gridCols, col + 1); c++) {
        newRow.push({
          id: `${grid.length}_${c}`,
          value: '',
          isFormula: false,
          row: grid.length,
          col: c,
          computedValue: ''
        });
      }
      grid.push(newRow);
    }
    
    const currentRow = grid[row];
    while (currentRow.length <= col) {
      currentRow.push({
        id: `${row}_${currentRow.length}`,
        value: '',
        isFormula: false,
        row: row,
        col: currentRow.length,
        computedValue: ''
      });
    }
    
    return grid[row][col];
  };

  const evaluateFormula = (expr: string, grid: ExcelCell[][]): number | string => {
    try {
      expr = expr.trim();
      if (expr.startsWith('=')) {
        expr = expr.substring(1).trim();
      }
      
      const singleCellPattern = /^([A-Z]+)(\d+)$/;
      const singleCellMatch = expr.match(singleCellPattern);
      if (singleCellMatch) {
        const col = singleCellMatch[1];
        const rowStr = singleCellMatch[2];
        const row = parseInt(rowStr) - 1;
        
        if (isNaN(row) || row < 0) {
          return '#ERROR';
        }
        
        const colIndex = getColumnIndex(col);
        
        if (row >= 0 && row < grid.length && colIndex >= 0 && colIndex < (grid[row]?.length || 0)) {
          const val = grid[row][colIndex]?.computedValue;
          return val || '';
        }
      }
      
      const cellReferencePattern = /([A-Z]+)(\d+)/g;
      let processedExpr = expr;
      let match;
      
      while ((match = cellReferencePattern.exec(expr)) !== null) {
        const colLetter = match[1];
        const rowStr = match[2];
        const rowNum = parseInt(rowStr) - 1;
        
        if (isNaN(rowNum) || rowNum < 0) {
          continue;
        }
        
        const colIndex = getColumnIndex(colLetter);
        
        if (rowNum >= 0 && rowNum < grid.length && colIndex >= 0 && colIndex < (grid[rowNum]?.length || 0)) {
          const cell = grid[rowNum][colIndex];
          if (cell) {
            const cellValue = cell.computedValue || cell.value || '0';
            const cellValueStr = String(cellValue);
            const numValue = parseFloat(cellValueStr);
            if (!isNaN(numValue)) {
              processedExpr = processedExpr.replace(match[0], numValue.toString());
            }
          }
        }
      }
      
      processedExpr = processedExpr.replace(/(\d+(\.\d+)?)%/g, (match, p1) => {
        const percentageValue = parseFloat(p1);
        if (!isNaN(percentageValue)) {
          return (percentageValue / 100).toString();
        }
        return match;
      });
      
      const number = parseFloat(processedExpr);
      if (!isNaN(number)) {
        return number;
      }
      
      try {
        const safeExpr = processedExpr
          .replace(/[^0-9+\-*/().%]/g, '')
          .replace(/%/g, '*0.01');
        
        if (safeExpr.trim() === '') {
          return '#ERROR';
        }
        
        const result = Function(`'use strict'; return (${safeExpr})`)();
        
        if (typeof result === 'number' && !isNaN(result)) {
          return result;
        }
        
        return '#ERROR';
      } catch (error) {
        console.error('Evaluation error:', error);
        return '#ERROR';
      }
      
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return '#ERROR';
    }
  };

  const updateDependentCells = (grid: ExcelCell[][]) => {
    let updated = false;
    do {
      updated = false;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < (grid[r]?.length || 0); c++) {
          const cell = grid[r][c];
          if (cell && cell.isFormula && cell.formula) {
            const oldValue = cell.computedValue;
            try {
              cell.computedValue = evaluateFormula(cell.formula, grid);
            } catch {
              cell.computedValue = '#ERROR';
            }
            if (cell.computedValue !== oldValue) {
              updated = true;
            }
          }
        }
      }
    } while (updated);
  };

  const updateCell = (row: number, col: number, value: string) => {
    const newGrid = [...excelGrid.map(rowArr => [...rowArr])];
    const cell = getOrCreateCell(newGrid, row, col);
    
    if (row >= totalRows) {
      setTotalRows(row + 1);
    }
    if (col >= totalCols) {
      setTotalCols(col + 1);
    }
    
    if (value.trim().startsWith('=')) {
      cell.isFormula = true;
      cell.formula = value.trim();
      cell.value = value.trim();
      
      try {
        cell.computedValue = evaluateFormula(value, newGrid);
      } catch (error) {
        console.error('Formula error:', error);
        cell.computedValue = '#ERROR';
      }
    } else {
      cell.isFormula = false;
      cell.formula = undefined;
      cell.value = value;
      
      const numValue = parseFloat(value);
      cell.computedValue = !isNaN(numValue) ? numValue : value;
    }
    
    updateDependentCells(newGrid);
    setExcelGrid(newGrid);
  };

  const handlePasteEnhanced = (e: React.ClipboardEvent, startRow: number, startCol: number) => {
    e.preventDefault();
    
    const pastedData = e.clipboardData.getData('text');
    const rows = pastedData.trim().split('\n');
    
    const neededRows = startRow + rows.length;
    const neededCols = startCol + Math.max(...rows.map(row => {
      if (row.includes('\t')) {
        return row.split('\t').length;
      } else if (row.includes(',')) {
        return row.split(',').length;
      }
      return 1;
    }));
    
    const newGrid = [...excelGrid.map(row => [...row])];
    
    for (let r = 0; r < neededRows; r++) {
      if (!newGrid[r]) {
        newGrid[r] = [];
      }
      for (let c = 0; c < neededCols; c++) {
        if (!newGrid[r][c]) {
          newGrid[r][c] = {
            id: `${r}_${c}`,
            value: '',
            isFormula: false,
            row: r,
            col: c,
            computedValue: ''
          };
        }
      }
    }
    
    setTotalRows(Math.max(totalRows, neededRows));
    setTotalCols(Math.max(totalCols, neededCols));
    
    if (neededRows > gridRows) {
      setGridRows(neededRows);
    }
    if (neededCols > gridCols) {
      setGridCols(neededCols);
    }
    
    rows.forEach((rowStr, rowOffset) => {
      const cells = rowStr.split('\t');
      cells.forEach((cellValue, colOffset) => {
        const targetRow = startRow + rowOffset;
        const targetCol = startCol + colOffset;
        
        const cell = newGrid[targetRow][targetCol];
        const value = cellValue.trim();
        
        if (value.startsWith('=')) {
          cell.isFormula = true;
          cell.formula = value;
          cell.value = value;
          try {
            cell.computedValue = evaluateFormula(value, newGrid);
          } catch {
            cell.computedValue = '#ERROR';
          }
        } else {
          cell.isFormula = false;
          cell.formula = undefined;
          cell.value = value;
          const numValue = parseFloat(value);
          cell.computedValue = !isNaN(numValue) ? numValue : value;
        }
      });
    });
    
    updateDependentCells(newGrid);
    setExcelGrid(newGrid);
    
    showToast(`Pasted ${rows.length} rows`, 'success');
  };

  const clearGrid = () => {
    const newGrid = [...excelGrid.map(row => [...row])];
    for (let r = 0; r < newGrid.length; r++) {
      for (let c = 0; c < newGrid[r].length; c++) {
        newGrid[r][c] = {
          ...newGrid[r][c],
          value: '',
          isFormula: false,
          formula: undefined,
          computedValue: ''
        };
      }
    }
    setExcelGrid(newGrid);
    showToast('Grid cleared', 'info');
  };

  const exportToCSV = () => {
    let csv = '';
    
    for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
      const rowNumber = rowIndex + 1;
      const row = excelGrid[rowIndex] || [];
      const rowData = [rowNumber];
      
      for (let colIndex = 0; colIndex < totalCols; colIndex++) {
        const cell = row[colIndex];
        if (cell && cell.isFormula && cell.formula) {
          rowData.push(cell.formula);
        } else if (cell) {
          rowData.push(cell.computedValue || cell.value || '');
        } else {
          rowData.push('');
        }
      }
      
      csv += rowData.join(',') + '\n';
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotation_notes_${formData.quotation_code}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast(`CSV exported`, 'success');
  };

  const calculateItemTotal = useCallback((item: QuotationItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = subtotal * (item.discount_percent / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (item.gst_rate / 100);
    const total = taxableAmount + taxAmount;
    
    return {
      subtotal,
      discountAmount,
      taxableAmount,
      taxAmount,
      total
    };
  }, []);

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalItems = 0;
    let totalQuantity = 0;

    items.forEach(item => {
      if (item.quantity > 0 && item.unit_price > 0) {
        totalItems++;
      }
      totalQuantity += item.quantity;

      const itemCalc = calculateItemTotal(item);
      subtotal += itemCalc.subtotal;
      totalDiscount += itemCalc.discountAmount;
      totalTaxable += itemCalc.taxableAmount;

      if (formData.tax_regime === "cgst_sgst") {
        totalCgst += itemCalc.taxAmount / 2;
        totalSgst += itemCalc.taxAmount / 2;
      } else if (formData.tax_regime === "igst") {
        totalIgst += itemCalc.taxAmount;
      }
    });

    let otherChargesTotal = 0;
    otherCharges.forEach(charge => {
      if (!charge.name.trim() && charge.amount === 0) return;
      
      let chargeAmount = charge.amount;
      if (charge.type === "percentage") {
        chargeAmount = totalTaxable * (charge.amount / 100);
      }
      
      const chargeTax = chargeAmount * (charge.tax / 100);
      const chargeTotal = chargeAmount + chargeTax;
      otherChargesTotal += chargeTotal;

      if (formData.tax_regime === "cgst_sgst") {
        totalCgst += chargeTax / 2;
        totalSgst += chargeTax / 2;
      } else if (formData.tax_regime === "igst") {
        totalIgst += chargeTax;
      }
    });

    const totalTax = totalCgst + totalSgst + totalIgst;
    const totalBeforeRoundOff = totalTaxable + otherChargesTotal + totalTax;
    const roundOff = Math.round(totalBeforeRoundOff) - totalBeforeRoundOff;
    const grandTotal = totalBeforeRoundOff + roundOff;

    return {
      totalItems,
      totalQuantity,
      subtotal,
      totalDiscount,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      roundOff,
      grandTotal,
      otherChargesTotal
    };
  }, [items, otherCharges, formData.tax_regime, calculateItemTotal]);

  // Fetch data
  const fetchData = async () => {
    if (!company?.id || !quotationId) return;
    
    try {
      setLoading(true);
      
      // Fetch customers
      try {
        const customersData = await customersApi.list(company.id, { page_size: 100 });
        let customersArray: any[] = [];
        if (customersData && typeof customersData === 'object') {
          customersArray = customersData.customers || [];
        }
        setCustomers(customersArray);
      } catch (customerError: any) {
        console.error("Failed to fetch customers:", customerError);
      }
      
      // Fetch products
      try {
        const productsData: any = await productsApi.list(company.id, { page_size: 100 });
        let productsArray: any[] = [];
        
        if (Array.isArray(productsData)) {
          productsArray = productsData;
        } else if (productsData && typeof productsData === 'object') {
          if (productsData.products && Array.isArray(productsData.products)) {
            productsArray = productsData.products;
          } else if (productsData.data && Array.isArray(productsData.data)) {
            productsArray = productsData.data;
          } else if (productsData.items && Array.isArray(productsData.items)) {
            productsArray = productsData.items;
          }
        }
        setProducts(productsArray);
      } catch (productError: any) {
        console.error("Product fetch error:", productError);
      }
      
      // Fetch sales engineers
      await fetchSalesEngineers();
      
      // Fetch quotation data
      await fetchQuotationData();
      
    } catch (error) {
      console.error("Unexpected error in fetchData:", error);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesEngineers = async () => {
    if (!company?.id) return;
    
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        showToast("Authentication required", "error");
        return;
      }

      const salesEngineersUrl = `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/sales-engineers`;
      
      const response = await fetch(salesEngineersUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          const formattedSalesmen = data.map(engineer => ({
            id: engineer.id,
            name: engineer.full_name || 'Unnamed Engineer',
            email: engineer.email || '',
            phone: engineer.phone || '',
            designation: engineer.designation_name || 'Sales Engineer',
            employee_code: engineer.employee_code || ''
          }));
          setSalesmen(formattedSalesmen);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch sales engineers:", error);
    }
  };

  const fetchContactPersons = async (customerId: string) => {
    if (!company?.id) return;
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/contact-persons?customer_id=${customerId}`;
      
      const response = await fetch(
        apiUrl,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        let persons: any[] = [];
        
        if (Array.isArray(data)) {
          persons = data;
        } else if (data && typeof data === 'object') {
          persons = data.contact_persons || data.contacts || data.data || data.items || [];
        }
        
        setContactPersons(persons);
        
        if (persons.length > 0 && formData.contact_person) {
          const matchingPerson = persons.find(p => p.name === formData.contact_person);
          if (matchingPerson) {
            setSelectedContactPerson(matchingPerson);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch contact persons:", error);
      setContactPersons([]);
    }
  };

  const fetchQuotationData = async () => {
    if (!company?.id || !quotationId) return;
    
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${quotationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const quotation = await response.json();
        
        // Set form data
        setFormData({
          quotation_code: quotation.quotation_number || quotation.quotation_code || "",
          quotation_date: quotation.quotation_date ? new Date(quotation.quotation_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          validity_days: quotation.validity_days || 30,
          customer_id: quotation.customer_id || "",
          notes: quotation.notes || "",
          terms: quotation.terms || "",
          subject: quotation.subject || `Quotation ${quotation.quotation_number}`,
          place_of_supply: quotation.place_of_supply || "",
          tax_regime: quotation.tax_regime || "cgst_sgst",
          status: quotation.status || "open",
          salesman_id: quotation.sales_person_id || "",
          reference: quotation.reference || "",
          reference_no: quotation.reference_no || "",
          reference_date: quotation.reference_date ? new Date(quotation.reference_date).toISOString().split("T")[0] : "",
          payment_terms: quotation.payment_terms || standardTermsTemplate,
          remarks: quotation.remarks || "",
          contact_person: quotation.contact_person || ""
        });
        
        // Set items
        if (quotation.items && Array.isArray(quotation.items)) {
          setItems(quotation.items.map((item: any) => ({
            id: item.id,
            product_id: item.product_id || "",
            hsn_code: item.hsn_code || "",
            description: item.description || "",
            quantity: item.quantity || 1,
            unit: item.unit || "unit",
            unit_price: item.unit_price || 0,
            discount_percent: item.discount_percent || 0,
            gst_rate: item.gst_rate || 18
          })));
        }
        
        // Set customer if exists
        if (quotation.customer_id) {
          const customer = customers.find(c => c.id === quotation.customer_id);
          if (customer) {
            setSelectedCustomer(customer);
            await fetchContactPersons(customer.id);
          }
        }
        
        // Fetch Excel notes if available
        if (quotation.excel_notes_file_url) {
          await fetchExcelNotes(quotation.excel_notes_file_url);
        }
        
        showToast("Quotation loaded successfully", "success");
      } else {
        showToast("Failed to load quotation", "error");
        router.push("/quotations");
      }
    } catch (error) {
      console.error("Failed to fetch quotation:", error);
      showToast("Failed to load quotation", "error");
    }
  };

  const fetchExcelNotes = async (fileUrl: string) => {
    try {
      const response = await fetch(fileUrl);
      if (response.ok) {
        const text = await response.text();
        // Parse CSV and load into grid
        const rows = text.split('\n').filter(row => row.trim());
        const newGrid: ExcelCell[][] = [];
        
        rows.forEach((rowStr, rowIndex) => {
          const cells = rowStr.split(',');
          const row: ExcelCell[] = [];
          
          cells.forEach((cellValue, colIndex) => {
            row.push({
              id: `${rowIndex}_${colIndex}`,
              value: cellValue.replace(/^"|"$/g, ''), // Remove quotes
              isFormula: false,
              row: rowIndex,
              col: colIndex,
              computedValue: cellValue.replace(/^"|"$/g, '')
            });
          });
          
          newGrid.push(row);
        });
        
        if (newGrid.length > 0) {
          setExcelGrid(newGrid);
          setGridRows(newGrid.length);
          setGridCols(newGrid[0].length);
          setTotalRows(newGrid.length);
          setTotalCols(newGrid[0].length);
        }
      }
    } catch (error) {
      console.error("Failed to load Excel notes:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [company?.id, quotationId]);

  // Item management functions
  const addItem = () => {
    setItems([...items, { 
      product_id: "", 
      hsn_code: "", 
      description: "", 
      quantity: 1, 
      unit: "unit", 
      unit_price: 0, 
      discount_percent: 0, 
      gst_rate: 18 
    }]);
    showToast("New item row added", "info");
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      showToast("Item removed", "info");
    } else {
      showToast("At least one item is required", "warning");
    }
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items];
    
    if (field === "product_id" && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: value,
          hsn_code: product.hsn || product.hsn_code || "",
          description: product.description || product.name || "Product",
          unit_price: product.unit_price || product.sales_price || 0,
          discount_percent: product.discount || 0,
          gst_rate: Number(product.tax_rate || product.gst_rate || 18)
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    if (field === "description" && !value.trim()) {
      newItems[index] = { ...newItems[index], description: "Item" };
    }
    
    setItems(newItems);
  };

  // Other charges management
  const addOtherCharge = () => {
    setOtherCharges([...otherCharges, { 
      id: Date.now().toString(), 
      name: "", 
      amount: 0, 
      type: "fixed", 
      tax: 18 
    }]);
  };

  const removeOtherCharge = (id: string) => {
    if (otherCharges.length > 1) {
      setOtherCharges(otherCharges.filter(charge => charge.id !== id));
    }
  };

  const updateOtherCharge = (id: string, field: keyof OtherCharge, value: any) => {
    setOtherCharges(otherCharges.map(charge => 
      charge.id === id 
        ? { ...charge, [field]: value }
        : charge
    ));
  };

  // Apply global discount
  const applyGlobalDiscount = () => {
    if (globalDiscount.value <= 0) {
      showToast("Please enter a discount value", "warning");
      return;
    }

    const newItems = items.map(item => {
      if (globalDiscount.type === "percentage") {
        const finalDiscount = Math.min(globalDiscount.value, 100);
        return { ...item, discount_percent: finalDiscount };
      } else {
        const itemSubtotal = item.quantity * item.unit_price;
        const percentageDiscount = (globalDiscount.value / itemSubtotal) * 100;
        const finalDiscount = Math.min(percentageDiscount, 100);
        return { ...item, discount_percent: finalDiscount };
      }
    });

    setItems(newItems);
    showToast("Discount applied to all items", "success");
  };

  // Customer change handler
  const handleCustomerChange = async (option: any) => {
    if (option) {
      const customer = option.data;
      setSelectedCustomer(customer);
      setFormData(prev => ({
        ...prev,
        customer_id: option.value,
        contact_person: ""
      }));
      
      setSelectedContactPerson(null);
      setContactPersons([]);
      
      await fetchContactPersons(customer.id);
      
      if (customer.billing_state && company?.state) {
        const isSameState = customer.billing_state === company.state;
        setFormData(prev => ({
          ...prev,
          tax_regime: isSameState ? "cgst_sgst" : "igst"
        }));
      }
    } else {
      setSelectedCustomer(null);
      setSelectedContactPerson(null);
      setContactPersons([]);
      setFormData(prev => ({
        ...prev,
        customer_id: "",
        contact_person: "",
        tax_regime: undefined  
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Form validation
  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.customer_id) {
      errors.push("Please select a customer");
    }

    if (!formData.contact_person) {
      errors.push("Please select a contact person");
    }

    if (!formData.salesman_id) {
      errors.push("Please select a sales engineer");
    }

    const validItems = items.filter(item => 
      item.quantity > 0 && item.unit_price > 0 && item.description.trim()
    );

    if (validItems.length === 0) {
      errors.push("Please add at least one valid item");
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => showToast(error, "error"));
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!company?.id || !token || !quotationId) {
      showToast("Authentication required", "error");
      return;
    }

    setSaving(true);

    try {
      // Get Excel data as text
      const excelDataText = exportToCSVForSubmission();
      
      // Prepare items for backend
      const itemsForBackend = items
        .filter(item => item.quantity > 0 && item.unit_price >= 0)
        .map(item => ({
          id: item.id || undefined,
          product_id: item.product_id || undefined,
          description: item.description || "Item",
          hsn_code: item.hsn_code || "",
          quantity: item.quantity,
          unit: item.unit || "unit",
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          gst_rate: item.gst_rate
        }));

      if (itemsForBackend.length === 0) {
        showToast("Please add at least one valid item", "error");
        setSaving(false);
        return;
      }

      // Prepare the JSON payload
      const payload = {
        customer_id: formData.customer_id || undefined,
        quotation_date: new Date(formData.quotation_date).toISOString(),
        validity_days: formData.validity_days,
        place_of_supply: selectedCustomer?.billing_state || undefined,
        subject: formData.subject || `Quotation ${formData.quotation_code}`,
        notes: formData.notes || undefined,
        terms: formData.terms || undefined,
        remarks: formData.remarks || undefined,
        contact_person: formData.contact_person || undefined,
        sales_person_id: formData.salesman_id || undefined,
        reference: formData.reference || undefined,
        reference_no: formData.reference_no || undefined,
        reference_date: formData.reference_date || undefined,
        payment_terms: formData.payment_terms || undefined,
        excel_notes: excelDataText || undefined,
        items: itemsForBackend,
        status: formData.status || "open",
        tax_regime: formData.tax_regime || "cgst_sgst"
      };

      // Create FormData
      const formDataToSend = new FormData();
      formDataToSend.append('data', JSON.stringify(payload));
      
      if (excelDataText) {
        const csvBlob = new Blob([excelDataText], { type: 'text/csv' });
        formDataToSend.append('excel_file', csvBlob, 'excel_notes.csv');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${quotationId}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: formDataToSend,
        }
      );

      if (response.ok) {
        const data = await response.json();
        showToast("Quotation updated successfully!", "success");
        router.push(`/quotations/${quotationId}`);
      } else {
        const errorText = await response.text();
        console.error("Backend error response:", errorText);
        
        let errorMessage = "Failed to update quotation";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map((err: any) => err.msg || err.message).join(", ");
            } else if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (errorData.detail?.msg) {
              errorMessage = errorData.detail.msg;
            }
          }
        } catch (parseError) {
          errorMessage = errorText || "Unknown error occurred";
        }
        
        showToast(errorMessage, "error");
      }
    } catch (err: any) { 
      console.error("Submission error:", err);
      const errorMessage = err instanceof Error ? err.message : "Network error";
      showToast("Failed to update quotation: " + errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  const exportToCSVForSubmission = () => {
    let csv = '';
    
    for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
      const row = excelGrid[rowIndex] || [];
      const rowData = [];
      
      for (let colIndex = 0; colIndex < totalCols; colIndex++) {
        const cell = row[colIndex];
        let cellValue = '';
        
        if (cell) {
          if (cell.computedValue !== '' && cell.computedValue !== undefined) {
            cellValue = cell.computedValue;
          } else {
            cellValue = cell.value || '';
          }
        }
        
        const cellValueStr = String(cellValue);
        if (cellValueStr.includes(',') || cellValueStr.includes('"') || cellValueStr.includes('\n') || cellValueStr.includes('\r')) {
          const escaped = cellValueStr.replace(/"/g, '""');
          cellValue = `"${escaped}"`;
        } else {
          cellValue = cellValueStr;
        }
        
        rowData.push(cellValue);
      }
      
      if (rowData.some(cell => cell !== '' && cell !== '""')) {
        csv += rowData.join(',') + '\n';
      }
    }
    
    return csv.trim();
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Options for dropdowns
  const productOptions = useMemo(() => 
    products.map((product) => ({
      value: product.id,
      label: product.name,
      hsn_code: product.hsn || product.hsn_code || "",
      description: product.description,
      unit_price: product.unit_price || product.sales_price || 0,
      discount_percent: product.discount || 0,
      gst_rate: product.tax_rate || product.gst_rate || 18
    })), [products]);

  const customerOptions = useMemo(() => {
    if (!customers || customers.length === 0) {
      return [];
    }
    
    return customers.map((customer) => {
      const name = customer.name || "Unnamed Customer";
      const phone = customer.phone || customer.mobile || "";
      const email = customer.email || "";
      
      const label = `${name}${phone ? ` (${phone})` : ''}${email ? ` - ${email}` : ''}`;
      
      return {
        value: customer.id,
        label: label,
        data: customer
      };
    });
  }, [customers]);

  const salesmanOptions = useMemo(() => {
    return salesmen
      .filter(salesman => salesman.name && salesman.name.trim())
      .map((salesman) => {
        const label = salesman.designation 
          ? `${salesman.name} (${salesman.designation})`
          : salesman.name;
        
        return {
          value: salesman.id,
          label: label,
          salesman: salesman
        };
      });
  }, [salesmen]);

  const contactPersonOptions = useMemo(() => {
    const filtered = contactPersons
      .filter(person => !selectedCustomer || person.customer_id === selectedCustomer.id);
    
    return filtered.map((person) => {
      const label = `${person.name} ${person.email ? `- ${person.email}` : ''} ${person.phone ? `- ${person.phone}` : ''}`;
      return {
        value: person.id,
        label: label,
        person
      };
    });
  }, [contactPersons, selectedCustomer]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading quotation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Toast Container */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>

        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Edit Quotation: {formData.quotation_code}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Update quotation details
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push(`/quotations/${quotationId}`)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to View
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Form Sections - Same as create page but with existing data */}
          {/* ... Rest of the form JSX is identical to create page ... */}
          {/* You can copy the entire form JSX from the create page */}
          {/* Just make sure to change the submit button text and header */}
          
          {/* Left Column */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Quotation Details Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quotation Details
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quotation No *
                  </label>
                  <input
                    type="text"
                    value={formData.quotation_code}
                    onChange={(e) => setFormData({ ...formData, quotation_code: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.quotation_date}
                    onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Validity Days
                  </label>
                  <input
                    type="number"
                    value={formData.validity_days}
                    onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) || 30 })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status *
                  </label>
                  <select
                    value={formData.status || "open"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    required
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="po_converted">PO Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Customer Information Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Customer Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Customer *
                  </label>
                  <Select
                    options={customerOptions}
                    value={customerOptions.find(opt => opt.value === formData.customer_id)}
                    onChange={handleCustomerChange}
                    placeholder="Select customer..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                    isClearable
                    isSearchable
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    placeholder="Contact person name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Place of Supply
                  </label>
                  <input
                    type="text"
                    value={formData.place_of_supply}
                    onChange={(e) => setFormData({ ...formData, place_of_supply: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    placeholder="State name or code"
                  />
                </div>
              </div>
            </div>
          </div>

             {/* Items Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Items
                        </h2>
                        <div className="flex gap-2 mt-2 sm:mt-0">
                          <button
                            type="button"
                            onClick={() => router.push("/products/new")}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-500 dark:hover:bg-blue-900/20"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add New Item
                          </button>
                          <button
                            type="button"
                            onClick={addItem}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Item
                          </button>
                        </div>
                      </div>
          
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px]">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                Item
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                HSN Code
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                Description
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                Qty *
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                Unit Price *
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                Discount %
                              </th>
                            
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                Total
                              </th>
                             
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {items.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-3">
                               <Select
            options={productOptions}
            value={productOptions.find(opt => opt.value === item.product_id)}
            onChange={(option) => {
              if (option) {
                updateItem(index, "product_id", option.value);
                // Automatically populate all fields from the selected product
                updateItem(index, "hsn_code", option.hsn_code || "");
                updateItem(index, "description", option.description || "");
                updateItem(index, "unit_price", option.unit_price || 0);
                updateItem(index, "discount_percent", option.discount_percent || 0);
                updateItem(index, "gst_rate", option.gst_rate || 18);
                
                // Show toast with item details
                const stockInfo = option.stock_quantity > 0 
                  ? ` (Stock: ${option.stock_quantity})`
                  : " (Out of stock)";
                showToast(`Selected: ${option.label}${stockInfo}`, "info");
              } else {
                // Clear all fields if product is deselected
                updateItem(index, "product_id", "");
                updateItem(index, "hsn_code", "");
                updateItem(index, "description", "");
                updateItem(index, "unit_price", 0);
                updateItem(index, "discount_percent", 0);
                updateItem(index, "gst_rate", 18);
              }
            }}
            placeholder="Search by item code or name..."
            className="react-select-container"
            classNamePrefix="react-select"
            isClearable
            isSearchable
            formatOptionLabel={(option, { context }) => (
              <div className="flex flex-col">
                <div className="font-medium">{option.label}</div>
                {option.subLabel && (
                  <div className="text-xs text-gray-500 truncate">{option.subLabel}</div>
                )}
                <div className="flex gap-2 text-xs text-gray-600 mt-1">
                  <span>Price: ₹{option.unit_price?.toFixed(2) || '0.00'}</span>
                  <span>•</span>
                  <span>Stock: {option.stock_quantity || 0}</span>
                  <span>•</span>
                  <span>HSN: {option.hsn_code || 'N/A'}</span>
                </div>
              </div>
            )}
            noOptionsMessage={() => "No products found. Add products first."}
          />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={item.hsn_code}
                                    onChange={(e) => updateItem(index, "hsn_code", e.target.value)}
                                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm"
                                    placeholder="HSN Code"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <textarea
                                    value={item.description}
                                    onChange={(e) => updateItem(index, "description", e.target.value)}
                                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm"
                                    rows={1}
                                    placeholder="Description"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                                    min={0.01}
                                    step={0.01}
                                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm"
                                    required
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                                    min={0}
                                    step={0.01}
                                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm"
                                    required
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={item.discount_percent}
                                    onChange={(e) => updateItem(index, "discount_percent", parseFloat(e.target.value) || 0)}
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm"
                                  />
                                </td>
                               
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={formatCurrency(calculateItemTotal(item).total)}
                                    readOnly
                                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-sm font-medium"
                                  />
                                </td>
                               
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
          
                    {/* Summary and Terms Section */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Excel Grid Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Additional Notes (Excel Grid)
                          </h2>
                          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                            <div className="flex items-center gap-2">
                             
                            </div>
                            <div className="flex items-center gap-2">
                              
                            </div>
                          </div>
                        </div>
          
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Grid Info:</h3>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Visible: {gridRows} rows × {gridCols} columns | 
                                Total: {totalRows} rows × {totalCols} columns
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={clearGrid}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Clear Grid
                              </button>
                              <button
                                type="button"
                                onClick={exportToCSV}
                                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export CSV
                              </button>
                            </div>
                          </div>
                        </div>
          
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Available Formulas:</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                            <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1+B2</code>
                            <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1-B2</code>
                            <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1*B2</code>
                            <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1/B2</code>
                            <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1*10%</code>
                            <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=(A1+B2)*C3</code>
                            <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1+B2*C3/D4</code>
                            <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1/B2-C3</code>
                            <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1+10-5%</code>
                            <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1*(1+B1%)</code>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                            • Use +, -, *, / for basic arithmetic • Use % for percentages • Use parentheses for complex formulas
                          </p>
                        </div>
          
                        <div className="overflow-x-auto max-h-[500px] border border-gray-300 dark:border-gray-600 rounded-lg">
                          <div className="inline-block min-w-full">
                            {/* Header Row */}
                            <div className="flex sticky top-0 z-10 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
                              <div className="w-16 flex-shrink-0 flex items-center justify-center border-r border-gray-300 dark:border-gray-600 p-2">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#</span>
                              </div>
                              {Array.from({ length: gridCols }).map((_, colIndex) => (
                                <div key={`header-${colIndex}`} className="w-32 flex-shrink-0 flex items-center justify-center border-r border-gray-300 dark:border-gray-600 p-2 last:border-r-0">
                                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                                    {getColumnLetter(colIndex)}
                                  </span>
                                </div>
                              ))}
                            </div>
          
                            {/* Data Rows */}
                            <div className="overflow-y-auto max-h-[600px]">
                              {Array.from({ length: gridRows }).map((_, rowIndex) => {
                                const row = excelGrid[rowIndex] || [];
                                return (
                                  <div key={`row-${rowIndex}`} className="flex border-b border-gray-300 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    {/* Row Number - Sticky */}
                                    <div className="w-16 flex-shrink-0 flex items-center justify-center border-r border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-2 sticky left-0">
                                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {rowIndex + 1}
                                      </span>
                                    </div>
          
                                    {/* Cells */}
                                    {Array.from({ length: gridCols }).map((_, colIndex) => {
                                      const cell = row[colIndex] || {
                                        id: `${rowIndex}_${colIndex}`,
                                        value: '',
                                        isFormula: false,
                                        row: rowIndex,
                                        col: colIndex,
                                        computedValue: ''
                                      };
                                      
                                      return (
                                        <div key={cell.id} className="w-32 flex-shrink-0 border-r border-gray-300 dark:border-gray-600 last:border-r-0">
                                          <input
                                            type="text"
                                            value={cell.value}
                                            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                                            onPaste={(e) => handlePasteEnhanced(e, rowIndex, colIndex)}
                                            onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
                                            placeholder={`${getColumnLetter(colIndex)}${rowIndex + 1}`}
                                            className={`w-full h-full px-3 py-2 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:z-20 focus:outline-none ${
                                              cell.isFormula 
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                                                : 'bg-white dark:bg-gray-800'
                                            } ${cell.computedValue === '#ERROR' || cell.computedValue === '#REF!' 
                                              ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
                                              : ''}`}
                                            title={cell.isFormula ? `Formula: ${cell.formula}\nValue: ${cell.computedValue}` : cell.value}
                                          />
                                          {cell.isFormula && cell.computedValue !== '#ERROR' && cell.computedValue !== '#REF!' && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 px-2 pb-1 truncate">
                                              ={typeof cell.computedValue === 'number' 
                                                ? cell.computedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                : cell.computedValue}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
          
                        {/* Grid Statistics */}
                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <p>• Active Cell: {activeCell ? `${getColumnLetter(activeCell.col)}${activeCell.row + 1}` : 'None'}</p>
                            <p>• Use column letters (A-Z, AA, AB...) and row numbers (1-∞)</p>
                            <p>• Ctrl+Enter: Add Row | Ctrl+Shift+Enter: Add Column</p>
                          </div>
                        </div>
                      </div>
          
                      {/* Summary Section */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Summary
                        </h2>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Total Items</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{totals.totalItems}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Total Quantity</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{totals.totalQuantity.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.subtotal)}</span>
                          </div>
          
                          {/* Global Discount */}
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">All Items Discount</span>
                            <div className="text-right">
                              <div className="mb-2 flex items-center gap-2">
                                <input
                                  type="number"
                                  value={globalDiscount.value}
                                  onChange={(e) => setGlobalDiscount({ ...globalDiscount, value: parseFloat(e.target.value) || 0 })}
                                  className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                                  min={0}
                                />
                                <select
                                  value={globalDiscount.type}
                                  onChange={(e) => setGlobalDiscount({ ...globalDiscount, type: e.target.value as "percentage" | "fixed" })}
                                  className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                                >
                                  <option value="percentage">%</option>
                                  <option value="fixed">₹</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={applyGlobalDiscount}
                                  className="rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                                >
                                  Apply
                                </button>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalDiscount)}</span>
                            </div>
                          </div>
          
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Taxable Amount</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalTaxable)}</span>
                          </div>
          
                          {/* Other Charges */}
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Other Charges</h3>
                              <button
                                type="button"
                                onClick={addOtherCharge}
                                className="rounded border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-500 dark:hover:bg-blue-900/20"
                              >
                                Add Charge
                              </button>
                            </div>
                            
                            <div className="space-y-2">
                              {otherCharges.map((charge) => (
                                <div key={charge.id} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={charge.name}
                                    onChange={(e) => updateOtherCharge(charge.id, "name", e.target.value)}
                                    className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1 text-sm"
                                    placeholder="Charge Name"
                                  />
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={charge.amount}
                                      onChange={(e) => updateOtherCharge(charge.id, "amount", parseFloat(e.target.value) || 0)}
                                      className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1 text-sm"
                                      min={0}
                                      step={0.01}
                                    />
                                    <select
                                      value={charge.type}
                                      onChange={(e) => updateOtherCharge(charge.id, "type", e.target.value as "fixed" | "percentage")}
                                      className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                                    >
                                      <option value="fixed">₹</option>
                                      <option value="percentage">%</option>
                                    </select>
                                  </div>
                                  <select
                                    value={charge.tax}
                                    onChange={(e) => updateOtherCharge(charge.id, "tax", Number(e.target.value) || 0)}
                                    className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                                  >
                                    <option value={0}>0%</option>
                                    <option value={5}>5%</option>
                                    <option value={12}>12%</option>
                                    <option value={18}>18%</option>
                                    <option value={28}>28%</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => removeOtherCharge(charge.id)}
                                    className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
          
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">CGST</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalCgst)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">SGST</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalSgst)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">IGST</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalIgst)}</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                            <span className="font-semibold text-gray-900 dark:text-white">Total Tax</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.totalTax)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Round Off</span>
                            <span className={`text-sm font-medium ${totals.roundOff > 0 ? 'text-green-600' : totals.roundOff < 0 ? 'text-red-600' : 'text-gray-900'} dark:text-white`}>
                              {totals.roundOff > 0 ? '+' : ''}{formatCurrency(totals.roundOff)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                            <span className="font-bold text-gray-900 dark:text-white">Grand Total</span>
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-500">{formatCurrency(totals.grandTotal)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
            <button
              type="button"
              onClick={() => router.push(`/quotations/${quotationId}`)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-6 py-3 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Quotation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}