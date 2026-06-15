import os
import uuid
import shutil
import hashlib
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
import pydicom
from database import get_db
import models
import auth
import dicom_service

router = APIRouter(prefix="/api/scans", tags=["scans"])

TEMP_DIR = os.getenv("DICOM_UPLOAD_TEMP_DIR", "./temp_uploads")
STORAGE_DIR = "./storage/dicom_uploads"

# Ensure directories exist
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(STORAGE_DIR, exist_ok=True)

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_dicom_files(
    files: List[UploadFile] = File(...),
    current_user: models.User = Depends(auth.require_radiologist),
    db: Session = Depends(get_db)
):
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded"
        )
    
    # Generate unique scan ID
    scan_id = str(uuid.uuid4())
    temp_scan_dir = os.path.join(TEMP_DIR, scan_id)
    os.makedirs(temp_scan_dir, exist_ok=True)
    
    temp_filepaths = []
    try:
        # 1. Cache uploaded files to temporary directory
        for idx, file in enumerate(files):
            temp_filepath = os.path.join(temp_scan_dir, f"file_{idx}.dcm")
            with open(temp_filepath, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            temp_filepaths.append(temp_filepath)
            
        if not temp_filepaths:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to save uploaded files"
            )
             
        # 2. Read files to extract patient metadata
        # Try to find a file that contains patient metadata (like PatientName or PatientID)
        first_ds = None
        sex = "O"
        age = 0
        study_date = None
        orig_patient_id = ""
        orig_patient_name = ""
        
        # Scan through the cached files to find patient metadata
        for temp_path in temp_filepaths:
            try:
                ds = pydicom.dcmread(temp_path)
                # Keep track of the first valid DICOM dataset just in case
                if first_ds is None:
                    first_ds = ds
                
                p_name = str(getattr(ds, "PatientName", "")).strip()
                p_id = str(getattr(ds, "PatientID", "")).strip()
                
                if p_name or p_id:
                    # Found a slice with metadata! Let's extract everything from here.
                    first_ds = ds
                    orig_patient_name = p_name
                    orig_patient_id = p_id
                    sex = getattr(ds, "PatientSex", "O")
                    age = dicom_service.parse_patient_age(ds)
                    study_date_raw = getattr(ds, "StudyDate", None)
                    if study_date_raw:
                        try:
                            study_date = datetime.strptime(study_date_raw, "%Y%m%d").date()
                        except Exception:
                            pass
                    break
            except Exception as e:
                import traceback
                print(f"[DEBUG] Error reading uploaded DICOM file {temp_path}: {e}")
                traceback.print_exc()
                continue
                
        # If we didn't find any file with patient name/ID, fall back to extracting from the first valid file
        if not orig_patient_name and not orig_patient_id and first_ds is not None:
            orig_patient_name = str(getattr(first_ds, "PatientName", "")).strip()
            orig_patient_id = str(getattr(first_ds, "PatientID", "")).strip()
            sex = getattr(first_ds, "PatientSex", "O")
            age = dicom_service.parse_patient_age(first_ds)
            study_date_raw = getattr(first_ds, "StudyDate", None)
            if study_date_raw:
                try:
                    study_date = datetime.strptime(study_date_raw, "%Y%m%d").date()
                except Exception:
                    pass
        
        if first_ds is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid DICOM files found in the upload."
            )
            
        # Format name for standard rendering (e.g., DOE^JOHN -> DOE, JOHN)
        clean_patient_name = orig_patient_name.replace("^", ", ").strip()
        if clean_patient_name.endswith(","):
            clean_patient_name = clean_patient_name[:-1].strip()
            
        sex = str(sex).strip().upper()
        if sex not in ["M", "F", "O"]:
            sex = "O"
        
        # 3. Generate secure, unique pseudonymized ID based on original attributes
        if orig_patient_id:
            patient_hash = hashlib.sha256(f"{orig_patient_id}_{orig_patient_name}".encode()).hexdigest()[:12]
            pseudonym_id = f"PATIENT_{patient_hash}"
        else:
            pseudonym_id = f"PATIENT_{str(uuid.uuid4())[:8]}"

        # 4. Create or fetch patient record
        patient = db.query(models.Patient).filter(models.Patient.pseudonymized_id == pseudonym_id).first()
        if not patient:
            patient = models.Patient(
                pseudonymized_id=pseudonym_id,
                patient_name=clean_patient_name if clean_patient_name else "Unknown Patient",
                age_at_scan=age,
                biological_sex=sex
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)
        elif not patient.patient_name and clean_patient_name:
            patient.patient_name = clean_patient_name
            db.commit()
            
        # 5. Create scan record
        permanent_scan_dir = os.path.join(STORAGE_DIR, scan_id)
        os.makedirs(permanent_scan_dir, exist_ok=True)
        
        series_instance_uid = ""
        if temp_filepaths:
            try:
                ds_temp = pydicom.dcmread(temp_filepaths[0], stop_before_pixels=True)
                series_instance_uid = str(getattr(ds_temp, "SeriesInstanceUID", ""))
            except Exception as e:
                print(f"Error reading SeriesInstanceUID from temp DICOM: {e}")
        
        scan = models.Scan(
            id=scan_id,
            patient_id=patient.id,
            uploaded_by=current_user.id,
            study_date=study_date,
            status="pending",
            dicom_folder_path=permanent_scan_dir,
            series_instance_uid=series_instance_uid
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)
        
        # Sort temp_filepaths by physical Z coordinate (ImagePositionPatient[2]) in ascending order
        temp_files_with_z = []
        for path in temp_filepaths:
            try:
                ds_temp = pydicom.dcmread(path, stop_before_pixels=True)
                ipp = getattr(ds_temp, "ImagePositionPatient", None)
                # Fallback to InstanceNumber if ImagePositionPatient is missing or incomplete
                z_pos = float(ipp[2]) if (ipp and len(ipp) > 2) else float(getattr(ds_temp, "InstanceNumber", 0))
                temp_files_with_z.append((z_pos, path))
            except Exception as e:
                temp_files_with_z.append((0.0, path))
                
        temp_files_with_z.sort(key=lambda x: x[0])
        sorted_temp_filepaths = [x[1] for x in temp_files_with_z]
        
        # 6. Run anonymization pipeline on all slices in sorted order and save to permanent path
        for idx, temp_filepath in enumerate(sorted_temp_filepaths):
            output_filepath = os.path.join(permanent_scan_dir, f"slice_{idx:03d}.dcm")
            dicom_service.anonymize_dicom_file(temp_filepath, output_filepath, pseudonym_id)
            
        # 7. Write audit log entry
        audit_log = models.AuditLog(
            user_id=current_user.id,
            action="UPLOAD_SCAN",
            resource_id=scan.id
        )
        db.add(audit_log)
        db.commit()
        
        return {
            "message": "Scan uploaded and anonymized successfully",
            "scan_id": scan.id,
            "patient_pseudonym": patient.pseudonymized_id,
            "patient_name": patient.patient_name,
            "patient_id": orig_patient_id,
            "age": age,
            "sex": sex,
            "study_date": study_date.isoformat() if study_date else None,
            "slice_count": len(temp_filepaths),
            "status": scan.status
        }
        
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during upload processing: {e}"
        )
    finally:
        # Clean up cached files in temporary directory
        if os.path.exists(temp_scan_dir):
            shutil.rmtree(temp_scan_dir)
