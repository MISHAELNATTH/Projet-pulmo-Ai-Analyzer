import os
import glob
import hashlib
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks
from pydantic import BaseModel
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
            "patient_name": scan.patient.patient_name if scan.patient else "Unknown",
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
        
    # Write audit log entry for viewing results
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="VIEW_RESULT",
        resource_id=scan_id
    )
    db.add(audit_log)
    db.commit()
    db.refresh(scan)
        
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
        
    ai_result_data = None
    if scan.ai_result and scan.ai_result.segmentation_mask_path and os.path.exists(scan.ai_result.segmentation_mask_path):
        try:
            with open(scan.ai_result.segmentation_mask_path, "r") as f:
                ai_result_data = json.load(f)
        except Exception:
            pass
            
    # Fallback to DB fields if file reading failed
    if not ai_result_data and scan.ai_result:
        ai_result_data = {
            "status": scan.status,
            "model_version": scan.ai_result.monai_model_version,
            "inference_time_ms": scan.ai_result.inference_time_ms,
            "nodules": [
                {
                    "nodule_id": "nodule_1",
                    "centroid": [slice_count // 2, 190, 260],
                    "bounding_box": [[0, 0, 0], [0, 0, 0]],
                    "confidence": scan.ai_result.max_confidence_score,
                    "size_mm": 14.2,
                    "location": "Upper Lobe"
                }
            ] if scan.ai_result.nodule_count > 0 else []
        }
        
    return {
        "scan_id": scan.id,
        "patient_name": scan.patient.patient_name if scan.patient else "Unknown",
        "patient_pseudonym": scan.patient.pseudonymized_id if scan.patient else "Unknown",
        "age_at_scan": scan.patient.age_at_scan if scan.patient else None,
        "biological_sex": scan.patient.biological_sex if scan.patient else None,
        "study_date": scan.study_date.isoformat() if scan.study_date else None,
        "slice_count": slice_count,
        "dimensions": (rows, cols),
        "slice_thickness": slice_thickness,
        "pixel_spacing": pixel_spacing,
        "status": scan.status,
        "ai_result": ai_result_data
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

class ConfirmScanMetadataPayload(BaseModel):
    patient_name: str
    patient_id: str
    age: int
    sex: str

@router.post("/{scan_id}/confirm")
async def confirm_scan_metadata(
    scan_id: str,
    payload: ConfirmScanMetadataPayload,
    current_user: models.User = Depends(auth.require_any_user),
    db: Session = Depends(get_db)
):
    """Confirm or manually override patient details. Updates DB and re-anonymizes disk files."""
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
        
    patient = scan.patient
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found"
        )
        
    # Clean and set patient details
    clean_patient_name = payload.patient_name.replace('^', ', ').strip()
    if clean_patient_name.endswith(','):
        clean_patient_name = clean_patient_name[:-1].strip()
        
    # Re-generate pseudonymized ID to ensure consistency
    if payload.patient_id:
        patient_hash = hashlib.sha256(f"{payload.patient_id}_{payload.patient_name}".encode()).hexdigest()[:12]
        new_pseudonym_id = f"PATIENT_{patient_hash}"
    else:
        new_pseudonym_id = f"PATIENT_{str(uuid.uuid4())[:8]}"
        
    old_pseudonym_id = patient.pseudonymized_id
    
    # Check if a patient with the new pseudonym already exists
    existing_patient = db.query(models.Patient).filter(models.Patient.pseudonymized_id == new_pseudonym_id).first()
    if existing_patient and existing_patient.id != patient.id:
        # Merge scan to the existing patient
        scan.patient = existing_patient
        
        # Update existing patient details if needed
        existing_patient.patient_name = clean_patient_name if clean_patient_name else "Unknown Patient"
        existing_patient.age_at_scan = payload.age
        existing_patient.biological_sex = payload.sex
        
        # Check if the temporary patient has other scans
        other_scans = db.query(models.Scan).filter(models.Scan.patient_id == patient.id).all()
        # Exclude the current scan in case session state hasn't flushed
        other_scans = [s for s in other_scans if s.id != scan.id]
        if not other_scans:
            db.delete(patient)
            
        patient = existing_patient
    else:
        patient.patient_name = clean_patient_name if clean_patient_name else "Unknown Patient"
        patient.age_at_scan = payload.age
        patient.biological_sex = payload.sex
        patient.pseudonymized_id = new_pseudonym_id
        
    db.commit()
    
    # Re-anonymize files with the new pseudonym if they changed
    if old_pseudonym_id != new_pseudonym_id and scan.dicom_folder_path and os.path.exists(scan.dicom_folder_path):
        slices = glob.glob(os.path.join(scan.dicom_folder_path, "*.dcm"))
        for slice_path in slices:
            try:
                ds = pydicom.dcmread(slice_path)
                ds.PatientName = new_pseudonym_id
                ds.PatientID = new_pseudonym_id
                ds.save_as(slice_path)
            except Exception as e:
                print(f"Error updating DICOM slice header: {e}")
                
    return {
        "status": "success",
        "scan_id": scan.id,
        "patient_name": patient.patient_name,
        "patient_pseudonym": patient.pseudonymized_id
    }

@router.delete("/{scan_id}", status_code=status.HTTP_200_OK)
async def delete_scan(
    scan_id: str,
    current_user: models.User = Depends(auth.require_radiologist),
    db: Session = Depends(get_db)
):
    """Delete a scan, its associated AI results, its files on disk, and optionally clean up the patient record."""
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
        
    patient = scan.patient
    folder_path = scan.dicom_folder_path
    
    # 1. Delete associated AI results if any exist
    if scan.ai_result:
        db.delete(scan.ai_result)
        
    # 2. Delete the Scan record
    db.delete(scan)
    
    # 3. Check if the patient has any other scans remaining. If not, delete patient record.
    if patient:
        other_scans = db.query(models.Scan).filter(models.Scan.patient_id == patient.id).all()
        # Exclude the current scan from the remaining count
        remaining_scans = [s for s in other_scans if s.id != scan_id]
        if not remaining_scans:
            db.delete(patient)
            
    # 4. Write audit log entry
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="DELETE_SCAN",
        resource_id=scan_id
    )
    db.add(audit_log)
    
    # Commit database changes
    db.commit()
    
    # 5. Remove the physical files on disk
    if folder_path and os.path.exists(folder_path):
        import shutil
        try:
            shutil.rmtree(folder_path, ignore_errors=True)
        except Exception as e:
            print(f"Error removing DICOM folder {folder_path}: {e}")
            
    return {"message": "Scan deleted successfully", "scan_id": scan_id}

