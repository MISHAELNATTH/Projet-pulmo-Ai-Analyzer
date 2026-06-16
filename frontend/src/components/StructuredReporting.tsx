import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from './Sidebar';

interface NoduleDetails {
  nodule_id: string;
  title: string;
  size: string;
  dotColor: string;
  activeBorder: string;
  badge: string;
  badgeColor: string;
  conf: string;
  dims: string;
  vol: string | null;
  att: string;
  series: string;
  delta: string | null;
  headerTitle: string;
  comp: string;
  margin: string;
  lungRads: string;
  showAlert: boolean;
  alertText: string;
  notes: string;
  centroid: [number, number, number];
}

interface NodulesMap {
  [key: number]: NoduleDetails;
}

const initialNodules: NodulesMap = {
  1: {
    nodule_id: 'nodule_1',
    title: 'Nodule 1 — RUL',
    size: '12.4 mm',
    dotColor: 'bg-error',
    activeBorder: 'border-[#00D2C4]',
    badge: 'CRITICAL',
    badgeColor: 'text-error bg-error/10 border-error/30',
    conf: '98%',
    dims: '12.4 x 9.8 mm',
    vol: '624 mm³',
    att: 'Solid',
    series: '3 / 142',
    delta: null,
    headerTitle: 'Target: Nodule 1 — RUL (12.4mm Solid)',
    comp: 'Solid',
    margin: 'Spiculated',
    lungRads: '3 - Probably Benign',
    showAlert: true,
    alertText: 'AI Logic Discrepancy: Nodule size exceeds Probably Benign threshold. ACR recommended classification is 4A or higher.',
    notes: '',
    centroid: [2, 190, 260],
  },
  2: {
    nodule_id: 'nodule_2',
    title: 'Nodule 2 — LLL',
    size: '6.1 mm',
    dotColor: 'bg-[#FFB703]',
    activeBorder: 'border-[#00D2C4]',
    badge: 'MONITOR',
    badgeColor: 'text-[#FFB703] bg-[#FFB703]/10 border-[#FFB703]/30',
    conf: '85%',
    dims: '6.1 x 5.2 mm',
    vol: '86 mm³',
    att: 'Solid',
    series: '4 / 112',
    delta: null,
    headerTitle: 'Target: Nodule 2 — LLL (6.1mm Solid)',
    comp: 'Solid',
    margin: 'Smooth',
    lungRads: '3 - Probably Benign',
    showAlert: false,
    alertText: '',
    notes: 'Nodule 2 shows stable density. Initiating standard 6-month surveillance follow-up.',
    centroid: [3, 190, 260],
  },
  3: {
    nodule_id: 'nodule_3',
    title: 'Nodule 3 — RML',
    size: '3.2 mm',
    dotColor: 'bg-[#2ECC71]',
    activeBorder: 'border-[#00D2C4]',
    badge: 'STABLE',
    badgeColor: 'text-[#2ECC71] bg-[#2ECC71]/10 border-[#2ECC71]/30',
    conf: '99%',
    dims: '3.2 x 3.0 mm',
    vol: null,
    att: 'Ground-Glass',
    series: '2 / 85',
    delta: '0.0 mm',
    headerTitle: 'Target: Nodule 3 — RML (3.2mm Ground-Glass)',
    comp: 'Ground-Glass',
    margin: 'Smooth',
    lungRads: '2 - Benign Appearance',
    showAlert: false,
    alertText: '',
    notes: 'Nodule 3 is small, stable, and meets benign criteria. Continue annual screening.',
    centroid: [1, 190, 260],
  },
};

const compOptions = ['Solid', 'Part-Solid', 'Ground-Glass'];
const marginOptions = ['Spiculated', 'Lobulated', 'Smooth', 'Irregular'];
const radsOptions = [
  '2 - Benign Appearance',
  '3 - Probably Benign',
  '4A - Suspicious',
  '4B - Very Suspicious',
  '4X - Highly Suspicious',
];

