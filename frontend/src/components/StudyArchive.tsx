import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from './Sidebar';

interface Record {
  id: string | number;
  date: string;
  time: string;
  name: string;
  mrn: string;
  desc: string;
  modality: 'CT' | 'XR' | 'MR';
  finding: string;
  findingDetails: string;
  findingType: 'Nodule' | 'Clear' | 'Suspicious';
  status: 'Archived' | 'Flagged' | 'Signed';
  log: string[];
  growthText: string;
}

const initialRecords: Record[] = [
  {
    id: 1,
    date: '2023-11-04',
    time: '14:22:10',
    name: 'DOE, JOHN',
    mrn: 'MRN: 882941',
    desc: 'CT CHEST W/O CONTRAST',
    modality: 'CT',
    finding: '1 Nodule (12.4mm)',
    findingDetails: '1 Nodule (12.4mm)',
    findingType: 'Nodule',
    status: 'Archived',
    growthText: 'Scanning historical data for this patient shows a 12% increase in nodule volume since study 2022-04-12.',
    log: [
      '> Fetching DICOM metadata...',
      '> AI Inference Complete [0.42s]',
      '> Integrity Verified: SHA-256',
    ],
  },
  {
    id: 2,
    date: '2023-11-04',
    time: '11:05:45',
    name: 'SMITH, SARAH',
    mrn: 'MRN: 921004',
    desc: 'XR CHEST 2 VIEWS',
    modality: 'XR',
    finding: 'Clear',
    findingDetails: 'Clear',
    findingType: 'Clear',
    status: 'Archived',
    growthText: 'No abnormalities detected. Standard screening baseline established. AI model consensus: 99.8% normal.',
    log: [
      '> Initializing XR sequence analysis...',
      '> Dual-energy subtraction simulated...',
      '> AI classification: Normal chest [0.18s]',
    ],
  },
  {
    id: 3,
    date: '2023-11-03',
    time: '09:12:30',
    name: 'RAMIREZ, CARLOS',
    mrn: 'MRN: 774129',
    desc: 'CT CHEST ANGIO',
    modality: 'CT',
    finding: 'Suspicious Density',
    findingDetails: 'Suspicious',
    findingType: 'Suspicious',
    status: 'Flagged',
    growthText: 'Subsegmental filling defect noted in the right lower lobe pulmonary artery branch. High clinical concern for acute PE.',
    log: [
      '> Loading CTA volumetric datasets...',
      '> Segmenting pulmonary vascular tree...',
      '> AI Alert raised: Filling defect detected [0.65s]',
    ],
  },
  {
    id: 4,
    date: '2023-11-02',
    time: '16:45:00',
    name: 'KIM, JISOO',
    mrn: 'MRN: 110293',
    desc: 'CT THORAX HIGH RES',
    modality: 'CT',
    finding: 'Clear',
    findingDetails: 'Clear',
    findingType: 'Clear',
    status: 'Archived',
    growthText: 'No nodules or consolidation. Mild bronchial wall thickening noted, stable compared to prior study.',
    log: [
      '> High-resolution reconstruction parsed...',
      '> Airway segmentation validated...',
      '> AI evaluation: No suspicious nodules [0.39s]',
    ],
  },
  {
    id: 5,
    date: '2023-10-28',
    time: '08:00:22',
    name: 'BAKER, ROBERT',
    mrn: 'MRN: 334912',
    desc: 'MR CHEST WITHOUT CONTRAST',
    modality: 'MR',
    finding: '2 Nodules (8mm, 5mm)',
    findingDetails: '2 Nodules (8mm, 5mm)',
    findingType: 'Nodule',
    status: 'Archived',
    growthText: 'Nodule in RML (8mm) shows minimal growth (previously 7.4mm). Nodule in LUL (5mm) is stable. Follow-up MR in 6 months.',
    log: [
      '> Aligning T2 & Diffusion sequences...',
      '> Nodule tracking telemetry parsed...',
      '> AI growth tracking calibrated [0.55s]',
    ],
  },
];

