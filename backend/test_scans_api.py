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

client = TestClient(app)

def create_mock_dicom(filename="mock_slice.dcm"):
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
    
    ds.PatientName = "DOE^TEST"
    ds.PatientID = "TEST-MRN-1"
    ds.PatientBirthDate = "19850505"
    ds.PatientSex = "F"
    ds.PatientAge = "038Y"
    ds.InstitutionName = "Test Hospital"
    ds.ReferringPhysicianName = "Dr. Tester"
    
    ds.StudyDate = "20231104"
    ds.SliceThickness = "1.5"
    ds.PixelSpacing = [0.8, 0.8]
    ds.Rows = 16
    ds.Columns = 16
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.RescaleSlope = "1.0"
    ds.RescaleIntercept = "-1024.0" # HU intercept
    ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.7"
    ds.SOPInstanceUID = "1.2.840.10008.5.1.4.1.1.7.1"
    
    # 16x16 pixel array containing some lung-like values
    pixels = np.zeros((16, 16), dtype=np.uint16)
    pixels[4:12, 4:12] = 200 # Air/Tissue boundaries
    ds.PixelData = pixels.tobytes()
    
    ds.save_as(filename, write_like_original=False)

def test_scans_endpoints():
    print("Testing scans listing, metadata, and slice streaming routes...")
    mock_filename = "slice_test.dcm"
    
    try:
        # Create mock file
        create_mock_dicom(mock_filename)
        
        # 1. Login
        login_response = client.post(
            "/api/auth/token",
            data={"username": "radiologist@pneumoguard.com", "password": "radiologistpass123"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Upload scan
        with open(mock_filename, "rb") as f:
            upload_response = client.post(
                "/api/scans/upload",
                files={"files": (mock_filename, f, "application/dicom")},
                headers=headers
            )
        assert upload_response.status_code == 201
        scan_id = upload_response.json()["scan_id"]
        
        # 3. Test GET /api/scans (list)
        list_response = client.get("/api/scans", headers=headers)
        assert list_response.status_code == 200
        scans_list = list_response.json()
        assert len(scans_list) >= 1
        
        # Find our uploaded scan
        uploaded_scan = next((s for s in scans_list if s["id"] == scan_id), None)
        assert uploaded_scan is not None
        assert uploaded_scan["patient_pseudonym"].startswith("PATIENT_")
        assert uploaded_scan["slice_count"] == 1
        print("[OK] Scans listing API verified.")
        
        # 4. Test GET /api/scans/{scan_id}/metadata
        meta_response = client.get(f"/api/scans/{scan_id}/metadata", headers=headers)
        assert meta_response.status_code == 200
        meta = meta_response.json()
        assert meta["scan_id"] == scan_id
        assert meta["slice_count"] == 1
        assert meta["dimensions"] == [16, 16]
        assert meta["slice_thickness"] == 1.5
        assert meta["pixel_spacing"] == [0.8, 0.8]
        print("[OK] Scan metadata API verified.")
        
        # 5. Test GET /api/scans/{scan_id}/slices/0
        slice_response = client.get(f"/api/scans/{scan_id}/slices/0", headers=headers)
        assert slice_response.status_code == 200
        assert slice_response.headers["content-type"] == "application/octet-stream"
        
        # Load binary content as float32 array
        pixel_bytes = slice_response.content
        float_array = np.frombuffer(pixel_bytes, dtype=np.float32)
        assert len(float_array) == 16 * 16
        
        # Check range constraints [0.0, 1.0]
        assert float_array.min() >= 0.0
        assert float_array.max() <= 1.0
        print("[OK] Slice binary streaming and intensity normalization verified.")
        
    finally:
        # Cleanup mock file
        if os.path.exists(mock_filename):
            os.remove(mock_filename)

if __name__ == "__main__":
    test_scans_endpoints()
    print("\nAll Phase 4 backend routing verification tests completed successfully!")
