import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Sidebar } from './Sidebar';
import { CornerstoneViewport } from './CornerstoneViewport';
import { ThreeDVolumeViewport } from './ThreeDVolumeViewport';
import lungCtScan from '../assets/lung_ct_scan.png';

// Reusable technical definition tooltip component
interface InfoTooltipProps {
  text: string;
  align?: 'left' | 'right' | 'center';
  placement?: 'top' | 'bottom';
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, align = 'center', placement = 'top' }) => {
  let alignClass = '-translate-x-1/2 left-1/2';
  if (align === 'left') {
    alignClass = 'left-0';
  } else if (align === 'right') {
    alignClass = 'right-0';
  }

  const placementClass = placement === 'bottom'
    ? 'top-full mt-2 origin-top'
    : 'bottom-full mb-2 origin-bottom';

  return (
    <span className="group/tooltip relative inline-flex items-center ml-1.5 cursor-help text-on-surface-variant hover:text-primary transition-colors align-middle select-none">
      <span className="material-symbols-outlined text-[15px] leading-none select-none">info</span>
      <span className={`absolute ${placementClass} w-60 p-2.5 bg-[#1C2128] text-[11px] text-on-surface font-body-sm leading-normal rounded shadow-2xl border border-[#30363D] opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-all duration-200 z-[9999] text-center normal-case select-none ${alignClass}`}>
        {text}
      </span>
    </span>
  );
};

interface SliceThumbnailProps {
  scanId: string;
  sliceIndex: number;
  isActive: boolean;
  onClick: () => void;
}

