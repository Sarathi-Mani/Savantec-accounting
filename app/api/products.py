"""Product API routes."""
import os
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database.connection import get_db
from app.database.models import User, Company
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
from app.services.product_service import ProductService
from app.services.company_service import CompanyService
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/companies/{company_id}/products", tags=["Products"])


def get_company_or_404(company_id: str, user: User, db: Session) -> Company:
    """Helper to get company or raise 404."""
    service = CompanyService(db)
    company = service.get_company(company_id, user)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return company


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    company_id: str,
    # Product fields as form data
    name: str = Form(...),
    description: Optional[str] = Form(None),
    sku: Optional[str] = Form(None),
    hsn_code: Optional[str] = Form(None),
    unit_price: float = Form(0.0),
    unit: str = Form("unit"),
    gst_rate: str = Form("18"),
    brand_id: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
    godown_id: Optional[str] = Form(None),
    opening_stock: int = Form(0),
    min_stock_level: int = Form(0),
    is_service: bool = Form(False),
    standard_cost: Optional[float] = Form(None),
    # Image files
    main_image: Optional[UploadFile] = File(None),
    additional_image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new product/service with optional images."""
    print(f"=== API DEBUG: create_product endpoint called ===")
    print(f"Company ID: {company_id}")
    print(f"Product name: {name}")
    
    company = get_company_or_404(company_id, current_user, db)
    
    # Create ProductCreate schema from form data
    product_data = ProductCreate(
        name=name,
        description=description,
        sku=sku,
        hsn_code=hsn_code,
        unit_price=unit_price,
        unit=unit,
        gst_rate=gst_rate,
        brand_id=brand_id,
        category_id=category_id,
        godown_id=godown_id,
        opening_stock=opening_stock,
        min_stock_level=min_stock_level,
        is_service=is_service,
        standard_cost=standard_cost,
        company_id=company_id
    )
    
    service = ProductService(db, upload_base_path="uploads")
    product = service.create_product(
        company=company, 
        data=product_data,
        main_image=main_image,
        additional_image=additional_image
    )
    
    # Get product with full details INCLUDING IMAGE URLs
    product_response_data = service.get_product_with_stock(product)
    print(f"=== API DEBUG: Created product with ID: {product.id} ===")
    print(f"Product response keys: {list(product_response_data.keys())}")
    print(f"Has image_url: {'image_url' in product_response_data}")
    
    return ProductResponse(**product_response_data)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    company_id: str,
    product_id: str,
    # Product fields as form data (all optional for update)
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    sku: Optional[str] = Form(None),
    hsn_code: Optional[str] = Form(None),
    unit_price: Optional[float] = Form(None),
    unit: Optional[str] = Form(None),
    gst_rate: Optional[str] = Form(None),
    brand_id: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
    godown_id: Optional[str] = Form(None),
    opening_stock: Optional[int] = Form(None),
    min_stock_level: Optional[int] = Form(None),
    is_service: Optional[bool] = Form(None),
    standard_cost: Optional[float] = Form(None),
    # Image files (optional for update)
    main_image: Optional[UploadFile] = File(None),
    additional_image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a product with optional image updates."""
    print(f"=== API DEBUG: update_product endpoint called ===")
    print(f"Company ID: {company_id}, Product ID: {product_id}")
    
    company = get_company_or_404(company_id, current_user, db)
    service = ProductService(db, upload_base_path="uploads")
    product = service.get_product(product_id, company=company)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Create ProductUpdate schema from form data (only include provided fields)
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description
    if sku is not None:
        update_data["sku"] = sku
    if hsn_code is not None:
        update_data["hsn_code"] = hsn_code
    if unit_price is not None:
        update_data["unit_price"] = unit_price
    if unit is not None:
        update_data["unit"] = unit
    if gst_rate is not None:
        update_data["gst_rate"] = gst_rate
    if brand_id is not None:
        update_data["brand_id"] = brand_id
    if category_id is not None:
        update_data["category_id"] = category_id
    if godown_id is not None:
        update_data["godown_id"] = godown_id
    if opening_stock is not None:
        update_data["opening_stock"] = opening_stock
    if min_stock_level is not None:
        update_data["min_stock_level"] = min_stock_level
    if is_service is not None:
        update_data["is_service"] = is_service
    if standard_cost is not None:
        update_data["standard_cost"] = standard_cost
    
    product_update = ProductUpdate(**update_data) if update_data else ProductUpdate()
    
    updated_product = service.update_product(
        product=product, 
        data=product_update,
        main_image=main_image,
        additional_image=additional_image
    )
    
    # Get updated product with full details INCLUDING IMAGE URLs
    product_response_data = service.get_product_with_stock(updated_product)
    print(f"=== API DEBUG: Updated product ===")
    print(f"Product response keys: {list(product_response_data.keys())}")
    
    return ProductResponse(**product_response_data)


