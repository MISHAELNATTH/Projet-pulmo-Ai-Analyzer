import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

type HelpSection = 'getting-started' | 'viewer-tools' | 'parameters' | 'reporting' | 'archive' | 'faqs';

interface ToolDetail {
  name: string;
  icon: string;
  action: string;
  description: string;
  tip: string;
}

export const HelpGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState<HelpSection>('getting-started');
  const [selectedSimTool, setSelectedSimTool] = useState<string>('windowing');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Tools definition for interactive simulator
  const toolsList: Record<string, ToolDetail> = {
    windowing: {
      name: 'Windowing (Contrast/Brightness)',
      icon: 'contrast',
      action: 'Left-click & Drag on Viewport',
      description: 'Adjusts the Window Width (WW) and Window Level (WL) of the CT scan. Window width controls the contrast range, while window level controls the overall brightness of the image.',
      tip: 'Drag horizontally to change contrast (WW) and vertically to adjust brightness (WL). Ideal for switching between lung window (-600 WL / 1500 WW) and mediastinum window (40 WL / 350 WW).'
    },
    zooming: {
      name: 'Zooming',
      icon: 'zoom_in',
      action: 'Mouse Scroll OR Select Zoom Tool + Drag Vertically',
      description: 'Enlarges or shrinks the active slice in the viewport. By default, scrolling the mouse wheel without selecting the Zoom tool navigates through the slices. Selecting the Zoom tool changes mouse scroll/drag to adjust magnification.',
      tip: 'Double-click the viewport to instantly reset the magnification and center the slice.'
    },
    panning: {
      name: 'Panning',
      icon: 'pan_tool',
      action: 'Select Pan Tool + Click & Drag',
      description: 'Moves the image around the viewport screen once you have zoomed in. Essential for inspectively scanning outlying lung margins or peripheral nodules.',
      tip: 'Hold the spacebar or middle mouse button to pan quickly without changing your active tool.'
    },
    toggle_ai: {
      name: 'Toggle AI Overlay',
      icon: 'visibility',
      action: 'Click the Eye Icon on the Toolbar',
      description: 'Shows or hides the AI bounding box contours and predicted nodule overlays on the viewport. Toggling this off lets you perform unassisted visual scans of the raw slices.',
      tip: 'Use this button to quickly toggle between raw DICOM slice visualization and AI-assisted segmentation overlay.'
    },
    threed: {
      name: '3D Lung Volume Mesh',
      icon: 'spatial_tracking',
      action: 'Toggle 3D Viewport Tab',
      description: 'Renders an interactive, solid, semi-transparent 3D mesh model of the patient\'s lungs reconstructed via Marching Cubes, mapping the exact spatial coordinates of detected nodules as glowing red spheres.',
      tip: 'Drag to rotate the model, scroll to zoom, and hover over the red tumor sphere to view its details. Use this view to communicate nodule locations to surgical or biopsy teams.'
    }
  };

  const faqs = [
    {
      q: "Why do the nodules found by the AI sometimes not match the coordinates in my manual annotation.csv?",
      a: "The AI model runs in RAS (Right-Anterior-Superior) space, but the patient CT coordinate system inside DICOMs is defined in LPS (Left-Posterior-Superior) physical space. The viewer calculates the exact LPS world coordinates by mapping voxel indices [Z, Y, X] using the ImagePositionPatient and ImageOrientationPatient directions from the DICOM headers. When cross-checking with annotation CSVs, ensure you are comparing physical world coordinates (LPS) rather than voxel indices, as pixel spacing and slice thickness rescale the indices."
    },
    {
      q: "What does the AI Confidence threshold (0.15) represent?",
      a: "RetinaNet classification subnet outputs raw logit values for candidates. These are converted to probabilities using a Sigmoid function. We enforce a threshold of 0.15 (15%). Detections below this score are filtered out as noise. Higher thresholds yield fewer false positives but might miss faint ground-glass nodules."
    },
    {
      q: "Can I edit a report after it has been signed and locked?",
      a: "No. Clicking 'Sign & Lock' permanently freezes the diagnostic data and clinical impressions. This copies the locked state to the database and generates a secure report. Finalizing the study locks it to ensure regulatory audit integrity, and propagates the report to the Archive page."
    },
    {
      q: "How does the scroll wheel interact with zooming vs. slice navigation?",
      a: "To prevent accidental zooming when you just want to browse slices, the mouse scroll wheel is locked to slice navigation. When you want to zoom, select the Zoom tool from the top toolbar first, then scroll or click-drag to adjust magnification. Deselecting the Zoom tool returns the scroll wheel to slice navigation."
    },
    {
      q: "How does the platform handle downsampling for CPU runtimes?",
      a: "For servers running on CPU rather than GPU (CUDA), the raw 3D volume is dynamically downsampled to (192, 192, 64) voxels using trilinear interpolation to avoid system memory exhaustion. The NoduleDetector then scales the bounding boxes back to the original voxel space (e.g. 512, 512, slice_count) so the user gets correct physical dimensions."
    }
  ];

  return (
    <div className="min-h-screen w-screen flex flex-col bg-[#0B0E14] text-on-background antialiased font-body-md overflow-hidden">
      {/* Full Width TopNavBar */}
      <header className="h-16 bg-surface-dim/80 backdrop-blur-md border-b border-[#30363D] flex justify-between items-center px-4 fixed top-0 left-0 w-full z-40">
        <div className="flex items-center space-x-3">
          <span className="material-symbols-outlined text-primary text-2xl">pulmonology</span>
          <span className="text-title-sm font-title-sm font-bold text-primary tracking-widest uppercase">
            PneumoGuard AI
          </span>
          <div className="h-4 w-px bg-outline-variant mx-2"></div>
          <span className="text-mono-data font-mono-data text-on-surface-variant uppercase text-xs">Help & User Guide</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-mono-data text-[10px] text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase">
            System Guide v1.2.0
          </span>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* Sidebar Navigation */}
        <Sidebar activeTab="help" />

        {/* Main Content Layout */}
        <main className="flex-1 ml-sidebar-width h-[calc(100vh-4rem)] overflow-y-auto bg-surface-dim p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Header Title Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary-container/20 to-surface-container-high/40 p-8 border border-[#30363D] shadow-lg">
              <div className="relative z-10 space-y-2">
                <h1 className="text-2xl font-bold text-white tracking-wide">PneumoGuard AI Reference Manual</h1>
                <p className="text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
                  Welcome to the platform user guide. Use the tabs below to explore instructions for scan uploading, PACS viewer features, parameters calculation, reporting workflows, and report archives.
                </p>
              </div>
              <div className="absolute right-8 bottom-0 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-[140px] text-primary">menu_book</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#30363D] overflow-x-auto space-x-2 pb-px">
              <button
                onClick={() => setActiveSection('getting-started')}
                className={`px-4 py-2.5 font-medium text-body-sm transition-all duration-100 flex items-center space-x-2 border-b-2 cursor-pointer ${
                  activeSection === 'getting-started'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-on-surface-variant hover:text-white hover:border-outline'
                }`}
              >
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                <span>Getting Started</span>
              </button>
              
              <button
                onClick={() => setActiveSection('viewer-tools')}
                className={`px-4 py-2.5 font-medium text-body-sm transition-all duration-100 flex items-center space-x-2 border-b-2 cursor-pointer ${
                  activeSection === 'viewer-tools'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-on-surface-variant hover:text-white hover:border-outline'
                }`}
              >
                <span className="material-symbols-outlined text-sm">build</span>
                <span>Viewer Tools</span>
              </button>

              <button
                onClick={() => setActiveSection('parameters')}
                className={`px-4 py-2.5 font-medium text-body-sm transition-all duration-100 flex items-center space-x-2 border-b-2 cursor-pointer ${
                  activeSection === 'parameters'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-on-surface-variant hover:text-white hover:border-outline'
                }`}
              >
                <span className="material-symbols-outlined text-sm">settings_input_component</span>
                <span>Calculated Parameters</span>
              </button>

              <button
                onClick={() => setActiveSection('reporting')}
                className={`px-4 py-2.5 font-medium text-body-sm transition-all duration-100 flex items-center space-x-2 border-b-2 cursor-pointer ${
                  activeSection === 'reporting'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-on-surface-variant hover:text-white hover:border-outline'
                }`}
              >
                <span className="material-symbols-outlined text-sm">assignment</span>
                <span>Reporting System</span>
              </button>

              <button
                onClick={() => setActiveSection('archive')}
                className={`px-4 py-2.5 font-medium text-body-sm transition-all duration-100 flex items-center space-x-2 border-b-2 cursor-pointer ${
                  activeSection === 'archive'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-on-surface-variant hover:text-white hover:border-outline'
                }`}
              >
                <span className="material-symbols-outlined text-sm">inventory_2</span>
                <span>Study Archive</span>
              </button>

              <button
                onClick={() => setActiveSection('faqs')}
                className={`px-4 py-2.5 font-medium text-body-sm transition-all duration-100 flex items-center space-x-2 border-b-2 cursor-pointer ${
                  activeSection === 'faqs'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-on-surface-variant hover:text-white hover:border-outline'
                }`}
              >
                <span className="material-symbols-outlined text-sm">help_outline</span>
                <span>FAQs & Support</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="glass-panel p-6 rounded-xl border border-[#30363D] bg-[#161b22]/40 min-h-[400px]">
              
              {/* SECTION 1: GETTING STARTED */}
              {activeSection === 'getting-started' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center space-x-3 pb-3 border-b border-[#30363D]">
                    <span className="material-symbols-outlined text-primary text-2xl">rocket_launch</span>
                    <h2 className="text-title-md font-title-md text-white">Getting Started & Scan Uploads</h2>
                  </div>

                  <p className="text-body-md text-on-surface-variant leading-relaxed">
                    PneumoGuard AI integrates high-performance computer vision algorithms with standard clinical imaging database features. Follow these steps to ingest and analyze a patient study:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-[#1C2128]/50 border border-[#30363D] rounded-lg space-y-2">
                      <div className="flex items-center space-x-2 text-primary font-bold">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">1</span>
                        <span>Select DICOM Folder</span>
                      </div>
                      <p className="text-body-sm text-on-surface-variant">
                        Go to the <strong>Worklist</strong> page, click the <strong>Add Study</strong> button, and upload a directory containing your clinical CT scan slices (must be <code>.dcm</code> format).
                      </p>
                    </div>

                    <div className="p-4 bg-[#1C2128]/50 border border-[#30363D] rounded-lg space-y-2">
                      <div className="flex items-center space-x-2 text-primary font-bold">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">2</span>
                        <span>Ingest & Verify Metadata</span>
                      </div>
                      <p className="text-body-sm text-on-surface-variant">
                        The dashboard extracts DICOM header metadata (Patient Name, MRN, Birth Date, and Series UID) for your review. Click <strong>Save Study</strong> to confirm.
                      </p>
                    </div>

                    <div className="p-4 bg-[#1C2128]/50 border border-[#30363D] rounded-lg space-y-2">
                      <div className="flex items-center space-x-2 text-primary font-bold">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">3</span>
                        <span>Automated AI Inference</span>
                      </div>
                      <p className="text-body-sm text-on-surface-variant">
                        The study enters the analysis queue. The backend executes 3D volume processing using the pretrained MONAI RetinaNet. Progress is updated dynamically.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-primary-container/10 border border-primary/20 space-y-1">
                    <div className="text-primary font-bold text-body-sm flex items-center">
                      <span className="material-symbols-outlined text-sm mr-1">info</span>
                      Ingestion Note
                    </div>
                    <p className="text-body-sm text-on-surface-variant">
                      Files are processed locally and anonymized by pseudonym mapping to ensure compliance with medical confidentiality standards (GDPR/HIPAA).
                    </p>
                  </div>
                </div>
              )}

              {/* SECTION 2: VIEWERS TOOLS */}
              {activeSection === 'viewer-tools' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center space-x-3 pb-3 border-b border-[#30363D]">
                    <span className="material-symbols-outlined text-primary text-2xl">build</span>
                    <h2 className="text-title-md font-title-md text-white">Interactive Viewer Tools</h2>
                  </div>

                  <p className="text-body-md text-on-surface-variant">
                    The diagnostic viewer page offers a full suite of PACS tools to analyze slices and measure regions of interest. Click a tool below to view its specific utility and shortcut details:
                  </p>

                  {/* Simulator Box */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    {/* Tool Buttons List */}
                    <div className="md:col-span-4 flex flex-col space-y-1 bg-black/20 p-2 rounded-lg border border-[#30363D]">
                      {Object.keys(toolsList).map((key) => (
                        <button
                          key={key}
                          onClick={() => setSelectedSimTool(key)}
                          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded text-left transition-colors cursor-pointer text-body-sm font-medium ${
                            selectedSimTool === key
                              ? 'bg-primary text-on-primary font-bold'
                              : 'text-on-surface-variant hover:bg-[#1C2128] hover:text-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">{toolsList[key].icon}</span>
                          <span>{toolsList[key].name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Simulation Console Screen */}
                    <div className="md:col-span-8 bg-[#1C2128]/40 border border-[#30363D] rounded-lg p-5 space-y-4 shadow-inner min-h-[220px] flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase tracking-wider text-primary font-mono-data bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                            Tool Details
                          </span>
                          <span className="text-mono-data text-[10px] text-on-surface-variant">
                            Trigger: <code className="text-primary font-bold bg-black/30 px-1 py-0.5 rounded">{toolsList[selectedSimTool].action}</code>
                          </span>
                        </div>
                        
                        <h3 className="text-title-sm font-bold text-white flex items-center space-x-2">
                          <span className="material-symbols-outlined text-primary text-lg">
                            {toolsList[selectedSimTool].icon}
                          </span>
                          <span>{toolsList[selectedSimTool].name}</span>
                        </h3>
                        
                        <p className="text-body-sm text-on-surface-variant leading-relaxed">
                          {toolsList[selectedSimTool].description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#30363D]/50 flex items-start space-x-2 text-yellow-500/90">
                        <span className="material-symbols-outlined text-sm mt-0.5">tips_and_updates</span>
                        <p className="text-body-sm italic">
                          <strong>Pro-Tip:</strong> {toolsList[selectedSimTool].tip}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: PARAMETERS */}
              {activeSection === 'parameters' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center space-x-3 pb-3 border-b border-[#30363D]">
                    <span className="material-symbols-outlined text-primary text-2xl">settings_input_component</span>
                    <h2 className="text-title-md font-title-md text-white">Calculated Diagnostic Parameters</h2>
                  </div>

                  <p className="text-body-md text-on-surface-variant">
                    When you hover over the viewport or click on a detected nodule marker, the overlay displays specific numerical details. Below is what they represent and how they are calculated:
                  </p>

                  <div className="space-y-4">
                    <div className="p-4 bg-[#1C2128]/50 border border-[#30363D] rounded-lg flex flex-col md:flex-row gap-4 items-start">
                      <div className="p-2 bg-primary/10 border border-primary/20 rounded text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">science</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-body-md font-bold text-white">Hounsfield Unit (HU) Value</h4>
                        <p className="text-body-sm text-on-surface-variant leading-relaxed">
                          Calculated directly at the mouse cursor using the DICOM pixel array coefficients: 
                          <code className="text-primary font-mono-data bg-black/40 px-1.5 py-0.5 rounded mx-1 font-bold">HU = PixelValue * RescaleSlope + RescaleIntercept</code>
                          Lungs display around -900 to -600 HU, water registers at 0 HU, bone at +400 to +1000 HU, and solid soft-tissue nodules typically display between -100 and +150 HU.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#1C2128]/50 border border-[#30363D] rounded-lg flex flex-col md:flex-row gap-4 items-start">
                      <div className="p-2 bg-primary/10 border border-primary/20 rounded text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">grid_goldenratio</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-body-md font-bold text-white">Centroid [Z, Y, X] (Voxel Space)</h4>
                        <p className="text-body-sm text-on-surface-variant leading-relaxed">
                          Indicates the coordinate index of the nodule inside the uploaded 3D pixel array volume. 
                          <strong>Z</strong> specifies the axial slice number (0-indexed starting from the bottom slice), while <strong>Y</strong> and <strong>X</strong> specify the vertical column and horizontal row voxel offsets on that specific slice coordinate.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#1C2128]/50 border border-[#30363D] rounded-lg flex flex-col md:flex-row gap-4 items-start">
                      <div className="p-2 bg-primary/10 border border-primary/20 rounded text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">language</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-body-md font-bold text-white">World Centroid (LPS) [X, Y, Z] (mm)</h4>
                        <p className="text-body-sm text-on-surface-variant leading-relaxed">
                          The absolute physical world coordinate location in millimeters, calculated using the standard DICOM LPS coordinate system (Left, Posterior, Superior relative to patient anatomy). It uses the slice\'s <code>ImagePositionPatient</code> and <code>ImageOrientationPatient</code> parameters to translate raw voxel indices. This coordinate allows precise verification of nodules against standard benchmark annotations (such as LUNA16 CSV files).
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#1C2128]/50 border border-[#30363D] rounded-lg flex flex-col md:flex-row gap-4 items-start">
                      <div className="p-2 bg-primary/10 border border-primary/20 rounded text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">percent</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-body-md font-bold text-white">AI Confidence / Nodule Probability</h4>
                        <p className="text-body-sm text-on-surface-variant leading-relaxed">
                          Represented as a percentage score on the right panel. It is the sigmoid function value of the logits generated by the MONAI 3D RetinaNet classification network. A higher percentage indicates that the model detected strong texture, density, and spherical bounds characteristics typical of true positive pulmonary nodules.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: REPORTING */}
              {activeSection === 'reporting' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center space-x-3 pb-3 border-b border-[#30363D]">
                    <span className="material-symbols-outlined text-primary text-2xl">assignment</span>
                    <h2 className="text-title-md font-title-md text-white">Reporting & Signature Workflows</h2>
                  </div>

                  <p className="text-body-md text-on-surface-variant leading-relaxed">
                    Once the diagnostic viewer highlights the nodules, you can generate a formal clinical report. The reporting page gathers findings and clinician notes to finalize the case.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        A
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-body-sm font-bold text-white">Nodule Selection checklist</h4>
                        <p className="text-body-sm text-on-surface-variant">
                          All AI-detected nodules are listed on the reporting page. You can check or uncheck individual nodules to include or exclude them from the final signed findings table.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        B
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-body-sm font-bold text-white">Clinical Findings & Remarks</h4>
                        <p className="text-body-sm text-on-surface-variant">
                          Enter your professional diagnostic notes under "Clinical Findings" and provide patient recommendations under "Recommendations / Impressions".
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        C
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-body-sm font-bold text-white">Sign & Lock Document</h4>
                        <p className="text-body-sm text-on-surface-variant">
                          Clicking the <strong>Sign and Lock Report</strong> button signs the report under the current authenticated radiologist account. This locks all text inputs and findings to maintain records integrity, and files it immediately in the Archive database.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-1">
                    <div className="text-yellow-500 font-bold text-body-sm flex items-center">
                      <span className="material-symbols-outlined text-sm mr-1">warning</span>
                      Important Signature Warning
                    </div>
                    <p className="text-body-sm text-on-surface-variant">
                      Once signed and locked, a report cannot be modified or re-opened for editing. This is a critical medical validation safeguard to prevent retroactive alteration of archived clinical data.
                    </p>
                  </div>
                </div>
              )}

              {/* SECTION 5: ARCHIVE */}
              {activeSection === 'archive' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center space-x-3 pb-3 border-b border-[#30363D]">
                    <span className="material-symbols-outlined text-primary text-2xl">inventory_2</span>
                    <h2 className="text-title-md font-title-md text-white">Archive Lookup & PDF Export</h2>
                  </div>

                  <p className="text-body-md text-on-surface-variant leading-relaxed">
                    The Archive page acts as the historical database of all patient scans and finalized reports.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-title-sm font-bold text-white flex items-center space-x-2">
                        <span className="material-symbols-outlined text-primary text-lg">search</span>
                        <span>Search and Filter Cases</span>
                      </h3>
                      <p className="text-body-sm text-on-surface-variant leading-relaxed">
                        You can filter patient cases by status (All, Locked Reports, Pending Studies) or search by typing the patient\'s name, MRN, or study description.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-title-sm font-bold text-white flex items-center space-x-2">
                        <span className="material-symbols-outlined text-primary text-lg">picture_as_pdf</span>
                        <span>Structured PDF Generation</span>
                      </h3>
                      <p className="text-body-sm text-on-surface-variant leading-relaxed">
                        For any signed and locked study, you can click the download icon. The system generates a print-ready clinical report, including patient metadata, the AI findings table, clinician signature, and a high-resolution snapshot of the exact CT slice containing the primary nodule.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 6: FAQS */}
              {activeSection === 'faqs' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center space-x-3 pb-3 border-b border-[#30363D]">
                    <span className="material-symbols-outlined text-primary text-2xl">help_outline</span>
                    <h2 className="text-title-md font-title-md text-white">Frequently Asked Questions</h2>
                  </div>

                  <div className="space-y-3">
                    {faqs.map((faq, index) => (
                      <div key={index} className="border border-[#30363D] rounded-lg overflow-hidden transition-colors">
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                          className="w-full flex justify-between items-center p-4 bg-[#1C2128]/30 hover:bg-[#1C2128]/50 text-left transition-colors cursor-pointer text-body-sm font-medium text-white"
                        >
                          <span>{faq.q}</span>
                          <span className="material-symbols-outlined text-primary transition-transform duration-100">
                            {expandedFaq === index ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                          </span>
                        </button>
                        
                        {expandedFaq === index && (
                          <div className="p-4 bg-black/20 text-body-sm text-on-surface-variant leading-relaxed border-t border-[#30363D]/50 animate-slideDown">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Feedback Hub Box */}
                  <div className="mt-8 p-6 rounded-xl border border-[#30363D] bg-gradient-to-r from-[#1C2128]/40 to-black/30 space-y-4">
                    <h3 className="text-title-sm font-bold text-white flex items-center space-x-2">
                      <span className="material-symbols-outlined text-primary text-lg font-bold">contact_support</span>
                      <span>Feedback & Technical Support</span>
                    </h3>
                    <p className="text-body-sm text-on-surface-variant leading-relaxed">
                      Encountered a system error, or need to configure a local PACS DICOM listener path? Submit a support request on the <strong>Settings</strong> page under the <strong>Feedback</strong> panel. The diagnostics log package is automatically bundled to speed up troubleshooting.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