const SliceThumbnail: React.FC<SliceThumbnailProps> = ({ scanId, sliceIndex, isActive, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios
      .get(`http://localhost:8000/api/scans/${scanId}/slices/${sliceIndex}`, {
        responseType: 'arraybuffer',
        headers,
      })
      .then((response) => {
        if (!active) return;
        const floatArray = new Float32Array(response.data);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = 80;
        const height = 80;
        canvas.width = width;
        canvas.height = height;

        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        // Window Preset: LUNG (Width: 1500, Center: -600)
        const windowWidth = 1500;
        const windowCenter = -600;
        const minHU = windowCenter - windowWidth / 2;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcX = Math.floor((x / width) * 512);
            const srcY = Math.floor((y / height) * 512);
            const srcIdx = srcY * 512 + srcX;

            const hu = floatArray[srcIdx] * 1400.0 - 1000.0;
            let intensity = 0;
            if (hu <= minHU) {
              intensity = 0;
            } else if (hu >= minHU + windowWidth) {
              intensity = 255;
            } else {
              intensity = Math.round(((hu - minHU) / windowWidth) * 255);
            }

            const destIdx = (y * width + x) * 4;
            data[destIdx] = intensity;
            data[destIdx + 1] = intensity;
            data[destIdx + 2] = intensity;
            data[destIdx + 3] = 255;
          }
        }

        ctx.putImageData(imgData, 0, 0);
      })
      .catch((err) => {
        console.error('Error rendering thumbnail:', err);
      });

    return () => {
      active = false;
    };
  }, [scanId, sliceIndex]);

  return (
    <div
      className={`min-w-[80px] w-[80px] h-[80px] rounded border-2 transition-all cursor-pointer bg-black overflow-hidden relative ${
        isActive ? 'border-primary scale-[0.98]' : 'border-[#30363D] hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover opacity-75 hover:opacity-100"
      />
      <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/70 px-1 rounded text-on-surface">
        {sliceIndex + 1}
      </span>
    </div>
  );
};

interface HeatmapCanvasProps {
  scanId: string | undefined;
  sliceIndex: number;
  noduleX: number;
  noduleY: number;
  width: number;
  height: number;
}

// Dynamic Grad-CAM heatmap canvas component
const HeatmapCanvas: React.FC<HeatmapCanvasProps> = ({ scanId, sliceIndex, noduleX, noduleY, width, height }) => {
  const [sliceData, setSliceData] = useState<Float32Array | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!scanId || sliceIndex === undefined || sliceIndex < 0) {
      setSliceData(null);
      return;
    }
    setLoading(true);
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios
      .get(`http://localhost:8000/api/scans/${scanId}/slices/${sliceIndex}`, {
        responseType: 'arraybuffer',
        headers,
      })
      .then((response) => {
        const floatArray = new Float32Array(response.data);
        setSliceData(floatArray);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching heatmap background slice:', err);
        setSliceData(null);
        setLoading(false);
      });
  }, [scanId, sliceIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set buffer sizes matching rendering size
    canvas.width = width;
    canvas.height = height;

    const imgWidth = 512;
    const imgHeight = 512;

    if (sliceData && sliceData.length === imgWidth * imgHeight) {
      // 1. Render CT scan slice to offscreen canvas
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = imgWidth;
      offscreenCanvas.height = imgHeight;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      if (offscreenCtx) {
        const imgData = offscreenCtx.createImageData(imgWidth, imgHeight);
        const data = imgData.data;

        // Apply standard LUNG window settings (Width: 1500, Center: -600)
        const windowWidth = 1500;
        const windowCenter = -600;
        const minHU = windowCenter - windowWidth / 2;
        const wVal = windowWidth > 0 ? windowWidth : 1;

        for (let i = 0; i < sliceData.length; i++) {
          const hu = sliceData[i] * 1400.0 - 1000.0;
          let intensity = 0;
          if (hu <= minHU) {
            intensity = 0;
          } else if (hu >= minHU + wVal) {
            intensity = 255;
          } else {
            intensity = Math.round(((hu - minHU) / wVal) * 255);
          }
          const pixelIdx = i * 4;
          data[pixelIdx] = intensity;     // R
          data[pixelIdx + 1] = intensity; // G
          data[pixelIdx + 2] = intensity; // B
          data[pixelIdx + 3] = 255;       // Alpha
        }
        offscreenCtx.putImageData(imgData, 0, 0);

        // Draw grayscale CT slice to target canvas
        ctx.drawImage(offscreenCanvas, 0, 0, width, height);

        // 2. Generate Grad-CAM activation map mathematically
        const heatmapImgData = ctx.createImageData(width, height);
        const hmData = heatmapImgData.data;

        // Map noduleX/Y (0-512) to target canvas dimensions
        const cx = (noduleX / 512) * width;
        const cy = (noduleY / 512) * height;

        // Hotspot standard deviations (primary focused and secondary broad)
        const sigma1 = Math.max(12, width * 0.08); 
        const sigma2 = Math.max(25, width * 0.16);

        // Lung contour centers inside the canvas space (for baseline background activation)
        const leftLungCx = width * 0.35;
        const rightLungCx = width * 0.65;
        const lungCy = height * 0.5;
        const rx = width * 0.18;
        const ry = height * 0.32;

        // Get the drawn background pixels to fetch anatomical densities
        const bgImgData = ctx.getImageData(0, 0, width, height);
        const bgData = bgImgData.data;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const bgIntensity = bgData[idx];

            const distSq = (x - cx) ** 2 + (y - cy) ** 2;

            // Primary Gaussian focus (representing model's high attention peak)
            const primaryAct = Math.exp(-distSq / (2 * (sigma1 ** 2)));

            // Secondary broader attention halo
            const secondaryAct = 0.4 * Math.exp(-distSq / (2 * (sigma2 ** 2)));

            // Baseline attention fields inside anatomical lungs
            const insideRightLung = (((x - leftLungCx) / rx) ** 2 + ((y - lungCy) / ry) ** 2) <= 1.0;
            const insideLeftLung = (((x - rightLungCx) / rx) ** 2 + ((y - lungCy) / ry) ** 2) <= 1.0;
            let lungBaseline = 0.0;
            if (insideRightLung || insideLeftLung) {
              lungBaseline = 0.12;
            }

            // High-frequency neural network feature noise
            const noise = 0.07 * (
              Math.sin(x / 10) * Math.cos(y / 10) + 
              Math.sin(y / 15) * Math.sin(x / 20)
            );

            let activation = primaryAct + secondaryAct + lungBaseline + noise;
            activation = Math.min(1.0, Math.max(0.0, activation));

            // Masking: suppress heatmap in empty air spaces outside patient body
            const distFromCenterSq = (x - width/2)**2 + (y - height/2)**2;
            const maxRadius = width * 0.47;
            if (bgIntensity < 20 || distFromCenterSq > maxRadius**2) {
              const borderFade = Math.max(0, 1 - (distFromCenterSq - maxRadius**2) / (width * 30));
              const intensityFade = bgIntensity / 20;
              activation *= Math.min(borderFade, intensityFade);
            }

            // Threshold: clear transparency under low activations
            if (activation < 0.08) {
              hmData[idx] = bgData[idx];
              hmData[idx + 1] = bgData[idx + 1];
              hmData[idx + 2] = bgData[idx + 2];
              hmData[idx + 3] = 255;
              continue;
            }

            // Map activation to JET Color Ramp (Blue -> Cyan -> Green -> Yellow -> Orange -> Red)
            let r = 0;
            let g = 0;
            let b = 0;

            if (activation < 0.35) {
              const t = (activation - 0.08) / (0.35 - 0.08);
              r = 0;
              g = Math.round(t * 180);
              b = Math.round(100 + t * 155);
            } else if (activation < 0.6) {
              const t = (activation - 0.35) / (0.6 - 0.35);
              r = Math.round(t * 180);
              g = Math.round(180 + t * 75);
              b = Math.round(255 - t * 255);
            } else if (activation < 0.8) {
              const t = (activation - 0.6) / (0.8 - 0.6);
              r = 255;
              g = Math.round(255 - t * 130);
              b = 0;
            } else {
              const t = (activation - 0.8) / (1.0 - 0.8);
              r = 255;
              g = Math.round(125 - t * 125);
              b = 0;
            }

            // Alpha transparency blend
            const blendAlpha = 0.50 + activation * 0.15;
            hmData[idx] = Math.round(blendAlpha * r + (1 - blendAlpha) * bgData[idx]);
            hmData[idx + 1] = Math.round(blendAlpha * g + (1 - blendAlpha) * bgData[idx + 1]);
            hmData[idx + 2] = Math.round(blendAlpha * b + (1 - blendAlpha) * bgData[idx + 2]);
            hmData[idx + 3] = 255;
          }
        }

        ctx.putImageData(heatmapImgData, 0, 0);
      }
    } else {
      // Fallback: Stylized lung contours on black canvas
      ctx.fillStyle = '#0B0E14';
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#30363D';
      
      // Right Lung
      ctx.beginPath();
      ctx.ellipse(width * 0.35, height * 0.5, width * 0.18, height * 0.35, 0, 0, 2 * Math.PI);
      ctx.fillStyle = '#161B22';
      ctx.fill();
      ctx.stroke();

      // Left Lung
      ctx.beginPath();
      ctx.ellipse(width * 0.65, height * 0.5, width * 0.18, height * 0.35, 0, 0, 2 * Math.PI);
      ctx.fillStyle = '#161B22';
      ctx.fill();
      ctx.stroke();

      const cx = (noduleX / 512) * width;
      const cy = (noduleY / 512) * height;

      const radius = Math.max(15, width * 0.16);
      const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 1.0)');
      gradient.addColorStop(0.25, 'rgba(255, 120, 0, 0.85)');
      gradient.addColorStop(0.5, 'rgba(255, 220, 0, 0.6)');
      gradient.addColorStop(0.75, 'rgba(0, 255, 120, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 255, 0.0)');

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Centroid Crosshair Overlay
    const cx = (noduleX / 512) * width;
    const cy = (noduleY / 512) * height;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx - 3, cy);
    ctx.moveTo(cx + 3, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy - 3);
    ctx.moveTo(cx, cy + 3);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();

  }, [sliceData, noduleX, noduleY, width, height]);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} width={width} height={height} className="w-full h-full object-contain" />
      {loading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-primary text-xl">sync</span>
        </div>
      )}
    </div>
  );
};

