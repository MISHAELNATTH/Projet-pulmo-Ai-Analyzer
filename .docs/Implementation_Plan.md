Implementation  Plan   —  Step-by-Step  Build  
Sequence
 The  exact  order  to  build  so  the  AI  never  skips  a  foundation  layer.  
   
Phase  1:  Local  Monolith  Workspace  &  Google  Stitch  Sync  
●  Objective:  Establish  the  dual-directory  Localhost  monorepo  architecture,  verify  port  
bindings,
 
and
 
ingest
 
the
 
ready-made
 
Exact
 
Google
 
Stitch
 
interface
 
components.
 Step  Technical  Specification  /  Implementation  Action  
Code  Deliverable  /  Milestone  
Verification  Script  /  Command  
1.1  Initialize  a  workspace  split  into  two  independent  primary  subdirectories:  /frontend  (Vite  +  React  18  +  TS)  and  /backend  (FastAPI  +  Python  3.10+).  
Root  monorepo  structure  with  independent  lockfiles.  
Ensure  both  directories  exist  and  execute  cd  frontend  &&  npm  install  and  cd  backend  &&  pip  install  -r  requirements.txt.  
1.2  Connect  the  Google  Stitch  UI  layouts  via  the  Model  Context  Protocol  (MCP)  tool  chain,  compiling  the  mock  layout  blueprints  into  functional  React  boilerplate  inside  /frontend/src/components/.  
Stitch  UI  pages  mapped  into  React  router  pathways.  
Run  npm  run  dev  inside  /frontend  and  verify  the  web  interface  loads  completely  on  http://localhost:5173  without  layout  breakage.  
1.3  Configure  standard  Cross-Origin  Resource  Sharing  (CORS)  middleware  parameters  inside  the  FastAPI  application  configuration  file  to  cleanly  authorize  requests  initiating  from  the  local  frontend  origin.  
main.py  core  app  instantiation  with  explicitly  allowed  local  origins.  
Run  uvicorn  main:app  --reload  --port  8000  inside  /backend  and  execute  a  manual  curl  http://localhost:8000/  to  verify  a  successful  ping.  

Phase  2:  Local  SQLite  Database  &  Auth  Foundation  
●  Objective:  Spin  up  a  local  file-based  data  system  using  SQLite  and  build  a  secure,  
zero-cloud
 
user
 
session
 
management
 
pipeline.
 Step  Technical  Specification  /  Implementation  Action  
Code  Deliverable  /  Milestone  
Verification  Script  /  Command  
2.1  Design  the  schema  layout  using  an  Object-Relational  Mapper  (SQLAlchemy/SQLModel)  pointing  to  a  physical  local  file  (./pneumoguard.db).  Code  tables  for  users,  patients,  scans,  ai_results,  and  audit_logs.  
database.py  initialization  and  SQL  models  module.  
Execute  a  custom  seed  script  python  seed_db.py  that  auto-generates  the  file  and  outputs:  SQLite  Database  initialized  successfully.  
2.2  Implement  local  user  session  routing  with  FastAPI  using  password  hashing  (passlib  with  bcrypt)  and  JSON  Web  Token  (JWT)  signature  generation.  
Auth  router  logic  handles  password  validation  and  JWT  distribution.  
Send  a  test  authentication  POST  payload  containing  mock  credentials  via  Postman  or  HTTP  client  and  assert  a  valid  access_token  string  response.  
2.3  Construct  a  Role-Based  Access  Control  (RBAC)  verification  dependency  that  intercepts  API  routes  based  on  user  attributes  (role:  "radiologist"  vs.  role:  "admin").  
FastAPI  dependency  guards  protecting  sensitive  local  data  routes.  
Attempt  to  pull  server  configuration  options  using  a  token  configured  as  a  standard  radiologist  user  and  verify  a  clean  HTTP  403  Forbidden  rejection.  
 

Phase  3:  DICOM  Ingestion,  Header  Anonymization  &  Processing  
●  Objective:  Build  the  local  data  ingestion  engine  that  safely  imports  heavy,  volumetric  
medical
 
image
 
arrays
 
from
 
the
 
local
 
file
 
system.
 Step  Technical  Specification  /  Implementation  Action  
Code  Deliverable  /  Milestone  
Verification  Script  /  Command  
3.1  Create  an  upload  path  handler  using  python-multipart  that  accepts  multi-file  form  payloads  representing  a  patient's  chest  CT  slice  directory.  
/api/scans/upload  endpoint  caching  folder  structures  to  a  local  disk  temporary  directory.  
POST  a  series  of  sample  slice  arrays  to  the  endpoint  and  verify  they  accurately  register  within  the  target  local  temporary  directory.  
3.2  Integrate  pydicom  to  loop  through  the  cached  directory,  pull  structural  spatial  metadata  parameters  (slice  thickness,  dimensions),  and  execute  a  scrub  routine  that  strips  out  Protected  Health  Information  (PHI).  
Anonymization  service  layer  isolating  raw  metadata.  
Execute  a  script  targeting  the  cache  folder  and  assert  that  fields  like  PatientName  or  PatientID  evaluate  to  a  blank  string  or  a  unique  secure  hash.  
3.3  Utilize  NumPy  to  handle  Hounsfield  Unit  (HU)  normalization  arrays,  mapping  density  ranges  cleanly  to  maximize  neural  network  execution  speed  using  the  standard  medical  bounding  function:    Normalized  Input  =  (clip(X,  -1000,  400)  +  1000)  /  1400  
Data  pre-processing  helper  utility  script.  
Pass  a  matrix  slice  through  the  normalization  module  and  assert  that  all  numerical  array  components  fall  reliably  between  0.0  and  1.0.  

