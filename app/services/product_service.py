"""Product service for business logic - Unified product with inventory."""
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Tuple, Dict, Any
from decimal import Decimal
from app.database.models import Product, Company
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:
    """Service for product operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_product(self, company: Company, data: ProductCreate) -> Product:
        """Create a new product for a company (unified with inventory)."""
        # Convert gst_rate to tax_type string
        tax_type_map = {
            "0": "GST 0%",
            "5": "GST 5%", 
            "12": "GST 12%",
            "18": "GST 18%",
            "28": "GST 28%"
        }
        tax_type = tax_type_map.get(data.gst_rate, "GST 18%")
        
        # Check if is_service column exists in model
        model_attrs = [attr for attr in dir(Product) if not attr.startswith('_')]
        
        # Build product data with only valid attributes
        product_data = {
            "company_id": company.id,
            "name": data.name,
            "description": data.description,
            "sku": data.sku,
            "hsn_code": data.hsn_code,
            "price": data.unit_price,
            "sales_price": data.unit_price,
            "unit": data.unit,
            "tax_type": tax_type,
            "brand_id": data.brand_id if data.brand_id else None,
            "category_id": data.category_id if data.category_id else None,
            "opening_stock": int(data.opening_stock) if data.opening_stock else 0,
            "quantity": int(data.opening_stock) if data.opening_stock else 0,
            "alert_quantity": int(data.min_stock_level) if data.min_stock_level else 0,
        }
        
        # Add optional fields only if they exist in the model
        if 'is_inclusive' in model_attrs:
            product_data["is_inclusive"] = data.is_inclusive
        
        if 'is_service' in model_attrs:
            product_data["is_service"] = data.is_service
            
        if 'standard_cost' in model_attrs and data.standard_cost:
            product_data["standard_cost"] = data.standard_cost
        
        product = Product(**product_data)
        
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def get_product(self, product_id: str, company: Company = None, company_id: str = None) -> Optional[Product]:
        """Get a single product by ID."""
        query = self.db.query(Product).filter(
            Product.id == product_id,
            Product.is_active == True
        )
        
        if company:
            query = query.filter(Product.company_id == company.id)
        elif company_id:
            query = query.filter(Product.company_id == company_id)
        
        return query.first()
    
    def get_product_with_stock(self, product: Product) -> Dict[str, Any]:
        """Get product with stock information (unified model)."""
        # Extract gst_rate from tax_type string
        gst_rate = "18"  # Default
        if hasattr(product, 'tax_type') and product.tax_type:
            import re
            match = re.search(r'GST\s*(\d+)%', product.tax_type)
            if match:
                gst_rate = match.group(1)
        
        response_data = {
            "id": product.id,
            "company_id": product.company_id,
            "name": product.name,
            "description": product.description,
            "sku": product.sku,
            "hsn_code": product.hsn_code,
            "unit_price": product.price,
            "unit": product.unit,
            "gst_rate": gst_rate,
            "is_active": product.is_active,
            "created_at": product.created_at,
            "updated_at": product.updated_at,
            "current_stock": float(product.quantity) if hasattr(product, 'quantity') else None,
            "min_stock_level": float(product.alert_quantity) if hasattr(product, 'alert_quantity') else None,
            "opening_stock": float(product.opening_stock) if hasattr(product, 'opening_stock') else None,
        }
        
        # Add optional fields if they exist
        if hasattr(product, 'is_inclusive'):
            response_data["is_inclusive"] = product.is_inclusive
        else:
            response_data["is_inclusive"] = False
            
        if hasattr(product, 'is_service'):
            response_data["is_service"] = product.is_service
        else:
            response_data["is_service"] = False
        
        # Add standard_cost if it exists
        if hasattr(product, 'standard_cost') and product.standard_cost:
            response_data["standard_cost"] = float(product.standard_cost)
        
        # Add relationships if they exist (use joinedload to avoid N+1 queries)
        if hasattr(product, 'brand_id') and product.brand_id:
            from app.database.models import Brand
            brand = self.db.query(Brand).filter(Brand.id == product.brand_id).first()
            if brand:
                response_data["brand"] = {"id": brand.id, "name": brand.name}
            else:
                response_data["brand"] = None
        else:
            response_data["brand"] = None
            
        if hasattr(product, 'category_id') and product.category_id:
            from app.database.models import Category
            category = self.db.query(Category).filter(Category.id == product.category_id).first()
            if category:
                response_data["category"] = {"id": category.id, "name": category.name}
            else:
                response_data["category"] = None
        else:
            response_data["category"] = None
        
        return response_data
    
    def update_product(self, product: Product, data: ProductUpdate) -> Product:
        """Update a product (unified with inventory)."""
        update_data = data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            # Map unit_price to price and sales_price
            if field == 'unit_price':
                product.price = value
                product.sales_price = value
            elif field == 'gst_rate':
                # Convert gst_rate to tax_type
                tax_type_map = {
                    "0": "GST 0%",
                    "5": "GST 5%", 
                    "12": "GST 12%",
                    "18": "GST 18%",
                    "28": "GST 28%"
                }
                product.tax_type = tax_type_map.get(str(value), "GST 18%")
            elif field == 'current_stock':
                product.quantity = int(value) if value is not None else 0
            elif field == 'min_stock_level':
                product.alert_quantity = int(value) if value is not None else 0
            elif field == 'opening_stock':
                product.opening_stock = int(value) if value is not None else 0
            elif hasattr(product, field):
                setattr(product, field, value)
        
        self.db.commit()
        self.db.refresh(product)
        return product
    
    def get_products(self, company: Company, page: int = 1, page_size: int = 20, 
                     search: Optional[str] = None, is_service: Optional[bool] = None) -> Tuple[List[Product], int]:
        """Get products for a company with pagination."""
        query = self.db.query(Product).filter(
            Product.company_id == company.id,
            Product.is_active == True
        )
        
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Product.name.ilike(search_filter)) |
                (Product.sku.ilike(search_filter)) |
                (Product.hsn_code.ilike(search_filter)) |
                (Product.description.ilike(search_filter))
            )
        
        if is_service is not None and hasattr(Product, 'is_service'):
            query = query.filter(Product.is_service == is_service)
        
        total = query.count()
        products = query.order_by(Product.created_at.desc())\
                      .offset((page - 1) * page_size)\
                      .limit(page_size)\
                      .all()
        
        return products, total
    
    def delete_product(self, product: Product) -> bool:
        """Soft delete a product."""
        product.is_active = False
        self.db.commit()
        return True
    
    def search_products(self, company: Company, query: str, limit: int = 10) -> List[Product]:
        """Quick search for products (for autocomplete)."""
        search_filter = f"%{query}%"
        return self.db.query(Product).filter(
            Product.company_id == company.id,
            Product.is_active == True,
            (Product.name.ilike(search_filter)) |
            (Product.sku.ilike(search_filter)) |
            (Product.hsn_code.ilike(search_filter))
        ).limit(limit).all()