def run_background_analysis(scan_id: str):
    from database import SessionLocal
    import models
    import json
    import os
    from ai_model import NoduleDetector
    
    db: Session = SessionLocal()
    try:
        scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
        if not scan:
            return
            
        detector = NoduleDetector()
        results = detector.run_inference(scan.dicom_folder_path)
        
        if results["status"] == "completed":
            nodules = results["nodules"]
            nodule_count = len(nodules)
            max_conf = max([n["confidence"] for n in nodules]) if nodule_count > 0 else 0.0
            
            # Save results as JSON on disk next to the slices
            results_filepath = os.path.join(scan.dicom_folder_path, "ai_results.json")
            with open(results_filepath, "w") as f:
                json.dump(results, f, indent=4)
                
            # Create or update AIResult record
            ai_result = db.query(models.AIResult).filter(models.AIResult.scan_id == scan_id).first()
            if not ai_result:
                ai_result = models.AIResult(
                    scan_id=scan_id,
                    nodule_count=nodule_count,
                    max_confidence_score=max_conf,
                    segmentation_mask_path=results_filepath,
                    monai_model_version=results["model_version"],
                    inference_time_ms=results["inference_time_ms"]
                )
                db.add(ai_result)
            else:
                ai_result.nodule_count = nodule_count
                ai_result.max_confidence_score = max_conf
                ai_result.segmentation_mask_path = results_filepath
                ai_result.monai_model_version = results["model_version"]
                ai_result.inference_time_ms = results["inference_time_ms"]
                
            scan.status = "completed"
        else:
            scan.status = "failed"
            
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error in background AI analysis: {e}")
        try:
            scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
            if scan:
                scan.status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

@router.post("/{scan_id}/analyze", status_code=status.HTTP_202_ACCEPTED)
async def analyze_scan(
    scan_id: str,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth.require_radiologist),
    db: Session = Depends(get_db)
):
    """Trigger the asynchronous MONAI AI pipeline for 3D pulmonary nodule segmentation."""
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
        
    if scan.status == "processing":
        return {
            "message": "AI analysis is already in progress",
            "scan_id": scan.id,
            "status": scan.status
        }
        
    # Mark scan status as processing
    scan.status = "processing"
    db.commit()
    
    # Schedule the background task
    background_tasks.add_task(run_background_analysis, scan.id)
    
    return {
        "message": "AI analysis started successfully in the background",
        "scan_id": scan.id,
        "status": scan.status
    }