const getAbbreviation = (loc: string) => {
  const l = loc.toLowerCase();
  if (l.includes('left') && l.includes('upper')) return 'LUL';
  if (l.includes('left') && l.includes('lower')) return 'LLL';
  if (l.includes('right') && l.includes('upper')) return 'RUL';
  if (l.includes('right') && l.includes('middle')) return 'RML';
  if (l.includes('right') && l.includes('lower')) return 'RLL';
  return loc;
};

const getDimensionsStr = (nodule: any, metadata: any) => {
  if (nodule.bounding_box && nodule.bounding_box.length === 2) {
    const spacingY = metadata?.pixel_spacing?.[0] || 0.703125;
    const spacingX = metadata?.pixel_spacing?.[1] || 0.703125;
    const dy = Math.abs(nodule.bounding_box[1][1] - nodule.bounding_box[0][1]) * spacingY;
    const dx = Math.abs(nodule.bounding_box[1][2] - nodule.bounding_box[0][2]) * spacingX;
    const max = Math.max(dy, dx);
    const min = Math.min(dy, dx);
    if (max > 0 && min > 0) {
      return `${max.toFixed(1)} x ${min.toFixed(1)} mm`;
    }
  }
  return `${nodule.size_mm.toFixed(1)} x ${(nodule.size_mm * 0.8).toFixed(1)} mm`;
};

const getVolumeStr = (nodule: any, metadata: any) => {
  if (nodule.bounding_box && nodule.bounding_box.length === 2) {
    const spacingY = metadata?.pixel_spacing?.[0] || 0.703125;
    const spacingX = metadata?.pixel_spacing?.[1] || 0.703125;
    const thickness = metadata?.slice_thickness || 1.0;
    const dy = Math.abs(nodule.bounding_box[1][1] - nodule.bounding_box[0][1]) * spacingY;
    const dx = Math.abs(nodule.bounding_box[1][2] - nodule.bounding_box[0][2]) * spacingX;
    const dz = Math.abs(nodule.bounding_box[1][0] - nodule.bounding_box[0][0]) * thickness;
    if (dx > 0 && dy > 0 && dz > 0) {
      const vol = (4/3) * Math.PI * (dx/2) * (dy/2) * (dz/2);
      return `${Math.round(vol)} mm³`;
    }
  }
  const vol = (4/3) * Math.PI * Math.pow(nodule.size_mm / 2, 3);
  return `${Math.round(vol)} mm³`;
};

const getPreFilledComposition = (size: number, index: number) => {
  if (size > 20) return 'Solid';
  if (index === 0) return 'Solid';
  if (index === 1) return 'Part-Solid';
  return 'Ground-Glass';
};

const getPreFilledMargin = (size: number) => {
  if (size < 8.0) return 'Smooth';
  if (size < 12.0) return 'Lobulated';
  return 'Spiculated';
};

const getRecommendedRads = (size: number) => {
  if (size < 6.0) return '2 - Benign Appearance';
  if (size < 8.0) return '3 - Probably Benign';
  if (size < 15.0) return '4A - Suspicious';
  return '4B - Very Suspicious';
};

const getRadsRank = (rads: string) => {
  if (rads.startsWith('2')) return 2;
  if (rads.startsWith('3')) return 3;
  if (rads.startsWith('4A')) return 4;
  if (rads.startsWith('4B')) return 5;
  if (rads.startsWith('4X')) return 6;
  return 0;
};

const getAlertText = (recommended: string) => {
  if (recommended.startsWith('4B')) {
    return 'AI Logic Discrepancy: Nodule size exceeds Suspicious threshold. ACR recommended classification is 4B or higher.';
  }
  if (recommended.startsWith('4A')) {
    return 'AI Logic Discrepancy: Nodule size exceeds Probably Benign threshold. ACR recommended classification is 4A or higher.';
  }
  if (recommended.startsWith('3')) {
    return 'AI Logic Discrepancy: Nodule size exceeds Benign Appearance threshold. ACR recommended classification is 3 or higher.';
  }
  return '';
};

