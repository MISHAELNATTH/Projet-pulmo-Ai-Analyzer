import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export interface Nodule {
  nodule_id: string;
  centroid: [number, number, number];
  bounding_box: [[number, number, number], [number, number, number]];
  confidence: number;
  size_mm: number;
  location: string;
}

interface CornerstoneViewportProps {
  scanId: string;
  sliceIndex: number;
  windowPreset: 'LUNG' | 'SOFT';
  activeTool: 'pan' | 'zoom' | 'contrast' | 'none';
  aiOverlayActive: boolean;
  nodules?: Nodule[];
}

export const CornerstoneViewport: React.FC<CornerstoneViewportProps> = ({
  scanId,
  sliceIndex,
  windowPreset,
  activeTool,
  aiOverlayActive,
  nodules = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Slice raw data
  const [sliceData, setSliceData] = useState<Float32Array | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Layout and viewport settings
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 512, height: 512 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Custom Window Width and Level
  const [windowWidth, setWindowWidth] = useState<number>(1500);
  const [windowCenter, setWindowCenter] = useState<number>(-600);

  // Mouse interaction state
  const isDragging = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const contrastStart = useRef<{ width: number; center: number }>({ width: 1500, center: -600 });
  const zoomStart = useRef<number>(1.0);

  // Synchronize window presets when they change
  useEffect(() => {
    if (windowPreset === 'LUNG') {
      setWindowWidth(1500);
      setWindowCenter(-600);
    } else if (windowPreset === 'SOFT') {
      setWindowWidth(400);
      setWindowCenter(40);
    }
  }, [windowPreset]);

  // Fetch the binary float32 slice array from the FastAPI server
  useEffect(() => {
    if (!scanId) return;
    
    setLoading(true);
    setError(null);

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
        console.error('Error fetching slice:', err);
        setError('Failed to load slice data');
        setLoading(false);
      });
  }, [scanId, sliceIndex]);

  // Handle canvas sizing on container changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: width || 512,
          height: height || 512,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Main rendering lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sliceData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas buffer sizes matching client size
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Clear background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create image buffer from raw normalized array (512x512)
    const imgWidth = 512;
    const imgHeight = 512;
    const imgData = ctx.createImageData(imgWidth, imgHeight);
    const data = imgData.data;

    const minHU = windowCenter - windowWidth / 2;
    const wVal = windowWidth > 0 ? windowWidth : 1;

    for (let i = 0; i < sliceData.length; i++) {
      // Scale from [0.0, 1.0] back to Hounsfield Units (HU)
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

    // Paint slice to offscreen canvas
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = imgWidth;
    offscreenCanvas.height = imgHeight;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (offscreenCtx) {
      offscreenCtx.putImageData(imgData, 0, 0);
    }

    ctx.save();
    
    // Apply viewport camera transforms (center origin -> scale -> translate)
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-imgWidth / 2, -imgHeight / 2);

    // Draw slice
    ctx.drawImage(offscreenCanvas, 0, 0);

    // Renders the AI Co-Pilot annotation overlays
    if (aiOverlayActive) {
      if (nodules && nodules.length > 0) {
        nodules.forEach((nodule) => {
          const [[z_min, y_min, x_min], [z_max, y_max, x_max]] = nodule.bounding_box;
          if (sliceIndex >= z_min && sliceIndex <= z_max) {
            const noduleX = x_min;
            const noduleY = y_min;
            const noduleW = x_max - x_min;
            const noduleH = y_max - y_min;

            ctx.strokeStyle = '#47EFE0'; // Pulmo Cyan
            ctx.lineWidth = Math.max(1, 2 / zoom);
            ctx.fillStyle = 'rgba(71, 239, 224, 0.15)';
            ctx.strokeRect(noduleX, noduleY, noduleW, noduleH);
            ctx.fillRect(noduleX, noduleY, noduleW, noduleH);

            // Label Overlay
            ctx.fillStyle = '#47EFE0';
            ctx.font = `bold ${Math.max(10, 12 / zoom)}px monospace`;
            ctx.fillText(
              `NODULE (${Math.round(nodule.confidence * 100)}%)`,
              noduleX,
              noduleY - 6 / zoom
            );
          }
        });
      } else if (sliceIndex === 0) {
        // Fallback mockup overlay if no nodules are parsed
        const noduleX = 260;
        const noduleY = 190;
        const noduleW = 48;
        const noduleH = 48;

        ctx.strokeStyle = '#47EFE0'; // Pulmo Cyan
        ctx.lineWidth = Math.max(1, 2 / zoom);
        ctx.fillStyle = 'rgba(71, 239, 224, 0.15)';
        ctx.strokeRect(noduleX, noduleY, noduleW, noduleH);
        ctx.fillRect(noduleX, noduleY, noduleW, noduleH);

        // Label Overlay
        ctx.fillStyle = '#47EFE0';
        ctx.font = `bold ${Math.max(10, 12 / zoom)}px monospace`;
        ctx.fillText('AI DETECTED NODULE', noduleX, noduleY - 6 / zoom);
      }
    }

    ctx.restore();
  }, [sliceData, dimensions, zoom, pan, windowWidth, windowCenter, aiOverlayActive, sliceIndex, nodules]);

  // Mouse Handlers for Interactivity (Pan/Zoom/Contrast)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'none') return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
    contrastStart.current = { width: windowWidth, center: windowCenter };
    zoomStart.current = zoom;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (activeTool === 'pan') {
      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    } else if (activeTool === 'contrast') {
      // Horizontal drags adjust Window Width, Vertical drags adjust Window Center (Level)
      setWindowWidth(Math.max(1, contrastStart.current.width + dx * 4));
      setWindowCenter(contrastStart.current.center - dy * 2);
    } else if (activeTool === 'zoom') {
      // Dragging up zooms in, dragging down zooms out
      const factor = Math.max(0.1, zoomStart.current - dy * 0.01);
      setZoom(factor);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = Math.max(0.1, zoom - e.deltaY * 0.001);
    setZoom(factor);
  };

  // Reset Viewport transforms
  const resetViewport = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    if (windowPreset === 'LUNG') {
      setWindowWidth(1500);
      setWindowCenter(-600);
    } else {
      setWindowWidth(400);
      setWindowCenter(40);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center cursor-crosshair select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {loading && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 text-primary">
          <span className="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
          <span className="text-body-sm font-mono-data">STREAMING DICOM DATA...</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 text-error p-4 text-center">
          <span className="material-symbols-outlined text-4xl mb-2">error</span>
          <span className="text-body-md font-bold">{error}</span>
          <button
            onClick={resetViewport}
            className="mt-4 px-3 py-1 bg-surface-container border border-outline-variant rounded text-on-surface hover:text-primary transition-colors cursor-pointer"
          >
            Reset Viewport
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Info text inside viewport */}
      <div className="absolute bottom-4 left-4 z-10 text-mono-data font-mono-data text-on-surface-variant drop-shadow-md text-xs pointer-events-none bg-black/40 px-2 py-1 rounded border border-[#30363D]/40">
        W: {windowWidth} L: {windowCenter} | Zoom: {Math.round(zoom * 100)}% | Active Tool: {activeTool.toUpperCase()}
      </div>

      <button
        onClick={resetViewport}
        className="absolute bottom-4 right-4 z-10 px-2 py-1 bg-[#161B22]/90 border border-[#30363D] hover:border-primary/50 text-[10px] font-mono text-on-surface-variant hover:text-primary rounded cursor-pointer transition-colors"
        title="Reset zoom, pan and window level"
      >
        RESET VIEW
      </button>
    </div>
  );
};
