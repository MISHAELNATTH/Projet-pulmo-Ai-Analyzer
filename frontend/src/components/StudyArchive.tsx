import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';

interface Record {
  id: number;
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
  const [statusFilter, setStatusFilter] = useState<string>('Archived');
  
  // UI Interactive Drawer State
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedRecord = initialRecords.find((r) => r.id === selectedRecordId);

  // Filter Logic
  const filteredRecords = initialRecords.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.desc.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModality = modality === 'ALL' || record.modality === modality;
    
    let matchesFinding = true;
    if (findingType === 'Nodule') matchesFinding = record.findingType === 'Nodule';
    if (findingType === 'Clear') matchesFinding = record.findingType === 'Clear';
    if (findingType === 'Suspicious') matchesFinding = record.findingType === 'Suspicious';

    const matchesStatus = record.status === statusFilter;

    return matchesSearch && matchesModality && matchesFinding && matchesStatus;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateRange('Last 30 Days');
    setModality('ALL');
    setFindingType('All Findings');
    setStatusFilter('Archived');
  };

  const handleRowClick = (record: Record) => {
    setSelectedRecordId(record.id);
    setDrawerOpen(true);
  };

  const handleQuickView = (record: Record, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering row selection drawer
    navigate('/viewer', { state: { patientName: record.name, mrn: record.mrn.replace('MRN: ', 'MRN-') } });
  };

  const handleFinalizeReport = () => {
    if (selectedRecord) {
      navigate('/reports', { state: { patientName: selectedRecord.name, mrn: selectedRecord.mrn.replace('MRN: ', 'MRN-') } });
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
              TOTAL RECORDS: {initialRecords.length}
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
              <option>Archived</option>
              <option>Flagged</option>
              <option>Signed</option>
            </select>
          </div>
          <button
            className="mt-auto mb-1 ml-auto flex items-center gap-2 text-primary hover:bg-primary/10 px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
            onClick={handleResetFilters}
          >
            <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
            <span className="text-label-caps">RESET FILTERS</span>
          </button>
        </section>

        {/* Study Results Table */}
        <section className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-container-high border-b border-outline-variant sticky top-0 z-10">
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">
                    Date / Time
                  </th>
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">
                    Patient & MRN
                  </th>
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">
                    Study Description
                  </th>
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">
                    Modality
                  </th>
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">
                    AI Summary
                  </th>
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">
                    Status
                  </th>
                  <th className="p-4 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-mono-data font-mono-data divide-y divide-outline-variant/30">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-on-surface-variant font-mono-data">
                      No archived studies match the current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className={`zebra-row group hover:bg-primary/5 transition-colors cursor-pointer ${
                        selectedRecordId === record.id ? 'active-viewport-glow bg-primary/10' : ''
                      }`}
                      onClick={() => handleRowClick(record)}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-on-surface font-semibold">{record.date}</span>
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
                              record.status === 'Flagged' ? 'text-error' : 'text-primary'
                            }`}
                          >
                            {record.status === 'Flagged' ? 'flag' : 'inventory_2'}
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
                            className="p-2 hover:bg-primary-container/20 rounded-lg text-primary transition-colors cursor-pointer"
                            title="Download Report"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`Downloading DICOM / Report package for ${record.name}...`);
                            }}
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
            <span className="material-symbols-outlined">edit_note</span>
            Finalize Report
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};