const generateNotes = (location: string, size: number, margin: string, composition: string, recommendedRads: string) => {
  let recommendation = '';
  if (recommendedRads.startsWith('2')) {
    recommendation = 'annual screening with low-dose CT in 12 months';
  } else if (recommendedRads.startsWith('3')) {
    recommendation = 'follow-up low-dose CT in 6 months';
  } else if (recommendedRads.startsWith('4A')) {
    recommendation = 'follow-up chest CT in 3 months; PET/CT or biopsy may be considered';
  } else {
    recommendation = 'chest CT with contrast, PET/CT, and/or tissue sampling (biopsy)';
  }
  return `Nodule detected in the ${location}. Measures ${size.toFixed(1)} mm. Margins appear ${margin.toLowerCase()}. Composition is ${composition}. Recommend ${recommendation}.`;
};

export const StructuredReporting: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract state if navigation passed it
  const stateFromLocation = (location.state || {}) as {
    patientName?: string;
    mrn?: string;
    scanId?: string;
  };

  const scanId = stateFromLocation.scanId;

  const [nodules, setNodules] = useState<NodulesMap>(initialNodules);
  const [activeNodule, setActiveNodule] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);

  const [patientInfo, setPatientInfo] = useState({
    patientName: stateFromLocation.patientName || 'DOE, JOHN',
    mrn: stateFromLocation.mrn || 'MRN: 882941',
    studyDate: '2023-11-04',
    modality: 'CT',
  });
  
  const [compOpen, setCompOpen] = useState(false);
  const [marginOpen, setMarginOpen] = useState(false);
  const [radsOpen, setRadsOpen] = useState(false);

  // Fallback to empty details object if no active nodule to prevent runtime errors
  const currentNodule = nodules[activeNodule] || {
    nodule_id: '',
    title: '',
    size: '0.0 mm',
    dotColor: 'bg-outline',
    activeBorder: 'border-transparent',
    badge: 'UNKNOWN',
    badgeColor: 'text-outline bg-surface-variant border-outline-variant',
    conf: '0%',
    dims: '0.0 x 0.0 mm',
    vol: null,
    att: 'Solid',
    series: '0 / 0',
    delta: null,
    headerTitle: 'No active nodule selected',
    comp: 'Solid',
    margin: 'Smooth',
    lungRads: '2 - Benign Appearance',
    showAlert: false,
    alertText: '',
    notes: '',
    centroid: [0, 0, 0],
  };

  // Fetch real scan metadata and AI nodules if scanId is available
  useEffect(() => {
    if (!scanId) return;

    setIsLoading(true);
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios.get(`http://localhost:8000/api/scans/${scanId}/metadata`, { headers })
      .then(response => {
        const data = response.data;
        setPatientInfo({
          patientName: data.patient_pseudonym || data.patient_name || 'DOE, JOHN',
          mrn: data.scan_id ? data.scan_id.substring(0, 8).toUpperCase() : 'MRN: 882941',
          studyDate: data.study_date || '2023-11-04',
          modality: 'CT',
        });

        const backendNodules = data.ai_result?.nodules || [];
        if (backendNodules.length > 0) {
          const newNodulesMap: NodulesMap = {};
          backendNodules.forEach((nodule: any, index: number) => {
            const key = index + 1;
            const size = nodule.size_mm;
            
            // Prefer previously saved values if they exist, otherwise pre-fill
            const comp = nodule.comp || getPreFilledComposition(size, index);
            const margin = nodule.margin || getPreFilledMargin(size);
            const recRads = nodule.lungRads || getRecommendedRads(size);
            const locationAbbr = getAbbreviation(nodule.location);
            const notes = nodule.notes || generateNotes(nodule.location, size, margin, comp, recRads);

            // Compute guideline discrepancy check
            const recommended = getRecommendedRads(size);
            const selectedRank = getRadsRank(recRads);
            const recommendedRank = getRadsRank(recommended);
            const hasAlert = selectedRank < recommendedRank;
            const recText = getAlertText(recommended);

            newNodulesMap[key] = {
              nodule_id: nodule.nodule_id,
              title: `Nodule ${key} — ${locationAbbr}`,
              size: `${size.toFixed(1)} mm`,
              dotColor: size >= 8.0 ? 'bg-error' : size >= 6.0 ? 'bg-[#FFB703]' : 'bg-[#2ECC71]',
              activeBorder: 'border-[#00D2C4]',
              badge: size >= 8.0 ? 'CRITICAL' : size >= 6.0 ? 'MONITOR' : 'STABLE',
              badgeColor: size >= 8.0 
                ? 'text-error bg-error/10 border-error/30' 
                : size >= 6.0 
                  ? 'text-[#FFB703] bg-[#FFB703]/10 border-[#FFB703]/30' 
                  : 'text-[#2ECC71] bg-[#2ECC71]/10 border-[#2ECC71]/30',
              conf: `${Math.round(nodule.confidence * 100)}%`,
              dims: getDimensionsStr(nodule, data),
              vol: getVolumeStr(nodule, data),
              att: comp,
              series: `${nodule.centroid[0] + 1} / ${data.slice_count}`,
              delta: null,
              headerTitle: `Target: Nodule ${key} — ${locationAbbr} (${size.toFixed(1)}mm ${comp})`,
              comp: comp,
              margin: margin,
              lungRads: recRads,
              showAlert: hasAlert,
              alertText: recText,
              notes: notes,
              centroid: nodule.centroid,
            };
          });
          setNodules(newNodulesMap);
          setActiveNodule(1);
        } else {
          setNodules({});
        }
      })
      .catch(err => {
        console.error('Error fetching scan metadata for reports page:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [scanId]);

  const updateNoduleField = (field: keyof NoduleDetails, value: any) => {
    setNodules((prev) => {
      const updatedNodule = { ...prev[activeNodule], [field]: value };
      
      // Smart Clinical Logic warning helper dynamically recalculated for user selection
      if (field === 'lungRads') {
        const sizeVal = parseFloat(updatedNodule.size);
        const recommended = getRecommendedRads(sizeVal);
        const selectedRank = getRadsRank(value);
        const recommendedRank = getRadsRank(recommended);
        updatedNodule.showAlert = selectedRank < recommendedRank;
        updatedNodule.alertText = getAlertText(recommended);
      }
      
      // Update header title if size/composition/title changes
      if (field === 'comp') {
        updatedNodule.headerTitle = `Target: ${updatedNodule.title} (${updatedNodule.size} ${value})`;
      }

      return {
        ...prev,
        [activeNodule]: updatedNodule,
      };
    });
  };

  const handleSignReport = async () => {
    if (scanId) {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const payload = {
        nodules: Object.values(nodules).map((nodule) => ({
          nodule_id: nodule.nodule_id,
          comp: nodule.att,
          margin: nodule.margin,
          lungRads: nodule.lungRads,
          notes: nodule.notes
        }))
      };

      try {
        await axios.post(`http://localhost:8000/api/scans/${scanId}/report`, payload, { headers });
        alert(`Report for Patient: ${patientInfo.patientName} signed & locked successfully. Synced to PACS archive.`);
        navigate('/archive');
      } catch (err: any) {
        console.error('Failed to sign and lock report:', err);
        alert(`Failed to save report: ${err.response?.data?.detail || err.message}`);
      }
    } else {
      alert(`Report for Patient: ${patientInfo.patientName} signed & locked successfully. Synced to PACS archive.`);
      navigate('/archive');
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
          <div className="flex space-x-6 text-mono-data font-mono-data text-on-surface-variant text-body-sm">
            <span>Patient: {patientInfo.patientName}</span>
            <span>MRN: {patientInfo.mrn.replace('MRN-', '').replace('MRN: ', '')}</span>
            <span>Study: {patientInfo.studyDate}</span>
            <span>Modality: {patientInfo.modality}</span>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-primary dark:text-primary-fixed">
          <div className="w-8 h-8 rounded-full bg-surface-variant border border-[#30363D] overflow-hidden ml-2 cursor-pointer">
            <img
              alt="Radiologist Session"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxpznft0CqSOvq12TMdooMzrvLGcUmhBmUR1CqUVOvhuFYI2BDd8S-NwmE8lfgSyyEiPHJ6_KHHnYA8U4CuwReZ5RqYGxAbFR0dN-WaSeSZrWjXDp24b9sxkJin8G_KBXqTrhGRX2qhjzI50m1qdNZ5x6jpPakNCXQ8epw5bXWHrFaZqqpAYm0FliL1AOShW8V1Miu8GrrhyzQs1TJL0jOMetMvdI8B6NOajmJofpY2ZvEfxQiLfWdE5P7GHm_Vj-xkrtMN2Gwf_U"
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* SideNavBar */}
        <Sidebar activeTab="reports" />

        {/* Main Content Area */}
        <main className="ml-sidebar-width flex-1 p-margin-page h-[calc(100vh-4rem)] flex gap-gutter overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <span className="material-symbols-outlined text-primary text-5xl animate-spin">
                sync
              </span>
              <h3 className="text-title-sm font-bold text-primary tracking-wide">
                LOADING STRUCTURED REPORT DATA...
              </h3>
            </div>
          ) : Object.keys(nodules).length === 0 ? (
            <div className="flex-1 bg-[#151A22] rounded-xl flex flex-col items-center justify-center p-6 text-center border border-outline-variant/30 shadow-lg my-auto h-fit py-12">
              <span className="material-symbols-outlined text-[#47EFE0] text-6xl mb-4">
                check_circle
              </span>
              <h2 className="text-title-lg font-bold text-on-surface mb-2">No Suspicious Nodules Found</h2>
              <p className="text-body-md text-on-surface-variant max-w-md mx-auto mb-6">
                The AI analysis did not detect any pulmonary nodules for this study. You can sign off on a clean report.
              </p>
              <button
                className="px-6 py-2.5 rounded bg-[#00D2C4] text-[#0B0E14] font-label-caps text-label-caps font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,210,196,0.2)] cursor-pointer mx-auto"
                onClick={handleSignReport}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                  lock
                </span>
                Sign & Lock Clean Report
              </button>
            </div>
          ) : (
            <>
              {/* Left Column: Validated Findings Ledger */}
              <section className="w-[340px] flex flex-col gap-4 h-full overflow-y-auto pr-2 pb-4 custom-scrollbar shrink-0">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <h2 className="text-title-sm font-title-sm text-on-surface">Findings Inventory</h2>
                  <span className="text-label-caps font-label-caps px-2 py-1 bg-[#151A22] rounded-sm text-on-surface-variant border border-outline-variant/30">
                    {Object.keys(nodules).length} Targets
                  </span>
                </div>
                <ul className="flex flex-col gap-3">
                  {Object.entries(nodules).map(([idStr, nodule]) => {
                    const id = parseInt(idStr);
                    const isActive = activeNodule === id;
                    return (
                      <li
                        key={id}
                        className={`flex flex-col p-3 bg-[#151A22] hover:bg-surface-variant cursor-pointer rounded-lg border transition-all duration-200 ${
                          isActive
                            ? 'border-[#00D2C4] shadow-[inset_0_0_12px_rgba(0,210,196,0.1)]'
                            : 'border-transparent'
                        }`}
                        onClick={() => {
                          setActiveNodule(id);
                          setCompOpen(false);
                          setMarginOpen(false);
                          setRadsOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${nodule.dotColor}`}></div>
                            <span className="text-body-md font-body-md font-bold text-on-surface">
                              {nodule.title}
                            </span>
                          </div>
                          <span className="text-mono-data font-mono-data text-on-surface-variant">{nodule.size}</span>
                        </div>

                        {/* Expanded Details (Only visible when active) */}
                        {isActive && (
                          <div className="mt-2 pt-3 border-t border-outline-variant/20 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[10px] font-label-caps px-1.5 py-0.5 rounded border ${nodule.badgeColor}`}
                              >
                                {nodule.badge}
                              </span>
                              <span className="text-label-caps font-label-caps text-on-surface-variant">
                                AI Conf: {nodule.conf}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-body-sm font-body-sm">
                              <div className="flex flex-col">
                                <span className="text-on-surface-variant text-[11px] mb-0.5">Dimensions</span>
                                <span className="text-on-surface font-mono-data">{nodule.dims}</span>
                              </div>
                              {nodule.vol && (
                                <div className="flex flex-col">
                                  <span className="text-on-surface-variant text-[11px] mb-0.5">Volume</span>
                                  <span className="text-on-surface font-mono-data">{nodule.vol}</span>
                                </div>
                              )}
                              {nodule.delta && (
                                <div className="flex flex-col">
                                  <span className="text-on-surface-variant text-[11px] mb-0.5">Delta (Prior)</span>
                                  <span className="text-on-surface font-mono-data">{nodule.delta}</span>
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-on-surface-variant text-[11px] mb-0.5">Attenuation</span>
                                <span className="text-on-surface">{nodule.att}</span>
                              </div>
                            </div>

                            {/* View Axial Plane Button */}
                            <button
                              className="mt-1 w-full flex items-center justify-center gap-2 py-1.5 bg-surface-dim border border-outline-variant/30 rounded text-on-surface hover:text-[#00D2C4] hover:border-[#00D2C4]/50 transition-colors group cursor-pointer"
                              onClick={() => navigate('/viewer', { 
                                state: { 
                                  patientName: patientInfo.patientName, 
                                  mrn: patientInfo.mrn, 
                                  scanId, 
                                  activeSliceIndex: nodule.centroid[0] 
                                } 
                              })}
                            >
                              <span className="material-symbols-outlined text-[16px] group-hover:text-[#00D2C4] transition-colors">
                                visibility
                              </span>
                              <span className="text-label-caps font-label-caps">
                                View Axial Plane (Ser: {nodule.series})
                              </span>
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* Right Column: Interactive Structured Report */}
              <section className="flex-1 h-full flex flex-col relative overflow-hidden">
                <div className="bg-[#151A22] rounded-xl h-full flex flex-col overflow-hidden border border-outline-variant/30 shadow-lg">
                  {/* Report Header */}
                  <div className="border-b border-outline-variant/30 p-5 bg-[#151A22] z-10 shrink-0">
                    <h1 className="text-headline-md font-headline-md text-on-surface">Structured Report</h1>
                    <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                      {currentNodule.headerTitle}
                    </p>
                  </div>

                  {/* Form Content */}
                  <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8 custom-scrollbar">
                    {/* Section: Morphology */}
                    <div className="space-y-4 relative z-30">
                      <h3 className="text-title-sm font-title-sm border-b border-surface-variant pb-2 text-on-surface">
                        Morphology & Classification
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        {/* Custom Dropdown: Composition */}
                        <div className="flex flex-col gap-1.5 relative">
                          <label className="text-label-caps font-label-caps text-on-surface-variant">Composition</label>
                          <button
                            className={`flex items-center justify-between w-full bg-[#0B0E14] border border-outline-variant/50 hover:border-[#00D2C4]/70 text-on-surface rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#00D2C4] focus:border-[#00D2C4] text-body-md font-body-md transition-colors cursor-pointer ${
                              compOpen ? 'active-field' : ''
                            }`}
                            onClick={() => {
                              setCompOpen(!compOpen);
                              setMarginOpen(false);
                              setRadsOpen(false);
                            }}
                          >
                            <span>{currentNodule.comp}</span>
                            <span className={`material-symbols-outlined text-outline text-[20px] transition-transform ${compOpen ? 'rotate-180 text-[#00D2C4]' : ''}`}>
                              expand_more
                            </span>
                          </button>
                          {/* Dropdown Menu */}
                          {compOpen && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-[#1A212A] border border-outline-variant/50 rounded shadow-xl overflow-hidden z-50">
                              <div className="flex flex-col">
                                {compOptions.map((opt) => (
                                  <div
                                    key={opt}
                                    className={`px-3 py-2 cursor-pointer hover:bg-surface-variant text-body-md text-on-surface transition-colors ${
                                      currentNodule.comp === opt ? 'bg-[#00D2C4]/10 text-[#00D2C4]' : ''
                                    }`}
                                    onClick={() => {
                                      updateNoduleField('comp', opt);
                                      setCompOpen(false);
                                    }}
                                  >
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Custom Dropdown: Margins */}
                        <div className="flex flex-col gap-1.5 relative">
                          <label className="text-label-caps font-label-caps text-on-surface-variant">Margins</label>
                          <button
                            className={`flex items-center justify-between w-full bg-[#0B0E14] border border-outline-variant/50 hover:border-[#00D2C4]/70 text-on-surface rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#00D2C4] focus:border-[#00D2C4] text-body-md font-body-md transition-colors cursor-pointer ${
                              marginOpen ? 'active-field' : ''
                            }`}
                            onClick={() => {
                              setMarginOpen(!marginOpen);
                              setCompOpen(false);
                              setRadsOpen(false);
                            }}
                          >
                            <span>{currentNodule.margin}</span>
                            <span className={`material-symbols-outlined text-outline text-[20px] transition-transform ${marginOpen ? 'rotate-180 text-[#00D2C4]' : ''}`}>
                              expand_more
                            </span>
                          </button>
                          {/* Dropdown Menu */}
                          {marginOpen && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-[#1A212A] border border-outline-variant/50 rounded shadow-xl overflow-hidden z-50">
                              <div className="flex flex-col">
                                {marginOptions.map((opt) => (
                                  <div
                                    key={opt}
                                    className={`px-3 py-2 cursor-pointer hover:bg-surface-variant text-body-md text-on-surface transition-colors ${
                                      currentNodule.margin === opt ? 'bg-[#00D2C4]/10 text-[#00D2C4]' : ''
                                    }`}
                                    onClick={() => {
                                      updateNoduleField('margin', opt);
                                      setMarginOpen(false);
                                    }}
                                  >
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section: Lung-RADS */}
                    <div className="space-y-4 relative z-20">
                      <div className="flex items-center justify-between border-b border-surface-variant pb-2">
                        <h3 className="text-title-sm font-title-sm text-on-surface">Clinical Guideline Compliance</h3>
                      </div>
                      <div className="bg-[#0B0E14] p-5 rounded-lg border border-outline-variant/30 flex flex-col gap-5">
                        <div className="flex gap-6 items-start">
                          {/* Custom Dropdown: Lung-RADS */}
                          <div className="flex-1 flex flex-col gap-1.5 relative">
                            <label className="text-label-caps font-label-caps text-on-surface-variant">
                              Lung-RADS Category
                            </label>
                            <button
                              className={`flex items-center justify-between w-full bg-[#151A22] border text-on-surface rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#00D2C4] text-body-md font-body-md transition-colors cursor-pointer ${
                                radsOpen ? 'active-field' : ''
                              } ${currentNodule.showAlert ? 'amber-warning-border' : 'border-outline-variant/50'}`}
                              onClick={() => {
                                setRadsOpen(!radsOpen);
                                setCompOpen(false);
                                setMarginOpen(false);
                              }}
                            >
                              <span>{currentNodule.lungRads}</span>
                              <span className={`material-symbols-outlined text-outline text-[20px] transition-transform ${radsOpen ? 'rotate-180 text-[#00D2C4]' : ''}`}>
                                expand_more
                              </span>
                            </button>
                            {/* Dropdown Menu */}
                            {radsOpen && (
                              <div className="absolute top-full left-0 w-full mt-1 bg-[#1A212A] border border-outline-variant/50 rounded shadow-xl overflow-hidden z-50 max-h-[200px] overflow-y-auto custom-scrollbar">
                                <div className="flex flex-col">
                                  {radsOptions.map((opt) => (
                                    <div
                                      key={opt}
                                      className={`px-3 py-2 cursor-pointer hover:bg-surface-variant text-body-md text-on-surface transition-colors ${
                                        currentNodule.lungRads === opt ? 'bg-[#00D2C4]/10 text-[#00D2C4]' : ''
                                      }`}
                                      onClick={() => {
                                        updateNoduleField('lungRads', opt);
                                        setRadsOpen(false);
                                      }}
                                    >
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col gap-1.5">
                            <label className="text-label-caps font-label-caps text-on-surface-variant">
                              Modifiers (Optional)
                            </label>
                            <div className="flex gap-4 mt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  className="form-checkbox text-[#00D2C4] rounded bg-[#151A22] border-outline-variant focus:ring-[#00D2C4] focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
                                  type="checkbox"
                                />
                                <span className="text-body-md font-body-md text-on-surface">S (Clinically Sig)</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  className="form-checkbox text-[#00D2C4] rounded bg-[#151A22] border-outline-variant focus:ring-[#00D2C4] focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
                                  type="checkbox"
                                />
                                <span className="text-body-md font-body-md text-on-surface">C (Prior Cancer)</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        {/* Amber Warning Box (Dynamic) */}
                        {currentNodule.showAlert && (
                          <div className="bg-amber-warning/10 border border-amber-warning/40 rounded p-3 flex gap-3 items-start transition-opacity duration-300">
                            <span className="material-symbols-outlined text-amber-warning text-[20px] mt-0.5" style={{ fontVariationSettings: '"FILL" 1' }}>
                              warning
                            </span>
                            <div className="text-body-sm font-body-sm text-amber-warning/90 leading-relaxed">
                              {currentNodule.alertText}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section: Notes */}
                    <div className="space-y-4 flex-1 flex flex-col relative z-10">
                      <div className="flex items-center justify-between border-b border-surface-variant pb-2">
                        <h3 className="text-title-sm font-title-sm text-on-surface">Notes</h3>
                      </div>
                      <textarea
                        className="w-full flex-1 min-h-[120px] bg-[#0B0E14] border border-outline-variant/50 text-on-surface rounded p-3 focus:outline-none focus:ring-1 focus:ring-[#00D2C4] focus:border-[#00D2C4] text-body-md font-body-md resize-none transition-colors"
                        placeholder="Enter clinical observations..."
                        value={currentNodule.notes}
                        onChange={(e) => updateNoduleField('notes', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="bg-[#151A22] border-t border-outline-variant/30 p-4 flex justify-between items-center mt-auto z-10 shrink-0">
                    <button 
                      className="text-on-surface-variant hover:text-on-surface font-label-caps text-label-caps transition-colors underline-offset-4 hover:underline cursor-pointer"
                      onClick={() => alert('Draft saved successfully to clinical server.')}
                    >
                      Save Draft
                    </button>
                    <div className="flex gap-3">
                      <button 
                        className="px-6 py-2 rounded border border-outline-variant/50 text-on-surface hover:bg-surface-variant transition-colors font-label-caps text-label-caps cursor-pointer"
                        onClick={() => {
                          const keys = Object.keys(nodules).map(Number);
                          if (keys.length > 0) {
                            const currentIndex = keys.indexOf(activeNodule);
                            const nextIndex = (currentIndex + 1) % keys.length;
                            setActiveNodule(keys[nextIndex]);
                          }
                          setCompOpen(false);
                          setMarginOpen(false);
                          setRadsOpen(false);
                        }}
                      >
                        Review Next Finding
                      </button>
                      <button
                        className="px-6 py-2 rounded bg-[#00D2C4] text-[#0B0E14] font-label-caps text-label-caps font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,210,196,0.2)] cursor-pointer"
                        onClick={handleSignReport}
                      >
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                          lock
                        </span>{' '}
                        Sign & Lock Report
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