export const StudyArchive: React.FC = () => {
  const navigate = useNavigate();
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [modality, setModality] = useState<'ALL' | 'CT' | 'XR' | 'MR'>('ALL');
  const [findingType, setFindingType] = useState<string>('All Findings');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // UI Interactive Drawer State
  const [selectedRecordId, setSelectedRecordId] = useState<string | number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Loaded database scans state
  const [dbRecords, setDbRecords] = useState<Record[]>([]);

  // Deleted initial records state (synced with dashboard)
  const [deletedInitialIds, setDeletedInitialIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('deletedInitialIds');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('deletedInitialIds', JSON.stringify(deletedInitialIds));
  }, [deletedInitialIds]);

  const fetchArchiveScans = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios.get('http://localhost:8000/api/scans', { headers })
      .then((response) => {
        const mapped: Record[] = response.data.map((scan: any) => {
          const dateObj = new Date(scan.created_at);
          const dateStr = scan.study_date || dateObj.toISOString().split('T')[0];
          const timeStr = dateObj.toTimeString().split(' ')[0];
          
          let finding = 'Clear';
          let findingType: 'Nodule' | 'Clear' | 'Suspicious' = 'Clear';
          let findingDetails = 'Clear';
          
          const nodules = scan.ai_result?.nodules || [];
          if (nodules.length > 0) {
            findingType = 'Nodule';
            const sizes = nodules.map((n: any) => `${n.size_mm.toFixed(1)}mm`).join(', ');
            finding = `${nodules.length} Nodule${nodules.length > 1 ? 's' : ''} (${sizes})`;
            findingDetails = finding;
          } else if (scan.status === 'failed') {
            findingType = 'Suspicious';
            finding = 'Error in AI';
            findingDetails = 'Error in AI';
          }

          let status: 'Archived' | 'Flagged' | 'Signed' = 'Archived';
          if (scan.status === 'signed') {
            status = 'Signed';
          } else if (scan.status === 'failed') {
            status = 'Flagged';
          }

          return {
            id: scan.id,
            date: dateStr,
            time: timeStr,
            name: scan.patient_pseudonym || scan.patient_name || 'Unknown Patient',
            mrn: `MRN: ${scan.id.substring(0, 8).toUpperCase()}`,
            desc: 'CT CHEST W/O CONTRAST',
            modality: 'CT',
            finding,
            findingDetails,
            findingType,
            status,
            growthText: nodules.length > 0 
              ? `AI segmented ${nodules.length} nodule(s). Max confidence: ${Math.round(scan.ai_result.max_confidence_score * 100)}%.` 
              : 'No nodules detected by the AI pipeline.',
            log: [
              `> Fetching DICOM metadata...`,
              `> AI Inference Status: ${scan.status}`,
              `> Slice count: ${scan.slice_count}`,
            ],
          };
        });
        setDbRecords(mapped);
      })
      .catch((err) => console.error('Error fetching archive scans:', err));
  };

  useEffect(() => {
    fetchArchiveScans();
  }, []);

  // Filter out deleted initial mock records
  const activeInitialRecords = initialRecords.filter((r) => !deletedInitialIds.includes(r.id as number));
  const allRecords = [...dbRecords, ...activeInitialRecords];

  const selectedRecord = allRecords.find((r) => r.id === selectedRecordId);

  // Filter Logic
  const filteredRecords = allRecords.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.desc.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModality = modality === 'ALL' || record.modality === modality;
    
    let matchesFinding = true;
    if (findingType === 'Nodule') matchesFinding = record.findingType === 'Nodule';
    if (findingType === 'Clear') matchesFinding = record.findingType === 'Clear';
    if (findingType === 'Suspicious') matchesFinding = record.findingType === 'Suspicious';

    const matchesStatus = statusFilter === 'ALL' || record.status === statusFilter;

    return matchesSearch && matchesModality && matchesFinding && matchesStatus;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateRange('Last 30 Days');
    setModality('ALL');
    setFindingType('All Findings');
    setStatusFilter('ALL');
  };

  const handleRowClick = (record: Record) => {
    setSelectedRecordId(record.id);
    setDrawerOpen(true);
  };

  const handleQuickView = (record: Record, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const isRealScan = typeof record.id === 'string';
    navigate('/viewer', { 
      state: { 
        patientName: record.name, 
        mrn: record.mrn.replace('MRN: ', 'MRN-'),
        scanId: isRealScan ? record.id : undefined 
      } 
    });
  };

  const handleDeleteRecord = async (record: Record, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the record for patient ${record.name}?`)) {
      return;
    }

    if (selectedRecordId === record.id) {
      setSelectedRecordId(null);
      setDrawerOpen(false);
    }

    if (typeof record.id === 'number') {
      setDeletedInitialIds((prev) => [...prev, record.id as number]);
    } else {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        await axios.delete(`http://localhost:8000/api/scans/${record.id}`, { headers });
        fetchArchiveScans();
      } catch (err: any) {
        console.error('Failed to delete scan from archive:', err);
        alert(`Failed to delete scan: ${err.response?.data?.detail || err.message}`);
      }
    }
  };
  const renderSliceImage = (
    scanId: string,
    sliceIndex: number,
    boundingBox?: [[number, number, number], [number, number, number]]
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      axios
        .get(`http://localhost:8000/api/scans/${scanId}/slices/${sliceIndex}`, {
          responseType: 'arraybuffer',
          headers,
        })
        .then((response) => {
          const floatArray = new Float32Array(response.data);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          const width = 512;
          const height = 512;
          canvas.width = width;
          canvas.height = height;

          const imgData = ctx.createImageData(width, height);
          const data = imgData.data;

          // Window Preset: LUNG (Width: 1500, Center: -600)
          const windowWidth = 1500;
          const windowCenter = -600;
          const minHU = windowCenter - windowWidth / 2;

          for (let i = 0; i < floatArray.length; i++) {
            const hu = floatArray[i] * 1400.0 - 1000.0;
            let intensity = 0;
            if (hu <= minHU) {
              intensity = 0;
            } else if (hu >= minHU + windowWidth) {
              intensity = 255;
            } else {
              intensity = Math.round(((hu - minHU) / windowWidth) * 255);
            }

            const pixelIdx = i * 4;
            data[pixelIdx] = intensity;
            data[pixelIdx + 1] = intensity;
            data[pixelIdx + 2] = intensity;
            data[pixelIdx + 3] = 255;
          }

          ctx.putImageData(imgData, 0, 0);

          // Draw AI Bounding Box overlay if provided
          if (boundingBox) {
            const [[z_min, y_min, x_min], [z_max, y_max, x_max]] = boundingBox;
            const noduleX = x_min;
            const noduleY = y_min;
            const noduleW = x_max - x_min;
            const noduleH = y_max - y_min;

            ctx.strokeStyle = '#00D2C4'; // Pulmo Cyan
            ctx.lineWidth = 3;
            ctx.fillStyle = 'rgba(0, 210, 196, 0.15)';
            ctx.strokeRect(noduleX, noduleY, noduleW, noduleH);
            ctx.fillRect(noduleX, noduleY, noduleW, noduleH);

            // Add label overlay
            ctx.fillStyle = '#00D2C4';
            ctx.font = 'bold 16px monospace';
            ctx.fillText('TARGET TUMOR', noduleX, noduleY - 8);
          }

          resolve(canvas.toDataURL('image/png'));
        })
        .catch((err) => {
          reject(err);
        });
    });
  };

  const renderMockSliceImage = (): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = lungCtScan;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 512;
        canvas.height = img.height || 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Overlay mock bounding box
          const noduleX = 260;
          const noduleY = 190;
          const noduleW = 48;
          const noduleH = 48;
          
          ctx.strokeStyle = '#00D2C4'; // Pulmo Cyan
          ctx.lineWidth = 3;
          ctx.fillStyle = 'rgba(0, 210, 196, 0.15)';
          ctx.strokeRect(noduleX, noduleY, noduleW, noduleH);
          ctx.fillRect(noduleX, noduleY, noduleW, noduleH);
          
          ctx.fillStyle = '#00D2C4';
          ctx.font = 'bold 16px monospace';
          ctx.fillText('TARGET TUMOR', noduleX, noduleY - 8);
        }
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        resolve(lungCtScan);
      };
    });
  };

  const printReportHTML = (
    patient: any,
    scanSpecs: any,
    findings: any[],
    status: string,
    log: string[]
  ) => {
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) {
      alert('Please allow popups to download/print the PDF report.');
      return;
    }

    let findingsHTML = '';
    if (findings.length === 0) {
      findingsHTML = `
        <div style="padding: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; font-style: italic; color: #64748b;">
          No suspicious pulmonary nodules were detected by the AI pipeline.
        </div>
      `;
    } else {
      findings.forEach((n, idx) => {
        findingsHTML += `
          <div style="margin-bottom: 25px; padding: 15px; border-left: 4px solid #00D2C4; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-radius: 0 6px 6px 0; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
              <div style="flex: 1;">
                <h4 style="margin: 0 0 10px 0; color: #0b141c; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Nodule Finding #${idx + 1}</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px;">
                  <tr>
                    <td style="padding: 4px 0; font-weight: bold; color: #475569; width: 130px;">Anatomical Lobe:</td>
                    <td style="padding: 4px 0; color: #0b141c;">${n.location || 'Unknown Lobe'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-weight: bold; color: #475569;">Voxel Coordinates:</td>
                    <td style="padding: 4px 0; color: #0b141c; font-family: monospace;">Slice ${n.centroid[0] + 1} (Y: ${Math.round(n.centroid[1])}, X: ${Math.round(n.centroid[2])})</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-weight: bold; color: #475569;">Max Axial Size:</td>
                    <td style="padding: 4px 0; color: #0b141c; font-weight: bold;">${n.size_mm.toFixed(1)} mm</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-weight: bold; color: #475569;">AI Confidence:</td>
                    <td style="padding: 4px 0; color: #0b141c;">${(n.confidence * 100).toFixed(1)}%</td>
                  </tr>
                  ${status === 'Signed' ? `
                  <tr>
                    <td style="padding: 4px 0; font-weight: bold; color: #475569;">Composition:</td>
                    <td style="padding: 4px 0; color: #0b141c;">${n.comp || 'Solid'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-weight: bold; color: #475569;">Margin Type:</td>
                    <td style="padding: 4px 0; color: #0b141c;">${n.margin || 'Smooth'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-weight: bold; color: #475569;">Lung-RADS Class:</td>
                    <td style="padding: 4px 0; color: #0f766e; font-weight: bold;">Category ${n.lungRads || 'N/A'}</td>
                  </tr>
                  ` : `
                  <tr>
                    <td style="padding: 4px 0; font-weight: bold; color: #475569;">Status:</td>
                    <td style="padding: 4px 0; color: #b45309; font-style: italic;">Draft (Report unsigned/pending final diagnostics)</td>
                  </tr>
                  `}
                </table>
                ${status === 'Signed' && n.notes ? `
                  <div style="margin-top: 10px; padding: 10px; background-color: #f1f5f9; border-radius: 4px; font-size: 11.5px; line-height: 1.4; color: #334155;">
                    <strong>Radiologist Notes:</strong><br/>
                    ${n.notes}
                  </div>
                ` : ''}
              </div>
              
              ${n.imageSrc ? `
              <div style="flex-shrink: 0; width: 180px; text-align: center;">
                <img src="${n.imageSrc}" style="width: 180px; height: 180px; border-radius: 4px; border: 1px solid #cbd5e1; background-color: #000;" />
                <div style="font-size: 9px; color: #64748b; margin-top: 4px; font-family: monospace;">Centroid Snapshot (Slice ${n.centroid[0] + 1})</div>
              </div>
              ` : ''}
            </div>
          </div>
        `;
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PneumoGuard AI Report - ${patient.name}</title>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0b141c;
            line-height: 1.5;
            margin: 0;
            padding: 30px;
            background-color: #ffffff;
            font-size: 13px;
          }
          @media print {
            body {
              padding: 0;
            }
            @page {
              margin: 20mm;
              size: A4;
            }
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border-bottom: 2px solid #00D2C4;
            padding-bottom: 15px;
          }
          .section-title {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #00D2C4;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-top: 25px;
            margin-bottom: 15px;
          }
          .info-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .info-grid td {
            padding: 6px 12px;
            vertical-align: top;
            border: 1px solid #e2e8f0;
          }
          .info-label {
            font-weight: bold;
            color: #475569;
            width: 25%;
            background-color: #f8fafc;
          }
          .info-value {
            width: 25%;
            color: #0b141c;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            font-weight: bold;
            font-size: 11px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .status-signed {
            background-color: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .status-draft {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="font-size: 24px; font-weight: bold; color: #00D2C4; letter-spacing: 0.5px;">PNEUMOGUARD AI</div>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">Clinical Diagnostic & Compliance Platform</div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <span class="status-badge ${status === 'Signed' ? 'status-signed' : 'status-draft'}">
                ${status === 'Signed' ? 'Signed & Locked' : 'Draft / Unsigned'}
              </span>
            </td>
          </tr>
        </table>

        <div class="section-title">Patient Demographics</div>
        <table class="info-grid">
          <tr>
            <td class="info-label">Patient Name</td>
            <td class="info-value" style="font-weight: bold;">${patient.name}</td>
            <td class="info-label">MRN / ID</td>
            <td class="info-value" style="font-family: monospace;">${patient.mrn}</td>
          </tr>
          <tr>
            <td class="info-label">Age / Gender</td>
            <td class="info-value">${patient.age || 'N/A'} Years / ${patient.gender || 'N/A'}</td>
            <td class="info-label">Pseudonym ID</td>
            <td class="info-value" style="font-family: monospace; font-size: 11px; word-break: break-all;">${patient.pseudonym || 'N/A'}</td>
          </tr>
          <tr>
            <td class="info-label">Study Date</td>
            <td class="info-value">${patient.studyDate}</td>
            <td class="info-label">Scan Modality</td>
            <td class="info-value">CT Chest w/o Contrast (Volumetric)</td>
          </tr>
        </table>

        <div class="section-title">Scan Acquisition Specifications</div>
        <table class="info-grid">
          <tr>
            <td class="info-label">Slice Count</td>
            <td class="info-value">${scanSpecs.sliceCount || 'N/A'} Slices</td>
            <td class="info-label">Slice Thickness</td>
            <td class="info-value">${scanSpecs.sliceThickness || 'N/A'}</td>
          </tr>
          <tr>
            <td class="info-label">Pixel Spacing</td>
            <td class="info-value" style="font-family: monospace; font-size: 11px;">${scanSpecs.pixelSpacing || 'N/A'}</td>
            <td class="info-label">Source System</td>
            <td class="info-value">PneumoGuard Ingestion Engine</td>
          </tr>
        </table>

        <div class="section-title">Diagnostic Findings & AI Telemetry</div>
        ${findingsHTML}

        <div class="section-title" style="margin-top: 30px;">Compliance & Audit Verification</div>
        <div style="background-color: #f1f5f9; padding: 10px 15px; border-radius: 4px; font-family: monospace; font-size: 11px; color: #475569; border: 1px solid #e2e8f0; line-height: 1.4;">
          ${log.map(line => `<div>${line}</div>`).join('')}
          <div>&gt; View Audit Level: VIEW_RESULT logged.</div>
          <div>&gt; Report generated securely on local node. Integrity verified.</div>
        </div>

        <div style="margin-top: 50px; page-break-inside: avoid;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 50%; padding-right: 40px; vertical-align: bottom;">
                <div style="border-bottom: 1px solid #94a3b8; height: 30px;"></div>
                <div style="font-size: 11px; color: #64748b; margin-top: 5px; text-transform: uppercase;">Reporting Radiologist Signature</div>
              </td>
              <td style="width: 50%; padding-left: 40px; vertical-align: bottom; text-align: right;">
                <div style="font-size: 11.5px; color: #0b141c;">Date Signed: ${status === 'Signed' ? patient.studyDate : '____________________'}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 5px; font-family: monospace;">PneumoGuard Certification Node: SECURE</div>
              </td>
            </tr>
          </table>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownloadReport = async (record: Record, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 1. Handle mock scans (numeric ID)
    if (typeof record.id === 'number') {
      try {
        const imageSrc = await renderMockSliceImage();
        
        const patient = {
          name: record.name,
          mrn: record.mrn.replace('MRN: ', ''),
          age: '62',
          gender: 'Male (M)',
          pseudonym: 'PATIENT_mock_5a8c9b3d',
          studyDate: record.date
        };

        const scanSpecs = {
          sliceCount: '243',
          sliceThickness: '1.25 mm',
          pixelSpacing: '[0.7031, 0.7031]'
        };

        const findings = [];
        if (record.findingType === 'Nodule') {
          findings.push({
            centroid: [120, 260, 190],
            location: 'Right Upper Lobe',
            size_mm: 12.4,
            confidence: 0.92,
            imageSrc: imageSrc,
            comp: 'Solid',
            margin: 'Spiculated',
            lungRads: '4A',
            notes: record.growthText
          });
        }

        printReportHTML(patient, scanSpecs, findings, record.status === 'Signed' || record.status === 'Archived' ? 'Signed' : 'Draft', record.log);
      } catch (err) {
        console.error(err);
        alert('Failed to generate mock PDF report.');
      }
      return;
    }

    // 2. Handle database scans (string ID)
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`http://localhost:8000/api/scans/${record.id}/metadata`, { headers });
      const metadata = response.data;
      
      const nodules = metadata.ai_result?.nodules || [];
      
      // Render images for all nodules sequentially
      const findings = [];
      for (const n of nodules) {
        let imageSrc = '';
        try {
          // Render slice image with bounding box details
          imageSrc = await renderSliceImage(record.id, n.centroid[0], n.bounding_box);
        } catch (imgErr) {
          console.error(`Error rendering slice for nodule ${n.nodule_id}:`, imgErr);
        }
        
        findings.push({
          ...n,
          imageSrc
        });
      }

      const patient = {
        name: metadata.patient_name || 'Anonymized Patient',
        mrn: record.mrn.replace('MRN: ', ''),
        age: metadata.age_at_scan || 'N/A',
        gender: metadata.biological_sex === 'M' ? 'Male (M)' : metadata.biological_sex === 'F' ? 'Female (F)' : 'Other (O)',
        pseudonym: metadata.patient_pseudonym || 'N/A',
        studyDate: metadata.study_date || 'N/A'
      };

      const scanSpecs = {
        sliceCount: metadata.slice_count || 'N/A',
        sliceThickness: metadata.slice_thickness ? `${metadata.slice_thickness.toFixed(2)} mm` : 'N/A',
        pixelSpacing: metadata.pixel_spacing ? `[${metadata.pixel_spacing.map((s: number) => s.toFixed(4)).join(', ')}]` : 'N/A'
      };

      printReportHTML(patient, scanSpecs, findings, metadata.status === 'signed' ? 'Signed' : 'Draft', record.log);
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Failed to generate and download structured PDF report. Please try again.');
    }
  };

  const handleFinalizeReport = () => {
    if (selectedRecord) {
      const isRealScan = typeof selectedRecord.id === 'string';
      navigate('/reports', { 
        state: { 
          patientName: selectedRecord.name, 
          mrn: selectedRecord.mrn.replace('MRN: ', 'MRN-'),
          scanId: isRealScan ? selectedRecord.id : undefined 
        } 
      });
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-[#0B0E14] text-on-background antialiased font-body-md overflow-hidden">
      {/* Full Width TopNavBar */}
      <header className="h-16 bg-surface-dim/80 backdrop-blur-md border-b border-[#30363D] flex justify-between items-center px-4 fixed top-0 left-0 w-full z-40">
        <div className="flex items-center space-x-3">
          <span className="material-symbols-outlined text-primary text-2xl">pulmonology</span>
          <span className="text-title-sm font-title-sm font-bold text-primary tracking-widest uppercase">
            PneumoGuard AI
          </span>
          <div className="h-4 w-px bg-[#30363D] mx-2"></div>
          <div className="flex gap-4 items-center">
            <span className="text-on-surface-variant font-mono-data text-body-sm">ARCHIVE VIEW</span>
            <span className="text-on-surface-variant font-mono-data text-body-sm opacity-40">•</span>
            <span className="text-on-surface-variant font-mono-data text-body-sm">
              TOTAL RECORDS: {allRecords.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            className="text-on-surface-variant hover:text-primary-fixed transition-colors cursor-pointer p-2 flex items-center justify-center bg-transparent border-none"
            onClick={() => alert('PACS Gateway is healthy. Synchronized with core storage.')}
          >
            <span className="material-symbols-outlined">notifications_active</span>
          </button>
          <button 
            className="text-on-surface-variant hover:text-primary-fixed transition-colors cursor-pointer p-2 flex items-center justify-center bg-transparent border-none"
            onClick={() => navigate('/')}
          >
            <span className="material-symbols-outlined">lock_open</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* Sidebar Navigation */}
        <Sidebar activeTab="archive" />

        {/* Main Content Area */}
        <main className="ml-sidebar-width flex-1 p-6 h-[calc(100vh-4rem)] flex flex-col gap-6 overflow-hidden">
          {/* Header & Global Search */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-display-lg font-display-lg text-on-surface">Study Archive</h1>
              <p className="text-body-md font-body-md text-on-surface-variant">Historical PACS records and AI telemetry</p>
            </div>
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="w-full bg-surface-container border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="Search Patient Name, MRN, or Accession..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </section>

          {/* Advanced Filter Bar */}
          <section className="glass-panel p-panel-padding rounded-xl flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface-variant uppercase">Date Range</label>
              <select
                className="bg-surface-container-highest border-none rounded-lg text-body-sm px-3 py-1.5 focus:ring-2 focus:ring-primary outline-none min-w-[140px]"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option>Last 30 Days</option>
                <option>Last 6 Months</option>
                <option>Year to Date</option>
                <option>Custom Range</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface-variant uppercase">Modality</label>
              <div className="flex gap-1">
                <button
                  className={`px-3 py-1.5 rounded-lg text-label-caps font-bold transition-all ${
                    modality === 'ALL'
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                  }`}
                  onClick={() => setModality('ALL')}
                >
                  ALL
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-label-caps font-bold transition-all ${
                    modality === 'CT'
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                  }`}
                  onClick={() => setModality('CT')}
                >
                  CT
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-label-caps font-bold transition-all ${
                    modality === 'XR'
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                  }`}
                  onClick={() => setModality('XR')}
                >
                  XR
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-label-caps font-bold transition-all ${
                    modality === 'MR'
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                  }`}
                  onClick={() => setModality('MR')}
                >
                  MR
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface-variant uppercase">AI Finding</label>
              <select
                className="bg-surface-container-highest border-none rounded-lg text-body-sm px-3 py-1.5 focus:ring-2 focus:ring-primary outline-none min-w-[140px]"
                value={findingType}
                onChange={(e) => setFindingType(e.target.value)}
              >
                <option>All Findings</option>
                <option>Nodule</option>
                <option>Clear</option>
                <option>Suspicious</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface-variant uppercase">Status</label>
              <select
                className="bg-surface-container-highest border-none rounded-lg text-body-sm px-3 py-1.5 focus:ring-2 focus:ring-primary outline-none min-w-[140px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="Archived">Archived</option>
                <option value="Flagged">Flagged</option>
                <option value="Signed">Signed</option>
              </select>
            </div>
            <button
              className="mt-auto px-4 py-2 hover:bg-surface-bright border border-outline-variant rounded-lg text-body-sm font-bold flex items-center gap-1.5 text-on-surface-variant cursor-pointer ml-auto"
              onClick={handleResetFilters}
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              Reset Filters
            </button>
          </section>

          {/* Records Table */}
          <section className="flex-1 bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col overflow-hidden shadow-sm">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-caps font-label-caps text-on-surface-variant text-[11px] uppercase tracking-wider bg-surface-container-low sticky top-0 z-10">
                    <th className="p-4">Date / Time</th>
                    <th className="p-4">Patient & MRN</th>
                    <th className="p-4">Study Description</th>
                    <th className="p-4">Modality</th>
                    <th className="p-4">AI Summary</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td className="p-8 text-center text-on-surface-variant italic font-body-md" colSpan={7}>
                        No records match the active search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        className={`hover:bg-surface-variant/40 transition-colors cursor-pointer ${
                          selectedRecordId === record.id ? 'bg-[#00D2C4]/5 border-l-2 border-[#00D2C4]' : ''
                        }`}
                        onClick={() => handleRowClick(record)}
                      >
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-on-surface font-bold">{record.date}</span>
                            <span className="text-body-sm text-on-surface-variant opacity-60">{record.time}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-on-surface font-bold">{record.name}</span>
                            <span className="text-body-sm text-primary font-mono">{record.mrn}</span>
                          </div>
                        </td>
                        <td className="p-4 text-on-surface-variant">{record.desc}</td>
                        <td className="p-4">
                          <span className="bg-surface-container-highest px-2 py-0.5 rounded text-[10px] font-bold border border-outline-variant">
                            {record.modality}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 ${
                                record.findingType === 'Nodule'
                                  ? 'bg-error-container/20 text-error border border-error/30'
                                  : record.findingType === 'Suspicious'
                                  ? 'bg-tertiary-container/10 text-tertiary border border-tertiary/30'
                                  : 'bg-primary/10 text-primary border border-primary/30'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  record.findingType === 'Nodule'
                                    ? 'bg-error animate-pulse'
                                    : record.findingType === 'Suspicious'
                                    ? 'bg-tertiary'
                                    : 'bg-primary'
                                }`}
                              ></span>
                              {record.finding}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-on-surface-variant flex items-center gap-1.5">
                            <span
                              className={`material-symbols-outlined text-[16px] ${
                                record.status === 'Flagged' ? 'text-error' : record.status === 'Signed' ? 'text-[#47EFE0]' : 'text-primary'
                              }`}
                            >
                              {record.status === 'Flagged' ? 'flag' : record.status === 'Signed' ? 'check_circle' : 'inventory_2'}
                            </span>
                            {record.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              className="p-2 hover:bg-primary-container/20 rounded-lg text-primary transition-colors cursor-pointer"
                              title="Quick View"
                              onClick={(e) => handleQuickView(record, e)}
                            >
                              <span className="material-symbols-outlined">visibility</span>
                            </button>
                            <button
                              className="p-2 hover:bg-error/10 rounded-lg text-error transition-colors cursor-pointer"
                              title="Delete Record"
                              onClick={(e) => handleDeleteRecord(record, e)}
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                            <button
                              className="p-2 hover:bg-primary-container/20 rounded-lg text-primary transition-colors cursor-pointer"
                              title="Download Report"
                              onClick={(e) => handleDownloadReport(record, e)}
                            >
                              <span className="material-symbols-outlined">download</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <footer className="bg-surface-container border-t border-outline-variant p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-body-sm text-on-surface-variant font-mono-data">
                Showing <span className="text-on-surface font-bold">1 - {filteredRecords.length}</span> of{' '}
                <span className="text-on-surface font-bold">{filteredRecords.length}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded text-on-surface-variant disabled:opacity-30 disabled:cursor-not-allowed" disabled>
                  <span className="material-symbols-outlined text-[20px]">first_page</span>
                </button>
                <button className="p-1.5 rounded text-on-surface-variant disabled:opacity-30 disabled:cursor-not-allowed" disabled>
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <div className="flex gap-1">
                  <button className="w-8 h-8 rounded flex items-center justify-center bg-primary text-on-primary font-bold text-body-sm">
                    1
                  </button>
                </div>
                <button className="p-1.5 rounded text-on-surface-variant disabled:opacity-30 disabled:cursor-not-allowed" disabled>
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
                <button className="p-1.5 rounded text-on-surface-variant disabled:opacity-30 disabled:cursor-not-allowed" disabled>
                  <span className="material-symbols-outlined text-[20px]">last_page</span>
                </button>
              </div>
              <div className="flex items-center gap-2 text-body-sm">
                <span className="text-on-surface-variant">Rows per page:</span>
                <select className="bg-transparent border-none focus:ring-0 text-on-surface font-bold cursor-pointer">
                  <option value="5">5</option>
                  <option value="10">10</option>
                </select>
              </div>
            </footer>
          </section>
        </main>

        {/* Contextual AI Insights Drawer (Hidden by Default, toggleable) */}
        <div
          className={`fixed right-0 top-16 h-[calc(100%-4rem)] w-80 bg-surface-container-high/90 backdrop-blur-2xl border-l border-outline-variant shadow-2xl transition-transform duration-300 z-30 ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          id="aiDrawer"
        >
          <div className="flex flex-col p-panel-padding h-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-title-sm font-title-sm text-primary">Clinical Context</h2>
                <p className="text-body-sm font-body-sm text-on-surface-variant">PACS-Integrated Reporting</p>
              </div>
              <button 
                className="text-on-surface-variant hover:text-primary cursor-pointer flex items-center justify-center" 
                onClick={() => setDrawerOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {selectedRecord ? (
              <div className="flex-1 space-y-6">
                <div className="space-y-3">
                  <h3 className="text-label-caps font-label-caps text-on-surface-variant uppercase">Patient Info</h3>
                  <div className="bg-surface-container-highest/30 p-3 rounded-lg border border-outline-variant/30 text-body-sm">
                    <div className="font-bold text-on-surface">{selectedRecord.name}</div>
                    <div className="text-primary font-mono text-xs">{selectedRecord.mrn}</div>
                    <div className="text-on-surface-variant mt-1">{selectedRecord.desc}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-label-caps font-label-caps text-on-surface-variant uppercase">AI Insights</h3>
                  <div className="bg-surface-container-highest/50 p-3 rounded-lg border border-outline-variant">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <span className="material-symbols-outlined text-[20px]">psychology</span>
                      <span className="text-body-md font-bold">Predictive Analysis</span>
                    </div>
                    <p className="text-body-sm text-on-surface-variant leading-relaxed">
                      {selectedRecord.growthText}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-label-caps font-label-caps text-on-surface-variant uppercase">System Logs</h3>
                  <div className="font-mono-data text-[11px] bg-black/40 p-3 rounded-lg text-primary-fixed-dim/80 space-y-1">
                    {selectedRecord.log.map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-on-surface-variant italic text-body-sm">
                Select a study record to view clinical AI insights.
              </div>
            )}

            <button
              className="mt-auto w-full bg-primary text-on-primary font-bold py-3 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              disabled={!selectedRecord}
              onClick={handleFinalizeReport}
            >
              <span className="material-symbols-outlined">
                {selectedRecord?.status === 'Signed' ? 'article' : 'edit_note'}
              </span>
              {selectedRecord?.status === 'Signed' ? 'View / Edit Report' : 'Finalize Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
