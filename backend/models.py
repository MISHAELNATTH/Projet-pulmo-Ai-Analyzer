import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="radiologist") # admin, radiologist, auditor
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    scans = relationship("Scan", back_populates="uploader")
    audit_logs = relationship("AuditLog", back_populates="user")


class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pseudonymized_id = Column(String, unique=True, index=True, nullable=False)
    patient_name = Column(String, nullable=True)
    age_at_scan = Column(Integer, nullable=True)
    biological_sex = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    scans = relationship("Scan", back_populates="patient")


class Scan(Base):
    __tablename__ = "scans"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)
    study_date = Column(Date, nullable=True)
    status = Column(String, default="pending") # pending, processing, completed, failed
    dicom_folder_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="scans")
    uploader = relationship("User", back_populates="scans")
    ai_result = relationship("AIResult", back_populates="scan", uselist=False)


class AIResult(Base):
    __tablename__ = "ai_results"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scans.id"), unique=True, nullable=False)
    nodule_count = Column(Integer, default=0)
    max_confidence_score = Column(Float, default=0.0)
    segmentation_mask_path = Column(String, nullable=True)
    monai_model_version = Column(String, nullable=True)
    inference_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    scan = relationship("Scan", back_populates="ai_result")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False) # UPLOAD_SCAN, VIEW_RESULT, ANONYMIZE_DATA
    resource_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
