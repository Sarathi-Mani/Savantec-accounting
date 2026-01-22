"""File upload endpoints."""
import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(tags=["Upload"])

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file."""
    # Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_extension = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    
    if not file_extension or file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (max 2MB)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:  # 2MB
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 2MB limit"
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Reset file pointer and save
    await file.seek(0)
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Build URL for frontend access
    file_url = f"/uploads/{unique_filename}"
    
    return JSONResponse({
        "success": True,
        "url": file_url,
        "filename": unique_filename,
        "original_name": file.filename,
        "size": len(contents),
        "message": "File uploaded successfully"
    })