import os
from datetime import datetime
import numpy as np
import pydicom

# List of common Protected Health Information (PHI) DICOM tags to strip or overwrite
PHI_TAGS_TO_CLEAR = [
    "PatientBirthDate",
    "PatientBirthTime",
    "PatientAddress",
    "PatientTelephoneNumbers",
    "InstitutionName",
    "InstitutionAddress",
    "ReferringPhysicianName",
    "OperatorName",
    "PerformingPhysicianName",
    "PhysiciansOfRecord",
    "InstitutionalDepartmentName",
    "AccessionNumber",
    "StudyID",
    "OtherPatientIDs",
    "PatientBirthName",
    "PatientMotherBirthName",
    "MilitaryRank",
    "MedicalRecordLocator",
    "MedicalAlerts",
    "Allergies",
    "PregnancyStatus",
    "PatientComments",
    "AdditionalPatientHistory",
]

def parse_patient_age(ds: pydicom.Dataset) -> int:
    """Extract age as an integer from DICOM tags."""
    # Try parsing PatientAge tag (format e.g., '045Y', '002M', '010D')
    age_str = getattr(ds, "PatientAge", None)
    if age_str and isinstance(age_str, str):
        try:
            # Look for suffix indicating years, months, or days
            if age_str.endswith("Y"):
                return int(age_str[:-1])
            elif age_str.endswith("M") or age_str.endswith("W") or age_str.endswith("D"):
                return 0  # Under 1 year old
            else:
                # Fallback to straight integer conversion if suffix is missing
                return int(age_str)
        except ValueError:
            pass

    # Fallback to StudyDate - PatientBirthDate
    birth_date_str = getattr(ds, "PatientBirthDate", None)
    study_date_str = getattr(ds, "StudyDate", None)
    if birth_date_str and study_date_str:
        try:
            birth_dt = datetime.strptime(birth_date_str, "%Y%m%d")
            study_dt = datetime.strptime(study_date_str, "%Y%m%d")
            return int((study_dt - birth_dt).days / 365.25)
        except Exception:
            pass

    return 0  # Default fallback if impossible to parse

def anonymize_dicom_file(file_path: str, output_path: str, pseudonym_id: str) -> dict:
    """
    Reads a DICOM file, extracts clinical metadata, strips all PHI elements,
    overwrites identifying tags with pseudonym_id, and writes out the anonymized file.
    """
    ds = pydicom.dcmread(file_path)
    
    # Extract clinical metadata before wiping
    sex = getattr(ds, "PatientSex", "O")  # M, F, O (Other/Unknown)
    age = parse_patient_age(ds)
    study_date_raw = getattr(ds, "StudyDate", None)
    
    study_date = None
    if study_date_raw:
        try:
            study_date = datetime.strptime(study_date_raw, "%Y%m%d").date()
        except Exception:
            pass
            
    slice_thickness = float(getattr(ds, "SliceThickness", 1.0))
    pixel_spacing = [float(x) for x in getattr(ds, "PixelSpacing", [1.0, 1.0])]
    rows = int(getattr(ds, "Rows", 512))
    cols = int(getattr(ds, "Columns", 512))
    rescale_slope = float(getattr(ds, "RescaleSlope", 1.0))
    rescale_intercept = float(getattr(ds, "RescaleIntercept", 0.0))
    
    # Wipe PHI tags
    for tag in PHI_TAGS_TO_CLEAR:
        if hasattr(ds, tag):
            # Overwrite or clear the tag
            setattr(ds, tag, "")
            
    # Overwrite PatientName and PatientID with the secure pseudonym ID
    ds.PatientName = pseudonym_id
    ds.PatientID = pseudonym_id
    
    # Save the modified anonymized DICOM file
    dir_name = os.path.dirname(output_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    ds.save_as(output_path)
    
    return {
        "pseudonymized_id": pseudonym_id,
        "age_at_scan": age,
        "biological_sex": sex,
        "study_date": study_date,
        "slice_thickness": slice_thickness,
        "pixel_spacing": pixel_spacing,
        "dimensions": (rows, cols),
        "rescale_slope": rescale_slope,
        "rescale_intercept": rescale_intercept
    }

def normalize_pixel_array(pixel_array: np.ndarray, rescale_slope: float, rescale_intercept: float) -> np.ndarray:
    """
    Converts raw DICOM pixel intensities to Hounsfield Units (HU) and
    normalizes them between [0.0, 1.0] using the formula:
    Normalized Input = (clip(X, -1000, 400) + 1000) / 1400
    """
    # Convert to Hounsfield Units (HU)
    hu_array = pixel_array.astype(np.float32) * rescale_slope + rescale_intercept
    
    # Clip intensity boundaries for lungs (-1000 to 400 HU)
    hu_clipped = np.clip(hu_array, -1000.0, 400.0)
    
    # Map range [-1000, 400] to [0.0, 1.0]
    normalized_array = (hu_clipped + 1000.0) / 1400.0
    
    return normalized_array
