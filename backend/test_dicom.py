import os
import shutil
import numpy as np
import pydicom
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, SecondaryCaptureImageStorage
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
import dicom_service

client = TestClient(app)

def create_mock_dicom(filename="mock.dcm", patient_name="DOE^JOHN", patient_id="MRN882941"):
    file_meta = FileMetaDataset()
    file_meta.FileMetaInformationGroupLength = 166
    file_meta.FileMetaInformationVersion = b'\x00\x01'
    file_meta.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
    file_meta.MediaStorageSOPInstanceUID = "1.2.840.10008.5.1.4.1.1.7"
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = "1.2.3.4"
    
    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    
    # PHI
    ds.PatientName = patient_name
    ds.PatientID = patient_id
    ds.PatientBirthDate = "19781024"
    ds.PatientSex = "M"
    ds.PatientAge = "045Y"
    ds.InstitutionName = "Mercy Hospital"
    ds.ReferringPhysicianName = "Dr. House"
    
    # Study
    ds.StudyDate = "20231104"
    ds.SliceThickness = "1.0"
    ds.PixelSpacing = [0.75, 0.75]
    ds.Rows = 16
    ds.Columns = 16
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.RescaleSlope = "1.0"
    ds.RescaleIntercept = "0.0"
    ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.7"
    ds.SOPInstanceUID = "1.2.840.10008.5.1.4.1.1.7.1"
    
    # Pixel Data
    pixels = np.zeros((16, 16), dtype=np.uint16)
    pixels[4:8, 4:8] = 200
    ds.PixelData = pixels.tobytes()
    
    ds.save_as(filename, write_like_original=False)

def test_dicom_anonymization_and_normalization():
    print("Testing DICOM anonymization and HU normalization logic...")
    mock_filename = "temp_mock.dcm"
    output_filename = "temp_mock_anon.dcm"
    
    try:
        # Create a mock raw DICOM file
        create_mock_dicom(mock_filename)
        
        # Test 1: Verify Anonymization service
        pseudonym = "PATIENT_DOE_JOHN_TEST"
        meta = dicom_service.anonymize_dicom_file(mock_filename, output_filename, pseudonym)
        
        assert meta["pseudonymized_id"] == pseudonym
        assert meta["age_at_scan"] == 45
        assert meta["biological_sex"] == "M"
        assert meta["dimensions"] == (16, 16)
        
        # Verify the saved anonymized file has no PHI
        anon_ds = pydicom.dcmread(output_filename)
        assert anon_ds.PatientName == pseudonym
        assert anon_ds.PatientID == pseudonym
        assert anon_ds.PatientBirthDate == ""
        assert anon_ds.InstitutionName == ""
        assert anon_ds.ReferringPhysicianName == ""
        print("[OK] DICOM anonymization verified. Real identifiers cleared successfully.")
        
        # Test 2: Verify NumPy HU Normalization
        raw_pixels = anon_ds.pixel_array
        rescale_slope = float(anon_ds.RescaleSlope)
        rescale_intercept = float(anon_ds.RescaleIntercept)
        
        normalized = dicom_service.normalize_pixel_array(raw_pixels, rescale_slope, rescale_intercept)
        
        assert normalized.min() >= 0.0
        assert normalized.max() <= 1.0
        assert normalized[0, 0] == (0.0 + 1000.0) / 1400.0
        print("[OK] Hounsfield Unit normalization verified. Intensities mapped inside [0.0, 1.0].")
        
    finally:
        # Cleanup
        if os.path.exists(mock_filename):
            os.remove(mock_filename)
        if os.path.exists(output_filename):
            os.remove(output_filename)

def test_dicom_upload_api():
    print("Testing DICOM upload API routing...")
    mock_filename = "upload_mock.dcm"
    try:
        # Create mock file
        create_mock_dicom(mock_filename)
        
        # Log in to get token (authenticated as Radiologist)
        login_response = client.post(
            "/api/auth/token",
            data={"username": "radiologist@pneumoguard.com", "password": "radiologistpass123"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test POST upload endpoint
        with open(mock_filename, "rb") as f:
            upload_response = client.post(
                "/api/scans/upload",
                files={"files": (mock_filename, f, "application/dicom")},
                headers=headers
            )
            
        assert upload_response.status_code == 201, f"Upload failed: {upload_response.text}"
        data = upload_response.json()
        assert "scan_id" in data
        assert data["patient_pseudonym"].startswith("PATIENT_")
        assert data["slice_count"] == 1
        
        # Verify database changes
        db = SessionLocal()
        try:
            scan = db.query(models.Scan).filter(models.Scan.id == data["scan_id"]).first()
            assert scan is not None
            assert scan.status == "pending"
            
            # Verify audit logs
            log = db.query(models.AuditLog).filter(models.AuditLog.resource_id == scan.id).first()
            assert log is not None
            assert log.action == "UPLOAD_SCAN"
            
            print("[OK] Upload API routing and DB record integration verified successfully.")
        finally:
            db.close()
            
    finally:
        if os.path.exists(mock_filename):
            os.remove(mock_filename)

if __name__ == "__main__":
    test_dicom_anonymization_and_normalization()
    test_dicom_upload_api()
    print("\nAll Phase 3 verification tests completed successfully!")
