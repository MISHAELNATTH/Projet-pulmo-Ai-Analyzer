import os
import shutil
import numpy as np
import pydicom
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, SecondaryCaptureImageStorage
from ai_model import NoduleDetector

def create_dummy_scan(folder_path="dummy_scan"):
    os.makedirs(folder_path, exist_ok=True)
    # Create 5 dummy slices
    for idx in range(5):
        file_meta = FileMetaDataset()
        file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
        file_meta.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
        file_meta.MediaStorageSOPInstanceUID = f"1.2.840.10008.5.1.4.1.1.7.{idx}"
        
        ds = Dataset()
        ds.file_meta = file_meta
        ds.is_little_endian = True
        ds.is_implicit_VR = False
        
        ds.PatientName = "MOCK^AI^PATIENT"
        ds.PatientID = "MOCK-AI-1"
        ds.PatientBirthDate = "19900101"
        ds.PatientSex = "O"
        ds.PatientAge = "036Y"
        ds.StudyDate = "20240101"
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
        ds.RescaleIntercept = "-1024.0"
        ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.7"
        ds.SOPInstanceUID = f"1.2.840.10008.5.1.4.1.1.7.{idx}"
        ds.SeriesInstanceUID = "1.2.840.10008.5.1.4.1.1.7.3"
        ds.ImagePositionPatient = [float(idx * 0.8), float(idx * 1.2), float(idx * 1.5)]
        ds.ImageOrientationPatient = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0]
        
        # Simple simulated nodule signal in the middle slice
        pixels = np.zeros((16, 16), dtype=np.uint16)
        if idx == 2:
            pixels[6:10, 6:10] = 500  # Nodule density spike
        ds.PixelData = pixels.tobytes()
        
        ds.save_as(os.path.join(folder_path, f"slice_{idx:03d}.dcm"), write_like_original=False)

def test_inference_standalone():
    print("Initializing NoduleDetector...")
    detector = NoduleDetector()
    print(f"Detector model version: {detector.model_version}")
    print(f"Fallback mode active: {detector.fallback}")
    
    dummy_folder = "dummy_test_scan"
    try:
        print(f"Creating dummy volumetric scan in {dummy_folder}...")
        create_dummy_scan(dummy_folder)
        
        print("Running mock inference pass...")
        results = detector.run_inference(dummy_folder)
        
        # Assertions
        assert results["status"] == "completed"
        assert "nodules" in results
        assert len(results["nodules"]) > 0
        
        print("\n[SUCCESS] AI Inference completed. Detected Nodule Clusters:")
        for nodule in results["nodules"]:
            print(f" - ID: {nodule['nodule_id']}")
            print(f"   Centroid [Z, Y, X]: {nodule['centroid']}")
            print(f"   Bounding Box: {nodule['bounding_box']}")
            print(f"   Confidence Score: {nodule['confidence']:.3f}")
            print(f"   Estimated Size: {nodule['size_mm']} mm")
            print(f"   Location Segment: {nodule['location']}")
            
        print("\nAll standalone AI inference pipeline checks passed successfully!")
    finally:
        if os.path.exists(dummy_folder):
            shutil.rmtree(dummy_folder)

if __name__ == "__main__":
    test_inference_standalone()