@router.get("", response_model=ProductListResponse)
async def list_products(
    company_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_service: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List products for a company."""
    print(f"=== API DEBUG: list_products endpoint called ===")
    print(f"Company ID: {company_id}")
    print(f"Search: {search}")
    print(f"Page: {page}, Page Size: {page_size}")
    
    company = get_company_or_404(company_id, current_user, db)
    service = ProductService(db, upload_base_path="uploads")
    products, total = service.get_products(
        company, page, page_size, search, is_service
    )
    
    # Convert products to response format WITH IMAGE URLs
    product_responses = []
    for product in products:
        product_data = service.get_product_with_stock(product)
        product_responses.append(ProductResponse(**product_data))
    
    print(f"=== API DEBUG: Returning {len(product_responses)} products ===")
    if product_responses:
        first_product = product_responses[0]
        print(f"First product keys: {list(first_product.dict().keys())}")
        print(f"First product has image_url: {hasattr(first_product, 'image_url')}")
    
    return ProductListResponse(
        products=product_responses,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/search")
async def search_products(
    company_id: str,
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Quick search for products (autocomplete)."""
    print(f"=== API DEBUG: search_products endpoint called ===")
    print(f"Company ID: {company_id}")
    print(f"Search query: {q}, Limit: {limit}")
    
    company = get_company_or_404(company_id, current_user, db)
    service = ProductService(db, upload_base_path="uploads")
    products = service.search_products(company, q, limit)
    
    # Convert products to response format WITH IMAGE URLs
    product_responses = []
    for product in products:
        product_data = service.get_product_with_stock(product)
        product_responses.append(ProductResponse(**product_data))
    
    print(f"=== API DEBUG: Found {len(product_responses)} products ===")
    return product_responses


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    company_id: str,
    product_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a product by ID."""
    print(f"=== API DEBUG: get_product endpoint called ===")
    print(f"Company ID: {company_id}, Product ID: {product_id}")
    
    company = get_company_or_404(company_id, current_user, db)
    service = ProductService(db, upload_base_path="uploads")
    product = service.get_product(product_id, company=company)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get product with full details INCLUDING IMAGE URLs
    product_response_data = service.get_product_with_stock(product)
    print(f"=== API DEBUG: Product response data ===")
    print(f"Product name: {product_response_data.get('name')}")
    print(f"Product has image_url: {'image_url' in product_response_data}")
    print(f"Product image_url: {product_response_data.get('image_url')}")
    print(f"All keys: {list(product_response_data.keys())}")
    
    return ProductResponse(**product_response_data)


@router.delete("/{product_id}")
async def delete_product(
    company_id: str,
    product_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a product (soft delete)."""
    print(f"=== API DEBUG: delete_product endpoint called ===")
    company = get_company_or_404(company_id, current_user, db)
    service = ProductService(db, upload_base_path="uploads")
    product = service.get_product(product_id, company=company)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    service.delete_product(product)
    return {"message": "Product deleted successfully"}


@router.post("/{product_id}/images")
async def upload_product_images(
    company_id: str,
    product_id: str,
    main_image: Optional[UploadFile] = File(None),
    additional_image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload images for an existing product."""
    print(f"=== API DEBUG: upload_product_images endpoint called ===")
    company = get_company_or_404(company_id, current_user, db)
    service = ProductService(db, upload_base_path="uploads")
    product = service.get_product(product_id, company=company)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if not main_image and not additional_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one image file is required"
        )
    
    # Update product images
    service.update_product_images(product, main_image, additional_image)
    
    # Get updated product with full details INCLUDING IMAGE URLs
    product_response_data = service.get_product_with_stock(product)
    print(f"=== API DEBUG: Images uploaded ===")
    print(f"Product has image_url: {'image_url' in product_response_data}")
    
    return ProductResponse(**product_response_data)


@router.get("/{product_id}/images")
async def get_product_images(
    company_id: str,
    product_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get product images."""
    print(f"=== API DEBUG: get_product_images endpoint called ===")
    company = get_company_or_404(company_id, current_user, db)
    service = ProductService(db, upload_base_path="uploads")
    product = service.get_product(product_id, company=company)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Get product with images
    product_response_data = service.get_product_with_stock(product)
    
    # Return just the image info
    images_info = {}
    if product_response_data.get("image_url"):
        images_info["main_image"] = {
            "url": product_response_data["image_url"],
            "path": product_response_data.get("image")
        }
    if product_response_data.get("additional_image_url"):
        images_info["additional_image"] = {
            "url": product_response_data["additional_image_url"],
            "path": product_response_data.get("additional_image")
        }
    
    print(f"=== API DEBUG: Returning image info ===")
    print(f"Images info keys: {list(images_info.keys())}")
    
    return images_info