Phase  4:  Cornerstone3D  Integration  &  Viewport  State  Matching  
●  Objective:  Map  the  local  data  endpoints  to  the  React  UI  layout  canvas,  using  WebGL  
acceleration
 
to
 
render
 
CT
 
cross-sections
 
fluidly.
 Step  Technical  Specification  /  Implementation  Action  
Code  Deliverable  /  Milestone  
Verification  Script  /  Command  
4.1  Initialize  the  cornerstone3D  rendering  library  context  wrapper  inside  the  primary  layout  canvas  container  synced  from  Google  Stitch.  
Core  Canvas  initialization  hook  embedded  into  React  state  life  cycles.  
Confirm  that  canvas  rendering  blocks  boot  correctly  on  the  page  without  throwing  WebGL  context  initialization  warnings  in  the  browser.  
4.2  Build  a  streaming  slice  endpoint  in  FastAPI  that  transmits  individual  normalized  image  frames  as  fast  2D  arrays  directly  to  the  UI  layer.  
Slice  delivery  backend  routing  optimized  for  fast  read  streams.  
Validate  the  endpoint  directly  inside  a  browser  tab  and  confirm  the  rapid  delivery  of  consecutive  slice  frame  responses.  
4.3  Implement  scrolling  navigation  listeners  on  the  frontend  interface  layer,  enabling  smooth  navigation  backwards  and  forwards  across  the  complete  3D  data  volume.  
Fully  operational  interactive  2D  stack  viewport  component.  
Load  a  patient  file  dataset  in  the  UI,  scroll  through  the  slices,  and  confirm  that  frame  adjustments  update  instantly  without  memory  leaks.  

Phase  5:  Asynchronous  AI  Core  &  Plug-and-Play  Model  Slot  
●  Objective:  Build  the  localized  machine  learning  inference  module,  using  a  decoupled  
framework
 
designed
 
to
 
safely
 
receive
 
the
 
.pth
 
weights
 
file
 
from
 
your
 
parallel
 
Google
 
Colab
 
training
 
workspace.
 Step  Technical  Specification  /  Implementation  Action  
Code  Deliverable  /  Milestone  
Verification  Script  /  Command  
5.1  Establish  a  standalone  model  repository  slot  path  at  /backend/models/.  Configure  a  fallback  check  so  that  missing  weights  files  do  not  cause  app  crashes  during  server  initialization.  
Resilient  model  initialization  setup  handling  missing  files  gracefully.  
Launch  the  FastAPI  application  while  the  /models/  folder  is  empty  and  assert  that  the  server  starts  normally  on  port  8000.  
5.2  Write  an  asynchronous  inference  task  using  FastAPI’s  native  BackgroundTasks  framework,  ensuring  that  multi-slice  3D  analysis  doesn't  lock  up  the  primary  user  interface  thread.  
Asynchronous  AI  service  runner  that  processes  tasks  in  the  background.  
POST  an  execution  call  to  the  inference  path  and  verify  it  instantly  delivers  an  HTTP  202  Accepted  response  code  while  continuing  computation.  
5.3  Build  out  the  PyTorch  and  MONAI  testing  block.  It  will  read  the  pre-trained  3D  U-Net  configuration,  transform  normalized  inputs  into  standard  channel  tensors  (C  *  D  *  H  *  W),  and  execute  a  mock  inference  pass.  
Standalone  local  evaluation  script  using  fallback  logic.  
Drop  a  template  weight  file  into  /models/  and  run  python  test_inference.py.  Verify  it  yields  a  standard  coordinate  dictionary  of  detected  nodule  clusters.  
 

Phase  6:  End-to-End  System  Integration  &  Local  Compliance  Audit  
●  Objective:  Wire  the  independent  pipeline  elements  into  a  seamless  execution  sequence,  
securing
 
all
 
user
 
operations
 
inside
 
the
 
tracking
 
logger
 
database.
 Step  Technical  Specification  /  Implementation  Action  
Code  Deliverable  /  Milestone  
Verification  Script  /  Command  
6.1  Bind  the  frontend  user  interface  elements  directly  to  the  backend  background  workers,  mapping  progress  indicators  to  display  the  current  computation  status.  
Interactive  progress  visualization  matching  system  execution  stages.  
Select  a  target  dataset,  click  "Analyze  Scan,"  and  verify  that  state  changes  transition  accurately  from  pending  to  processing  to  completed.  
6.2  Implement  the  rendering  layer  that  maps  the  output  segmentation  mask  array  as  a  color-coded  canvas  overlay  on  top  of  the  original  Cornerstone3D  viewports.  
Visual  nodule  contour  visualization  layout.  
Confirm  that  areas  flagged  as  positive  by  the  AI  engine  render  with  clear  boundary  rings  directly  on  top  of  the  target  slice  frames.  
6.3  Wire  up  the  tracking  log  engine  to  record  all  user  interactions  (UPLOAD_SCAN,  VIEW_RESULT)  to  the  local  SQLite  audit_logs  table.  
Bulletproof  local  diagnostic  tracking  system.  
Complete  an  analysis  run,  run  sqlite3  pneumoguard.db  "SELECT  *  FROM  audit_logs;"  in  your  terminal,  and  confirm  that  all  steps  are  logged  with  timestamps.  
 

Stop-Gate  Instructions  for  Antigravity  2.0:  
Strict  Operational  Rule:  Do  not  write  code  for  a  subsequent  phase  until  all  verification  scripts  
and
 
commands
 
for
 
the
 
current
 
phase
 
pass
 
with
 
zero
 
errors.
 
Build
 
sequentially
 
from
 
Phase
 
1
 
through
 
Phase
 
6
 
to
 
guarantee
 
a
 
robust
 
local
 
development
 
environment.