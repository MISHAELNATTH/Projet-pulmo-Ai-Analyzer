import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import lungCtScan from '../assets/lung_ct_scan.png';
import lungGradCamHeatmap from '../assets/lung_grad_cam_heatmap.png';

interface Slice {
  number: number;
  image: string;
}

const slices: Slice[] = [
  {
    number: 142,
    image: lungCtScan,
  },
  {
    number: 143,
    image: lungCtScan,
  },
  {
    number: 144,
    image: lungCtScan,
  },
  {
    number: 145,
    image: lungCtScan,
  },
  {
    number: 146,
    image: lungCtScan,
  },
  {
    number: 147,
    image: lungCtScan,
  },
];

export const InteractiveViewer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract state if navigation from Worklist passed it
  const { patientName = 'DOE, JOHN A.', mrn = 'MRN-882941' } = (location.state || {}) as {
    patientName?: string;
    mrn?: string;
  };

  // State variables for interactive simulation
  const [activeSliceIndex, setActiveSliceIndex] = useState(0);
  const [aiOverlayActive, setAiOverlayActive] = useState(true);
  const [windowPreset, setWindowPreset] = useState<'LUNG' | 'SOFT'>('LUNG');
  const [activeTool, setActiveTool] = useState<'pan' | 'zoom' | 'contrast' | 'none'>('none');
  const [heatmapZoomed, setHeatmapZoomed] = useState(false);

  const currentSlice = slices[activeSliceIndex];

  const handleFinalDiagnosis = () => {
    navigate('/reports', { state: { patientName, mrn } });
  };

  // Adjust style depending on active tools and window level presets
  const getSliceImageStyle = () => {
    let style = '';
    
    // Apply visual effects depending on windowing preset
    if (windowPreset === 'SOFT') {
      style += ' brightness-[0.6] contrast-[1.4] saturate-[0.8]';
    } else {
      style += ' brightness-[1.0] contrast-[1.0]';
    }

    // Adjust scale for zoom tool simulation
    if (activeTool === 'zoom') {
      style += ' scale-125';
    }

    // Apply filter for window leveling contrast simulation
    if (activeTool === 'contrast') {
      style += ' invert-[0.1]';
    }

    return style.trim();
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-[#0B0E14] text-on-background antialiased font-body-md overflow-hidden">
      {/* Full Width TopNavBar */}
      <header className="h-16 bg-surface-dim/80 backdrop-blur-md border-b border-[#30363D] flex justify-between items-center px-4 fixed top-0 left-0 w-full z-40">
        <div className="flex items-center space-x-3 text-mono-data">
          <span className="material-symbols-outlined text-primary text-2xl">pulmonology</span>
          <span className="text-title-sm font-title-sm font-bold text-primary tracking-widest uppercase">
            PneumoGuard AI
          </span>
          <span className="text-on-surface-variant mx-1">|</span>
          <span className="text-on-surface">Patient: {patientName}</span>
          <span className="text-on-surface-variant ml-2">MRN: {mrn.replace('MRN-', '').replace('MRN: ', '')}</span>
          <span className="text-on-surface-variant ml-2">Study: 2023-11-04</span>
          <span className="text-on-surface-variant ml-2">Modality: CT</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-surface-variant border border-outline-variant overflow-hidden cursor-pointer ml-2">
            <img
              alt="Radiologist Session"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAO7gBMFZokhwt6vHiUyiTiuNg19f5Dbnd_po4MaOaGdPbwp8No2a0pV_AINcZPUMIDInCVOTzzV0jKizdIYXBrJ461ec9szzGNdWA_IVR8xJx2MiIZjrboJz3yNl93l_fe33qT3fFkAfDGOAbX3ES-HOy57d9T0QU1QgdzX1WtCwzqtuEhpxSufSCd3Sqcg8E1_NnewaHUI758-IhYfDHQnlQlhADKMCsSHeLN4Dlj8bphwX_MG3qN6FPwdqHdErnlzoEXSliRkag"
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16 h-[calc(100vh-4rem)]">
        {/* SideNavBar */}
        <Sidebar activeTab="viewer" />

        {/* Main Content Area */}
        <main className="ml-sidebar-width flex-1 flex gap-gutter p-gutter overflow-hidden relative w-full h-full">
          {/* Large Main Viewport Area */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Dominant Axial Viewport */}
            <div className="flex-1 bg-black relative overflow-hidden border-axial rounded flex flex-col group">
              <div className="absolute top-4 left-4 z-10 text-mono-data font-mono-data text-on-surface drop-shadow-md text-lg">
                Primary Axial View [A] — Slice {currentSlice.number}/280
              </div>

              {aiOverlayActive && (
                <div className="absolute top-4 right-4 z-10 font-bold text-primary drop-shadow-md bg-surface-dim/70 px-3 py-1 rounded-full flex items-center gap-2 border border-primary/30">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  PneumoGuard AI: SUSPICIOUS NODULE CONFIDENCE: 98%
                </div>
              )}

              {/* Simulated Crosshair overlay for Pan/Zoom tools */}
              {activeTool === 'pan' && (
                <>
                  <div className="crosshair-h"></div>
                  <div className="crosshair-v"></div>
                </>
              )}

              {/* Toolbar Overlay */}
              <div className="absolute left-1/2 top-4 -translate-x-1/2 z-20 glass-panel rounded-full px-4 py-2 flex items-center gap-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className={`p-1.5 rounded transition-colors flex items-center justify-center cursor-pointer ${
                    activeTool === 'pan' ? 'text-primary bg-surface-container-highest' : 'text-on-surface hover:text-primary'
                  }`}
                  title="Pan tool"
                  onClick={() => setActiveTool(activeTool === 'pan' ? 'none' : 'pan')}
                >
                  <span className="material-symbols-outlined text-[20px]">pan_tool</span>
                </button>

                <button
                  className={`p-1.5 rounded transition-colors flex items-center justify-center cursor-pointer ${
                    activeTool === 'zoom' ? 'text-primary bg-surface-container-highest' : 'text-on-surface hover:text-primary'
                  }`}
                  title="Zoom in"
                  onClick={() => setActiveTool(activeTool === 'zoom' ? 'none' : 'zoom')}
                >
                  <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                </button>

                <button
                  className={`p-1.5 rounded transition-colors flex items-center justify-center cursor-pointer ${
                    activeTool === 'contrast' ? 'text-primary bg-surface-container-highest' : 'text-on-surface hover:text-primary'
                  }`}
                  title="Window Leveling contrast"
                  onClick={() => setActiveTool(activeTool === 'contrast' ? 'none' : 'contrast')}
                >
                  <span className="material-symbols-outlined text-[20px]">contrast</span>
                </button>

                <button
                  className={`p-1.5 rounded transition-colors flex items-center justify-center cursor-pointer ${
                    aiOverlayActive ? 'text-primary' : 'text-outline hover:text-on-surface'
                  }`}
                  title="Toggle AI Overlay"
                  onClick={() => setAiOverlayActive(!aiOverlayActive)}
                >
                  <span className="material-symbols-outlined text-[20px]" style={aiOverlayActive ? { fontVariationSettings: '"FILL" 1' } : undefined}>
                    visibility
                  </span>
                </button>

                <div className="w-px h-5 bg-outline-variant"></div>

                <div className="flex gap-1">
                  <button
                    className={`text-label-caps font-label-caps px-2 py-1 rounded transition-colors cursor-pointer ${
                      windowPreset === 'LUNG'
                        ? 'text-primary bg-surface-container-highest'
                        : 'text-on-surface hover:text-primary hover:bg-surface-container-highest'
                    }`}
                    onClick={() => setWindowPreset('LUNG')}
                  >
                    LUNG
                  </button>
                  <button
                    className={`text-label-caps font-label-caps px-2 py-1 rounded transition-colors cursor-pointer ${
                      windowPreset === 'SOFT'
                        ? 'text-primary bg-surface-container-highest'
                        : 'text-on-surface hover:text-primary hover:bg-surface-container-highest'
                    }`}
                    onClick={() => setWindowPreset('SOFT')}
                  >
                    SOFT
                  </button>
                </div>
              </div>

              {/* Large Scan Slice Viewer */}
              <div 
                className={`w-full h-full bg-cover bg-center transition-all duration-300 relative ${getSliceImageStyle()}`}
                style={{ backgroundImage: `url('${currentSlice.image}')` }}
              >
                {/* Highlight box around simulated nodule if AI is active */}
                {aiOverlayActive && activeSliceIndex === 0 && (
                  <div 
                    className="absolute border border-primary bg-primary/10 w-[64px] h-[64px] rounded-sm animate-pulse"
                    style={{
                      left: '52%',
                      top: '38%',
                      boxShadow: '0 0 10px rgba(71, 239, 224, 0.6)'
                    }}
                    title="AI DETECTED NODULE"
                  >
                    <div className="absolute -top-6 -left-1 bg-primary text-[#0B0E14] text-[9px] font-mono px-1 rounded font-bold whitespace-nowrap">
                      AI DETECTED NODULE
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-4 z-10 text-mono-data font-mono-data text-on-surface-variant drop-shadow-md text-xs">
                {windowPreset === 'LUNG' ? 'W: 1500 L: -600' : 'W: 400 L: 40'} | Slice: {currentSlice.number}/280 | Thick: 1.00 mm
              </div>
            </div>

            {/* 2D Slices Thumbnail Strip */}
            <div className="h-24 flex gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
              {slices.map((slice, index) => (
                <div
                  key={slice.number}
                  className={`min-w-[80px] h-full rounded border-2 transition-all cursor-pointer bg-black/40 overflow-hidden relative ${
                    activeSliceIndex === index ? 'border-primary scale-[0.98]' : 'border-[#30363D] hover:border-primary/50'
                  }`}
                  onClick={() => setActiveSliceIndex(index)}
                >
                  <img
                    alt={`Slice ${slice.number}`}
                    className="w-full h-full object-cover"
                    src={slice.image}
                  />
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/70 px-1 rounded text-on-surface">
                    {slice.number}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Redesigned AI Co-Pilot Panel */}
          <aside className="w-96 h-full bg-[#161B22] border border-[#30363D] flex flex-col overflow-hidden shrink-0 shadow-2xl rounded">
            <div className="p-5 bg-error/10 border-b border-error/30">
              <div className="flex items-center gap-3 text-error">
                <span className="material-symbols-outlined fill-icon">report</span>
                <h2 className="text-title-sm font-bold tracking-tight">ANOMALY DETECTED</h2>
              </div>
              <p className="text-label-caps text-error/70 mt-1 uppercase">Suspected Pulmonary Nodule</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {/* Priority Results Stats */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant text-label-caps">Probability</span>
                  <span className="text-primary text-mono-data text-lg">89.4%</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full">
                  <div className="bg-primary h-full rounded-full" style={{ width: '89.4%' }}></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-surface-container-low rounded border border-[#30363D]/30">
                    <div className="text-label-caps text-on-surface-variant mb-1">Estimated Size</div>
                    <div className="text-body-md font-bold text-on-surface">14.2 mm</div>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded border border-[#30363D]/30">
                    <div className="text-label-caps text-on-surface-variant mb-1">Confidence</div>
                    <div className="text-body-md font-bold text-on-surface">High</div>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded border border-[#30363D]/30">
                    <div className="text-label-caps text-on-surface-variant mb-1">Location</div>
                    <div className="text-body-md font-bold text-on-surface">RUL Apical</div>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded border border-[#30363D]/30">
                    <div className="text-label-caps text-on-surface-variant mb-1">Type</div>
                    <div className="text-body-md font-bold text-on-surface">Solid</div>
                  </div>
                </div>
              </div>

              {/* Heat Map Section */}
              <div className="pt-4 border-t border-[#30363D]">
                <h3 className="text-label-caps text-on-surface-variant mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">heat_pump</span>
                  HEAT MAP (GRAD-CAM)
                </h3>
                <div className="flex gap-3 items-stretch">
                  <div
                    className={`aspect-square flex-1 rounded border border-[#30363D] overflow-hidden bg-black relative group cursor-crosshair transition-all duration-300 ${
                      heatmapZoomed ? 'scale-110 z-30 shadow-2xl' : ''
                    }`}
                    onClick={() => setHeatmapZoomed(!heatmapZoomed)}
                  >
                    <img
                      alt="Grad-CAM Heat Map"
                      className="w-full h-full object-cover"
                      src={lungGradCamHeatmap}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <span className="text-white text-[10px] px-2 py-1 bg-black/60 rounded">
                        {heatmapZoomed ? 'Click to Shrink' : 'Click to Zoom'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-between py-1">
                    <span className="text-[10px] font-label-caps text-error">High</span>
                    <div className="w-2 flex-1 my-1 rounded-full bg-gradient-to-t from-blue-600 via-yellow-400 to-red-600"></div>
                    <span className="text-[10px] font-label-caps text-on-surface-variant">Low</span>
                  </div>
                </div>
                <p className="text-body-sm text-on-surface-variant mt-2 italic">
                  AI focus regions highlighted. Primary hotspot correlates with the RUL nodule location.
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-[#30363D] bg-[#161B22]">
              <button
                className="w-full bg-primary text-[#0B0E14] hover:bg-primary-fixed font-bold py-3 px-4 rounded transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-95 cursor-pointer"
                onClick={handleFinalDiagnosis}
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
                FINAL DIAGNOSIS
              </button>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

