"""Purchase Service - Handles all purchase types: purchase, purchase-import, purchase-expenses."""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
import uuid

from app.database.models import (
    Purchase, PurchaseItem, PurchaseImportItem, PurchaseExpenseItem, PurchasePayment,
    Vendor, Product, Company, User,
    PurchaseType, PurchaseInvoiceStatus,
    StockEntry, StockMovementType, Account, Transaction, TransactionEntry,
    AccountType, TransactionStatus, ReferenceType,generate_uuid
)
from app.services.company_service import CompanyService

class PurchaseService:
    """Service for handling all purchase operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _round_amount(self, amount: Decimal) -> Decimal:
        """Round amount to 2 decimal places."""
        return Decimal(amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def _get_next_purchase_number(self, company_id: str) -> str:
        """Generate next purchase number."""
        today = datetime.utcnow()
        year = today.year
        month = today.month
        
        # Get the count for this month
        count = self.db.query(Purchase).filter(
            Purchase.company_id == company_id,
            func.extract('year', Purchase.created_at) == year,
            func.extract('month', Purchase.created_at) == month
        ).count()
        
        return f"PUR-{year}{month:02d}-{count + 1:03d}"
    
    def _calculate_item_totals(self, item: dict) -> Dict[str, Decimal]:
        """Calculate totals for a regular purchase item with currency conversion."""
        print(f"DEBUG ITEM DATA: {item}")
        quantity = Decimal(str(item.get("quantity", 1)))
        purchase_price = Decimal(str(item.get("purchase_price", 0)))
        discount_percent = Decimal(str(item.get("discount_percent", 0)))
        gst_rate = Decimal(str(item.get("gst_rate", 18)))
        
        currency = item.get("currency", "INR")
        exchange_rate = Decimal(str(item.get("exchange_rate", 1.0)))
        print(f"DEBUG CURRENCY: {currency}, EXCHANGE_RATE: {exchange_rate}")
        # Convert to INR if needed
        if currency != "INR":
            price_inr = purchase_price * exchange_rate
            print(f"  Currency Conversion: {currency} {purchase_price} × {exchange_rate} = ₹{price_inr:.2f}")
            effective_price = price_inr
        else:
            effective_price = purchase_price
        
        # Calculate item total in INR
        item_total = self._round_amount(quantity * effective_price)
        
        if currency != "INR":
            print(f"  Item Total in INR: {quantity} × ₹{effective_price:.2f} = ₹{item_total:.2f}")
        
        # Calculate discount
        discount_amount = self._round_amount(item_total * discount_percent / 100)
        
        # Calculate taxable amount
        taxable_amount = item_total - discount_amount
        
        # Calculate GST
        cgst_rate = gst_rate / 2
        sgst_rate = gst_rate / 2
        cgst_amount = self._round_amount(taxable_amount * cgst_rate / 100)
        sgst_amount = self._round_amount(taxable_amount * sgst_rate / 100)
        total_tax = cgst_amount + sgst_amount
        
        # Calculate total amount
        total_amount = taxable_amount + total_tax
        
        # Log the calculation
        if currency != "INR":
            print(f"  Taxable Amount (INR): ₹{taxable_amount:.2f}")
            print(f"  Tax Amount (INR): ₹{total_tax:.2f}")
            print(f"  Total Amount (INR): ₹{total_amount:.2f}")
        
        return {
            "item_total": item_total,
            "discount_amount": discount_amount,
            "taxable_amount": taxable_amount,
            "cgst_rate": cgst_rate,
            "sgst_rate": sgst_rate,
            "cgst_amount": cgst_amount,
            "sgst_amount": sgst_amount,
            "total_tax": total_tax,
            "total_amount": total_amount,
            "currency": currency,
            "exchange_rate": exchange_rate,
            "price_inr": effective_price
        }
        
    def create_purchase(
        self,
        company_id: str,
        user_id: str,
        vendor_id: str,
        purchase_type: str,
        items: List[Dict[str, Any]],
        import_items: Optional[List[Dict[str, Any]]] = None,
        expense_items: Optional[List[Dict[str, Any]]] = None,
        payment_data: Optional[Dict[str, Any]] = None,
        **additional_data
    ) -> Purchase:
        """Create a new purchase (all types)."""
        
        print("=" * 80)
        print("🚀 PURCHASE SERVICE: create_purchase() STARTED")
        print("=" * 80)
        
        # ============================================
        # STEP 1: VALIDATE PURCHASE TYPE
        # ============================================
        print("📋 STEP 1: Validating purchase type")
        print(f"📥 Received purchase_type: '{purchase_type}' (type: {type(purchase_type)})")
        
        # Convert string to PurchaseType enum
        try:
            normalized_type = purchase_type.lower().strip()
            print(f"   Normalized (lowercase): '{normalized_type}'")
            
            # Replace hyphen with underscore for enum matching
            normalized_type = normalized_type.replace("-", "_")
            print(f"   Normalized (hyphen→underscore): '{normalized_type}'")
            
            # Try to create enum
            purchase_type_enum = PurchaseType(normalized_type)
            print(f"✅ Created PurchaseType enum: {purchase_type_enum}")
            
            # Show all valid values
            valid_values = [e.value for e in PurchaseType]
            print(f"   All valid enum values: {valid_values}")
            
        except ValueError as e:
            print(f"❌ ERROR: Invalid purchase type")
            print(f"   Error: {e}")
            valid_values = [e.value for e in PurchaseType]
            print(f"   Valid values are: {valid_values}")
            raise ValueError(f"Invalid purchase type: '{purchase_type}'. Valid values: {valid_values}")
        
        # ============================================
        # STEP 2: VALIDATE COMPANY AND VENDOR
        # ============================================
        print("\n🏢 STEP 2: Validating company and vendor")
        print(f"   Company ID: {company_id}")
        print(f"   Vendor ID: {vendor_id}")
        print(f"   User ID: {user_id}")
        
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            print("❌ Company not found")
            raise ValueError("Company not found")
        print(f"✅ Company found: {company.name} (ID: {company.id})")
        
        vendor = self.db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            print("❌ Vendor not found")
            raise ValueError("Vendor not found")
        print(f"✅ Vendor found: {vendor.name or vendor.vendor_code} (ID: {vendor.id})")
        # ============================================
        # STEP 3: GENERATE PURCHASE NUMBER
        # ============================================
        print("\n🔢 STEP 3: Generating purchase number")
        company_service = CompanyService(self.db)
        purchase_number = company_service.get_next_invoice_number(company)
        print(f"✅ Generated purchase number: {purchase_number}")
        
        # ============================================
        # STEP 4: PREPARE PURCHASE DATA
        # ============================================
        print("\n📝 STEP 4: Preparing purchase data")
        
        # Base purchase data
        purchase_data = {
            "id": generate_uuid(),
            "company_id": company_id,
            "vendor_id": vendor_id,
            "purchase_type": purchase_type_enum,
            "purchase_number": purchase_number,
            "created_by": user_id,
            "status": PurchaseInvoiceStatus.DRAFT,
        }
        
        print("   Base purchase data:")
        for key, value in purchase_data.items():
            if key != "id":
                print(f"     {key}: {value}")
        
        # Add additional data
        print("\n   Additional data received:")
        additional_count = 0
        for key, value in additional_data.items():
            if hasattr(Purchase, key):
                purchase_data[key] = value
                print(f"     ✅ {key}: {value} (type: {type(value)})")
                additional_count += 1
            else:
                print(f"     ❌ {key}: {value} (SKIPPED - not in Purchase model)")
        
        print(f"   Total additional fields added: {additional_count}")
        
        # ============================================
        # STEP 5: CREATE PURCHASE INSTANCE
        # ============================================
        print("\n💾 STEP 5: Creating purchase instance")
        purchase = Purchase(**purchase_data)
        self.db.add(purchase)
        self.db.flush()
        print(f"✅ Purchase instance created with ID: {purchase.id}")
        
        # ============================================
        # STEP 6: PROCESS ITEMS BASED ON PURCHASE TYPE
        # ============================================
        print(f"\n📦 STEP 6: Processing items based on purchase type")
        print(f"   Purchase type: {purchase_type_enum}")
        print(f"   Received {len(items)} regular items")
        print(f"   Received {len(import_items or [])} import items")
        print(f"   Received {len(expense_items or [])} expense items")
        
        total_subtotal = Decimal("0")
        total_tax = Decimal("0")
        total_discount = Decimal("0")
        item_count = 0
        import_total = Decimal("0")
        expense_total = Decimal("0")
        
        # Process regular items ONLY for purchase and purchase-import types
        if purchase_type_enum in [PurchaseType.PURCHASE, PurchaseType.PURCHASE_IMPORT]:
            print(f"\n📦 STEP 6A: Processing {len(items)} regular items")
            
            for idx, item_data in enumerate(items, 1):
                print(f"\n   Regular Item #{idx}:")
                
                product_id = item_data.get("product_id")
                if product_id:
                    product = self.db.query(Product).filter(
                        Product.id == product_id,
                        Product.company_id == company_id
                    ).first()
                    if not product:
                        print(f"❌ Product {product_id} not found")
                        raise ValueError(f"Product {product_id} not found")
                    print(f"     Product: {product.name} (ID: {product.id})")
                print(f"DEBUG: Processing item #{idx} data:")
                print(f"  Full item_data: {item_data}")
                print(f"  Currency: {item_data.get('currency')}")
                print(f"  Exchange rate: {item_data.get('exchange_rate')}")
                # Calculate item totals
                totals = self._calculate_item_totals(item_data)
                print(f"     Quantity: {item_data.get('quantity', 1)}")
                print(f"     Price: {item_data.get('purchase_price', 0)}")
                print(f"     GST Rate: {item_data.get('gst_rate', 18)}%")
                print(f"     Taxable Amount: {totals['taxable_amount']}")
                print(f"     Tax Amount: {totals['total_tax']}")
                print(f"     Total Amount: {totals['total_amount']}")
                print(f"     Currency: {item_data.get('currency', 'INR')}")
    
                # Create purchase item
                purchase_item = PurchaseItem(
                    id=generate_uuid(),
                    purchase_id=purchase.id,
                    product_id=product_id,
                    description=item_data.get("description", ""),
                    item_code=item_data.get("item_code", ""),
                    hsn_code=item_data.get("hsn_code", ""),
                    quantity=Decimal(str(item_data.get("quantity", 1))),
                    unit=item_data.get("unit", "unit"),
                    purchase_price=Decimal(str(item_data.get("purchase_price", 0))),
                    discount_percent=Decimal(str(item_data.get("discount_percent", 0))),
                    discount_amount=totals["discount_amount"],
                    gst_rate=Decimal(str(item_data.get("gst_rate", 18))),
                    cgst_rate=totals["cgst_rate"],
                    sgst_rate=totals["sgst_rate"],
                    igst_rate=Decimal("0"),
                    cgst_amount=totals["cgst_amount"],
                    sgst_amount=totals["sgst_amount"],
                    igst_amount=Decimal("0"),
                    tax_amount=totals["total_tax"],
                    unit_cost=Decimal(str(item_data.get("purchase_price", 0))),
                    currency=item_data.get("currency", "INR"),

                    total_amount=totals["total_amount"]
                )
                self.db.add(purchase_item)
                item_count += 1
                
                # Update totals
                total_subtotal += totals["taxable_amount"]
                total_tax += totals["total_tax"]
                total_discount += totals["discount_amount"]
            
            print(f"\n✅ Processed {item_count} regular items")
            print(f"   Subtotal from items: {total_subtotal}")
            print(f"   Total tax: {total_tax}")
            print(f"   Total discount: {total_discount}")
        
        elif purchase_type_enum == PurchaseType.PURCHASE_EXPENSES:
            print(f"\n📦 STEP 6B: Skipping regular items for expense purchase")
            print(f"   Received {len(items)} regular items, but expense purchases don't use regular items")
            print(f"   Regular items will be ignored for expense purchases")
            # Clear items for expense purchases since they shouldn't have regular items
            items = []
            item_count = 0
        
        # ============================================
        # STEP 7: PROCESS IMPORT ITEMS (if applicable)
        # ============================================
        if import_items and purchase_type_enum in [PurchaseType.PURCHASE, PurchaseType.PURCHASE_IMPORT]:
            print(f"\n📦 STEP 7: Processing {len(import_items)} import items")
            
            for idx, import_item_data in enumerate(import_items, 1):
                print(f"\n   Import Item #{idx}:")
                
                # Calculate import item amount
                quantity = Decimal(str(import_item_data.get("quantity", 1)))
                rate = Decimal(str(import_item_data.get("rate", 0)))
                discount_percent = Decimal(str(import_item_data.get("discount_percent", 0)))
                
                item_total = self._round_amount(quantity * rate)
                discount = self._round_amount(item_total * discount_percent / 100)
                amount = item_total - discount
                
                print(f"     Name: {import_item_data.get('name', '')}")
                print(f"     Quantity: {quantity}")
                print(f"     Rate: {rate}")
                print(f"     Currency: {import_item_data.get('currency', 'INR')}")
                print(f"     Discount: {discount_percent}%")
                print(f"     Amount: {amount}")
                
                import_item = PurchaseImportItem(
                    id=generate_uuid(),
                    purchase_id=purchase.id,
                    name=import_item_data.get("name", ""),
                    quantity=quantity,
                    rate=rate,
                    currency=import_item_data.get("currency", "INR"),
                    per=import_item_data.get("per", "unit"),
                    discount_percent=discount_percent,
                    amount=amount
                )
                self.db.add(import_item)
                
                import_total += amount
            
            print(f"✅ Total import amount: {import_total}")
        
        # ============================================
        # STEP 8: PROCESS EXPENSE ITEMS (if applicable)
        # ============================================
        if expense_items and purchase_type_enum == PurchaseType.PURCHASE_EXPENSES:
            print(f"\n💰 STEP 8: Processing {len(expense_items)} expense items")
            
            for idx, expense_item_data in enumerate(expense_items, 1):
                print(f"\n   Expense Item #{idx}:")
                
                amount = Decimal(str(expense_item_data.get("amount", 0)))
                if amount <= 0:
                    # Calculate from rate if amount not provided
                    rate = Decimal(str(expense_item_data.get("rate", 0)))
                    amount = rate
                
                print(f"     Particulars: {expense_item_data.get('particulars', '')}")
                print(f"     Rate: {expense_item_data.get('rate', 0)}")
                print(f"     Amount: {amount}")
                
                expense_item = PurchaseExpenseItem(
                    id=generate_uuid(),
                    purchase_id=purchase.id,
                    particulars=expense_item_data.get("particulars", ""),
                    rate=Decimal(str(expense_item_data.get("rate", 0))),
                    per=expense_item_data.get("per", "unit"),
                    amount=amount
                )
                self.db.add(expense_item)
                
                expense_total += amount
            
            print(f"✅ Total expense amount: {expense_total}")
        
        # ============================================
        # STEP 9: CALCULATE FINAL TOTALS
        # ============================================
        print("\n🧮 STEP 9: Calculating final totals")
        
        # Get charges from additional data
        freight_charges = Decimal(str(additional_data.get("freight_charges", 0)))
        pf_charges = Decimal(str(additional_data.get("packing_forwarding_charges", 0)))
        discount_on_all = Decimal(str(additional_data.get("discount_on_all", 0)))
        discount_type = additional_data.get("discount_type", "percentage")
        round_off = Decimal(str(additional_data.get("round_off", 0)))
        
        print(f"   Freight Charges: {freight_charges}")
        print(f"   P&F Charges: {pf_charges}")
        print(f"   Discount on All: {discount_on_all} ({discount_type})")
        print(f"   Round Off: {round_off}")
        freight_type = additional_data.get("freight_type", "fixed")
        pf_type = additional_data.get("pf_type", "fixed")
        print(f"   Freight Charges: {freight_charges} (type: {freight_type})")
        print(f"   P&F Charges: {pf_charges} (type: {pf_type})")
        print(f"   Discount on All: {discount_on_all} ({discount_type})")
        print(f"   Round Off: {round_off}")


        freight_tax = Decimal("0")
        if freight_type and freight_type.startswith('tax'):
           try:
              # Extract tax rate from "tax12", "tax18", etc.
              tax_rate_str = freight_type.replace('tax', '')
              tax_rate = Decimal(tax_rate_str)
              freight_tax = self._round_amount(freight_charges * tax_rate / 100)
              print(f"   Freight Tax ({tax_rate}%): {freight_tax}")
              total_tax += freight_tax  # Add to total tax
           except (ValueError, AttributeError) as e:
               print(f"   Error parsing freight tax rate: {e}")

        # Calculate tax for P&F if TAX option is selected
        pf_tax = Decimal("0") 
        if pf_type and pf_type.startswith('tax'):
           try:
             # Extract tax rate from "tax12", "tax18", etc.
             tax_rate_str = pf_type.replace('tax', '')
             tax_rate = Decimal(tax_rate_str)
             pf_tax = self._round_amount(pf_charges * tax_rate / 100)
             print(f"   P&F Tax ({tax_rate}%): {pf_tax}")
             total_tax += pf_tax  # Add to total tax
           except (ValueError, AttributeError) as e:
              print(f"   Error parsing P&F tax rate: {e}")
    
        # Calculate final charges (base + tax)
        final_freight_charges = freight_charges + freight_tax
        final_pf_charges = pf_charges + pf_tax

        # Calculate base amount based on purchase type
        if purchase_type_enum == PurchaseType.PURCHASE_EXPENSES:
            base_amount = expense_total
            print(f"   Base amount (expenses only): {base_amount}")
        elif purchase_type_enum == PurchaseType.PURCHASE_IMPORT:
            base_amount = total_subtotal + import_total
            print(f"   Base amount (regular + import): {base_amount} = {total_subtotal} + {import_total}")
        else:
            base_amount = total_subtotal + import_total
            print(f"   Base amount (regular): {base_amount} = {total_subtotal} + {import_total}")
        
        # Calculate discount on all based on type
        if discount_type == "percentage":
            discount_all_amount = self._round_amount(base_amount * discount_on_all / 100)
            print(f"   Discount on all ({discount_on_all}%): {discount_all_amount}")
        else:
            discount_all_amount = discount_on_all
            print(f"   Discount on all (fixed): {discount_all_amount}")
        
        # Calculate final totals
        final_subtotal = base_amount
        final_total_tax = total_tax + freight_tax + pf_tax  # Tax only applies to regular items
        
        # Step-by-step calculation
        total_after_item_tax = final_subtotal + total_tax  # Only item tax
        total_after_charges = total_after_item_tax + final_freight_charges + final_pf_charges
        total_after_discount = total_after_charges - discount_all_amount
        grand_total = total_after_discount + round_off
        
        print("\n   📊 FINAL CALCULATION:")
        print(f"     1. Subtotal: {final_subtotal}")
        print(f"     2. Add Tax: +{final_total_tax}")
        print(f"        → After Tax: {total_after_item_tax}")
        print(f"     3. Add Charges: +{freight_charges} (freight) + {pf_charges} (P&F)")
        print(f"        → After Charges: {total_after_charges}")
        print(f"     4. Apply Discount: -{discount_all_amount}")
        print(f"        → After Discount: {total_after_discount}")
        print(f"     5. Apply Round Off: {'+' if round_off >= 0 else ''}{round_off}")
        print(f"        → GRAND TOTAL: {grand_total}")
        
        # ============================================
        # STEP 10: UPDATE PURCHASE TOTALS
        # ============================================
        print("\n💳 STEP 10: Updating purchase totals")
        
        purchase.subtotal = final_subtotal
        purchase.total_tax = final_total_tax
        purchase.discount_amount = total_discount + discount_all_amount
        purchase.freight_charges = final_freight_charges 
        purchase.freight_type = freight_type
        purchase.freight_base = freight_charges  # Store base amount
        purchase.freight_tax = freight_tax  # Store tax amount
        purchase.packing_forwarding_charges = final_pf_charges
        purchase.pf_type = pf_type
        purchase.pf_base = pf_charges  # Store base amount
        purchase.pf_tax = pf_tax  # Store tax amount
        purchase.discount_on_all = discount_on_all
        purchase.discount_type = discount_type
        purchase.round_off = round_off
        purchase.total_amount = grand_total
        purchase.grand_total = grand_total
        purchase.balance_due = grand_total
        
        print("✅ Purchase totals updated")
        
        # ============================================
        # STEP 11: PROCESS PAYMENT (if provided)
        # ============================================
        if payment_data and payment_data.get("amount", 0) > 0:
            print(f"\n💵 STEP 11: Processing payment of {payment_data.get('amount')}")
            self._create_payment(purchase, payment_data, user_id)
            print("✅ Payment processed")
        else:
            print("\n💵 STEP 11: No payment data provided")
        
        # ============================================
        # STEP 12: UPDATE STOCK
        # ============================================
        if items and purchase_type_enum in [PurchaseType.PURCHASE, PurchaseType.PURCHASE_IMPORT]:
            print(f"\n📊 STEP 12: Updating stock for {len(items)} items")
            self._update_stock_for_purchase(purchase)
            print("✅ Stock updated")
        else:
            print("\n📊 STEP 12: No regular items or expense purchase, skipping stock update")
        
        # ============================================
        # STEP 13: COMMIT AND RETURN
        # ============================================
        print("\n💾 STEP 13: Committing transaction")
        self.db.commit()
        self.db.refresh(purchase)
        
        print("=" * 80)
        print(f"✅ PURCHASE CREATED SUCCESSFULLY!")
        print(f"   Purchase Number: {purchase.purchase_number}")
        print(f"   Vendor: {vendor.name or vendor.vendor_code}")
        print(f"   Type: {purchase.purchase_type}")
        print(f"   Total Amount: {purchase.total_amount}")
        print(f"   Status: {purchase.status}")
        print("=" * 80)
        
        return purchase 
    def _create_payment(self, purchase: Purchase, payment_data: Dict[str, Any], user_id: str):
        """Create payment for purchase."""
        payment = PurchasePayment(
            id=generate_uuid(),
            purchase_id=purchase.id,
            amount=Decimal(str(payment_data.get("amount", 0))),
            payment_date=datetime.utcnow(),
            payment_type=payment_data.get("payment_type", ""),
            account=payment_data.get("account", ""),
            payment_note=payment_data.get("payment_note", ""),
            reference_number=payment_data.get("reference_number", "")
        )
        self.db.add(payment)
        
        # Update purchase payment status
        purchase.amount_paid += payment.amount
        purchase.balance_due -= payment.amount
        
        if purchase.balance_due <= 0:
            purchase.status = PurchaseInvoiceStatus.PAID
        else:
            purchase.status = PurchaseInvoiceStatus.PARTIALLY_PAID
        
        # Create accounting entry
        self._create_payment_accounting_entry(purchase, payment, user_id)
    
    def _create_payment_accounting_entry(
        self,
        purchase: Purchase,
        payment: PurchasePayment,
        user_id: str
    ) -> Optional[Transaction]:
        """Create accounting entry for purchase payment."""
        try:
            # Get accounts
            ap_account = self.db.query(Account).filter(
                Account.company_id == purchase.company_id,
                Account.code == "2000"  # Accounts Payable
            ).first()
            
            if not ap_account:
                # Create if doesn't exist
                ap_account = Account(
                    id=generate_uuid(),
                    company_id=purchase.company_id,
                    code="2000",
                    name="Accounts Payable",
                    account_type=AccountType.LIABILITY
                )
                self.db.add(ap_account)
                self.db.flush()
            
            # Determine payment account
            if payment.account:
                payment_account = self.db.query(Account).filter(
                    Account.company_id == purchase.company_id,
                    Account.name.ilike(f"%{payment.account}%")
                ).first()
            
            if not payment_account:
                # Default to cash account
                payment_account = self.db.query(Account).filter(
                    Account.company_id == purchase.company_id,
                    Account.code == "1000"  # Cash
                ).first()
                if not payment_account:
                    payment_account = Account(
                        id=generate_uuid(),
                        company_id=purchase.company_id,
                        code="1000",
                        name="Cash",
                        account_type=AccountType.ASSET
                    )
                    self.db.add(payment_account)
                    self.db.flush()
            
            # Create transaction
            transaction = Transaction(
                id=generate_uuid(),
                company_id=purchase.company_id,
                transaction_number=f"PPMT-{purchase.purchase_number}",
                transaction_date=payment.payment_date,
                description=f"Payment for Purchase {purchase.purchase_number}",
                reference_type=ReferenceType.PAYMENT,
                reference_id=payment.id,
                status=TransactionStatus.POSTED,
                total_debit=payment.amount,
                total_credit=payment.amount,
                # created_by=user_id
            )
            self.db.add(transaction)
            self.db.flush()
            
            # Debit: Accounts Payable
            debit_entry = TransactionEntry(
                id=generate_uuid(),
                transaction_id=transaction.id,
                account_id=ap_account.id,
                debit_amount=payment.amount,
                credit_amount=Decimal("0"),
                description=f"Payment to {purchase.vendor.name if purchase.vendor else 'Vendor'}"
            )
            self.db.add(debit_entry)
            
            # Credit: Payment Account
            credit_entry = TransactionEntry(
                id=generate_uuid(),
                transaction_id=transaction.id,
                account_id=payment_account.id,
                debit_amount=Decimal("0"),
                credit_amount=payment.amount,
                description=f"Payment for Purchase {purchase.purchase_number}"
            )
            self.db.add(credit_entry)
            
            payment.transaction_id = transaction.id
            
            return transaction
            
        except Exception as e:
            print(f"Error creating payment accounting entry: {e}")
            return None
    
    def _update_stock_for_purchase(self, purchase: Purchase):
        """Update stock for regular purchase items."""
        for item in purchase.items:
            if not item.product_id:
                continue
            
            product = self.db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                continue
            
            # Create stock entry
            stock_entry = StockEntry(
                id=generate_uuid(),
                company_id=purchase.company_id,
                product_id=item.product_id,
                godown_id=None,  # You can add godown logic here
                entry_date=purchase.created_at,
                movement_type=StockMovementType.PURCHASE,
                quantity=item.quantity,
                unit=item.unit,
                rate=item.purchase_price,
                value=item.total_amount,
                reference_type="purchase",
                reference_id=purchase.id,
                reference_number=purchase.purchase_number,
                notes=f"Purchase from {purchase.vendor.name if purchase.vendor else 'Vendor'}"
            )
            self.db.add(stock_entry)
            
            # Update product stock
            product.quantity = (product.quantity or 0) + int(item.quantity)
            product.last_purchase_price = item.purchase_price
            product.last_purchase_date = purchase.created_at
    
    def get_purchase(self, purchase_id: str, company_id: str) -> Optional[Purchase]:
        """Get purchase by ID with all related data."""
        return self.db.query(Purchase).options(
            joinedload(Purchase.vendor),
            joinedload(Purchase.items).joinedload(PurchaseItem.product),
            joinedload(Purchase.import_items),
            joinedload(Purchase.expense_items),
            joinedload(Purchase.payments)
        ).filter(
            Purchase.id == purchase_id,
            Purchase.company_id == company_id,
            Purchase.deleted_at.is_(None)
        ).first()
    
    def get_purchases(
        self,
        company_id: str,
        purchase_type: Optional[str] = None,
        vendor_id: Optional[str] = None,
        status: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Purchase], int]:
        """Get purchases with filters."""
        query = self.db.query(Purchase).filter(
            Purchase.company_id == company_id,
            Purchase.deleted_at.is_(None)
        )
        
        if purchase_type:
            query = query.filter(Purchase.purchase_type == purchase_type)
        if vendor_id:
            query = query.filter(Purchase.vendor_id == vendor_id)
        if status:
            query = query.filter(Purchase.status == status)
        if from_date:
            query = query.filter(Purchase.created_at >= from_date)
        if to_date:
            query = query.filter(Purchase.created_at <= to_date)
        
        total = query.count()
        
        offset = (page - 1) * page_size
        purchases = query.order_by(Purchase.created_at.desc()) \
                       .offset(offset) \
                       .limit(page_size) \
                       .all()
        
        return purchases, total
    
    def update_purchase(
        self,
        purchase_id: str,
        company_id: str,
        update_data: Dict[str, Any]
    ) -> Optional[Purchase]:
        """Update a purchase."""
        purchase = self.get_purchase(purchase_id, company_id)
        if not purchase:
            return None
        
        # Update fields
        for key, value in update_data.items():
            if hasattr(purchase, key) and key not in ["id", "company_id", "created_at", "created_by"]:
                setattr(purchase, key, value)
        
        purchase.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(purchase)
        return purchase
    
    def delete_purchase(self, purchase_id: str, company_id: str) -> bool:
        """Soft delete a purchase."""
        purchase = self.get_purchase(purchase_id, company_id)
        if not purchase:
            return False
        
        purchase.deleted_at = datetime.utcnow()
        purchase.status = PurchaseInvoiceStatus.CANCELLED
        
        self.db.commit()
        return True
    
    def add_payment_to_purchase(
        self,
        purchase_id: str,
        company_id: str,
        user_id: str,
        payment_data: Dict[str, Any]
    ) -> Optional[PurchasePayment]:
        """Add payment to an existing purchase."""
        purchase = self.get_purchase(purchase_id, company_id)
        if not purchase:
            return None
        
        return self._create_payment(purchase, payment_data, user_id)
    
    def get_purchase_summary(
        self,
        company_id: str,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get purchase summary for dashboard."""
        query = self.db.query(Purchase).filter(
            Purchase.company_id == company_id,
            Purchase.deleted_at.is_(None),
            Purchase.status != PurchaseInvoiceStatus.CANCELLED
        )
        
        if from_date:
            query = query.filter(Purchase.created_at >= from_date)
        if to_date:
            query = query.filter(Purchase.created_at <= to_date)
        
        purchases = query.all()
        
        total_purchases = len(purchases)
        total_amount = sum(p.total_amount for p in purchases)
        total_paid = sum(p.amount_paid for p in purchases)
        total_due = sum(p.balance_due for p in purchases)
        
        # Group by purchase type
        by_type = {}
        for purchase in purchases:
            ptype = purchase.purchase_type
            if ptype not in by_type:
                by_type[ptype] = {
                    "count": 0,
                    "amount": Decimal("0")
                }
            by_type[ptype]["count"] += 1
            by_type[ptype]["amount"] += purchase.total_amount
        
        # Monthly trend
        monthly_data = {}
        for purchase in purchases:
            month_key = purchase.created_at.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = Decimal("0")
            monthly_data[month_key] += purchase.total_amount
        
        return {
            "total_purchases": total_purchases,
            "total_amount": float(total_amount),
            "total_paid": float(total_paid),
            "total_due": float(total_due),
            "by_type": by_type,
            "monthly_trend": monthly_data
        }