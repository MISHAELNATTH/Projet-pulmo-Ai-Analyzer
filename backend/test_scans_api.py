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

def create_mock_dicom(filename="mock_slice.dcm", name="DOE^TEST", pid="TEST-MRN-1"):
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
    
    if name is not None:
        ds.PatientName = name
    if pid is not None:
        ds.PatientID = pid
        
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
    mock_no_meta_filename = "slice_no_meta.dcm"
    
    try:
        # Create mock file
        create_mock_dicom(mock_filename)
        create_mock_dicom(mock_no_meta_filename, name="", pid="")
        
        # 1. Login
        login_response = client.post(
            "/api/auth/token",
            data={"username": "radiologist@pneumoguard.com", "password": "radiologistpass123"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Upload scan (with metadata)
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

        # 6. Upload second scan without patient metadata (simulating test files)
        print("Testing upload of files without patient metadata...")
        with open(mock_no_meta_filename, "rb") as f:
            upload_no_meta_response = client.post(
                "/api/scans/upload",
                files={"files": (mock_no_meta_filename, f, "application/dicom")},
                headers=headers
            )
        assert upload_no_meta_response.status_code == 201
        no_meta_scan_id = upload_no_meta_response.json()["scan_id"]
        assert upload_no_meta_response.json()["patient_name"] == "Unknown Patient"
        
        # 7. Confirm the second scan's details manually
        print("Testing manual confirmation of metadata...")
        confirm_payload = {
            "patient_name": "JONES, INDY",
            "patient_id": "MRN-1936",
            "age": 40,
            "sex": "M"
        }
        confirm_response = client.post(
            f"/api/scans/{no_meta_scan_id}/confirm",
            json=confirm_payload,
            headers=headers
        )
        assert confirm_response.status_code == 200
        confirm_data = confirm_response.json()
        assert confirm_data["patient_name"] == "JONES, INDY"
        assert confirm_data["patient_pseudonym"].startswith("PATIENT_")
        
        # Verify the database has the updated values
        meta_confirm_response = client.get(f"/api/scans/{no_meta_scan_id}/metadata", headers=headers)
        assert meta_confirm_response.status_code == 200
        meta_confirmed = meta_confirm_response.json()
        assert meta_confirmed["patient_name"] == "JONES, INDY"
        assert meta_confirmed["age_at_scan"] == 40
        assert meta_confirmed["biological_sex"] == "M"
        print("[OK] Manual confirmation of metadata verified.")

        # 8. Upload another scan for the same patient to verify merging
        print("Testing patient merging flow...")
        with open(mock_no_meta_filename, "rb") as f:
            upload_merge_response = client.post(
                "/api/scans/upload",
                files={"files": (mock_no_meta_filename, f, "application/dicom")},
                headers=headers
            )
        assert upload_merge_response.status_code == 201
        merge_scan_id = upload_merge_response.json()["scan_id"]
        
        # Confirm with the same patient details to trigger merge
        confirm_merge_response = client.post(
            f"/api/scans/{merge_scan_id}/confirm",
            json=confirm_payload,
            headers=headers
        )
        assert confirm_merge_response.status_code == 200
        confirm_merge_data = confirm_merge_response.json()
        assert confirm_merge_data["patient_name"] == "JONES, INDY"
        
        # Retrieve scans to verify they both link to the same patient pseudonym
        scans_list_response = client.get("/api/scans", headers=headers)
        scans_list_all = scans_list_response.json()
        
        scan2 = next(s for s in scans_list_all if s["id"] == no_meta_scan_id)
        scan3 = next(s for s in scans_list_all if s["id"] == merge_scan_id)
        assert scan2["patient_pseudonym"] == scan3["patient_pseudonym"]
        print("[OK] Patient merging verified.")
        
        # 8.5 Test POST /api/scans/{scan_id}/analyze
        print("Testing analyze scan endpoint...")
        analyze_response = client.post(f"/api/scans/{no_meta_scan_id}/analyze", headers=headers)
        assert analyze_response.status_code == 202
        analyze_data = analyze_response.json()
        assert analyze_data["scan_id"] == no_meta_scan_id
        assert analyze_data["status"] == "processing"
        
        # Poll status until completed (should take ~1.5s in fallback)
        import time
        status_completed = False
        for _ in range(15):
            time.sleep(0.2)
            meta_check = client.get(f"/api/scans/{no_meta_scan_id}/metadata", headers=headers)
            assert meta_check.status_code == 200
            meta_data = meta_check.json()
            if meta_data["status"] == "completed":
                status_completed = True
                assert meta_data["ai_result"] is not None
                assert len(meta_data["ai_result"]["nodules"]) > 0
                assert meta_data["ai_result"]["nodules"][0]["confidence"] == 0.894
                break
        assert status_completed
        print("[OK] Asynchronous AI analysis and result metadata retrieval verified.")
        
        # 9. Test DELETE /api/scans/{scan_id}
        print("Testing delete scan endpoint...")
        delete_response = client.delete(f"/api/scans/{scan_id}", headers=headers)
        assert delete_response.status_code == 200
        delete_data = delete_response.json()
        assert delete_data["scan_id"] == scan_id
        
        # Verify scan is gone
        get_meta_after_delete = client.get(f"/api/scans/{scan_id}/metadata", headers=headers)
        assert get_meta_after_delete.status_code == 404
        print("[OK] Delete scan verified.")
        
    finally:
        # Cleanup mock files
        if os.path.exists(mock_filename):
            os.remove(mock_filename)
        if os.path.exists(mock_no_meta_filename):
            os.remove(mock_no_meta_filename)

if __name__ == "__main__":
    test_scans_endpoints()
    print("\nAll Phase 4 backend routing verification tests completed successfully!")
