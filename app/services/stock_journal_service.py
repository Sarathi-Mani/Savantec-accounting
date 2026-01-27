"""Stock Journal Service - For stock adjustments, transfers, manufacturing, and conversions."""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.models import (
    Company, Product, Godown, Batch, StockEntry, StockJournal, StockJournalItem,
    BillOfMaterial, BOMComponent, StockMovementType, StockJournalType, StockJournalStatus,
    generate_uuid
)
from app.services.inventory_service import InventoryService


class StockJournalService:
    """Service for managing stock journal vouchers."""
    
    def __init__(self, db: Session):
        self.db = db
        self.inventory_service = InventoryService(db)
    
    # ============== Voucher Number Generation ==============
    
    def _get_next_voucher_number(self, company: Company, journal_type: StockJournalType) -> str:
        """Generate next voucher number based on type."""
        prefix_map = {
            StockJournalType.TRANSFER: "STR",
            StockJournalType.MANUFACTURING: "MFG",
            StockJournalType.DISASSEMBLY: "DIS",
            StockJournalType.REPACKAGING: "RPK",
            StockJournalType.CONVERSION: "CNV",
            StockJournalType.ADJUSTMENT: "ADJ",
        }
        prefix = prefix_map.get(journal_type, "SJ")
        
        # Get current year
        current_year = datetime.utcnow().year
        
        # Find last voucher number for this type and year
        last_journal = self.db.query(StockJournal).filter(
            StockJournal.company_id == company.id,
            StockJournal.journal_type == journal_type,
            StockJournal.voucher_number.like(f"{prefix}-{current_year}-%")
        ).order_by(StockJournal.created_at.desc()).first()
        
        if last_journal:
            try:
                last_num = int(last_journal.voucher_number.split("-")[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}-{current_year}-{next_num:04d}"
    
    # ============== Stock Journal CRUD ==============
    
    def create_stock_journal(
        self,
        company: Company,
        journal_type: StockJournalType,
        source_items: List[Dict[str, Any]],
        destination_items: List[Dict[str, Any]],
        voucher_date: Optional[datetime] = None,
        from_godown_id: Optional[str] = None,
        to_godown_id: Optional[str] = None,
        bom_id: Optional[str] = None,
        narration: Optional[str] = None,
        notes: Optional[str] = None,
        additional_cost: Decimal = Decimal("0"),
        additional_cost_type: Optional[str] = None,
        user_id: Optional[str] = None,
        auto_confirm: bool = False,
    ) -> StockJournal:
        """
        Create a new stock journal voucher.
        
        Args:
            company: Company object
            journal_type: Type of journal (transfer, manufacturing, etc.)
            source_items: List of items being consumed/transferred out
                [{"product_id": str, "quantity": Decimal, "rate": Decimal, "godown_id": str, "batch_id": str}]
            destination_items: List of items being produced/transferred in
                [{"product_id": str, "quantity": Decimal, "rate": Decimal, "godown_id": str, "batch_id": str}]
            voucher_date: Date of voucher
            from_godown_id: Source godown (for transfers)
            to_godown_id: Destination godown (for transfers)
            bom_id: Bill of Material reference (for manufacturing)
            narration: Description
            notes: Additional notes
            additional_cost: Extra costs to allocate
            additional_cost_type: Type of additional cost
            user_id: User creating the voucher
            auto_confirm: If True, automatically confirm the voucher
        """
        voucher_number = self._get_next_voucher_number(company, journal_type)
        
        journal = StockJournal(
            id=generate_uuid(),
            company_id=company.id,
            voucher_number=voucher_number,
            voucher_date=voucher_date or datetime.utcnow(),
            journal_type=journal_type,
            status=StockJournalStatus.DRAFT,
            from_godown_id=from_godown_id or None,
            to_godown_id=to_godown_id or None,
            bom_id=bom_id,
            narration=narration,
            notes=notes,
            additional_cost=additional_cost,
            additional_cost_type=additional_cost_type,
            created_by=user_id,
        )
        self.db.add(journal)
        self.db.flush()
        
        # Add source items (consumption)
        for item_data in source_items:
            self._add_journal_item(journal, "source", item_data, company)
        
        # Add destination items (production)
        for item_data in destination_items:
            self._add_journal_item(journal, "destination", item_data, company)
        
        self.db.commit()
        self.db.refresh(journal)
        
        # Auto-confirm if requested
        if auto_confirm:
            return self.confirm_stock_journal(journal, user_id)
        
        return journal
    
    def _add_journal_item(
        self,
        journal: StockJournal,
        item_type: str,
        item_data: Dict[str, Any],
        company: Company,
    ) -> StockJournalItem:
        """Add an item to the stock journal."""
        product = self.db.query(Product).filter(
            Product.id == item_data["product_id"],
            Product.company_id == company.id
        ).first()
        
        if not product:
            raise ValueError(f"Product not found: {item_data['product_id']}")
        
        quantity = Decimal(str(item_data.get("quantity", 0)))
        rate = Decimal(str(item_data.get("rate", product.standard_cost or 0)))
        value = quantity * rate
        
        item = StockJournalItem(
            id=generate_uuid(),
            stock_journal_id=journal.id,
            item_type=item_type,
            product_id=item_data["product_id"],
            godown_id=item_data.get("godown_id") or journal.from_godown_id if item_type == "source" else item_data.get("godown_id") or journal.to_godown_id,
            batch_id=item_data.get("batch_id"),
            quantity=quantity,
            unit=item_data.get("unit", product.primary_unit or product.unit),
            rate=rate,
            value=value,
            cost_allocation_percent=Decimal(str(item_data.get("cost_allocation_percent", 100))),
            serial_numbers=item_data.get("serial_numbers"),
            notes=item_data.get("notes"),
        )
        self.db.add(item)
        return item
    
    def get_stock_journal(self, company_id: str, journal_id: str) -> Optional[StockJournal]:
        """Get a stock journal by ID."""
        return self.db.query(StockJournal).filter(
            StockJournal.id == journal_id,
            StockJournal.company_id == company_id
        ).first()
    
    def list_stock_journals(
        self,
        company_id: str,
        journal_type: Optional[StockJournalType] = None,
        status: Optional[StockJournalStatus] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """List stock journals with pagination and filters."""
        query = self.db.query(StockJournal).filter(
            StockJournal.company_id == company_id
        )
        
        if journal_type:
            query = query.filter(StockJournal.journal_type == journal_type)
        if status:
            query = query.filter(StockJournal.status == status)
        if from_date:
            query = query.filter(StockJournal.voucher_date >= from_date)
        if to_date:
            query = query.filter(StockJournal.voucher_date <= to_date)
        
        total = query.count()
        
        journals = query.order_by(StockJournal.voucher_date.desc(), StockJournal.created_at.desc())\
            .offset((page - 1) * page_size)\
            .limit(page_size)\
            .all()
        
        return {
            "items": journals,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }
    
    # ============== Confirm/Cancel ==============
    
    def confirm_stock_journal(
        self,
        journal: StockJournal,
        user_id: Optional[str] = None,
    ) -> StockJournal:
        """
        Confirm a stock journal and create actual stock entries.
        
        This will:
        1. Validate stock availability for source items
        2. Create stock out entries for source items
        3. Create stock in entries for destination items
        4. Update product current_stock
        """
        if journal.status != StockJournalStatus.DRAFT:
            raise ValueError(f"Cannot confirm journal. Current status: {journal.status}")
        
        company = self.db.query(Company).filter(Company.id == journal.company_id).first()
        
        # Get all items
        source_items = self.db.query(StockJournalItem).filter(
            StockJournalItem.stock_journal_id == journal.id,
            StockJournalItem.item_type == "source"
        ).all()
        
        destination_items = self.db.query(StockJournalItem).filter(
            StockJournalItem.stock_journal_id == journal.id,
            StockJournalItem.item_type == "destination"
        ).all()
        
        # Validate stock availability for source items
        for item in source_items:
            product = self.db.query(Product).filter(Product.id == item.product_id).first()
            if product.current_stock < item.quantity:
                raise ValueError(
                    f"Insufficient stock for {product.name}. "
                    f"Available: {product.current_stock}, Required: {item.quantity}"
                )
        
        # Determine movement types based on journal type
        source_movement_type, dest_movement_type = self._get_movement_types(journal.journal_type)
        
        # Create stock entries for source items (stock out)
        for item in source_items:
            stock_entry = self.inventory_service.record_stock_out(
                company=company,
                product_id=item.product_id,
                quantity=item.quantity,
                rate=item.rate,
                godown_id=item.godown_id,
                batch_id=item.batch_id,
                reference_type="stock_journal",
                reference_id=journal.id,
                reference_number=journal.voucher_number,
                entry_date=journal.voucher_date,
                notes=f"{journal.journal_type.value}: {journal.narration or ''}",
                movement_type=source_movement_type,
            )
            item.stock_entry_id = stock_entry.id
        
        # Create stock entries for destination items (stock in)
        for item in destination_items:
            stock_entry = self.inventory_service.record_stock_in(
                company=company,
                product_id=item.product_id,
                quantity=item.quantity,
                rate=item.rate,
                godown_id=item.godown_id,
                batch_id=item.batch_id,
                reference_type="stock_journal",
                reference_id=journal.id,
                reference_number=journal.voucher_number,
                entry_date=journal.voucher_date,
                notes=f"{journal.journal_type.value}: {journal.narration or ''}",
                movement_type=dest_movement_type,
            )
            item.stock_entry_id = stock_entry.id
        
        # Update journal status
        journal.status = StockJournalStatus.CONFIRMED
        journal.confirmed_at = datetime.utcnow()
        journal.confirmed_by = user_id
        
        self.db.commit()
        self.db.refresh(journal)
        
        return journal
    
    def _get_movement_types(self, journal_type: StockJournalType) -> tuple:
        """Get source and destination movement types based on journal type."""
        type_map = {
            StockJournalType.TRANSFER: (StockMovementType.TRANSFER_OUT, StockMovementType.TRANSFER_IN),
            StockJournalType.MANUFACTURING: (StockMovementType.MANUFACTURING_OUT, StockMovementType.MANUFACTURING_IN),
            StockJournalType.DISASSEMBLY: (StockMovementType.MANUFACTURING_OUT, StockMovementType.MANUFACTURING_IN),
            StockJournalType.REPACKAGING: (StockMovementType.REPACK_OUT, StockMovementType.REPACK_IN),
            StockJournalType.CONVERSION: (StockMovementType.CONVERSION_OUT, StockMovementType.CONVERSION_IN),
            StockJournalType.ADJUSTMENT: (StockMovementType.ADJUSTMENT_OUT, StockMovementType.ADJUSTMENT_IN),
        }
        return type_map.get(journal_type, (StockMovementType.ADJUSTMENT_OUT, StockMovementType.ADJUSTMENT_IN))
    
    def cancel_stock_journal(
        self,
        journal: StockJournal,
        reason: str,
        user_id: Optional[str] = None,
    ) -> StockJournal:
        """
        Cancel a stock journal and reverse stock entries.
        
        If journal was confirmed, this will create reverse entries.
        """
        if journal.status == StockJournalStatus.CANCELLED:
            raise ValueError("Journal is already cancelled")
        
        # If confirmed, reverse the stock entries
        if journal.status == StockJournalStatus.CONFIRMED:
            company = self.db.query(Company).filter(Company.id == journal.company_id).first()
            
            # Get all items and reverse them
            all_items = self.db.query(StockJournalItem).filter(
                StockJournalItem.stock_journal_id == journal.id
            ).all()
            
            for item in all_items:
                if item.item_type == "source":
                    # Source items were stock out, so reverse with stock in
                    self.inventory_service.record_stock_in(
                        company=company,
                        product_id=item.product_id,
                        quantity=item.quantity,
                        rate=item.rate,
                        godown_id=item.godown_id,
                        batch_id=item.batch_id,
                        reference_type="stock_journal_reversal",
                        reference_id=journal.id,
                        reference_number=f"{journal.voucher_number}-REV",
                        entry_date=datetime.utcnow(),
                        notes=f"Reversal of {journal.voucher_number}: {reason}",
                        movement_type=StockMovementType.ADJUSTMENT_IN,
                    )
                else:
                    # Destination items were stock in, so reverse with stock out
                    self.inventory_service.record_stock_out(
                        company=company,
                        product_id=item.product_id,
                        quantity=item.quantity,
                        rate=item.rate,
                        godown_id=item.godown_id,
                        batch_id=item.batch_id,
                        reference_type="stock_journal_reversal",
                        reference_id=journal.id,
                        reference_number=f"{journal.voucher_number}-REV",
                        entry_date=datetime.utcnow(),
                        notes=f"Reversal of {journal.voucher_number}: {reason}",
                        movement_type=StockMovementType.ADJUSTMENT_OUT,
                    )
        
        journal.status = StockJournalStatus.CANCELLED
        journal.cancelled_at = datetime.utcnow()
        journal.cancelled_by = user_id
        journal.cancellation_reason = reason
        
        self.db.commit()
        self.db.refresh(journal)
        
        return journal
    
    def delete_stock_journal(self, journal: StockJournal) -> bool:
        """Delete a draft stock journal."""
        if journal.status != StockJournalStatus.DRAFT:
            raise ValueError("Can only delete draft journals. Use cancel for confirmed journals.")
        
        self.db.delete(journal)
        self.db.commit()
        return True
    
    # ============== BOM-Based Manufacturing ==============
    
    def create_manufacturing_from_bom(
        self,
        company: Company,
        bom_id: str,
        output_quantity: Decimal,
        godown_id: Optional[str] = None,
        voucher_date: Optional[datetime] = None,
        narration: Optional[str] = None,
        additional_cost: Decimal = Decimal("0"),
        user_id: Optional[str] = None,
        auto_confirm: bool = False,
    ) -> StockJournal:
        """
        Create a manufacturing journal from a Bill of Materials.
        
        This automatically:
        1. Calculates component quantities based on output quantity
        2. Creates source items for all components
        3. Creates destination item for finished product
        """
        bom = self.db.query(BillOfMaterial).filter(
            BillOfMaterial.id == bom_id,
            BillOfMaterial.company_id == company.id,
            BillOfMaterial.is_active == True
        ).first()
        
        if not bom:
            raise ValueError("Bill of Material not found or inactive")
        
        # Calculate multiplier based on output quantity
        multiplier = output_quantity / (bom.output_quantity or Decimal("1"))
        
        # Prepare source items (components)
        source_items = []
        for component in bom.components:
            component_qty = component.quantity * multiplier
            # Add waste allowance
            if component.waste_percentage:
                component_qty = component_qty * (1 + component.waste_percentage / 100)
            
            source_items.append({
                "product_id": component.component_item_id,
                "quantity": component_qty,
                "godown_id": godown_id,
            })
        
        # Prepare destination item (finished product)
        finished_product = self.db.query(Product).filter(
            Product.id == bom.finished_item_id
        ).first()
        
        destination_items = [{
            "product_id": bom.finished_item_id,
            "quantity": output_quantity,
            "rate": finished_product.standard_cost if finished_product else Decimal("0"),
            "godown_id": godown_id,
        }]
        
        return self.create_stock_journal(
            company=company,
            journal_type=StockJournalType.MANUFACTURING,
            source_items=source_items,
            destination_items=destination_items,
            voucher_date=voucher_date,
            bom_id=bom_id,
            narration=narration or f"Manufacturing: {bom.name}",
            additional_cost=additional_cost,
            additional_cost_type="manufacturing_overhead",
            user_id=user_id,
            auto_confirm=auto_confirm,
        )
    
    # ============== Quick Operations ==============
    
    def create_inter_godown_transfer(
        self,
        company: Company,
        product_id: str,
        quantity: Decimal,
        from_godown_id: str,
        to_godown_id: str,
        voucher_date: Optional[datetime] = None,
        narration: Optional[str] = None,
        user_id: Optional[str] = None,
        auto_confirm: bool = True,
    ) -> StockJournal:
        """Quick helper for simple godown-to-godown transfer."""
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.company_id == company.id
        ).first()
        
        if not product:
            raise ValueError("Product not found")
        
        return self.create_stock_journal(
            company=company,
            journal_type=StockJournalType.TRANSFER,
            source_items=[{
                "product_id": product_id,
                "quantity": quantity,
                "rate": product.standard_cost or Decimal("0"),
                "godown_id": from_godown_id,
            }],
            destination_items=[{
                "product_id": product_id,
                "quantity": quantity,
                "rate": product.standard_cost or Decimal("0"),
                "godown_id": to_godown_id,
            }],
            voucher_date=voucher_date,
            from_godown_id=from_godown_id,
            to_godown_id=to_godown_id,
            narration=narration or f"Transfer: {product.name}",
            user_id=user_id,
            auto_confirm=auto_confirm,
        )
    
    def create_product_conversion(
        self,
        company: Company,
        source_product_id: str,
        source_quantity: Decimal,
        destination_product_id: str,
        destination_quantity: Decimal,
        godown_id: Optional[str] = None,
        voucher_date: Optional[datetime] = None,
        narration: Optional[str] = None,
        user_id: Optional[str] = None,
        auto_confirm: bool = False,
    ) -> StockJournal:
        """
        Quick helper for product conversion (A -> B).
        
        Use case: Selling product A as product B (rebranding/alias).
        """
        return self.create_stock_journal(
            company=company,
            journal_type=StockJournalType.CONVERSION,
            source_items=[{
                "product_id": source_product_id,
                "quantity": source_quantity,
                "godown_id": godown_id,
            }],
            destination_items=[{
                "product_id": destination_product_id,
                "quantity": destination_quantity,
                "godown_id": godown_id,
            }],
            voucher_date=voucher_date,
            narration=narration or "Product Conversion",
            user_id=user_id,
            auto_confirm=auto_confirm,
        )
    
    def create_stock_adjustment(
        self,
        company: Company,
        product_id: str,
        quantity: Decimal,
        adjustment_type: str,  # "increase" or "decrease"
        godown_id: Optional[str] = None,
        reason: Optional[str] = None,
        voucher_date: Optional[datetime] = None,
        user_id: Optional[str] = None,
        auto_confirm: bool = True,
    ) -> StockJournal:
        """Quick helper for stock adjustment (damage, expiry, samples, etc.)."""
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.company_id == company.id
        ).first()
        
        if not product:
            raise ValueError("Product not found")
        
        item_data = {
            "product_id": product_id,
            "quantity": quantity,
            "rate": product.standard_cost or Decimal("0"),
            "godown_id": godown_id,
        }
        
        if adjustment_type == "increase":
            source_items = []
            destination_items = [item_data]
        else:
            source_items = [item_data]
            destination_items = []
        
        return self.create_stock_journal(
            company=company,
            journal_type=StockJournalType.ADJUSTMENT,
            source_items=source_items,
            destination_items=destination_items,
            voucher_date=voucher_date,
            narration=reason or f"Stock Adjustment: {adjustment_type}",
            user_id=user_id,
            auto_confirm=auto_confirm,
        )
    
    # ============== Stock Ledger Reports ==============
    
    def get_stock_ledger(
        self,
        company_id: str,
        product_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        godown_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get detailed stock ledger for a product (Tally-style).
        
        Shows all stock movements with running balance.
        """
        # Delegate to inventory service for the actual ledger
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            return {"error": "Company not found"}
        
        return self.inventory_service.get_stock_ledger(
            company=company,
            product_id=product_id,
            from_date=from_date,
            to_date=to_date,
            godown_id=godown_id,
        )
    
    def get_godown_stock_summary(
        self,
        company_id: str,
        godown_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get stock summary by godown."""
        query = self.db.query(
            Godown.id.label("godown_id"),
            Godown.name.label("godown_name"),
            func.count(func.distinct(StockEntry.product_id)).label("item_count"),
            func.sum(
                func.case(
                    (StockEntry.quantity > 0, StockEntry.quantity),
                    else_=0
                )
            ).label("total_inward"),
            func.sum(
                func.case(
                    (StockEntry.quantity < 0, func.abs(StockEntry.quantity)),
                    else_=0
                )
            ).label("total_outward"),
        ).select_from(StockEntry).join(
            Godown, StockEntry.godown_id == Godown.id
        ).filter(
            StockEntry.company_id == company_id
        )
        
        if godown_id:
            query = query.filter(Godown.id == godown_id)
        
        query = query.group_by(Godown.id, Godown.name)
        
        results = query.all()
        
        return [
            {
                "godown_id": r.godown_id,
                "godown_name": r.godown_name,
                "item_count": r.item_count or 0,
                "total_inward": float(r.total_inward or 0),
                "total_outward": float(r.total_outward or 0),
            }
            for r in results
        ]
