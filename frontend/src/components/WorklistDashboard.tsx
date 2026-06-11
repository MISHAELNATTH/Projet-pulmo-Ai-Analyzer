import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';

interface Study {
  id: number;
  priority: 'STAT' | 'Routine';
  name: string;
  mrn: string;
  desc: string;
  status: string;
  finding: string;
  findingColor: string;
  findingIcon: string;
}

const initialStudies: Study[] = [
  {
    id: 1,
    priority: 'STAT',
    name: 'DOE, JOHN A.',
    mrn: 'MRN-882941',
    desc: 'CT CHEST W/O CONTRAST',
    status: 'New',
    finding: 'Likely Nodule',
    findingColor: 'bg-error/20 text-error border border-error/50',
    findingIcon: 'warning',
  },
  {
    id: 2,
    priority: 'Routine',
    name: 'SMITH, SARAH L.',
    mrn: 'MRN-773102',
    desc: 'CT CHEST PA/LAT',
    status: 'In Review',
    finding: 'Clear',
    findingColor: 'bg-[#2ECC71]/10 text-[#2ECC71] border border-[#2ECC71]/30',
    findingIcon: 'check_circle',
  },
  {
    id: 3,
    priority: 'Routine',
    name: 'JOHNSON, MICHAEL T.',
    mrn: 'MRN-991204',
    desc: 'CT CHEST W/ CONTRAST',
    status: 'New',
    finding: 'Clear',
    findingColor: 'bg-[#2ECC71]/10 text-[#2ECC71] border border-[#2ECC71]/30',
    findingIcon: 'check_circle',
  },
  {
    id: 4,
    priority: 'STAT',
    name: 'WILLIAMS, DAVID',
    mrn: 'MRN-554211',
    desc: 'CT ANGIO PULMONARY',
    status: 'New',
    finding: 'Suspected PE',
    findingColor: 'bg-error/20 text-error border border-error/50',
    findingIcon: 'warning',
  },
];

