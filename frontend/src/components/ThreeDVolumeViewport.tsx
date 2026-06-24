import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import * as THREE from 'three';

interface Nodule {
  nodule_id: string;
  centroid: [number, number, number]; // [Z, Y, X]
  centered_centroid?: [number, number, number]; // [centered_x, centered_y, centered_z]
  confidence: number;
  size_mm: number;
  location: string;
}

interface ThreeDVolumeViewportProps {
  scanId: string;
  pixelSpacing?: [number, number]; // [row_spacing, col_spacing]
  sliceThickness?: number;
}

export const ThreeDVolumeViewport: React.FC<ThreeDVolumeViewportProps> = ({
  scanId,
  pixelSpacing = [0.75, 0.75],
  sliceThickness = 1.25,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nodules, setNodules] = useState<Nodule[]>([]);
  const [meshStats, setMeshStats] = useState({ vertices: 0, faces: 0 });

  // Orbit control states for HUD overlay display
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotX, setRotX] = useState<number>(-0.4);
  const [rotY, setRotY] = useState<number>(0.6);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Mesh & Node state
  const [meshData, setMeshData] = useState<{
    vertices: [number, number, number][];
    faces: [number, number, number][];
    nodules: Nodule[];
  } | null>(null);

  // References for rendering and animation loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const lungMeshRef = useRef<THREE.Mesh | null>(null);
  const pulseMeshesRef = useRef<THREE.Mesh[]>([]);

  // Interactive rotation state references (avoids re-creating WebGL contexts on state change)
  const phiRef = useRef<number>(Math.PI / 2 - 0.4); // vertical rotation
  const thetaRef = useRef<number>(0.6); // horizontal rotation
  const zoomRef = useRef<number>(1.0);
  const isDragging = useRef<boolean>(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

  // Sync state values to references for the animation frame loop
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    thetaRef.current = rotY;
    phiRef.current = Math.PI / 2 + rotX;
  }, [rotX, rotY]);

  // 1. Fetch 3D mesh data on scanId change
  useEffect(() => {
    if (!scanId) return;

    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios
      .get(`http://localhost:8000/api/scans/${scanId}/3d-volume`, { headers })
      .then((response) => {
        const data = response.data;
        if (!data.vertices || data.vertices.length === 0) {
          setError('No 3D lung mesh data found.');
          setLoading(false);
          return;
        }

        setMeshData({
          vertices: data.vertices,
          faces: data.faces,
          nodules: data.nodules || [],
        });
        setMeshStats({
          vertices: data.vertices.length,
          faces: data.faces.length,
        });
        setNodules(data.nodules || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching 3D volume:', err);
        setError('Failed to load 3D volume reconstruction data.');
        setLoading(false);
      });
  }, [scanId]);

  // 2. Initialize Three.js Scene and Render Loop
  useEffect(() => {
    if (!meshData) return;

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 512;
    const height = container.clientHeight || 512;

    // Create Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090c10); // clinical dark background
    sceneRef.current = scene;

    // Create Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    cameraRef.current = camera;

    // Create WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Clear mount point and append renderer canvas
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(renderer.domElement);
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(200, 400, 200);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x47efe0, 0.4); // glowing cyan fill light
    dirLight2.position.set(-200, -400, -200);
    scene.add(dirLight2);

    // Build lung mesh geometry
    const geometry = new THREE.BufferGeometry();
    
    // Flatten vertices: Map [Z_phys, Y_phys, X_phys] -> Three.js [X_phys, Z_phys, Y_phys]
    const positionArray = new Float32Array(meshData.vertices.length * 3);
    for (let i = 0; i < meshData.vertices.length; i++) {
      const [pz, py, px] = meshData.vertices[i];
      positionArray[i * 3] = px;      // X
      positionArray[i * 3 + 1] = pz;  // Y
      positionArray[i * 3 + 2] = py;  // Z
    }

    // Flatten faces
    const indexArray = new Uint32Array(meshData.faces.length * 3);
    for (let i = 0; i < meshData.faces.length; i++) {
      indexArray[i * 3] = meshData.faces[i][0];
      indexArray[i * 3 + 1] = meshData.faces[i][1];
      indexArray[i * 3 + 2] = meshData.faces[i][2];
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
    geometry.computeVertexNormals();

    // Standard clinical mesh material
    const lungMaterial = new THREE.MeshStandardMaterial({
      color: 0x47efe0,
      roughness: 0.35,
      metalness: 0.15,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false, // eliminates semi-transparent polygon overlapping sorting bugs
    });

    const lungMesh = new THREE.Mesh(geometry, lungMaterial);
    scene.add(lungMesh);
    lungMeshRef.current = lungMesh;

    // Subtle diagnostic grid helper below the lungs
    const gridHelper = new THREE.GridHelper(300, 20, 0x30363d, 0x1f242c);
    gridHelper.position.y = -150;
    scene.add(gridHelper);

    // Add Tumor Nodules
    const tumorMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0x660000,
      roughness: 0.1,
      metalness: 0.1,
    });

    pulseMeshesRef.current = [];

    meshData.nodules.forEach((nodule) => {
      const size = nodule.size_mm || 14.0;
      const radius = size / 2.0;

      // Sphere mesh representing tumor
      const sphereGeom = new THREE.SphereGeometry(radius, 32, 32);
      const sphereMesh = new THREE.Mesh(sphereGeom, tumorMaterial);
      
      const centroid = nodule.centered_centroid || [0, 0, 0];
      // Centered centroid: [X, Y, Z]
      // Three.js: X, Y = physical Z (centroid[2]), Z = physical Y (centroid[1])
      sphereMesh.position.set(centroid[0], centroid[2], centroid[1]);
      scene.add(sphereMesh);

      // Dedicated tumor point light to illuminate it inside the lung cavity
      const tumorLight = new THREE.PointLight(0xff3333, 2.0, 100);
      tumorLight.position.copy(sphereMesh.position);
      scene.add(tumorLight);

      // Glowing outer halo mesh for attention visual
      const haloGeom = new THREE.SphereGeometry(radius * 2.2, 16, 16);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      });
      const haloMesh = new THREE.Mesh(haloGeom, haloMaterial);
      haloMesh.position.copy(sphereMesh.position);
      scene.add(haloMesh);

      // Precise 3D target crosshair markers passing through the centroid
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.5,
      });
      const lineLength = Math.max(30, size * 2.5);

      // X-Axis line (Sagittal projection line)
      const xGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-lineLength, 0, 0),
        new THREE.Vector3(lineLength, 0, 0)
      ]);
      const xLine = new THREE.Line(xGeometry, lineMaterial);
      xLine.position.copy(sphereMesh.position);
      scene.add(xLine);

      // Y-Axis line (Three.js Y corresponds to physical Z / Axial projection line)
      const yGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -lineLength, 0),
        new THREE.Vector3(0, lineLength, 0)
      ]);
      const yLine = new THREE.Line(yGeometry, lineMaterial);
      yLine.position.copy(sphereMesh.position);
      scene.add(yLine);

      // Z-Axis line (Three.js Z corresponds to physical Y / Coronal projection line)
      const zGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -lineLength),
        new THREE.Vector3(0, 0, lineLength)
      ]);
      const zLine = new THREE.Line(zGeometry, lineMaterial);
      zLine.position.copy(sphereMesh.position);
      scene.add(zLine);

      // Pulsing wireframe outer boundaries representing calculated diagnostic limits
      const pulseGeom = new THREE.SphereGeometry(radius * 1.3, 16, 16);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0xff3333,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      const pulseMesh = new THREE.Mesh(pulseGeom, pulseMat);
      pulseMesh.position.copy(sphereMesh.position);
      scene.add(pulseMesh);
      pulseMeshesRef.current.push(pulseMesh);
    });

    // Resize observer to scale renderer canvas dynamically
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        const newW = w || 512;
        const newH = h || 512;

        renderer.setSize(newW, newH);
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(container);

    // Camera updates based on spherical coordinates
    const renderLoop = () => {
      if (autoRotate && !isDragging.current) {
        thetaRef.current = (thetaRef.current + 0.004) % (2 * Math.PI);
      }

      // Animate pulsing wireframe halos
      pulseMeshesRef.current.forEach((pm) => {
        const scaleVal = 1.0 + 0.12 * Math.sin(Date.now() * 0.005);
        pm.scale.set(scaleVal, scaleVal, scaleVal);
        pm.rotation.y += 0.005;
        pm.rotation.x += 0.003;
      });

      const cameraDistance = 350 * zoomRef.current;
      const phi = phiRef.current;
      const theta = thetaRef.current;

      const cx = cameraDistance * Math.sin(phi) * Math.sin(theta);
      const cy = cameraDistance * Math.cos(phi);
      const cz = cameraDistance * Math.sin(phi) * Math.cos(theta);

      camera.position.set(cx, cy, cz);
      camera.lookAt(0, 0, 0);

      // Follow lights
      dirLight1.position.set(cx + 100, cy + 200, cz + 100);

      renderer.render(scene, camera);
      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    // Clean up Three.js components and event bindings
    return () => {
      resizeObserver.disconnect();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
      geometry.dispose();
      lungMaterial.dispose();
      tumorMaterial.dispose();
      renderer.dispose();
    };
  }, [meshData, autoRotate]);

  // Drag interaction events
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    thetaRef.current = thetaRef.current + dx * 0.007;
    phiRef.current = Math.max(0.1, Math.min(Math.PI - 0.1, phiRef.current + dy * 0.007));

    // Update state to trigger HUD text overlays refresh
    setRotY(thetaRef.current);
    setRotX(phiRef.current - Math.PI / 2);

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Zooming with wheel scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.max(0.2, Math.min(4.0, zoomRef.current + e.deltaY * 0.001));
    zoomRef.current = newZoom;
    setZoom(newZoom);
  };

  // Reset viewport
  const handleDoubleClick = () => {
    thetaRef.current = 0.6;
    phiRef.current = Math.PI / 2 - 0.4;
    zoomRef.current = 1.0;
    setRotY(0.6);
    setRotX(-0.4);
    setZoom(1.0);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#090C10] overflow-hidden flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      {loading && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 text-primary">
          <span className="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
          <span className="text-body-sm font-mono-data">RECONSTRUCTING 3D LUNG MESH...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 text-error p-4 text-center">
          <span className="material-symbols-outlined text-4xl mb-2">error</span>
          <span className="text-body-md font-bold">{error}</span>
          <button
            onClick={() => setLoading(true)}
            className="mt-4 px-3 py-1 bg-surface-container border border-outline-variant rounded text-on-surface hover:text-primary transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* WebGL Mount Point */}
      <div ref={mountRef} className="block w-full h-full" />

      {/* 3D Visualizer HUD Control Overlays */}
      {!loading && !error && (
        <>
          <div className="absolute top-4 left-4 z-10 text-[10px] font-mono bg-black/50 p-2.5 rounded border border-[#30363D]/40 text-on-surface-variant flex flex-col gap-1 pointer-events-none">
            <span className="text-primary font-bold">3D ANATOMICAL RENDERING</span>
            <span>Lungs Mesh: Solid surface model</span>
            <span>Vertices: {meshStats.vertices.toLocaleString()} | Faces: {meshStats.faces.toLocaleString()}</span>
            <span>Nodules Detected: {nodules.length}</span>
          </div>

          {nodules.length > 0 && (
            <div className="absolute top-20 left-4 z-10 text-[10px] font-mono bg-black/60 p-2.5 rounded border border-[#30363D]/40 text-on-surface-variant w-48 flex flex-col gap-1">
              <span className="text-error font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                TUMOR HOTSPOT DETECTED
              </span>
              <span>Location: {nodules[0].location || 'N/A'}</span>
              <span>Est. Size: {nodules[0].size_mm?.toFixed(1) || 'N/A'} mm</span>
              <span>Confidence: {(nodules[0].confidence * 100).toFixed(1)}%</span>
            </div>
          )}

          <div className="absolute top-4 right-4 z-10 text-[10px] font-mono bg-black/50 p-2.5 rounded border border-[#30363D]/40 text-on-surface-variant text-right pointer-events-none">
            <span className="text-white">Mouse Drag: Rotate Lungs</span>
            <br />
            <span>Scroll: Zoom In/Out</span>
            <br />
            <span>Double-Click: Reset Camera</span>
          </div>

          <div className="absolute bottom-4 left-4 z-10 text-[9px] font-mono bg-black/60 p-2 rounded border border-[#30363D]/40 text-on-surface-variant flex gap-4 pointer-events-none">
            <span>Rot-X: {Math.round(rotX * (180 / Math.PI))}°</span>
            <span>Rot-Y: {Math.round(rotY * (180 / Math.PI))}°</span>
            <span>Zoom: {Math.round(zoom * 100)}%</span>
          </div>

          {/* Color Ramp Legend */}
          <div className="absolute bottom-4 right-4 z-10 text-[10px] font-mono bg-black/60 p-2.5 rounded border border-[#30363D]/40 text-on-surface-variant w-44">
            <div className="mb-1 text-[9px] text-center">Tumor Attention Intensity</div>
            <div className="h-2.5 w-full rounded bg-gradient-to-r from-blue-600 via-green-500 via-yellow-400 to-red-600"></div>
            <div className="flex justify-between mt-1 text-[8px]">
              <span>Normal</span>
              <span className="text-error font-bold">High</span>
            </div>
          </div>

          {/* Auto Rotation Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAutoRotate(!autoRotate);
            }}
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 text-[10px] font-mono rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
              autoRotate
                ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30'
                : 'bg-[#161B22]/90 border-[#30363D] text-on-surface-variant hover:text-white hover:border-primary/50'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">
              {autoRotate ? 'pause' : 'play_arrow'}
            </span>
            {autoRotate ? 'PAUSE ROTATION' : 'AUTO ROTATE'}
          </button>
        </>
      )}
    </div>
  );
};
