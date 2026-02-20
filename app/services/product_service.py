"""Product service for business logic - Unified product with inventory."""
import os
import uuid
from pathlib import Path
from sqlalchemy.orm import Session
from typing import List, Optional, Tuple, Dict, Any
from fastapi import UploadFile
from decimal import Decimal

from app.database.models import Product, Company
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:
    """Service for product operations."""
    
    def __init__(self, db: Session, upload_base_path: str = "uploads"):
        self.db = db
        self.upload_base_path = upload_base_path
        # Ensure base upload directory exists
        os.makedirs(upload_base_path, exist_ok=True)
    
    def create_product(self, company: Company, data: ProductCreate, 
                      main_image: Optional[UploadFile] = None,
                      additional_image: Optional[UploadFile] = None) -> Product:
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
        
        unit_price = Decimal(str(data.unit_price or 0))
        discount_value = Decimal(str(getattr(data, "discount", 0) or 0))
        discount_type = getattr(data, "discount_type", "percentage") or "percentage"
        profit_margin = Decimal(str(getattr(data, "profit_margin", 0) or 0))

        if discount_type == "fixed":
            discount_amount = discount_value
        else:
            discount_amount = (unit_price * discount_value) / Decimal("100")

        purchase_price = max(unit_price - discount_amount, Decimal("0"))
        sales_price = purchase_price + ((purchase_price * profit_margin) / Decimal("100"))

        # Build product data - only include fields that exist in Product model
        product_data = {
            "company_id": company.id,
            "godown_id": data.godown_id if getattr(data, "godown_id", None) else None,
            "name": data.name,
            "description": data.description,
            "sku": data.sku,
            "hsn_code": data.hsn_code,
            "price": unit_price,
            "unit_price": unit_price,
            "unit": data.unit,
            "tax_type": tax_type,
            "seller_points": int(getattr(data, "seller_points", 0) or 0),
            "discount_type": discount_type,
            "discount": discount_value,
            "purchase_price": purchase_price,
            "profit_margin": profit_margin,
            "sales_price": sales_price,
            "brand_id": data.brand_id if data.brand_id else None,
            "category_id": data.category_id if data.category_id else None,
            "opening_stock": int(data.opening_stock) if data.opening_stock else 0,
            "quantity": int(data.opening_stock) if data.opening_stock else 0,
            "current_stock": int(data.opening_stock) if data.opening_stock else 0,
            "alert_quantity": int(data.min_stock_level) if data.min_stock_level else 0,
            "min_stock_level": int(data.min_stock_level) if data.min_stock_level else 0,
            "is_service": getattr(data, 'is_service', False),
            "is_active": True,
            "approval_status": "approved",
            "created_by": company.user_id
        }
        
        # Add standard_cost if provided
        if hasattr(data, 'standard_cost') and data.standard_cost is not None:
            product_data["standard_cost"] = data.standard_cost
        
        # Create product instance first (without images)
        product = Product(**product_data)
        
        # Handle image uploads
        if main_image or additional_image:
            image_paths = self._save_product_images(product.id, main_image, additional_image)
            if image_paths.get('main'):
                product.image = image_paths['main']
            if image_paths.get('additional'):
                product.additional_image = image_paths['additional']
        
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        
        return product

    def _save_product_images(self, product_id: str, 
                            main_image: Optional[UploadFile] = None,
                            additional_image: Optional[UploadFile] = None) -> Dict[str, str]:
        """Save product images and return their paths."""
        image_paths = {}
        
        # Create product directory structure
        product_dir = Path(self.upload_base_path) / "products" / str(product_id)
        main_dir = product_dir / "main"
        additional_dir = product_dir / "additional"
        
        # Create directories if they don't exist
        main_dir.mkdir(parents=True, exist_ok=True)
        additional_dir.mkdir(parents=True, exist_ok=True)
        
        # Save main image if provided
        if main_image and main_image.filename:
            # Generate unique filename
            file_extension = main_image.filename.split('.')[-1] if '.' in main_image.filename else 'jpg'
            filename = f"main_{uuid.uuid4()}.{file_extension}"
            file_path = main_dir / filename
            
            # Save the file
            content = main_image.file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Store relative path (from uploads folder)
            relative_path = str(Path("products") / str(product_id) / "main" / filename)
            image_paths['main'] = relative_path
        
        # Save additional image if provided
        if additional_image and additional_image.filename:
            # Generate unique filename
            file_extension = additional_image.filename.split('.')[-1] if '.' in additional_image.filename else 'jpg'
            filename = f"additional_{uuid.uuid4()}.{file_extension}"
            file_path = additional_dir / filename
            
            # Save the file
            content = additional_image.file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Store relative path (from uploads folder)
            relative_path = str(Path("products") / str(product_id) / "additional" / filename)
            image_paths['additional'] = relative_path
        
        return image_paths
    
    def update_product_images(self, product: Product,
                             main_image: Optional[UploadFile] = None,
                             additional_image: Optional[UploadFile] = None):
        """Update product images."""
        image_paths = self._save_product_images(product.id, main_image, additional_image)
        
        if image_paths.get('main'):
            # Delete old main image if exists
            if product.image:
                old_path = Path(self.upload_base_path) / product.image
                if old_path.exists():
                    old_path.unlink()
            product.image = image_paths['main']
        
        if image_paths.get('additional'):
            # Delete old additional image if exists
            if product.additional_image:
                old_path = Path(self.upload_base_path) / product.additional_image
                if old_path.exists():
                    old_path.unlink()
            product.additional_image = image_paths['additional']
        
        self.db.commit()
        self.db.refresh(product)

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
        print(f"=== DEBUG: get_product_with_stock called for product_id: {product.id} ===")
        print(f"Product name: {product.name}")
        print(f"Product image attribute: {product.image}")
        print(f"Product additional_image attribute: {product.additional_image}")
        print(f"Product type: {type(product)}")
        
        # Extract gst_rate from tax_type string
        gst_rate = "18"  # Default
        if hasattr(product, 'tax_type') and product.tax_type:
            print(f"Product tax_type: {product.tax_type}")
            import re
            match = re.search(r'GST\s*(\d+)%', product.tax_type)
            if match:
                gst_rate = match.group(1)
                print(f"Extracted gst_rate: {gst_rate}")
        
        # Use absolute URLs for images
        base_url = os.getenv("API_BASE_URL", "http://localhost:6768")
        print(f"Base URL for images: {base_url}")
        print(f"Upload base path: {self.upload_base_path}")
        
        response_data = {
            "id": product.id,
            "company_id": product.company_id,
            "godown_id": getattr(product, "godown_id", None),
            "godown_name": product.godown.name if getattr(product, "godown", None) else None,
            "name": product.name,
            "description": product.description,
            "sku": product.sku,
            "hsn_code": product.hsn_code,
            "unit_price": float(product.unit_price) if product.unit_price is not None else (float(product.price) if product.price else 0.0),
            "unit": product.unit,
            "gst_rate": gst_rate,
            "is_active": product.is_active,
            "is_service": getattr(product, 'is_service', False),
            "seller_points": int(getattr(product, "seller_points", 0) or 0),
            "discount_type": str(getattr(product, "discount_type", "percentage") or "percentage"),
            "discount": float(getattr(product, "discount", 0) or 0),
            "purchase_price": float(getattr(product, "purchase_price", 0) or 0),
            "profit_margin": float(getattr(product, "profit_margin", 0) or 0),
            "sales_price": float(getattr(product, "sales_price", 0) or 0),
            "created_at": product.created_at,
            "updated_at": product.updated_at,
            "current_stock": float(getattr(product, 'quantity', 0)) if hasattr(product, 'quantity') else 0.0,
            "min_stock_level": float(getattr(product, 'alert_quantity', 0)) if hasattr(product, 'alert_quantity') and getattr(product, 'alert_quantity') is not None else 0.0,
            "opening_stock": float(getattr(product, 'opening_stock', 0)) if hasattr(product, 'opening_stock') else 0.0,
        }
        
        print(f"=== DEBUG: Checking image paths ===")
        print(f"Product.image value: {product.image}")
        print(f"Product.additional_image value: {product.additional_image}")
        
        # FIX: Function to normalize paths for URLs
        def normalize_path_for_url(path: str) -> str:
            """Convert backslashes to forward slashes for URLs and clean up."""
            if not path:
                return path
            
            # Replace backslashes with forward slashes
            normalized = path.replace('\\', '/')
            
            # Remove double slashes
            while '//' in normalized:
                normalized = normalized.replace('//', '/')
            
            # Remove leading slash if it creates issues
            if normalized.startswith('/') and not normalized.startswith('//'):
                normalized = normalized[1:]
            
            # Ensure it doesn't start with uploads/uploads
            if normalized.startswith('uploads/uploads/'):
                normalized = normalized.replace('uploads/uploads/', 'uploads/', 1)
            
            return normalized
        
        # Add image URLs if they exist
        if product.image:
            # Normalize the path first
            image_path = product.image
            normalized_image_path = normalize_path_for_url(image_path)
            print(f"Original image path: {image_path}")
            print(f"Normalized image path: {normalized_image_path}")
            
            # Check if the path is absolute or relative
            if normalized_image_path.startswith('http'):
                # Already an absolute URL
                image_url = normalized_image_path
                relative_path = normalized_image_path
                print(f"Image is already absolute URL: {image_url}")
            else:
                # Handle different path formats
                if normalized_image_path.startswith('/uploads/'):
                    # Path starts with /uploads/
                    relative_path = normalized_image_path[1:]  # Remove leading slash
                    image_url = f"{base_url}/{relative_path}"
                elif normalized_image_path.startswith('uploads/'):
                    # Path starts with uploads/
                    relative_path = normalized_image_path
                    image_url = f"{base_url}/{relative_path}"
                else:
                    # Raw path, need to add uploads/
                    relative_path = f"uploads/{normalized_image_path}"
                    image_url = f"{base_url}/{relative_path}"
                
                print(f"Constructed image URL: {image_url}")
                print(f"Image relative path: {relative_path}")
            
            # Check if file exists (for debugging)
            # Remove uploads/ prefix for file system check
            fs_path = relative_path
            if fs_path.startswith('uploads/'):
                fs_path = fs_path[8:]  # Remove 'uploads/' prefix
            full_path = os.path.join(self.upload_base_path, fs_path)
            file_exists = os.path.exists(full_path)
            print(f"Image file exists at {full_path}: {file_exists}")
            
            response_data["image"] = relative_path  # Relative path
            response_data["image_url"] = image_url
            response_data["main_image"] = relative_path  # For backward compatibility
            response_data["main_image_url"] = image_url  # For backward compatibility
        
        if product.additional_image:
            # Normalize the path first
            additional_path = product.additional_image
            normalized_additional_path = normalize_path_for_url(additional_path)
            print(f"Original additional image path: {additional_path}")
            print(f"Normalized additional image path: {normalized_additional_path}")
            
            # Check if the path is absolute or relative
            if normalized_additional_path.startswith('http'):
                # Already an absolute URL
                additional_image_url = normalized_additional_path
                additional_relative_path = normalized_additional_path
                print(f"Additional image is already absolute URL: {additional_image_url}")
            else:
                # Handle different path formats
                if normalized_additional_path.startswith('/uploads/'):
                    # Path starts with /uploads/
                    additional_relative_path = normalized_additional_path[1:]  # Remove leading slash
                    additional_image_url = f"{base_url}/{additional_relative_path}"
                elif normalized_additional_path.startswith('uploads/'):
                    # Path starts with uploads/
                    additional_relative_path = normalized_additional_path
                    additional_image_url = f"{base_url}/{additional_relative_path}"
                else:
                    # Raw path, need to add uploads/
                    additional_relative_path = f"uploads/{normalized_additional_path}"
                    additional_image_url = f"{base_url}/{additional_relative_path}"
                
                print(f"Constructed additional image URL: {additional_image_url}")
                print(f"Additional image relative path: {additional_relative_path}")
            
            # Check if file exists (for debugging)
            # Remove uploads/ prefix for file system check
            fs_path = additional_relative_path
            if fs_path.startswith('uploads/'):
                fs_path = fs_path[8:]  # Remove 'uploads/' prefix
            additional_full_path = os.path.join(self.upload_base_path, fs_path)
            additional_file_exists = os.path.exists(additional_full_path)
            print(f"Additional image file exists at {additional_full_path}: {additional_file_exists}")
            
            response_data["additional_image"] = additional_relative_path  # Relative path
            response_data["additional_image_url"] = additional_image_url
        
        print(f"=== DEBUG: Checking for standard_cost ===")
        # Add standard_cost if it exists
        if hasattr(product, 'standard_cost') and product.standard_cost:
            response_data["standard_cost"] = float(product.standard_cost)
            print(f"Found standard_cost: {product.standard_cost}")
        
        print(f"=== DEBUG: Checking relationships ===")
        # Add brand if it exists
        if hasattr(product, 'brand_id') and product.brand_id:
            print(f"Product has brand_id: {product.brand_id}")
            try:
                from app.database.models import Brand
                brand = self.db.query(Brand).filter(Brand.id == product.brand_id).first()
                if brand:
                    response_data["brand"] = {"id": brand.id, "name": brand.name}
                    print(f"Found brand: {brand.name}")
                else:
                    response_data["brand"] = None
                    print(f"Brand not found in database")
            except Exception as e:
                print(f"Error fetching brand: {e}")
                response_data["brand"] = None
        else:
            response_data["brand"] = None
            print(f"Product has no brand_id")
            
        # Add category if it exists
        if hasattr(product, 'category_id') and product.category_id:
            print(f"Product has category_id: {product.category_id}")
            try:
                from app.database.models import Category
                category = self.db.query(Category).filter(Category.id == product.category_id).first()
                if category:
                    response_data["category"] = {"id": category.id, "name": category.name}
                    print(f"Found category: {category.name}")
                else:
                    response_data["category"] = None
                    print(f"Category not found in database")
            except Exception as e:
                print(f"Error fetching category: {e}")
                response_data["category"] = None
        else:
            response_data["category"] = None
            print(f"Product has no category_id")
        
        # Add item_code if available (for compatibility)
        if hasattr(product, 'item_code') and product.item_code:
            response_data["item_code"] = product.item_code
            print(f"Found item_code: {product.item_code}")
        elif hasattr(product, 'code') and product.code:
            response_data["item_code"] = product.code
            response_data["code"] = product.code
            print(f"Found code (used as item_code): {product.code}")
        
        # Add discount if available
        if hasattr(product, 'discount') and product.discount is not None:
            response_data["discount"] = float(product.discount)
            response_data["discount_percent"] = float(product.discount)
            print(f"Found discount: {product.discount}%")
        
        # Add tax_rate for backward compatibility
        response_data["tax_rate"] = float(gst_rate)
        
        # Add sales_price if different from unit_price
        if hasattr(product, 'sales_price') and product.sales_price:
            response_data["sales_price"] = float(product.sales_price)
            print(f"Found sales_price: {product.sales_price}")
        
        print(f"=== DEBUG: Final response data keys ===")
        print(f"Response keys: {list(response_data.keys())}")
        print(f"Has image_url: {'image_url' in response_data}")
        print(f"Has image: {'image' in response_data}")
        if 'image_url' in response_data:
            print(f"Image URL: {response_data['image_url']}")
        print(f"=== DEBUG: End of get_product_with_stock ===\n")
        
        return response_data

   
    def update_product(self, product: Product, data: ProductUpdate,
                      main_image: Optional[UploadFile] = None,
                      additional_image: Optional[UploadFile] = None) -> Product:
        """Update a product (unified with inventory)."""
        update_data = data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            # Map unit_price to price and sales_price
            if field == 'unit_price':
                product.price = value
                product.unit_price = value
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
                product.min_stock_level = int(value) if value is not None else 0
            elif field == 'opening_stock':
                product.opening_stock = int(value) if value is not None else 0
            elif field == 'is_service' and hasattr(product, 'is_service'):
                product.is_service = value
            elif field == 'standard_cost' and hasattr(product, 'standard_cost'):
                product.standard_cost = value
            elif hasattr(product, field):
                setattr(product, field, value)
        
        unit_price = Decimal(str(product.unit_price or product.price or 0))
        discount_value = Decimal(str(getattr(product, "discount", 0) or 0))
        discount_type = str(getattr(product, "discount_type", "percentage") or "percentage")
        profit_margin = Decimal(str(getattr(product, "profit_margin", 0) or 0))

        if discount_type == "fixed":
            discount_amount = discount_value
        else:
            discount_amount = (unit_price * discount_value) / Decimal("100")

        purchase_price = max(unit_price - discount_amount, Decimal("0"))
        sales_price = purchase_price + ((purchase_price * profit_margin) / Decimal("100"))

        product.price = unit_price
        product.unit_price = unit_price
        product.purchase_price = purchase_price
        product.sales_price = sales_price

        # Handle image updates
        if main_image or additional_image:
            self.update_product_images(product, main_image, additional_image)
        
        self.db.commit()
        self.db.refresh(product)
        return product
    


    def get_products(self, company: Company, page: int = 1, page_size: int = 20, 
                     search: Optional[str] = None, is_service: Optional[bool] = None) -> Tuple[List[Product], int]:
        """Get products for a company with pagination."""
        print(f"=== DEBUG: get_products called ===")
        print(f"Company ID: {company.id}")
        print(f"Search term: {search}")
        print(f"Page: {page}, Page Size: {page_size}")
        
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
            print(f"Applied search filter for: {search}")
        
        if is_service is not None and hasattr(Product, 'is_service'):
            query = query.filter(Product.is_service == is_service)
            print(f"Filtered by is_service: {is_service}")
        
        total = query.count()
        print(f"Total products found: {total}")
        
        products = query.order_by(Product.created_at.desc())\
                      .offset((page - 1) * page_size)\
                      .limit(page_size)\
                      .all()
        
        print(f"Returning {len(products)} products")
        print(f"First product details (if any):")
        if products:
            first_product = products[0]
            print(f"  ID: {first_product.id}")
            print(f"  Name: {first_product.name}")
            print(f"  Image: {first_product.image}")
            print(f"  Additional Image: {first_product.additional_image}")
        
        return products, total



    def delete_product(self, product: Product) -> bool:
        """Soft delete a product."""
        from datetime import datetime
        product.is_active = False
        product.deleted_at = datetime.utcnow()
        
        # Delete associated images
        if product.image:
            image_path = Path(self.upload_base_path) / product.image
            if image_path.exists():
                image_path.unlink()
        
        if product.additional_image:
            image_path = Path(self.upload_base_path) / product.additional_image
            if image_path.exists():
                image_path.unlink()
        
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
