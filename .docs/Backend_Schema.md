Backend  Schema   —  Data  Model  &  Auth  
Architecture
 How  your  data  is  stored,  structured,  and  secured  —  defined  before  the  AI  writes  a  single  migration.
 
Category  Technical  Specification  &  Details  
Table:  users  
id (uuid,  PK)  
email (varchar,  unique)  
hashed_password (varchar)  
first_name (varchar)  
last_name (varchar)  
role (varchar)  
created_at (timestamp)  
Table:  patients  
id (uuid,  PK)  
pseudonymized_id (varchar,  unique)  replaces  real  names  for  GDPR  strict  GDPR  compliance  
age_at_scan (integer)  
biological_sex (varchar)  
created_at (timestamp)  
Table:  scans  
id (uuid,  PK)  
patient_id (uuid,  FK)  
uploaded_by (uuid,  FK)  
study_date (date)  
status (varchar)  —  Tracks  pipeline  state:  'pending',  'processing',  'completed',  'failed'  
dicom_folder_path (varchar)  —  Local  storage  pointer  to  the  file  volume  
created_at (timestamp)  

Table:  ai_results  
id (uuid,  PK)  
scan_id (uuid,  FK,  unique)  
nodule_count (integer)  
max_confidence_score (float)  
segmentation_mask_path (varchar)  —  Pointer  to  the  output  matrix  file  
monai_model_version (varchar)  
inference_time_ms (integer)  
created_at (timestamp)  
Table:  audit_logs  
id (uuid,  PK)  
user_id (uuid,  FK)  
action (varchar)  —  e.g.,  'UPLOAD_SCAN',  'VIEW_RESULT',  'ANONYMIZE_DATA'  
resource_id (uuid)  —  ID  of  the  target  row  being  interacted  with  
ip_address (varchar)  
timestamp (timestamp)  
Relationships  
scans.patient_id matches  patients.id (Many-to-One)  
scans.uploaded_by matches  users.id (Many-to-One)  
ai_results.scan_id matches  scans.id (One-to-One)  
audit_logs.user_id matches  users.id (Many-to-One)  
Auth  Provider  
Custom  JWT  (JSON  Web  Tokens)  managed  within  FastAPI  via  OAuth2PasswordBearer,  utilizing  passlib  with  bcrypt  for  password  hashing.  
Row  Level  Security  (RLS)  /  Access  Logic  
Implemented  via  FastAPI  dependency  injection:  Radiologists  can  only  read/write  scans  tied  to  their  own  user_id  (or  hospital  group  if  expanded).  Admins  cannot  view  medical  scans,  only  user  accounts  and  audit  logs.  

User  Roles  
Radiologist:  Permissions  to  stream/upload  DICOMs,  initialize  MONAI  models,  view  generated  masks.  
Admin:  Permissions  for  profile  creation,  schema  oversight,  system  deployment  diagnostics.  
Auditor:  Strict  read-only  access  limited  exclusively  to  the  audit_logs index  for  compliance  tracing.  
File  Storage  
Standard  file  system  (or  Docker  volumes)  managed  by  
Raw  Incoming  DICOMs:  /storage/dicom_uploads/{scan_id}/ 
Post-Inference  Segmentations:  /storage/ai_masks/{scan_id}/ 
Sensitive  Fields  
Users.hashed_password:  Encrypted  via  Bcrypt.Strict.  
Core  Compliance  Rule :  Real  patient  names,  birthdates,  and  government  IDs  are  NEVER  stored  in  the  database.  They  are  stripped  from  the  DICOM  files  by  the  backend  before  the  scans  row  is  ever  created.