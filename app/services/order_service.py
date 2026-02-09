"""Order Service - Sales and Purchase order management."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.models import (
    Company, Customer, Product, SalesOrder, SalesOrderItem,CreatorType  ,
    PurchaseOrder, PurchaseOrderItem, DeliveryNote, DeliveryNoteItem,
    ReceiptNote, ReceiptNoteItem, Godown, OrderStatus
)
from app.services.inventory_service import InventoryService
from app.services.voucher_engine import VoucherEngine


class OrderService:
    """Service for managing sales and purchase orders."""
    
    def __init__(self, db: Session):
        self.db = db
        self.inventory_service = InventoryService(db)
    
    # ============== Sales Orders ==============
    
    def create_sales_order(
        self,
        company: Company,
        customer_id: str,
        items: List[Dict[str, Any]],
        sales_order_date: Optional[datetime] = None,
        expire_date: Optional[datetime] = None,
        status: Optional[str] = "pending",
        reference_no: Optional[str] = None,
        reference_date: Optional[datetime] = None,
        payment_terms: Optional[str] = None,
        sales_person_id: Optional[str] = None,
        contact_person: Optional[str] = None,
        notes: Optional[str] = None,
        terms: Optional[str] = None,
        freight_charges: Optional[Decimal] = None,
        p_and_f_charges: Optional[Decimal] = None,
        round_off: Optional[Decimal] = None,
        subtotal: Optional[Decimal] = None,
        total_tax: Optional[Decimal] = None,
        total_amount: Optional[Decimal] = None,
        send_message: Optional[bool] = False,
        # New fields from frontend
        delivery_note: Optional[str] = None,
        supplier_ref: Optional[str] = None,
        other_references: Optional[str] = None,
        buyer_order_no: Optional[str] = None,
        buyer_order_date: Optional[datetime] = None,
        despatch_doc_no: Optional[str] = None,
        delivery_note_date: Optional[datetime] = None,
        despatched_through: Optional[str] = None,
        destination: Optional[str] = None,
        terms_of_delivery: Optional[str] = None,
        
    ) -> SalesOrder:
        """Create a new sales order."""
        print("=" * 80)
        print("DEBUG: START create_sales_order")
        print(f"DEBUG: Company: {company.id}")
        print(f"DEBUG: Customer: {customer_id}")
        print(f"DEBUG: Items count: {len(items)}")
        
        for idx, item in enumerate(items):
            print(f"\nDEBUG: Item {idx} raw data:")
            print(f"  item_code: '{item.get('item_code')}'")
            print(f"  item_code is str: {isinstance(item.get('item_code'), str)}")
        
        # Generate order number
        order_count = self.db.query(SalesOrder).filter(
            SalesOrder.company_id == company.id
        ).count()
        order_number = f"SO/{datetime.now().year}-{datetime.now().year+1}/{order_count + 1:04d}"
        
        print(f"DEBUG: Order number: {order_number}")
        
        # Map status string to OrderStatus enum
        status_map = {
            "pending": OrderStatus.DRAFT,
            "approved": OrderStatus.CONFIRMED,
            "cancelled": OrderStatus.CANCELLED,
            "completed": OrderStatus.FULFILLED,
            "draft": OrderStatus.DRAFT,
            "confirmed": OrderStatus.CONFIRMED,
            "fulfilled": OrderStatus.FULFILLED,
            "cancelled": OrderStatus.CANCELLED
        }
        
        order_status = status_map.get(status.lower() if status else "pending", OrderStatus.DRAFT)
        
        order = SalesOrder(
            company_id=company.id,
            customer_id=customer_id,
            order_number=order_number,
            order_date=sales_order_date or datetime.utcnow(),
            expire_date=expire_date,
            status=order_status,
            reference_no=reference_no,
            reference_date=reference_date,
            payment_terms=payment_terms,
            sales_person_id=sales_person_id,
            contact_person=contact_person,
            notes=notes,
            terms=terms,
            freight_charges=freight_charges or Decimal("0"),
            p_and_f_charges=p_and_f_charges or Decimal("0"),
            round_off=round_off or Decimal("0"),
            subtotal=subtotal or Decimal("0"),
            total_tax=total_tax or Decimal("0"),
            total_amount=total_amount or Decimal("0"),
            send_message=send_message or False,
            # New fields
            delivery_note=delivery_note,
            supplier_ref=supplier_ref,
            other_references=other_references,
            buyer_order_no=buyer_order_no,
            buyer_order_date=buyer_order_date,
            despatch_doc_no=despatch_doc_no,
            delivery_note_date=delivery_note_date,
            despatched_through=despatched_through,
            destination=destination,
            terms_of_delivery=terms_of_delivery,
        )
        
        self.db.add(order)
        self.db.flush()
        print(f"DEBUG: Order created with ID: {order.id}")
        
        # Store created items
        created_items = []
        
        # Create items regardless of totals calculation
        for idx, item_data in enumerate(items):
            print(f"\nDEBUG: Processing item {idx}:")
            
            qty = Decimal(str(item_data.get("quantity", 0)))
            unit_price = Decimal(str(item_data.get("unit_price", item_data.get("rate", 0))))
            gst_rate = Decimal(str(item_data.get("gst_rate", 18)))
            
            print(f"  DEBUG: Quantity: {qty}, Unit Price: {unit_price}, GST: {gst_rate}")
            
            # Calculate item totals
            item_total = qty * unit_price
            tax_amount = item_total * gst_rate / 100
            item_total_amount = item_total + tax_amount
            
            # FIX: Handle item_code - ALWAYS ensure non-empty
            item_code_value = str(item_data.get("item_code", "")).strip() 
            print(f"  DEBUG: Final item_code: '{item_code_value}'")
            
            # Create sales order item
            item = SalesOrderItem(
                order_id=order.id,
                product_id=item_data.get("product_id"),
                item_code=item_code_value,  # Non-empty string
                description=item_data.get("description", ""),
                hsn_code=item_data.get("hsn_code"),
                quantity=qty,
                unit=item_data.get("unit", "unit"),
                unit_price=unit_price,
                 rate=unit_price,
                gst_rate=gst_rate,
                tax_amount=tax_amount,
                total_amount=item_total_amount,
                quantity_pending=qty,
            )
            
            self.db.add(item)
            created_items.append(item)
            print(f"  DEBUG: Item object created with item_code='{item.item_code}'")
        
        # Calculate totals if not provided
        if not subtotal or not total_tax or not total_amount:
            print("DEBUG: Calculating totals from items")
            calculated_subtotal = sum(item.quantity * item.unit_price for item in created_items)
            calculated_total_tax = sum(item.tax_amount for item in created_items)
            calculated_total_qty = sum(item.quantity for item in created_items)
            
            # Add freight and P&F charges to subtotal
            final_subtotal = calculated_subtotal + (freight_charges or Decimal("0")) + (p_and_f_charges or Decimal("0"))
            final_total = final_subtotal + calculated_total_tax + (round_off or Decimal("0"))
            
            # Update order with calculated values
            order.subtotal = final_subtotal
            order.total_tax = calculated_total_tax
            order.total_amount = final_total
            order.quantity_ordered = calculated_total_qty
            
            print(f"DEBUG: Calculated - Subtotal: {final_subtotal}, Tax: {calculated_total_tax}, Total: {final_total}")
        
        print(f"\nDEBUG: {len(created_items)} items created:")
        for idx, item in enumerate(created_items):
            print(f"  Item {idx}: item_code='{item.item_code}'")
        
        try:
            print("\nDEBUG: Attempting to commit...")
            self.db.commit()
            self.db.refresh(order)
            print(f"DEBUG: SUCCESS! Sales order {order.order_number} created")
            print("=" * 80)
            return order
        except Exception as e:
            print(f"\nDEBUG: ERROR during commit: {e}")
            import traceback
            traceback.print_exc()
            self.db.rollback()
            print("=" * 80)
            raise
    def get_sales_orders(
        self,
        company: Company,
        customer_id: Optional[str] = None,
        status: Optional[OrderStatus] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> List[SalesOrder]:
        """Get sales orders with filters."""
        query = self.db.query(SalesOrder).filter(
            SalesOrder.company_id == company.id
        )
        
        if customer_id:
            query = query.filter(SalesOrder.customer_id == customer_id)
        if status:
            query = query.filter(SalesOrder.status == status)
        if from_date:
            query = query.filter(SalesOrder.order_date >= from_date)
        if to_date:
            query = query.filter(SalesOrder.order_date <= to_date)
        
        return query.order_by(SalesOrder.order_date.desc()).all()
    
    def get_sales_order(self, order_id: str, company: Company) -> Optional[SalesOrder]:
        """Get a sales order by ID."""
        return self.db.query(SalesOrder).filter(
            SalesOrder.id == order_id,
            SalesOrder.company_id == company.id
        ).first()
    
    def update_sales_order(
        self,
        order: SalesOrder,
        customer_id: Optional[str] = None,
        sales_order_date: Optional[datetime] = None,
        expire_date: Optional[datetime] = None,
        status: Optional[str] = None,
        reference_no: Optional[str] = None,
        reference_date: Optional[datetime] = None,
        payment_terms: Optional[str] = None,
        sales_person_id: Optional[str] = None,
        contact_person: Optional[str] = None,
        notes: Optional[str] = None,
        terms: Optional[str] = None,
        freight_charges: Optional[Decimal] = None,
        p_and_f_charges: Optional[Decimal] = None,
        round_off: Optional[Decimal] = None,
        subtotal: Optional[Decimal] = None,
        total_tax: Optional[Decimal] = None,
        total_amount: Optional[Decimal] = None,
        send_message: Optional[bool] = None,
        items: Optional[List[Dict[str, Any]]] = None,
        # New fields
        delivery_note: Optional[str] = None,
        supplier_ref: Optional[str] = None,
        other_references: Optional[str] = None,
        buyer_order_no: Optional[str] = None,
        buyer_order_date: Optional[datetime] = None,
        despatch_doc_no: Optional[str] = None,
        delivery_note_date: Optional[datetime] = None,
        despatched_through: Optional[str] = None,
        destination: Optional[str] = None,
        terms_of_delivery: Optional[str] = None,
    ) -> SalesOrder:
        """Update an existing sales order."""
        # Update basic fields if provided
        if customer_id is not None:
            order.customer_id = customer_id
        if sales_order_date is not None:
            order.order_date = sales_order_date
        if expire_date is not None:
            order.expire_date = expire_date
        if status is not None:
            status_map = {
                "pending": OrderStatus.DRAFT,
                "approved": OrderStatus.CONFIRMED,
                "cancelled": OrderStatus.CANCELLED,
                "completed": OrderStatus.FULFILLED,
                "draft": OrderStatus.DRAFT,
                "confirmed": OrderStatus.CONFIRMED,
                "fulfilled": OrderStatus.FULFILLED,
                "cancelled": OrderStatus.CANCELLED
            }
            order.status = status_map.get(status.lower(), OrderStatus.DRAFT)
        if reference_no is not None:
            order.reference_no = reference_no
        if reference_date is not None:
            order.reference_date = reference_date
        if payment_terms is not None:
            order.payment_terms = payment_terms
        if sales_person_id is not None:
            order.sales_person_id = sales_person_id
        if contact_person is not None:
            order.contact_person = contact_person
        if notes is not None:
            order.notes = notes
        if terms is not None:
            order.terms = terms
        if freight_charges is not None:
            order.freight_charges = freight_charges
        if p_and_f_charges is not None:
            order.p_and_f_charges = p_and_f_charges
        if round_off is not None:
            order.round_off = round_off
        if subtotal is not None:
            order.subtotal = subtotal
        if total_tax is not None:
            order.total_tax = total_tax
        if total_amount is not None:
            order.total_amount = total_amount
        if send_message is not None:
            order.send_message = send_message
        
        # Update new fields
        if delivery_note is not None:
            order.delivery_note = delivery_note
        if supplier_ref is not None:
            order.supplier_ref = supplier_ref
        if other_references is not None:
            order.other_references = other_references
        if buyer_order_no is not None:
            order.buyer_order_no = buyer_order_no
        if buyer_order_date is not None:
            order.buyer_order_date = buyer_order_date
        if despatch_doc_no is not None:
            order.despatch_doc_no = despatch_doc_no
        if delivery_note_date is not None:
            order.delivery_note_date = delivery_note_date
        if despatched_through is not None:
            order.despatched_through = despatched_through
        if destination is not None:
            order.destination = destination
        if terms_of_delivery is not None:
            order.terms_of_delivery = terms_of_delivery
        
        # Update items if provided
        if items is not None:
            # Delete existing items
            self.db.query(SalesOrderItem).filter(
                SalesOrderItem.order_id == order.id
            ).delete()
            
            # Add new items
            calculated_subtotal = Decimal("0")
            calculated_total_tax = Decimal("0")
            calculated_total_qty = Decimal("0")
            
            for item_data in items:
                qty = Decimal(str(item_data.get("quantity", 0)))
                unit_price = Decimal(str(item_data.get("unit_price", item_data.get("rate", 0))))
                gst_rate = Decimal(str(item_data.get("gst_rate", 18)))
                
                # Calculate item totals - SIMPLIFIED to match your model
                item_total = qty * unit_price
                tax_amount = item_total * gst_rate / 100
                item_total_amount = item_total + tax_amount
                
                # Create sales order item - ONLY USE FIELDS THAT EXIST IN THE MODEL
                item = SalesOrderItem(
                    order_id=order.id,
                    product_id=item_data.get("product_id"),
                    item_code=item_data.get("item_code", ""),
                    description=item_data.get("description", ""),
                    hsn_code=item_data.get("hsn_code"),
                    quantity=qty,
                    unit=item_data.get("unit", "unit"),
                    unit_price=unit_price,
                    rate=unit_price,
                    gst_rate=gst_rate,
                    tax_amount=tax_amount,
                    total_amount=item_total_amount,
                    quantity_pending=qty,
                )
                self.db.add(item)
                
                calculated_subtotal += item_total  # Use item_total, not taxable_amount
                calculated_total_tax += tax_amount
                calculated_total_qty += qty
            
            # Update order totals
            final_subtotal = calculated_subtotal + (order.freight_charges or Decimal("0")) + (order.p_and_f_charges or Decimal("0"))
            final_total = final_subtotal + calculated_total_tax + (order.round_off or Decimal("0"))
            
            order.subtotal = final_subtotal
            order.total_tax = calculated_total_tax
            order.total_amount = final_total
            order.quantity_ordered = calculated_total_qty
        
        self.db.commit()
        self.db.refresh(order)
        return order
    def confirm_sales_order(self, order: SalesOrder, create_voucher: bool = True) -> SalesOrder:
        """Confirm a sales order and optionally create accounting entries.
        
        When confirmed, creates the following accounting entries:
        - Dr. Accounts Receivable (Total amount)
        - Cr. Sales A/c (Subtotal)
        - Cr. Output CGST A/c (CGST amount)
        - Cr. Output SGST A/c (SGST amount)
        """
        order.status = OrderStatus.CONFIRMED
        
        # Create accounting voucher
        if create_voucher and order.total_amount and order.total_amount > 0:
            try:
                company = self.db.query(Company).filter(Company.id == order.company_id).first()
                if company:
                    voucher_engine = VoucherEngine(self.db)
                    result = voucher_engine.create_sales_order_voucher(company, order)
                    if not result.success:
                        print(f"Warning: Failed to create voucher for SO {order.order_number}: {result.error}")
            except Exception as e:
                print(f"Warning: Error creating voucher for SO {order.order_number}: {e}")
        
        self.db.commit()
        self.db.refresh(order)
        return order
    
    def cancel_sales_order(self, order: SalesOrder) -> SalesOrder:
        """Cancel a sales order."""
        order.status = OrderStatus.CANCELLED
        self.db.commit()
        self.db.refresh(order)
        return order
    
    # ============== Purchase Orders ==============
    
    def create_purchase_order(
        self,
        company: Company,
        vendor_id: str,
        items: List[Dict[str, Any]],
        order_date: Optional[datetime] = None,
        expected_date: Optional[datetime] = None,
        notes: Optional[str] = None,
        terms: Optional[str] = None,
        reference_number: Optional[str] = None,
        currency: str = "INR",
        exchange_rate: Decimal = Decimal("1.0"),
        freight_charges: Decimal = Decimal("0"),
        other_charges: Decimal = Decimal("0"),
        discount_on_all: Decimal = Decimal("0"),
        round_off: Decimal = Decimal("0"),
        subtotal: Optional[Decimal] = None,
        tax_amount: Optional[Decimal] = None,
        total_amount: Optional[Decimal] = None,
        creator_id: Optional[str] = None,
        creator_type: CreatorType = CreatorType.USER,
    ) -> PurchaseOrder:
        """Create a new purchase order."""
        print("=" * 80)
        print("DEBUG: START create_purchase_order")
        print(f"DEBUG: Company: {company.id}")
        print(f"DEBUG: Vendor: {vendor_id}")
        print(f"DEBUG: Created by: {creator_type}") 
        print(f"DEBUG: Items count: {len(items)}")
        print(f"DEBUG: Currency: {currency}, Exchange Rate: {exchange_rate}")
        print(f"DEBUG: Freight: {freight_charges}, Other Charges: {other_charges}")
        print(f"DEBUG: Discount on All: {discount_on_all}, Round Off: {round_off}")
        
        # Debug each item
        for idx, item in enumerate(items):
            print(f"\nDEBUG: Item {idx} raw data:")
            print(f"  product_id: {item.get('product_id')}")
            print(f"  item_code: '{item.get('item_code')}'")
            print(f"  quantity: {item.get('quantity')}")
            print(f"  rate: {item.get('rate')}")
            print(f"  discount_percent: {item.get('discount_percent')}")
            print(f"  discount_amount: {item.get('discount_amount')}")
            print(f"  gst_rate: {item.get('gst_rate')}")
            print(f"  tax_amount: {item.get('tax_amount')}")
            print(f"  total_amount: {item.get('total_amount')}")
        
        order_count = self.db.query(PurchaseOrder).filter(
            PurchaseOrder.company_id == company.id
        ).count()
        order_number = f"PO-{order_count + 1:05d}"
        
        print(f"\nDEBUG: Generated order number: {order_number}")
        
        # Create the purchase order with basic info
        order = PurchaseOrder(
            company_id=company.id,
            vendor_id=vendor_id,
            order_number=order_number,
            order_date=order_date or datetime.utcnow(),
            expected_date=expected_date,
            status=OrderStatus.DRAFT,
            notes=notes,
            terms=terms,
            reference_number=reference_number,
            currency=currency,
            tax_amount=tax_amount, 
            exchange_rate=exchange_rate,
            freight_charges=freight_charges,
            other_charges=other_charges,
            discount_on_all=discount_on_all,
            round_off=round_off,
            creator_type=creator_type,  # Set creator type
        creator_id=creator_id,
        )
        
        self.db.add(order)
        self.db.flush()
        print(f"DEBUG: Order created with ID: {order.id}")
        
        # Store created items
        created_items = []
        
        # Create items
        for idx, item_data in enumerate(items):
            print(f"\nDEBUG: Processing item {idx}:")
            
            qty = Decimal(str(item_data.get("quantity", 0)))
            rate = Decimal(str(item_data.get("rate", 0)))
            discount_percent = Decimal(str(item_data.get("discount_percent", 0)))
            discount_amount = Decimal(str(item_data.get("discount_amount", 0)))
            gst_rate = Decimal(str(item_data.get("gst_rate", 18)))
            item_tax_amount = Decimal(str(item_data.get("tax_amount", 0)))
            item_total_amount = Decimal(str(item_data.get("total_amount", 0)))
            
            print(f"  DEBUG: Quantity: {qty}, Rate: {rate}")
            print(f"  DEBUG: Discount %: {discount_percent}, Amount: {discount_amount}")
            print(f"  DEBUG: GST Rate: {gst_rate}, Tax: {item_tax_amount}")
            print(f"  DEBUG: Total: {item_total_amount}")
            
            # FIX: Handle item_code - ensure non-empty
            item_code_value = str(item_data.get("item_code", "")).strip() 
            print(f"  DEBUG: Final item_code: '{item_code_value}'")
            
            # Create purchase order item
            item = PurchaseOrderItem(
                order_id=order.id,
                product_id=item_data.get("product_id"),
                description=item_data.get("description", ""),
                quantity=qty,
                item_code=item_code_value,  # Use item_code, not description
                unit=item_data.get("unit", "Nos"),
                rate=rate,
                discount_percent=discount_percent,
                discount_amount=discount_amount,
                quantity_pending=qty,
                gst_rate=gst_rate,
                tax_amount=item_tax_amount,
                total_amount=item_total_amount,
            )
            
            self.db.add(item)
            created_items.append(item)
            print(f"  DEBUG: Item object created with item_code='{item.item_code}'")
        
        # Calculate totals from items
        print("\nDEBUG: Calculating totals from items...")
        calculated_subtotal = Decimal("0")
        calculated_total_tax = Decimal("0")
        calculated_total_qty = Decimal("0")
        
        for item in created_items:
            # Item subtotal = (quantity * rate) - discount_amount
            item_subtotal = (item.quantity * item.rate) - item.discount_amount
            calculated_subtotal += item_subtotal
            calculated_total_tax += item.tax_amount
            calculated_total_qty += item.quantity
            print(f"  Item: {item.item_code} - Subtotal: {item_subtotal}, Tax: {item.tax_amount}")
        
        # Apply charges and discounts to total
        final_total = (
            calculated_subtotal + 
            calculated_total_tax + 
            freight_charges + 
            other_charges - 
            discount_on_all + 
            round_off
        )
        
        # Use frontend-provided totals if available, otherwise use calculated
        if subtotal is not None and tax_amount is not None and total_amount is not None:
            print(f"DEBUG: Using frontend provided totals")
            print(f"  Frontend - Subtotal: {subtotal}, Tax: {tax_amount}, Total: {total_amount}")
            order.subtotal = subtotal
            order.tax_amount = tax_amount
            order.total_amount = total_amount
        else:
            print(f"DEBUG: Using backend calculated totals")
            print(f"  Calculated - Subtotal: {calculated_subtotal}, Tax: {calculated_total_tax}")
            print(f"  Final Total (with charges): {final_total}")
            order.subtotal = calculated_subtotal
            order.tax_amount = calculated_total_tax
            order.total_amount = final_total
        
        order.quantity_ordered = calculated_total_qty
        
        print(f"\nDEBUG: {len(created_items)} items created:")
        for idx, item in enumerate(created_items):
            print(f"  Item {idx}: item_code='{item.item_code}', discount_percent={item.discount_percent}")
        
        try:
            print("\nDEBUG: Attempting to commit...")
            self.db.commit()
            self.db.refresh(order)
            print(f"DEBUG: SUCCESS! Purchase order {order.order_number} created")
            print("=" * 80)
            return order
        except Exception as e:
            print(f"\nDEBUG: ERROR during commit: {e}")
            import traceback
            traceback.print_exc()
            self.db.rollback()
            print("=" * 80)
            raise


    def get_purchase_orders(
        self,
        company: Company,
        vendor_id: Optional[str] = None,
        status: Optional[OrderStatus] = None,
    ) -> List[PurchaseOrder]:
        """Get purchase orders with filters."""
        query = self.db.query(PurchaseOrder).filter(
            PurchaseOrder.company_id == company.id
        )
        
        if vendor_id:
            query = query.filter(PurchaseOrder.vendor_id == vendor_id)
        if status:
            query = query.filter(PurchaseOrder.status == status)
        
        return query.order_by(PurchaseOrder.order_date.desc()).all()
    
    def get_purchase_order(self, order_id: str, company: Company) -> Optional[PurchaseOrder]:
        """Get a purchase order by ID."""
        return self.db.query(PurchaseOrder).filter(
            PurchaseOrder.id == order_id,
            PurchaseOrder.company_id == company.id
        ).first()
    
    def get_purchase_order_with_items(self, order_id: str, company: Company) -> Optional[PurchaseOrder]:
        """Get a purchase order by ID with items eagerly loaded."""
        from sqlalchemy.orm import joinedload
        print(f"DEBUG: Loading purchase order {order_id} for company {company.id}")
        return self.db.query(PurchaseOrder).options(
            joinedload(PurchaseOrder.items).joinedload(PurchaseOrderItem.product),
            joinedload(PurchaseOrder.vendor),
            
        ).filter(
            PurchaseOrder.id == order_id,
            PurchaseOrder.company_id == company.id
        ).first()
      
    
    def update_purchase_order(
        self,
        order: PurchaseOrder,
        vendor_id: Optional[str] = None,
        items: Optional[List[Dict[str, Any]]] = None,
        order_date: Optional[datetime] = None,
        expected_date: Optional[datetime] = None,
        notes: Optional[str] = None,
        terms: Optional[str] = None,
        # Add these parameters to match create_purchase_order
        reference_number: Optional[str] = None,
        currency: Optional[str] = None,
        exchange_rate: Optional[Decimal] = None,
        freight_charges: Optional[Decimal] = None,
        other_charges: Optional[Decimal] = None,
        discount_on_all: Optional[Decimal] = None,
        round_off: Optional[Decimal] = None,
        subtotal: Optional[Decimal] = None,
        tax_amount: Optional[Decimal] = None,
        total_amount: Optional[Decimal] = None,
    ) -> PurchaseOrder:
        """Update an existing purchase order."""
        print("=" * 80)
        print("DEBUG: START update_purchase_order")
        print(f"DEBUG: Updating order: {order.order_number}")
        
        # Update basic fields if provided
        if vendor_id is not None:
            order.vendor_id = vendor_id
        if order_date is not None:
            order.order_date = order_date
        if expected_date is not None:
            order.expected_date = expected_date
        if notes is not None:
            order.notes = notes
        if terms is not None:
            order.terms = terms
        if reference_number is not None:
            order.reference_number = reference_number
        if currency is not None:
            order.currency = currency
        if exchange_rate is not None:
            order.exchange_rate = exchange_rate
        if freight_charges is not None:
            order.freight_charges = freight_charges
        if other_charges is not None:
            order.other_charges = other_charges
        if discount_on_all is not None:
            order.discount_on_all = discount_on_all
        if round_off is not None:
            order.round_off = round_off
        
        # Update items if provided
        if items is not None:
            print(f"DEBUG: Updating {len(items)} items")
            
            # Debug each item
            for idx, item in enumerate(items):
                print(f"\nDEBUG: Item {idx} raw data:")
                print(f"  product_id: {item.get('product_id')}")
                print(f"  item_code: '{item.get('item_code')}'")
                print(f"  quantity: {item.get('quantity')}")
                print(f"  rate: {item.get('rate')}")
                print(f"  discount_percent: {item.get('discount_percent')}")
                print(f"  discount_amount: {item.get('discount_amount')}")
                print(f"  gst_rate: {item.get('gst_rate')}")
                print(f"  tax_amount: {item.get('tax_amount')}")
                print(f"  total_amount: {item.get('total_amount')}")
            
            # Delete existing items
            self.db.query(PurchaseOrderItem).filter(
                PurchaseOrderItem.order_id == order.id
            ).delete()
            print("DEBUG: Deleted existing items")
            
            # Add new items
            calculated_subtotal = Decimal("0")
            calculated_total_tax = Decimal("0")
            calculated_total_qty = Decimal("0")
            
            for idx, item_data in enumerate(items):
                qty = Decimal(str(item_data.get("quantity", 0)))
                rate = Decimal(str(item_data.get("rate", 0)))
                discount_percent = Decimal(str(item_data.get("discount_percent", 0)))
                discount_amount = Decimal(str(item_data.get("discount_amount", 0)))
                gst_rate = Decimal(str(item_data.get("gst_rate", 18)))
                item_tax_amount = Decimal(str(item_data.get("tax_amount", 0)))
                item_total_amount = Decimal(str(item_data.get("total_amount", 0)))
                
                print(f"\nDEBUG: Processing item {idx}:")
                print(f"  Quantity: {qty}, Rate: {rate}")
                print(f"  Discount %: {discount_percent}, Amount: {discount_amount}")
                print(f"  GST Rate: {gst_rate}, Tax: {item_tax_amount}")
                print(f"  Total: {item_total_amount}")
                
                # Handle item_code - ensure non-empty
                item_code_value = str(item_data.get("item_code", "")).strip()
                print(f"  Final item_code: '{item_code_value}'")
                
                # Calculate item subtotal for summary
                item_subtotal = (qty * rate) - discount_amount
                calculated_subtotal += item_subtotal
                calculated_total_tax += item_tax_amount
                calculated_total_qty += qty
                
                # Create purchase order item
                item = PurchaseOrderItem(
                    order_id=order.id,
                    product_id=item_data.get("product_id"),
                    description=item_data.get("description", ""),
                    quantity=qty,
                    item_code=item_code_value,
                    unit=item_data.get("unit", "Nos"),
                    rate=rate,
                    discount_percent=discount_percent,
                    discount_amount=discount_amount,
                    quantity_pending=qty,
                    gst_rate=gst_rate,
                    tax_amount=item_tax_amount,
                    total_amount=item_total_amount,
                )
                self.db.add(item)
                print(f"  Item created with item_code='{item.item_code}'")
            
            print(f"\nDEBUG: Calculated from items:")
            print(f"  Subtotal: {calculated_subtotal}")
            print(f"  Tax: {calculated_total_tax}")
            print(f"  Quantity: {calculated_total_qty}")
            
            # Apply charges and discounts to total
            final_total = (
                calculated_subtotal + 
                calculated_total_tax + 
                order.freight_charges + 
                order.other_charges - 
                order.discount_on_all + 
                order.round_off
            )
            
            # Use provided totals if available, otherwise use calculated
            if subtotal is not None and tax_amount is not None and total_amount is not None:
                print(f"DEBUG: Using provided totals from parameters")
                print(f"  Provided - Subtotal: {subtotal}, Tax: {tax_amount}, Total: {total_amount}")
                order.subtotal = subtotal
                order.tax_amount = tax_amount
                order.total_amount = total_amount
            else:
                print(f"DEBUG: Using calculated totals")
                print(f"  Calculated - Subtotal: {calculated_subtotal}, Tax: {calculated_total_tax}")
                print(f"  Final Total (with charges): {final_total}")
                order.subtotal = calculated_subtotal
                order.tax_amount = calculated_total_tax
                order.total_amount = final_total
            
            order.quantity_ordered = calculated_total_qty
            
            print(f"DEBUG: Order totals updated:")
            print(f"  Subtotal: {order.subtotal}")
            print(f"  Tax Amount: {order.tax_amount}")
            print(f"  Total Amount: {order.total_amount}")
        
        self.db.commit()
        self.db.refresh(order)
        print(f"DEBUG: SUCCESS! Purchase order {order.order_number} updated")
        print("=" * 80)
        return order
    
    def confirm_purchase_order(self, order: PurchaseOrder, create_voucher: bool = True) -> PurchaseOrder:
        """Confirm a purchase order and optionally create accounting entries.
        
        When confirmed, creates the following accounting entries:
        - Dr. Purchases A/c (Subtotal)
        - Dr. Input CGST A/c (CGST amount)
        - Dr. Input SGST A/c (SGST amount)
        - Cr. Accounts Payable (Total amount)
        """
        order.status = OrderStatus.CONFIRMED
        
        # Create accounting voucher
        if create_voucher and order.total_amount and order.total_amount > 0:
            try:
                company = self.db.query(Company).filter(Company.id == order.company_id).first()
                if company:
                    voucher_engine = VoucherEngine(self.db)
                    result = voucher_engine.create_purchase_order_voucher(company, order)
                    if not result.success:
                        # Log but don't fail the order confirmation
                        print(f"Warning: Failed to create voucher for PO {order.order_number}: {result.error}")
            except Exception as e:
                # Log but don't fail the order confirmation
                print(f"Warning: Error creating voucher for PO {order.order_number}: {e}")
        
        self.db.commit()
        self.db.refresh(order)
        return order
    
    def cancel_purchase_order(self, order: PurchaseOrder) -> PurchaseOrder:
        """Cancel a purchase order."""
        order.status = OrderStatus.CANCELLED
        self.db.commit()
        self.db.refresh(order)
        return order
    
    # ============== Delivery Notes ==============
    
    def create_delivery_note(
        self,
        company: Company,
        sales_order_id: Optional[str],
        customer_id: str,
        items: List[Dict[str, Any]],
        godown_id: Optional[str] = None,
        delivery_date: Optional[datetime] = None,
        transporter_name: Optional[str] = None,
        vehicle_number: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> DeliveryNote:
        """Create a delivery note and update stock."""
        note_count = self.db.query(DeliveryNote).filter(
            DeliveryNote.company_id == company.id
        ).count()
        delivery_number = f"DN-{note_count + 1:05d}"
        
        note = DeliveryNote(
            company_id=company.id,
            sales_order_id=sales_order_id,
            customer_id=customer_id,
            delivery_number=delivery_number,
            delivery_date=delivery_date or datetime.utcnow(),
            godown_id=godown_id,
            transporter_name=transporter_name,
            vehicle_number=vehicle_number,
            notes=notes,
        )
        
        self.db.add(note)
        self.db.flush()
        
        for item_data in items:
            dn_item = DeliveryNoteItem(
                delivery_note_id=note.id,
                product_id=item_data.get("product_id"),  # Unified Product model
                description=item_data.get("description", ""),
                quantity=Decimal(str(item_data.get("quantity", 0))),
                unit=item_data.get("unit", "Nos"),
            )
            self.db.add(dn_item)
            
            # Update stock
            if item_data.get("product_id"):
                self.inventory_service.record_stock_out(
                    company=company,
                    product_id=item_data["product_id"],
                    quantity=Decimal(str(item_data["quantity"])),
                    godown_id=godown_id,
                    reference_type="delivery_note",
                    reference_id=note.id,
                    reference_number=delivery_number,
                )
        
        # Update sales order if linked
        if sales_order_id:
            order = self.get_sales_order(sales_order_id, company)
            if order:
                delivered = sum(Decimal(str(i.get("quantity", 0))) for i in items)
                order.quantity_delivered = (order.quantity_delivered or Decimal("0")) + delivered
                
                if order.quantity_delivered >= order.quantity_ordered:
                    order.status = OrderStatus.FULFILLED
                else:
                    order.status = OrderStatus.PARTIALLY_FULFILLED
        
        self.db.commit()
        self.db.refresh(note)
        return note
    
    def get_delivery_notes(
        self,
        company: Company,
        sales_order_id: Optional[str] = None,
    ) -> List[DeliveryNote]:
        """Get delivery notes."""
        query = self.db.query(DeliveryNote).filter(
            DeliveryNote.company_id == company.id
        )
        
        if sales_order_id:
            query = query.filter(DeliveryNote.sales_order_id == sales_order_id)
        
        return query.order_by(DeliveryNote.delivery_date.desc()).all()
    
    # ============== Receipt Notes ==============
    
    def create_receipt_note(
        self,
        company: Company,
        purchase_order_id: Optional[str],
        vendor_id: str,
        items: List[Dict[str, Any]],
        godown_id: Optional[str] = None,
        receipt_date: Optional[datetime] = None,
        vendor_invoice_number: Optional[str] = None,
        vendor_invoice_date: Optional[datetime] = None,
        notes: Optional[str] = None,
    ) -> ReceiptNote:
        """Create a receipt note and update stock."""
        note_count = self.db.query(ReceiptNote).filter(
            ReceiptNote.company_id == company.id
        ).count()
        receipt_number = f"RN-{note_count + 1:05d}"
        
        note = ReceiptNote(
            company_id=company.id,
            purchase_order_id=purchase_order_id,
            vendor_id=vendor_id,
            receipt_number=receipt_number,
            receipt_date=receipt_date or datetime.utcnow(),
            godown_id=godown_id,
            vendor_invoice_number=vendor_invoice_number,
            vendor_invoice_date=vendor_invoice_date,
            notes=notes,
        )
        
        self.db.add(note)
        self.db.flush()
        
        for item_data in items:
            accepted = Decimal(str(item_data.get("quantity", 0)))
            rejected = Decimal(str(item_data.get("rejected_quantity", 0)))
            
            rn_item = ReceiptNoteItem(
                receipt_note_id=note.id,
                product_id=item_data.get("product_id"),  # Unified Product model
                description=item_data.get("description", ""),
                quantity=accepted + rejected,
                unit=item_data.get("unit", "Nos"),
                rate=Decimal(str(item_data.get("rate", 0))),
                accepted_quantity=accepted,
                rejected_quantity=rejected,
                rejection_reason=item_data.get("rejection_reason"),
            )
            self.db.add(rn_item)
            
            # Update stock (only accepted quantity)
            if item_data.get("product_id") and accepted > 0:
                self.inventory_service.record_stock_in(
                    company=company,
                    product_id=item_data["product_id"],
                    quantity=accepted,
                    rate=Decimal(str(item_data.get("rate", 0))),
                    godown_id=godown_id,
                    reference_type="receipt_note",
                    reference_id=note.id,
                    reference_number=receipt_number,
                )
        
        # Update purchase order if linked
        if purchase_order_id:
            order = self.get_purchase_order(purchase_order_id, company)
            if order:
                received = sum(Decimal(str(i.get("quantity", 0))) for i in items)
                order.quantity_received = (order.quantity_received or Decimal("0")) + received
                
                if order.quantity_received >= order.quantity_ordered:
                    order.status = OrderStatus.FULFILLED
                else:
                    order.status = OrderStatus.PARTIALLY_FULFILLED
        
        self.db.commit()
        self.db.refresh(note)
        return note
    
    def get_receipt_notes(
        self,
        company: Company,
        purchase_order_id: Optional[str] = None,
    ) -> List[ReceiptNote]:
        """Get receipt notes."""
        query = self.db.query(ReceiptNote).filter(
            ReceiptNote.company_id == company.id
        )
        
        if purchase_order_id:
            query = query.filter(ReceiptNote.purchase_order_id == purchase_order_id)
        
        return query.order_by(ReceiptNote.receipt_date.desc()).all()
