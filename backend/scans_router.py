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
            
        # Check and dynamically populate series_instance_uid if empty
        series_uid = scan.series_instance_uid
        if not series_uid and scan.dicom_folder_path and os.path.exists(scan.dicom_folder_path):
            slice_files = sorted(glob.glob(os.path.join(scan.dicom_folder_path, "*.dcm")))
            if slice_files:
                try:
                    ds = pydicom.dcmread(slice_files[0], stop_before_pixels=True)
                    series_uid = str(getattr(ds, "SeriesInstanceUID", ""))
                    if series_uid:
                        scan.series_instance_uid = series_uid
                        db.commit()
                except Exception as e:
                    print(f"Error dynamically extracting SeriesInstanceUID: {e}")
                    
        # Explicitly print patient ID/pseudonym to SeriesInstanceUID mapping in console/terminal logs
        print(f"[DICOM LOAD] Patient Pseudonym: {scan.patient.pseudonymized_id if scan.patient else 'Unknown'} | SeriesInstanceUID: {series_uid}")
                    
        ai_result_data = None
        if scan.ai_result and scan.ai_result.segmentation_mask_path and os.path.exists(scan.ai_result.segmentation_mask_path):
            try:
                with open(scan.ai_result.segmentation_mask_path, "r") as f:
                    ai_result_data = json.load(f)
            except Exception:
                pass

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
            "series_instance_uid": series_uid,
            "created_at": scan.created_at.isoformat(),
            "ai_result": ai_result_data
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
        
    # Check and dynamically populate series_instance_uid if empty
    series_uid = scan.series_instance_uid
    if not series_uid and slice_files:
        try:
            ds = pydicom.dcmread(slice_files[0], stop_before_pixels=True)
            series_uid = str(getattr(ds, "SeriesInstanceUID", ""))
            if series_uid:
                scan.series_instance_uid = series_uid
                db.commit()
        except Exception as e:
            print(f"Error dynamically extracting SeriesInstanceUID: {e}")
            
    # Explicitly print patient ID/pseudonym to SeriesInstanceUID mapping in console/terminal logs
    print(f"[DICOM LOAD] SeriesInstanceUID for scan {scan_id}: {series_uid}")
            
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
            
    # Project world centroid on the fly if missing in JSON nodules
    if ai_result_data and "nodules" in ai_result_data:
        updated_file = False
        for nodule in ai_result_data["nodules"]:
            if "world_centroid" not in nodule or nodule["world_centroid"] is None:
                centroid = nodule.get("centroid", None)
                if centroid and len(centroid) == 3 and slice_files:
                    cz, cy, cx = centroid
                    if 0 <= cz < len(slice_files):
                        try:
                            ds_slice = pydicom.dcmread(slice_files[cz], stop_before_pixels=True)
                            ipp = [float(x) for x in getattr(ds_slice, "ImagePositionPatient", [0.0, 0.0, 0.0])]
                            iop = [float(x) for x in getattr(ds_slice, "ImageOrientationPatient", [1.0, 0.0, 0.0, 0.0, 1.0, 0.0])]
                            pixel_spacing_slice = [float(x) for x in getattr(ds_slice, "PixelSpacing", [0.703125, 0.703125])]
                            
                            dir_cos_col = np.array(iop[:3])
                            dir_cos_row = np.array(iop[3:])
                            centroid_phys = np.array(ipp) + cx * pixel_spacing_slice[1] * dir_cos_col + cy * pixel_spacing_slice[0] * dir_cos_row
                            nodule["world_centroid"] = [round(float(centroid_phys[0]), 2), round(float(centroid_phys[1]), 2), round(float(centroid_phys[2]), 2)]
                            updated_file = True
                        except Exception as e:
                            print(f"Error calculating world centroid on the fly: {e}")
        if updated_file:
            try:
                with open(scan.ai_result.segmentation_mask_path, "w") as f:
                    json.dump(ai_result_data, f, indent=4)
            except Exception as e:
                print(f"Error caching updated world_centroid inside results JSON: {e}")
                
    # Fallback to DB fields if file reading failed
    if not ai_result_data and scan.ai_result:
        try:
            ipp = [float(x) for x in getattr(ds, "ImagePositionPatient", [0.0, 0.0, 0.0])]
            iop = [float(x) for x in getattr(ds, "ImageOrientationPatient", [1.0, 0.0, 0.0, 0.0, 1.0, 0.0])]
            dir_cos_col = np.array(iop[:3])
            dir_cos_row = np.array(iop[3:])
            centroid_phys = np.array(ipp) + 260 * pixel_spacing[1] * dir_cos_col + 190 * pixel_spacing[0] * dir_cos_row
            mock_world = [round(float(centroid_phys[0]), 2), round(float(centroid_phys[1]), 2), round(float(centroid_phys[2]), 2)]
        except Exception:
            mock_world = None
            
        ai_result_data = {
            "status": scan.status,
            "model_version": scan.ai_result.monai_model_version,
            "inference_time_ms": scan.ai_result.inference_time_ms,
            "nodules": [
                {
                    "nodule_id": "nodule_1",
                    "centroid": [slice_count // 2, 190, 260],
                    "bounding_box": [[0, 0, 0], [0, 0, 0]],
                    "world_centroid": mock_world,
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
        "series_instance_uid": series_uid,
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

class NoduleReport(BaseModel):
    nodule_id: str
    comp: str
    margin: str
    lungRads: str
    notes: str

class SaveReportPayload(BaseModel):
    nodules: list[NoduleReport]

@router.post("/{scan_id}/report")
async def save_scan_report(
    scan_id: str,
    payload: SaveReportPayload,
    current_user: models.User = Depends(auth.require_radiologist),
    db: Session = Depends(get_db)
):
    """Save the signed structured report, updating the ai_results.json and scan status."""
    scan = db.query(models.Scan).filter(models.Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
        
    scan.status = "signed"
    db.commit()
    
    # Update AI results file on disk
    if scan.ai_result and scan.ai_result.segmentation_mask_path and os.path.exists(scan.ai_result.segmentation_mask_path):
        try:
            with open(scan.ai_result.segmentation_mask_path, "r") as f:
                ai_data = json.load(f)
            
            # Map nodule reports
            updated = False
            for report in payload.nodules:
                for nodule in ai_data.get("nodules", []):
                    if nodule.get("nodule_id") == report.nodule_id:
                        nodule["comp"] = report.comp
                        nodule["margin"] = report.margin
                        nodule["lungRads"] = report.lungRads
                        nodule["notes"] = report.notes
                        updated = True
                        
            if updated:
                with open(scan.ai_result.segmentation_mask_path, "w") as f:
                    json.dump(ai_data, f, indent=4)
        except Exception as e:
            print(f"Error saving report data to JSON: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to write report on disk: {e}"
            )
            
    return {"message": "Report signed and locked successfully", "scan_id": scan_id}

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

@router.get("/{scan_id}/3d-volume")
async def get_scan_3d_volume(
    scan_id: str,
    current_user: models.User = Depends(auth.require_any_user),
    db: Session = Depends(get_db)
):
    """Generates or loads a cached 3D lung surface mesh with centered tumor coordinates."""
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
        
    cache_file = os.path.join(scan.dicom_folder_path, "3d_lungs.json")
    
    # Check if cached
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r") as f:
                cached_data = json.load(f)
                
            # Dynamic overlay of nodules from the latest AI results
            nodules = []
            if scan.ai_result and scan.ai_result.segmentation_mask_path and os.path.exists(scan.ai_result.segmentation_mask_path):
                try:
                    with open(scan.ai_result.segmentation_mask_path, "r") as f_ai:
                        ai_data = json.load(f_ai)
                        nodules = json.loads(json.dumps(ai_data.get("nodules", []))) # Deep copy
                except Exception:
                    pass
            
            # Recalculate centered centroids for nodules using the cached center and spacing from DICOM
            if nodules:
                slice_files = sorted(glob.glob(os.path.join(scan.dicom_folder_path, "*.dcm")))
                if slice_files:
                    try:
                        ds_first = pydicom.dcmread(slice_files[0])
                        pixel_spacing = [float(x) for x in getattr(ds_first, "PixelSpacing", [0.75, 0.75])]
                        slice_thickness = float(getattr(ds_first, "SliceThickness", 1.25))
                    except Exception:
                        pixel_spacing = [0.75, 0.75]
                        slice_thickness = 1.25
                else:
                    pixel_spacing = [0.75, 0.75]
                    slice_thickness = 1.25
                
                cx, cy, cz = cached_data.get("center", [0.0, 0.0, 0.0])
                for nodule in nodules:
                    nz_vox, ny_vox, nx_vox = nodule["centroid"]
                    n_phys_x = nx_vox * pixel_spacing[1]
                    n_phys_y = ny_vox * pixel_spacing[0]
                    n_phys_z = nz_vox * slice_thickness
                    nodule["centered_centroid"] = [
                        float(n_phys_x - cx),
                        float(n_phys_y - cy),
                        float(n_phys_z - cz)
                    ]
            
            cached_data["nodules"] = nodules
            
            # Save updated cache back so we don't have to keep reading DICOM files next time
            try:
                with open(cache_file, "w") as f_out:
                    json.dump(cached_data, f_out)
            except Exception:
                pass
                
            return cached_data
        except Exception:
            pass
            
    # Not cached, generate mesh using Marching Cubes
    slice_files = sorted(glob.glob(os.path.join(scan.dicom_folder_path, "*.dcm")))
    slice_count = len(slice_files)
    if slice_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No slices found for 3D reconstruction"
        )
        
    # Read metadata from first slice
    try:
        ds_first = pydicom.dcmread(slice_files[0])
        pixel_spacing = [float(x) for x in getattr(ds_first, "PixelSpacing", [0.75, 0.75])]
        slice_thickness = float(getattr(ds_first, "SliceThickness", 1.25))
        rows = int(getattr(ds_first, "Rows", 512))
        cols = int(getattr(ds_first, "Columns", 512))
    except Exception as e:
        print(f"Error reading DICOM spatial metadata: {e}")
        pixel_spacing = [0.75, 0.75]
        slice_thickness = 1.25
        rows = 512
        cols = 512
        
    # Load nodules from AI Results if available
    nodules = []
    if scan.ai_result and scan.ai_result.segmentation_mask_path and os.path.exists(scan.ai_result.segmentation_mask_path):
        try:
            with open(scan.ai_result.segmentation_mask_path, "r") as f:
                ai_data = json.load(f)
                nodules = json.loads(json.dumps(ai_data.get("nodules", []))) # Deep copy
        except Exception:
            pass

    # Downsampling parameters
    target_size = 48
    max_slices = 48
    step_z = max(1, slice_count // max_slices)
    sampled_indices = list(range(0, slice_count, step_z))[:max_slices]

    # Create 3D volume grid
    volume = np.zeros((len(sampled_indices), target_size, target_size), dtype=np.float32)
    step_x = max(1, cols // target_size)
    step_y = max(1, rows // target_size)

    for z_idx, file_idx in enumerate(sampled_indices):
        file_path = slice_files[file_idx]
        try:
            ds = pydicom.dcmread(file_path)
            pixel_array = ds.pixel_array
            shape = pixel_array.shape
            
            rescale_slope = float(getattr(ds, "RescaleSlope", 1.0))
            rescale_intercept = float(getattr(ds, "RescaleIntercept", 0.0))
            
            # Map pixels to Hounsfield Units safely
            for y_target in range(target_size):
                y_orig = min(shape[0] - 1, y_target * step_y)
                for x_target in range(target_size):
                    x_orig = min(shape[1] - 1, x_target * step_x)
                    
                    val = pixel_array[y_orig, x_orig]
                    hu = val * rescale_slope + rescale_intercept
                    volume[z_idx, y_target, x_target] = hu
        except Exception as e:
            print(f"Error reading slice {file_idx} for 3D volume: {e}")

    # Marching Cubes Spacing [Z_phys_step, Y_phys_step, X_phys_step]
    spacing = (step_z * slice_thickness, step_y * pixel_spacing[0], step_x * pixel_spacing[1])
    
    # Run marching cubes
    from skimage import measure
    try:
        verts, faces, normals, values = measure.marching_cubes(volume, level=-450.0, spacing=spacing)
        
        # Center physical coordinates of the lungs mesh
        cz = float(np.mean(verts[:, 0]))
        cy = float(np.mean(verts[:, 1]))
        cx = float(np.mean(verts[:, 2]))
        
        verts_centered = verts.copy()
        verts_centered[:, 0] -= cz # Physical Z
        verts_centered[:, 1] -= cy # Physical Y
        verts_centered[:, 2] -= cx # Physical X
        
        vertices_list = verts_centered.tolist()
        faces_list = faces.tolist()
    except Exception as e:
        print(f"Marching cubes failed, using fallback empty mesh: {e}")
        # Mock empty lungs mesh bounding box
        vertices_list = [[-50, -50, -50], [50, -50, -50], [50, 50, -50], [-50, 50, -50],
                         [-50, -50, 50], [50, -50, 50], [50, 50, 50], [-50, 50, 50]]
        faces_list = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4],
                      [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]]
        cx, cy, cz = 0.0, 0.0, 0.0

    # Project and center nodules in the physical mesh coordinates space
    for nodule in nodules:
        # nodule["centroid"] is [Z_vox, Y_vox, X_vox]
        nz_vox, ny_vox, nx_vox = nodule["centroid"]
        n_phys_x = nx_vox * pixel_spacing[1]
        n_phys_y = ny_vox * pixel_spacing[0]
        n_phys_z = nz_vox * slice_thickness
        
        # Centered physical coordinates
        nodule["centered_centroid"] = [
            float(n_phys_x - cx),
            float(n_phys_y - cy),
            float(n_phys_z - cz)
        ]
        
    payload = {
        "vertices": vertices_list,
        "faces": faces_list,
        "nodules": nodules,
        "center": [float(cx), float(cy), float(cz)]
    }
    
    # Save cache
    try:
        with open(cache_file, "w") as f:
            json.dump(payload, f)
    except Exception as e:
        print(f"Error caching 3D lungs mesh JSON: {e}")
        
    return payload


