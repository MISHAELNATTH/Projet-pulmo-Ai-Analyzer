TRD   -  Technical  Requirements  Document  The  blueprint  your  AI  agent  needs  to  make  technical  decisions  without  guessing.  
 
Category Technical  Decision  &  Specification 
Frontend React  18  (via  Vite)  with  TypeScript,  Tailwind  CSS. 
Backend Python  3.10+  with  FastAPI  (Uvicorn  server). 
Database 
SQLite  (Local  file-based  database).  Replaces  PostgreSQL  to  eliminate  Docker/server  dependencies  and  ensure  the  project  runs  instantly  on  any  local  machine  for  the  jury  demonstration.   
Auth 
JSON  Web  Tokens  (JWT)  with  Role-Based  Access  Control  (RBAC).  Managed  entirely  locally  within  the  FastAPI  backend  (Crucial  distinction:  "Radiologist"  vs.  "Admin"  roles).   
Hosting 
Strictly  Localhost  (No  Cloud).  
•  Frontend  runs  via  npm  run  dev (Vite  local  server).  
•  Backend  runs  via  uvicorn  main:app  --reload (Local  Python  environment).  
Third-party  APIs 
Hugging  Face  Hub  API:  To  securely  pull  down  the  pre-trained  LUNA16  3D  U-Net  weights  into  the  backend  during  the  initial  build. 
Key  Libraries 
Frontend:  cornerstone3D (DICOM  WebGL  rendering),  axios (API  calls),  lucide-react (UI  icons).  
Backend:  pydicom (DICOM  parsing/anonymization),  numpy (Hounsfield  windowing),  MONAI &  torch (AI  inference),  python-multipart (handling  large  file  uploads). 
Environment  Variables 
DATABASE_URL 
JWT_SECRET_KEY 
MODEL_WEIGHTS_PATH (Explicit  local  path,  e.g.,  ./models/best_metric_model.pth)   
DICOM_UPLOAD_TEMP_DIR
 

Constraints 
1.  GDPR/Data  Privacy:  Backend  must  strip  all  PHI  (Patient  Health  Information)  from  DICOM  headers  locally  before  storing  or  processing.  
2.  Model  Plug-and-Play:  The  backend  architecture  must  be  built  so  that  if  the  best_metric_model.pth file  is  missing  from  the  ./models/ directory,  the  backend  does  not  crash  on  startup,  but  gracefully  returns  an  error  only  when  inference  is  triggered.   
3.  Performance:  The  backend  must  operate  asynchronously  so  massive  CT  scan  folders  (often  100+  MB)  do  not  block  the  main  API  thread.  
4.  Hardware:  Requires  CUDA-compatible  GPU  for  reasonable  AI  processing  times  (inference  on  CPU  may  take  minutes  per  scan,  which  is  unacceptable  for  UI  flow).