"""Import/Export Service - Data import and export functionality."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any, BinaryIO
from sqlalchemy.orm import Session
import json
import csv
import io
import zipfile
from pathlib import Path

from app.database.models import (
    Company, Customer, Product, Vendor, Invoice, Payment,
    Quotation, SalesOrder, PurchaseOrder, StockEntry,
    generate_uuid
)


class ImportExportService:
    """Service for importing and exporting data."""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== VENDOR IMPORT ====================
    
    def import_vendors_from_csv(
        self,
        company_id: str,
        csv_content: str,
        skip_header: bool = True,
    ) -> Dict[str, Any]:
        """
        Import vendors from CSV file.
        
        Expected columns:
        name, gstin, pan, phone, email, address, city, state, pincode
        """
        reader = csv.reader(io.StringIO(csv_content))
        
        if skip_header:
            next(reader, None)
        
        imported = 0
        errors = []
        
        for row_num, row in enumerate(reader, start=2 if skip_header else 1):
            try:
                if len(row) < 9:
                    errors.append(f"Row {row_num}: Not enough columns")
                    continue
                
                name = row[0].strip()
                if not name:
                    errors.append(f"Row {row_num}: Name is required")
                    continue
                
                # Check if vendor already exists
                existing = self.db.query(Vendor).filter(
                    Vendor.company_id == company_id,
                    Vendor.name == name
                ).first()
                
                if existing:
                    # Update existing vendor (use actual model columns)
                    existing.tax_number = row[1].strip() or existing.tax_number
                    existing.pan_number = row[2].strip() or existing.pan_number
                    existing.contact = row[3].strip() or existing.contact
                    existing.email = row[4].strip() or existing.email
                    existing.billing_address = row[5].strip() or existing.billing_address
                    existing.billing_city = row[6].strip() or existing.billing_city
                    existing.billing_state = row[7].strip() or existing.billing_state
                    existing.billing_zip = row[8].strip() or existing.billing_zip
                else:
                    # Create new vendor (use actual model columns)
                    vendor = Vendor(
                        id=generate_uuid(),
                        company_id=company_id,
                        name=name,
                        tax_number=row[1].strip() or None,
                        pan_number=row[2].strip() or None,
                        contact=row[3].strip() or "",
                        email=row[4].strip() or None,
                        billing_address=row[5].strip() or None,
                        billing_city=row[6].strip() or None,
                        billing_state=row[7].strip() or None,
                        billing_zip=row[8].strip() or None,
                    )
                    self.db.add(vendor)
                
                imported += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        self.db.commit()
        
        return {
            "imported": imported,
            "errors": errors,
            "total_rows": imported + len(errors),
        }
    
    # ==================== STOCK IMPORT/EXPORT ====================
    
    def import_stock_from_csv(
        self,
        company_id: str,
        user_id: str,
        csv_content: str,
        skip_header: bool = True,
    ) -> Dict[str, Any]:
        """
        Import stock/products from CSV file.
        
        Expected columns:
        name, sku, hsn_code, purchase_price, sales_price, opening_stock, unit, brand, category
        """
        reader = csv.reader(io.StringIO(csv_content))
        
        if skip_header:
            next(reader, None)
        
        imported = 0
        updated = 0
        errors = []
        
        for row_num, row in enumerate(reader, start=2 if skip_header else 1):
            try:
                if len(row) < 9:
                    errors.append(f"Row {row_num}: Not enough columns")
                    continue
                
                name = row[0].strip()
                if not name:
                    errors.append(f"Row {row_num}: Name is required")
                    continue
                
                sku = row[1].strip() or None
                
                # Check if product already exists by SKU or name
                existing = None
                if sku:
                    existing = self.db.query(Product).filter(
                        Product.company_id == company_id,
                        Product.sku == sku
                    ).first()
                
                if not existing:
                    existing = self.db.query(Product).filter(
                        Product.company_id == company_id,
                        Product.name == name
                    ).first()
                
                if existing:
                    # Update existing product
                    existing.hsn_code = row[2].strip() or existing.hsn_code
                    existing.purchase_price = Decimal(row[3]) if row[3].strip() else existing.purchase_price
                    existing.sales_price = Decimal(row[4]) if row[4].strip() else existing.sales_price
                    existing.opening_stock = int(row[5]) if row[5].strip() else existing.opening_stock
                    existing.unit = row[6].strip() or existing.unit
                    existing.brand = row[7].strip() or existing.brand
                    existing.category = row[8].strip() or existing.category
                    updated += 1
                else:
                    # Create new product
                    product = Product(
                        id=generate_uuid(),
                        company_id=company_id,
                        created_by=user_id,
                        name=name,
                        sku=sku,
                        hsn_code=row[2].strip() or None,
                        purchase_price=Decimal(row[3]) if row[3].strip() else Decimal("0"),
                        sales_price=Decimal(row[4]) if row[4].strip() else Decimal("0"),
                        opening_stock=int(row[5]) if row[5].strip() else 0,
                        quantity=int(row[5]) if row[5].strip() else 0,
                        unit=row[6].strip() or "PCS",
                        brand=row[7].strip() or None,
                        category=row[8].strip() or None,
                    )
                    self.db.add(product)
                    imported += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        self.db.commit()
        
        return {
            "imported": imported,
            "updated": updated,
            "errors": errors,
            "total_rows": imported + updated + len(errors),
        }
    
    def export_stock_to_csv(
        self,
        company_id: str,
    ) -> str:
        """Export stock/products to CSV format."""
        products = self.db.query(Product).filter(
            Product.company_id == company_id,
            Product.is_active == True
        ).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "name", "sku", "hsn_code", "purchase_price", "sales_price",
            "quantity", "unit", "brand", "category", "description"
        ])
        
        # Data
        for product in products:
            writer.writerow([
                product.name,
                product.sku or "",
                product.hsn_code or "",
                str(product.purchase_price or 0),
                str(product.sales_price or 0),
                str(product.quantity or 0),
                product.unit or "",
                product.brand or "",
                product.category or "",
                product.description or "",
            ])
        
        return output.getvalue()
    
    # ==================== CUSTOMER IMPORT/EXPORT ====================
    
    def import_customers_from_csv(
        self,
        company_id: str,
        csv_content: str,
        skip_header: bool = True,
    ) -> Dict[str, Any]:
        """
        Import customers from CSV file.
        
        Expected columns:
        name, gstin, phone, email, address, city, state, pincode
        """
        reader = csv.reader(io.StringIO(csv_content))
        
        if skip_header:
            next(reader, None)
        
        imported = 0
        errors = []
        
        for row_num, row in enumerate(reader, start=2 if skip_header else 1):
            try:
                if len(row) < 8:
                    errors.append(f"Row {row_num}: Not enough columns")
                    continue
                
                name = row[0].strip()
                if not name:
                    errors.append(f"Row {row_num}: Name is required")
                    continue
                
                # Check if customer already exists
                existing = self.db.query(Customer).filter(
                    Customer.company_id == company_id,
                    Customer.name == name
                ).first()
                
                if existing:
                    # Update existing customer (use actual model columns)
                    existing.tax_number = row[1].strip() or existing.tax_number
                    existing.contact = row[2].strip() or existing.contact
                    existing.email = row[3].strip() or existing.email
                    existing.billing_address = row[4].strip() or existing.billing_address
                    existing.billing_city = row[5].strip() or existing.billing_city
                    existing.billing_state = row[6].strip() or existing.billing_state
                    existing.billing_zip = row[7].strip() or existing.billing_zip
                else:
                    # Create new customer (use actual model columns)
                    customer = Customer(
                        id=generate_uuid(),
                        company_id=company_id,
                        name=name,
                        contact=row[2].strip() or "",
                        tax_number=row[1].strip() or None,
                        email=row[3].strip() or None,
                        billing_address=row[4].strip() or None,
                        billing_city=row[5].strip() or None,
                        billing_state=row[6].strip() or None,
                        billing_zip=row[7].strip() or None,
                    )
                    self.db.add(customer)
                
                imported += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        self.db.commit()
        
        return {
            "imported": imported,
            "errors": errors,
            "total_rows": imported + len(errors),
        }
    
    def export_customers_to_csv(
        self,
        company_id: str,
    ) -> str:
        """Export customers to CSV format."""
        customers = self.db.query(Customer).filter(
            Customer.company_id == company_id
        ).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            "name", "gstin", "phone", "email", "address",
            "city", "state", "pincode"
        ])
        
        for customer in customers:
            writer.writerow([
                customer.name,
                customer.gstin or "",
                customer.phone or "",
                customer.email or "",
                customer.address or "",
                customer.city or "",
                customer.state or "",
                customer.pincode or "",
            ])
        
        return output.getvalue()
    
    # ==================== BACKUP SYSTEM ====================
    
    def create_full_backup(
        self,
        company_id: str,
    ) -> bytes:
        """
        Create a full backup of company data as a ZIP file.
        
        Includes: customers, products, vendors, invoices, quotations, etc.
        """
        output = io.BytesIO()
        
        with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Customers
            customers_csv = self.export_customers_to_csv(company_id)
            zf.writestr("customers.csv", customers_csv)
            
            # Products
            products_csv = self.export_stock_to_csv(company_id)
            zf.writestr("products.csv", products_csv)
            
            # Vendors
            vendors_csv = self._export_vendors_to_csv(company_id)
            zf.writestr("vendors.csv", vendors_csv)
            
            # Invoices
            invoices_json = self._export_invoices_to_json(company_id)
            zf.writestr("invoices.json", invoices_json)
            
            # Quotations
            quotations_json = self._export_quotations_to_json(company_id)
            zf.writestr("quotations.json", quotations_json)
            
            # Backup metadata
            metadata = {
                "company_id": company_id,
                "backup_date": datetime.utcnow().isoformat(),
                "version": "1.0",
            }
            zf.writestr("backup_metadata.json", json.dumps(metadata, indent=2))
        
        return output.getvalue()
    
    def _export_vendors_to_csv(self, company_id: str) -> str:
        """Export vendors to CSV format."""
        vendors = self.db.query(Vendor).filter(
            Vendor.company_id == company_id
        ).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            "name", "gstin", "pan", "phone", "email",
            "address", "city", "state", "pincode"
        ])
        
        for vendor in vendors:
            writer.writerow([
                vendor.name,
                vendor.tax_number or "",
                vendor.pan_number or "",
                vendor.contact or "",
                vendor.email or "",
                vendor.billing_address or "",
                vendor.billing_city or "",
                vendor.billing_state or "",
                vendor.billing_zip or "",
            ])
        
        return output.getvalue()
    
    def _export_invoices_to_json(self, company_id: str) -> str:
        """Export invoices to JSON format."""
        invoices = self.db.query(Invoice).filter(
            Invoice.company_id == company_id
        ).all()
        
        data = []
        for invoice in invoices:
            data.append({
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
                "customer_name": invoice.customer_name,
                "total_amount": str(invoice.total_amount or 0),
                "status": invoice.status.value if invoice.status else None,
            })
        
        return json.dumps(data, indent=2)
    
    def _export_quotations_to_json(self, company_id: str) -> str:
        """Export quotations to JSON format."""
        quotations = self.db.query(Quotation).filter(
            Quotation.company_id == company_id
        ).all()
        
        data = []
        for quotation in quotations:
            data.append({
                "id": quotation.id,
                "quotation_number": quotation.quotation_number,
                "quotation_date": quotation.quotation_date.isoformat() if quotation.quotation_date else None,
                "total_amount": str(quotation.total_amount or 0),
                "status": quotation.status.value if quotation.status else None,
            })
        
        return json.dumps(data, indent=2)
    
    # ==================== SALES IMPORT ====================
    
    def import_sales_from_csv(
        self,
        company_id: str,
        csv_content: str,
        skip_header: bool = True,
    ) -> Dict[str, Any]:
        """
        Import sales data from CSV.
        
        Expected columns:
        invoice_number, invoice_date, customer_name, total_amount, payment_status
        """
        # This would create Invoice records from CSV
        # Implementation simplified for brevity
        return {
            "imported": 0,
            "errors": ["Sales import not fully implemented - use UI for invoice creation"],
            "total_rows": 0,
        }
    
    # ==================== PURCHASE IMPORT ====================
    
    def import_purchases_from_csv(
        self,
        company_id: str,
        csv_content: str,
        skip_header: bool = True,
    ) -> Dict[str, Any]:
        """
        Import purchase data from CSV.
        
        Expected columns:
        purchase_number, purchase_date, vendor_name, total_amount
        """
        # Implementation simplified for brevity
        return {
            "imported": 0,
            "errors": ["Purchase import not fully implemented - use UI for purchase creation"],
            "total_rows": 0,
        }