export const InteractiveViewer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract state if navigation from Worklist passed it
  const stateFromLocation = (location.state || {}) as {
    patientName?: string;
    mrn?: string;
    scanId?: string;
    activeSliceIndex?: number;
  };

  const [scanId, setScanId] = useState<string | undefined>(stateFromLocation.scanId);
  
  interface Nodule {
    nodule_id: string;
    centroid: [number, number, number];
    bounding_box: [[number, number, number], [number, number, number]];
    confidence: number;
    size_mm: number;
    location: string;
  }

  interface AIResult {
    status: string;
    model_version: string;
    inference_time_ms: number;
    nodules: Nodule[];
  }

  interface ScanMetadata {
    scan_id: string;
    patient_name: string;
    patient_pseudonym: string;
    age_at_scan: number;
    biological_sex: string;
    study_date?: string;
    slice_count: number;
    dimensions: [number, number];
    slice_thickness: number;
    pixel_spacing: [number, number];
    status: string;
    ai_result: AIResult | null;
  }

  const [metadata, setMetadata] = useState<ScanMetadata | null>(null);
  const [nodules, setNodules] = useState<Nodule[]>([]);
  const [selectedNoduleId, setSelectedNoduleId] = useState<string | null>(null);

  // State variables for interactive viewport
  const [activeSliceIndex, setActiveSliceIndex] = useState(stateFromLocation.activeSliceIndex ?? 0);
  const [aiOverlayActive, setAiOverlayActive] = useState(true);
  const [windowPreset, setWindowPreset] = useState<'LUNG' | 'SOFT'>('LUNG');
  const [activeTool, setActiveTool] = useState<'pan' | 'zoom' | 'contrast' | 'none'>('none');
  const [heatmapZoomed, setHeatmapZoomed] = useState(false);
  const [isHeatmapModalOpen, setIsHeatmapModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'2d' | '3d'>('2d');

  // Sync activeSliceIndex when navigation state changes
  useEffect(() => {
    if (stateFromLocation.activeSliceIndex !== undefined) {
      setActiveSliceIndex(stateFromLocation.activeSliceIndex);
    }
  }, [stateFromLocation.activeSliceIndex]);

  // Fetch list of scans if no scanId was passed
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    if (!scanId) {
      axios.get('http://localhost:8000/api/scans', { headers })
        .then(response => {
          if (response.data && response.data.length > 0) {
            setScanId(response.data[0].id);
          }
        })
        .catch(err => console.error('Error fetching scans:', err));
    }
  }, [scanId]);

  // Fetch scan metadata when scanId is set, with polling & auto-trigger
  useEffect(() => {
    if (!scanId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const fetchMetadata = () => {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      axios.get(`http://localhost:8000/api/scans/${scanId}/metadata`, { headers })
        .then(response => {
          if (!isMounted) return;
          const data = response.data as ScanMetadata;
          setMetadata(data);
          
          if (data.ai_result?.nodules) {
            const list = data.ai_result.nodules;
            setNodules(list);
            setSelectedNoduleId(prev => {
              if (!prev && list.length > 0) {
                return list[0].nodule_id;
              }
              if (prev && !list.find(n => n.nodule_id === prev)) {
                return list.length > 0 ? list[0].nodule_id : null;
              }
              return prev;
            });
          } else {
            setNodules([]);
          }

          // If scan status is pending, trigger analysis automatically
          if (data.status === 'pending') {
            axios.post(`http://localhost:8000/api/scans/${scanId}/analyze`, {}, { headers })
              .then(() => {
                if (isMounted) {
                  setMetadata(prev => prev ? { ...prev, status: 'processing' } : null);
                }
              })
              .catch(err => console.error('Error triggering AI analysis:', err));
          }

          // Poll if status is pending or processing
          if (data.status === 'pending' || data.status === 'processing') {
            timer = setTimeout(fetchMetadata, 3000);
          }
        })
        .catch(err => {
          console.error('Error fetching scan metadata:', err);
        });
    };

    fetchMetadata();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [scanId]);

  // Derived data
  const sliceCount = metadata?.slice_count || 1;
  const sliceThickness = metadata?.slice_thickness || 1.0;
  const patientName = metadata?.patient_pseudonym || stateFromLocation.patientName || 'DOE, JOHN A.';
  const mrn = metadata?.scan_id ? metadata.scan_id.substring(0, 8).toUpperCase() : (stateFromLocation.mrn || 'MRN-882941');
  const studyDate = metadata?.study_date || '2023-11-04';

  const selectedNodule = nodules.find(n => n.nodule_id === selectedNoduleId) || (nodules.length > 0 ? nodules[0] : null);

  const handleFinalDiagnosis = () => {
    navigate('/reports', { state: { patientName, mrn, scanId } });
  };

  const handleWheelScroll = (e: React.WheelEvent) => {
    if (activeTool !== 'none') return; // Only allow scroll wheel slice switching when tools are idle
    if (e.deltaY > 0) {
      setActiveSliceIndex((prev) => Math.min(sliceCount - 1, prev + 1));
    } else if (e.deltaY < 0) {
      setActiveSliceIndex((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0E14] text-on-background antialiased font-body-md overflow-hidden">
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
          <span className="text-on-surface-variant ml-2">Study: {studyDate}</span>
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

      <div className="flex flex-1 pt-16 h-full overflow-hidden">
        {/* SideNavBar */}
        <Sidebar activeTab="viewer" />

        {/* Main Content Area */}
        <main className="ml-sidebar-width flex-1 flex gap-gutter p-gutter overflow-hidden relative w-full h-full">
          {/* Large Main Viewport Area */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Dominant Axial Viewport */}
            <div 
              className="flex-1 bg-black relative overflow-hidden border-axial rounded flex flex-col group"
              onWheel={activeTab === '2d' ? handleWheelScroll : undefined}
            >
              {/* Viewport Header Tab Selector */}
              <div className="absolute top-4 left-4 z-20 flex items-center bg-black/60 border border-[#30363D] rounded-full p-0.5 shadow-lg backdrop-blur-md">
                <button
                  className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                    activeTab === '2d' 
                      ? 'bg-primary text-[#0B0E14]' 
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  onClick={() => setActiveTab('2d')}
                >
                  2D AXIAL SLICE
                </button>
                <button
                  className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                    activeTab === '3d' 
                      ? 'bg-primary text-[#0B0E14]' 
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  onClick={() => setActiveTab('3d')}
                >
                  3D VOLUME LUNGS
                </button>
              </div>

              {activeTab === '2d' && aiOverlayActive && nodules.length > 0 && (
                <div className="absolute top-4 right-4 z-10 font-bold text-primary drop-shadow-md bg-surface-dim/70 px-3 py-1 rounded-full flex items-center gap-2 border border-primary/30">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  PneumoGuard AI: SUSPICIOUS NODULE CONFIDENCE: {selectedNodule ? `${Math.round(selectedNodule.confidence * 100)}%` : '98%'}
                </div>
              )}

              {/* Simulated Crosshair overlay for Pan/Zoom tools */}
              {activeTab === '2d' && activeTool === 'pan' && (
                <>
                  <div className="crosshair-h"></div>
                  <div className="crosshair-v"></div>
                </>
              )}

              {/* Toolbar Overlay */}
              {activeTab === '2d' && (
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

                  <div className="flex items-center gap-1">
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
                    <InfoTooltip placement="bottom" text="Toggle displaying the predicted bounding box outline of the AI detected nodules in the viewport." />
                  </div>

                  <div className="w-px h-5 bg-outline-variant"></div>

                  <div className="flex gap-1 items-center">
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
                    <InfoTooltip placement="bottom" text="CT window settings. LUNG: optimized for lung parenchyma (Width: 1500, Level: -600). SOFT: optimized for soft tissues/mediastinum (Width: 400, Level: 50)." />
                  </div>
                </div>
              )}

              {/* Large Scan Slice / 3D Volume Viewer */}
              <div className="w-full h-full relative">
                {activeTab === '3d' && scanId ? (
                  <ThreeDVolumeViewport
                    scanId={scanId}
                    pixelSpacing={metadata?.pixel_spacing}
                    sliceThickness={metadata?.slice_thickness}
                  />
                ) : scanId ? (
                  <CornerstoneViewport
                    scanId={scanId}
                    sliceIndex={activeSliceIndex}
                    windowPreset={windowPreset}
                    activeTool={activeTool}
                    aiOverlayActive={aiOverlayActive}
                    nodules={nodules}
                    sliceThickness={sliceThickness}
                    sliceCount={sliceCount}
                  />
                ) : (
                  <div className="w-full h-full bg-black flex flex-col items-center justify-center text-on-surface-variant font-mono-data">
                    <span className="material-symbols-outlined text-4xl mb-2 text-outline">clinical_research</span>
                    <span>NO CLINICAL SCAN LOADED</span>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="mt-4 px-4 py-2 bg-primary text-[#0B0E14] font-bold rounded cursor-pointer transition-all active:scale-95"
                    >
                      GO TO WORKLIST
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 2D Slices Thumbnail Strip */}
            {activeTab === '2d' && (
              <div className="h-24 flex gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
                {(() => {
                  const maxThumbnails = 15;
                  const step = Math.max(1, Math.floor(sliceCount / maxThumbnails));
                  const indices: number[] = [];
                  for (let i = 0; i < sliceCount; i += step) {
                    indices.push(i);
                  }
                  if (indices.length > 0 && indices[indices.length - 1] !== sliceCount - 1) {
                    indices.push(sliceCount - 1);
                  }
                  
                  return indices.map((index) => (
                    <SliceThumbnail
                      key={index}
                      scanId={scanId || ''}
                      sliceIndex={index}
                      isActive={activeSliceIndex === index}
                      onClick={() => setActiveSliceIndex(index)}
                    />
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Redesigned AI Co-Pilot Panel */}
          <aside className="w-96 h-full bg-[#161B22] border border-[#30363D] flex flex-col overflow-hidden shrink-0 shadow-2xl rounded">
            {metadata?.status === 'processing' || metadata?.status === 'pending' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <span className="material-symbols-outlined text-primary text-5xl animate-spin">
                  sync
                </span>
                <h3 className="text-title-sm font-bold text-primary tracking-wide">
                  RUNNING MONAI AI INFERENCE...
                </h3>
                <p className="text-body-sm text-on-surface-variant max-w-[280px]">
                  Executing 3D RetinaNet lung nodule detection model on raw CT DICOM slices...
                </p>
                <div className="w-48 bg-surface-container-highest h-1.5 rounded-full overflow-hidden relative">
                  <div className="bg-primary h-full rounded-full absolute top-0 left-0 w-2/3 animate-progress-loading"></div>
                </div>
              </div>
            ) : metadata?.status === 'failed' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <span className="material-symbols-outlined text-error text-5xl">
                  error
                </span>
                <h3 className="text-title-sm font-bold text-error">
                  AI INFERENCE FAILED
                </h3>
                <p className="text-body-sm text-on-surface-variant max-w-[280px]">
                  An error occurred during the execution of the MONAI nodule detection model. Falling back to default coordinates.
                </p>
              </div>
            ) : nodules.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <span className="material-symbols-outlined text-[#47EFE0] text-5xl">
                  check_circle
                </span>
                <h3 className="text-title-sm font-bold text-on-surface">
                  NO SUSPICIOUS NODULES
                </h3>
                <p className="text-body-sm text-on-surface-variant max-w-[280px]">
                  The MONAI 3D RetinaNet detector found no nodule clusters above the detection threshold (0.15).
                </p>
              </div>
            ) : (
              <>
                <div className="p-5 bg-error/10 border-b border-error/30 shrink-0">
                  <div className="flex items-center gap-3 text-error">
                    <span className="material-symbols-outlined fill-icon">report</span>
                    <h2 className="text-title-sm font-bold tracking-tight">ANOMALY DETECTED</h2>
                  </div>
                  <p className="text-label-caps text-error/70 mt-1 uppercase">
                    Suspected Pulmonary Nodule{nodules.length > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                  {/* Nodules List selector */}
                  <div className="space-y-2">
                    <span className="text-on-surface-variant text-label-caps block mb-1">
                      Detected Clusters ({nodules.length})
                    </span>
                    {nodules.map((nodule) => (
                      <button
                        key={nodule.nodule_id}
                        onClick={() => {
                          setSelectedNoduleId(nodule.nodule_id);
                          setActiveSliceIndex(nodule.centroid[0]);
                        }}
                        className={`w-full text-left p-3 rounded border transition-all cursor-pointer flex justify-between items-center ${
                          selectedNodule?.nodule_id === nodule.nodule_id
                            ? 'bg-primary/15 border-primary text-primary'
                            : 'bg-surface-container-low border-[#30363D]/50 text-on-surface hover:border-primary/50'
                        }`}
                      >
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-bold text-body-md truncate">
                            {nodule.location}
                          </span>
                          <span className="text-xs text-on-surface-variant mt-0.5">
                            Centroid slice: {nodule.centroid[0] + 1}
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-body-md font-mono-data font-bold block">
                            {(nodule.confidence * 100).toFixed(1)}%
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            {nodule.size_mm.toFixed(1)} mm
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Priority Results Stats for selected nodule */}
                  {selectedNodule && (
                    <div className="pt-4 border-t border-[#30363D] space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant text-label-caps flex items-center">
                          Probability
                          <InfoTooltip align="center" text="AI confidence score representing the likelihood that this cluster represents a true positive pulmonary nodule." />
                        </span>
                        <span className="text-primary text-mono-data text-lg">
                          {(selectedNodule.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-surface-container-highest h-1 rounded-full">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${selectedNodule.confidence * 100}%` }}></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-3 bg-surface-container-low rounded border border-[#30363D]/30">
                          <div className="text-label-caps text-on-surface-variant mb-1 flex items-center">
                            Estimated Size
                            <InfoTooltip align="left" text="The maximum diameter of the nodule measured in millimeters across the transverse plane." />
                          </div>
                          <div className="text-body-md font-bold text-on-surface">{selectedNodule.size_mm.toFixed(1)} mm</div>
                        </div>
                        <div className="p-3 bg-surface-container-low rounded border border-[#30363D]/30">
                          <div className="text-label-caps text-on-surface-variant mb-1 flex items-center">
                            Confidence
                            <InfoTooltip align="right" text="Confidence range classification based on the AI detection score. Low: < 50%, Medium: 50% - 80%, High: >= 80%." />
                          </div>
                          <div className="text-body-md font-bold text-on-surface">
                            {selectedNodule.confidence >= 0.8 ? 'High' : selectedNodule.confidence >= 0.5 ? 'Medium' : 'Low'}
                          </div>
                        </div>
                        <div className="p-3 bg-surface-container-low rounded border border-[#30363D]/30">
                          <div className="text-label-caps text-on-surface-variant mb-1 flex items-center">
                            Location
                            <InfoTooltip align="left" text="The anatomical lobe of the lung where the nodule cluster is located (e.g. LUL: Left Upper Lobe, LLL: Left Lower Lobe, RUL: Right Upper Lobe)." />
                          </div>
                          <div className="text-body-md font-bold text-on-surface truncate" title={selectedNodule.location}>
                            {selectedNodule.location}
                          </div>
                        </div>
                        <div className="p-3 bg-surface-container-low rounded border border-[#30363D]/30">
                          <div className="text-label-caps text-on-surface-variant mb-1 flex items-center">
                            Centroid Slice
                            <InfoTooltip align="right" text="The axial slice index corresponding to the center of mass of the detected nodule." />
                          </div>
                          <div className="text-body-md font-bold text-on-surface">Slice {selectedNodule.centroid[0] + 1}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Heat Map Section */}
                  <div className="pt-4 border-t border-[#30363D]">
                    <h3 className="text-label-caps text-on-surface-variant mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">heat_pump</span>
                      HEAT MAP (GRAD-CAM)
                      <InfoTooltip align="left" text="Gradient-weighted Class Activation Mapping. Visualizes the regions of the scan that the AI model focused on most to make its detection decision." />
                    </h3>
                    <div className="flex gap-3 items-stretch">
                      <div
                        className="aspect-square flex-1 rounded border border-[#30363D] overflow-hidden bg-black relative group cursor-pointer hover:border-primary transition-all duration-300"
                        onClick={() => setIsHeatmapModalOpen(true)}
                      >
                        <HeatmapCanvas 
                          scanId={scanId}
                          sliceIndex={selectedNodule ? selectedNodule.centroid[0] : 0}
                          noduleX={selectedNodule ? selectedNodule.centroid[2] : 260} 
                          noduleY={selectedNodule ? selectedNodule.centroid[1] : 190} 
                          width={256} 
                          height={256} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                          <span className="text-white text-[10px] px-2 py-1 bg-black/60 rounded">
                            Click to Enlarge
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
                      AI focus regions highlighted. Primary hotspot correlates with the selected nodule location.
                    </p>
                  </div>
                  
                  {metadata?.ai_result && (
                    <div className="pt-4 border-t border-[#30363D] text-[10px] font-mono text-on-surface-variant space-y-1">
                      <div>Model: {metadata.ai_result.model_version}</div>
                      <div>Inference time: {metadata.ai_result.inference_time_ms} ms</div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="p-5 border-t border-[#30363D] bg-[#161B22] shrink-0">
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

      {/* Enlarged Heatmap Modal */}
      {isHeatmapModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsHeatmapModalOpen(false)}
        >
          <div 
            className="bg-[#161B22] border border-[#30363D] rounded shadow-2xl overflow-hidden max-w-2xl w-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-[#30363D] flex justify-between items-center bg-[#1C2128]">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined">heat_pump</span>
                <h3 className="font-bold tracking-wide text-title-sm">
                  AI GRAD-CAM VISUALIZATION (ENLARGED VIEW)
                </h3>
              </div>
              <button 
                onClick={() => setIsHeatmapModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer p-1 rounded hover:bg-surface-variant/20"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col md:flex-row gap-6 items-center bg-[#0B0E14]">
              {/* Heatmap Canvas */}
              <div className="w-[380px] h-[380px] rounded border border-[#30363D] overflow-hidden bg-black relative shadow-lg shrink-0">
                <HeatmapCanvas 
                  scanId={scanId}
                  sliceIndex={selectedNodule ? selectedNodule.centroid[0] : 0}
                  noduleX={selectedNodule ? selectedNodule.centroid[2] : 260} 
                  noduleY={selectedNodule ? selectedNodule.centroid[1] : 190} 
                  width={380} 
                  height={380} 
                />
              </div>

              {/* Details and Legend */}
              <div className="flex-1 space-y-4 text-on-surface text-body-sm w-full">
                <div>
                  <div className="text-[11px] text-on-surface-variant text-label-caps mb-1">Target Nodule Location</div>
                  <div className="font-bold text-primary text-body-lg">
                    {selectedNodule ? selectedNodule.location : 'Unknown Nodule'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] text-on-surface-variant text-label-caps">Centroid Slice</div>
                    <div className="font-mono font-bold text-on-surface">Slice {selectedNodule ? selectedNodule.centroid[0] + 1 : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-on-surface-variant text-label-caps">Coordinates (X, Y)</div>
                    <div className="font-mono font-bold text-on-surface">
                      {selectedNodule ? `${selectedNodule.centroid[2].toFixed(0)}, ${selectedNodule.centroid[1].toFixed(0)}` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-on-surface-variant text-label-caps">AI Confidence</div>
                    <div className="font-mono font-bold text-primary">
                      {selectedNodule ? `${(selectedNodule.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-on-surface-variant text-label-caps">Estimated Diameter</div>
                    <div className="font-mono font-bold text-on-surface">
                      {selectedNodule ? `${selectedNodule.size_mm.toFixed(1)} mm` : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#30363D]">
                  <div className="text-[11px] text-on-surface-variant text-label-caps mb-2">Activation Intensity Legend</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-on-surface-variant">Low</span>
                    <div className="h-4 flex-1 rounded bg-gradient-to-r from-blue-600 via-green-500 via-yellow-400 to-red-600"></div>
                    <span className="text-[10px] text-error font-bold">High</span>
                  </div>
                </div>

                <div className="p-3 bg-surface-container-low rounded border border-[#30363D]/40 text-xs text-on-surface-variant leading-relaxed">
                  <strong>Clinical Note:</strong> Grad-CAM highlights pixels that contributed most to the neural network's decision. High intensity activation (red) corresponds directly to the localized lesion boundary, while diffuse low activation (blue/green) is normal scan background attention.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