export const WorklistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [studies, setStudies] = useState<Study[]>(initialStudies);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'STAT' | 'Routine'>('ALL');
  const [isAddingScan, setIsAddingScan] = useState(false);

  const filteredStudies = studies.filter((study) => {
    const matchesSearch =
      study.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.desc.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'ALL') return matchesSearch;
    return matchesSearch && study.priority === filterType;
  });

  const handleAddScan = () => {
    setIsAddingScan(true);
    setTimeout(() => {
      const names = [
        'BROWN, ELIZABETH R.',
        'DAVIS, JAMES K.',
        'GARCIA, MARIA M.',
        'RODRIGUEZ, ANTONIO',
      ];
      const mrns = ['MRN-442918', 'MRN-221980', 'MRN-105432', 'MRN-609124'];
      const descs = [
        'CT CHEST HIGH RES',
        'CT CHEST W/O CONTRAST',
        'XR CHEST PA/LAT',
        'CT ANGIO PULMONARY',
      ];
      const findings = ['Likely Nodule', 'Clear', 'Suspicious Density', 'Clear'];
      const findingIcons = ['warning', 'check_circle', 'warning', 'check_circle'];
      const findingColors = [
        'bg-error/20 text-error border border-error/50',
        'bg-[#2ECC71]/10 text-[#2ECC71] border border-[#2ECC71]/30',
        'bg-amber-warning/20 text-amber-warning border border-amber-warning/30',
        'bg-[#2ECC71]/10 text-[#2ECC71] border border-[#2ECC71]/30',
      ];

      const randomIndex = Math.floor(Math.random() * names.length);
      const newStudy: Study = {
        id: Date.now(),
        priority: Math.random() > 0.5 ? 'STAT' : 'Routine',
        name: names[randomIndex],
        mrn: mrns[randomIndex],
        desc: descs[randomIndex],
        status: 'New',
        finding: findings[randomIndex],
        findingColor: findingColors[randomIndex],
        findingIcon: findingIcons[randomIndex],
      };

      setStudies((prev) => [newStudy, ...prev]);
      setIsAddingScan(false);
    }, 800);
  };

  const handleRowClick = (study: Study) => {
    navigate('/viewer', { state: { patientName: study.name, mrn: study.mrn } });
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-[#0B0E14] text-on-background antialiased font-body-md">
      {/* Full Width TopNavBar */}
      <header className="h-16 bg-surface-dim/80 backdrop-blur-md border-b border-[#30363D] flex justify-between items-center px-4 fixed top-0 left-0 w-full z-40">
        {/* Left: Brand Context */}
        <div className="flex items-center space-x-3">
          <span className="material-symbols-outlined text-primary text-2xl">pulmonology</span>
          <span className="text-title-sm font-title-sm font-bold text-primary tracking-widest uppercase">
            PNEUMOGUARD AI
          </span>
          <div className="h-4 w-px bg-outline-variant mx-2"></div>
          <span className="text-mono-data font-mono-data text-on-surface-variant uppercase text-xs">Worklist</span>
        </div>
        
        {/* Center/Right: Search & Actions */}
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative w-64 clinical-cyan-glow rounded bg-surface border border-outline-variant flex items-center px-3 py-1.5 transition-all">
            <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2">
              search
            </span>
            <input
              className="bg-transparent border-none outline-none text-body-sm text-on-surface w-full placeholder-on-surface-variant focus:ring-0 p-0 h-auto"
              placeholder="Search Patient, MRN..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Actions / Notifications */}
          <button 
            className="text-on-surface-variant hover:text-primary-fixed transition-colors cursor-pointer p-2 flex items-center justify-center relative bg-transparent border-none"
            onClick={() => alert('All system services are operational. PACS connection active.')}
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border border-surface-dim"></span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* SideNavBar (Mounts below the header) */}
        <Sidebar activeTab="worklist" />

        {/* Main Content Canvas */}
        <main className="ml-sidebar-width flex-1 flex flex-col h-[calc(100vh-4rem)] p-margin-page overflow-y-auto w-full flex flex-col space-y-4">
          {/* Toolbar */}
          <div className="flex justify-between items-center bg-[#161B22] p-panel-padding border border-[#30363D] rounded-DEFAULT">
            <div className="flex items-center space-x-3">
              <span className="text-title-sm font-title-sm text-on-surface">Unread Studies</span>
              <span className="text-label-caps font-label-caps bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full border border-outline-variant">
                {filteredStudies.length} Pending
              </span>
            </div>
            <div className="flex items-center space-x-3">
              {/* Quick Modality Filters */}
              <div className="flex border border-outline-variant rounded bg-surface-container overflow-hidden">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1 text-label-caps font-bold transition-colors ${
                    filterType === 'ALL'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setFilterType('STAT')}
                  className={`px-3 py-1 text-label-caps font-bold transition-colors ${
                    filterType === 'STAT'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                  }`}
                >
                  STAT
                </button>
                <button
                  onClick={() => setFilterType('Routine')}
                  className={`px-3 py-1 text-label-caps font-bold transition-colors ${
                    filterType === 'Routine'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                  }`}
                >
                  ROUTINE
                </button>
              </div>

              <button
                className="flex items-center space-x-2 bg-surface text-primary border border-primary px-4 py-1.5 rounded hover:bg-primary/10 transition-colors shadow-[0_0_8px_rgba(71,239,224,0.15)] disabled:opacity-50 cursor-pointer"
                onClick={handleAddScan}
                disabled={isAddingScan}
              >
                <span className="material-symbols-outlined text-sm">
                  {isAddingScan ? 'sync' : 'cloud_sync'}
                </span>
                <span className="text-mono-data font-mono-data">
                  {isAddingScan ? 'Analyzing Scan...' : 'Add Scan for Analysis'}
                </span>
              </button>
            </div>
          </div>

          {/* Data Table Container */}
          <div className="flex-1 border border-[#30363D] bg-[#161B22] rounded-DEFAULT overflow-hidden flex flex-col relative">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-[#30363D] bg-surface-container-low text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider sticky top-0 z-10">
              <div className="col-span-1">Priority</div>
              <div className="col-span-3">Patient Name</div>
              <div className="col-span-2">MRN</div>
              <div className="col-span-2">Study Description</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">AI Finding</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredStudies.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant font-mono-data">
                  No matching clinical studies found in current queue.
                </div>
              ) : (
                filteredStudies.map((study) => (
                  <div
                    key={study.id}
                    className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-[#30363D]/50 hover:bg-surface-container-highest/30 transition-colors cursor-pointer group"
                    onClick={() => handleRowClick(study)}
                  >
                    <div className="col-span-1 flex items-center">
                      {study.priority === 'STAT' ? (
                        <span className="bg-error/20 text-error border border-error/50 px-1.5 py-[2px] rounded text-[10px] font-bold uppercase tracking-wider flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-error mr-1 animate-pulse"></span>
                          STAT
                        </span>
                      ) : (
                        <span className="text-on-surface-variant text-[11px] font-mono-data uppercase">
                          Routine
                        </span>
                      )}
                    </div>
                    <div className="col-span-3 text-mono-data font-mono-data text-on-surface truncate font-semibold group-hover:text-primary transition-colors">
                      {study.name}
                    </div>
                    <div className="col-span-2 text-mono-data font-mono-data text-on-surface-variant">
                      {study.mrn}
                    </div>
                    <div className="col-span-2 text-mono-data font-mono-data text-on-surface truncate" title={study.desc}>
                      {study.desc}
                    </div>
                    <div className="col-span-2 flex items-center">
                      {study.status === 'In Review' ? (
                        <span className="bg-[#42474f]/30 text-on-surface-variant border border-[#30363D] px-1.5 py-[2px] rounded text-[10px] font-bold uppercase tracking-wider">
                          In Review
                        </span>
                      ) : (
                        <span className="bg-primary/10 text-primary border border-primary/30 px-1.5 py-[2px] rounded text-[10px] font-bold uppercase tracking-wider">
                          {study.status}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center">
                      {study.finding === 'Clear' ? (
                        <span className="bg-[#2ECC71]/10 text-[#2ECC71] border border-[#2ECC71]/30 px-1.5 py-[2px] rounded text-[10px] font-bold flex items-center space-x-1 uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[10px] font-bold">check_circle</span>
                          <span>Clear</span>
                        </span>
                      ) : study.finding === 'Likely Nodule' || study.finding === 'Suspected PE' ? (
                        <span className="bg-error/20 text-error border border-error/50 px-1.5 py-[2px] rounded text-[10px] font-bold flex items-center space-x-1 uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[10px] font-bold">warning</span>
                          <span>{study.finding}</span>
                        </span>
                      ) : (
                        <span className="bg-amber-warning/20 text-amber-warning border border-amber-warning/30 px-1.5 py-[2px] rounded text-[10px] font-bold flex items-center space-x-1 uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[10px] font-bold">warning</span>
                          <span>{study.finding}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Table Footer / Pagination Status */}
            <div className="h-8 border-t border-[#30363D] bg-surface-container-lowest flex items-center justify-between px-4 shrink-0">
              <span className="text-label-caps font-label-caps text-on-surface-variant">
                Showing 1-{filteredStudies.length} of {studies.length} studies
              </span>
              <div className="flex items-center space-x-2">
                <button
                  className="text-on-surface-variant hover:text-primary disabled:opacity-50 transition-colors bg-transparent border-none cursor-pointer"
                  disabled
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <span className="text-mono-data font-mono-data text-on-surface text-xs">Page 1 of 3</span>
                <button
                  className="text-on-surface-variant hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
