import os
import glob
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
import pydicom
import numpy as np
from database import get_db
import models
import auth
import dicom_service

router = APIRouter(prefix="/api/scans", tags=["scans"])

@router.get("")
async def get_scans(
    current_user: models.User = Depends(auth.require_any_user),
    db: Session = Depends(get_db)
):
    """List all uploaded scans joined with patient pseudonymized details."""
    scans = db.query(models.Scan).all()
    results = []
    for scan in scans:
        slice_count = 0
        if scan.dicom_folder_path and os.path.exists(scan.dicom_folder_path):
            slice_count = len(glob.glob(os.path.join(scan.dicom_folder_path, "*.dcm")))
            
        results.append({
            "id": scan.id,
            "patient_id": scan.patient_id,
            "patient_pseudonym": scan.patient.pseudonymized_id if scan.patient else "Unknown",
            "age_at_scan": scan.patient.age_at_scan if scan.patient else None,
            "biological_sex": scan.patient.biological_sex if scan.patient else None,
            "uploaded_by": scan.uploader.email if scan.uploader else "Unknown",
            "study_date": scan.study_date.isoformat() if scan.study_date else None,
            "status": scan.status,
            "slice_count": slice_count,
            "created_at": scan.created_at.isoformat()
        })
    return results

@router.get("/{scan_id}/metadata")
async def get_scan_metadata(
    scan_id: str,
    current_user: models.User = Depends(auth.require_any_user),
    db: Session = Depends(get_db)
):
    """Retrieve spatial metadata and slice count for a specific scan."""
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
        
    slice_count = 0
    slice_files = []
    if scan.dicom_folder_path and os.path.exists(scan.dicom_folder_path):
        slice_files = sorted(glob.glob(os.path.join(scan.dicom_folder_path, "*.dcm")))
        slice_count = len(slice_files)
        
    if slice_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No DICOM slices found for this scan"
        )
        
    try:
        ds = pydicom.dcmread(slice_files[0])
        rows = int(getattr(ds, "Rows", 512))
        cols = int(getattr(ds, "Columns", 512))
        slice_thickness = float(getattr(ds, "SliceThickness", 1.0))
        pixel_spacing = [float(x) for x in getattr(ds, "PixelSpacing", [1.0, 1.0])]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read DICOM metadata: {e}"
        )
        
    return {
        "scan_id": scan.id,
        "patient_pseudonym": scan.patient.pseudonymized_id if scan.patient else "Unknown",
        "age_at_scan": scan.patient.age_at_scan if scan.patient else None,
        "biological_sex": scan.patient.biological_sex if scan.patient else None,
        "study_date": scan.study_date.isoformat() if scan.study_date else None,
        "slice_count": slice_count,
        "dimensions": (rows, cols),
        "slice_thickness": slice_thickness,
        "pixel_spacing": pixel_spacing,
        "status": scan.status
    }

@router.get("/{scan_id}/slices/{slice_index}")
async def get_scan_slice(
    scan_id: str,
    slice_index: int,
    current_user: models.User = Depends(auth.require_any_user),
    db: Session = Depends(get_db)
):
    """Retrieve raw normalized slice pixel values as a float32 binary array."""
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
        
    if not scan.dicom_folder_path or not os.path.exists(scan.dicom_folder_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan folder not found on disk"
        )
        
    # Formulate index-based file name
    slice_filename = f"slice_{slice_index:03d}.dcm"
    slice_path = os.path.join(scan.dicom_folder_path, slice_filename)
    
    if not os.path.exists(slice_path):
        # Fallback: scan folder, sort files alphabetically, retrieve by index
        dcm_files = sorted(glob.glob(os.path.join(scan.dicom_folder_path, "*.dcm")))
        if slice_index < 0 or slice_index >= len(dcm_files):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Slice index {slice_index} out of range (total slices: {len(dcm_files)})"
            )
        slice_path = dcm_files[slice_index]
        
    try:
        ds = pydicom.dcmread(slice_path)
        pixel_array = ds.pixel_array
        rescale_slope = float(getattr(ds, "RescaleSlope", 1.0))
        rescale_intercept = float(getattr(ds, "RescaleIntercept", 0.0))
        
        normalized = dicom_service.normalize_pixel_array(pixel_array, rescale_slope, rescale_intercept)
        float_array = normalized.astype(np.float32)
        bytes_data = float_array.tobytes()
        
        return Response(content=bytes_data, media_type="application/octet-stream")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading DICOM slice: {e}"
        )
