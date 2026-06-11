import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';

interface NoduleDetails {
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
}

interface NodulesMap {
  [key: number]: NoduleDetails;
}

const initialNodules: NodulesMap = {
  1: {
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
    lungRads: '3 - Probably Benign (Selected)',
    showAlert: true,
    alertText: 'AI Logic Discrepancy: Nodule size exceeds Probably Benign threshold. ACR recommended classification is 4A or higher.',
    notes: '',
  },
  2: {
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
  },
  3: {
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
  },
};

const compOptions = ['Solid', 'Part-Solid', 'Ground-Glass'];
const marginOptions = ['Spiculated', 'Lobulated', 'Smooth', 'Irregular'];
const radsOptions = [
  '2 - Benign Appearance',
  '3 - Probably Benign',
  '3 - Probably Benign (Selected)',
  '4A - Suspicious',
  '4B - Very Suspicious',
  '4X - Highly Suspicious',
];

export const StructuredReporting: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract state if navigation passed it
  const { patientName = 'DOE, JOHN', mrn = 'MRN: 882941' } = (location.state || {}) as {
    patientName?: string;
    mrn?: string;
  };

  const [nodules, setNodules] = useState<NodulesMap>(initialNodules);
  const [activeNodule, setActiveNodule] = useState<number>(1);
  
  const [compOpen, setCompOpen] = useState(false);
  const [marginOpen, setMarginOpen] = useState(false);
  const [radsOpen, setRadsOpen] = useState(false);

  const currentNodule = nodules[activeNodule];

  const updateNoduleField = (field: keyof NoduleDetails, value: any) => {
    setNodules((prev) => {
      const updatedNodule = { ...prev[activeNodule], [field]: value };
      
      // Smart Clinical Logic warning helper
      if (activeNodule === 1 && field === 'lungRads') {
        // If they select category 3 for Nodule 1, raise discrepancy alert
        const isCat3 = value.startsWith('3 -');
        updatedNodule.showAlert = isCat3;
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

  const handleSignReport = () => {
    alert(`Report for Patient: ${patientName} signed & locked successfully. Synced to PACS archive.`);
    navigate('/archive');
  };

  return (
    <div className="bg-[#0B0E14] text-on-background min-h-screen w-screen flex font-body-md overflow-hidden">
      {/* SideNavBar */}
      <Sidebar activeTab="reports" />

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 left-sidebar-width h-16 bg-surface-dim/80 backdrop-blur-md border-b border-outline-variant flex justify-between items-center px-gutter w-[calc(100%-64px)] z-40">
        <div className="flex items-center space-x-4">
          <span className="text-title-sm font-title-sm font-bold text-primary tracking-widest">
            PneumoGuard AI
          </span>
          <div className="h-4 w-px bg-outline-variant mx-2"></div>
          <div className="flex space-x-6 text-mono-data font-mono-data text-on-surface-variant text-body-sm">
            <span>Patient: {patientName}</span>
            <span>{mrn}</span>
            <span>Study: 2023-11-04</span>
            <span>Modality: CT</span>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-primary dark:text-primary-fixed">
          <div className="w-8 h-8 rounded-full bg-surface-variant border border-outline-variant overflow-hidden ml-2 cursor-pointer">
            <img
              alt="Radiologist Session"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxpznft0CqSOvq12TMdooMzrvLGcUmhBmUR1CqUVOvhuFYI2BDd8S-NwmE8lfgSyyEiPHJ6_KHHnYA8U4CuwReZ5RqYGxAbFR0dN-WaSeSZrWjXDp24b9sxkJin8G_KBXqTrhGRX2qhjzI50m1qdNZ5x6jpPakNCXQ8epw5bXWHrFaZqqpAYm0FliL1AOShW8V1Miu8GrrhyzQs1TJL0jOMetMvdI8B6NOajmJofpY2ZvEfxQiLfWdE5P7GHm_Vj-xkrtMN2Gwf_U"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ml-[64px] mt-16 p-margin-page w-[calc(100%-64px)] h-[calc(100vh-64px)] flex gap-gutter overflow-hidden">
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
                        onClick={() => navigate('/viewer', { state: { patientName, mrn } })}
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
                    const nextNoduleId = activeNodule === 3 ? 1 : activeNodule + 1;
                    setActiveNodule(nextNoduleId);
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
      </main>
    </div>
  );
};
