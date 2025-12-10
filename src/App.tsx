import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationState, SimulationStatus, SimulationResponse } from './types';
import { generateSimulation, modifySimulation, explainPhysics } from './services/gemini';
import { DynamicScene } from './components/DynamicScene';
import { ExplanationPanel } from './components/ExplanationPanel';
import { InputBar } from './components/InputBar';
import { AlertTriangle, Atom, Play, Loader2, Menu, ChevronDown, ChevronUp, History, Library, MessageSquare, Box, RotateCcw, Upload } from 'lucide-react';
import { PERFECT_SIMULATIONS } from './data/perfectSimulations';
import { Leva } from 'leva';

// Default initial state
const INITIAL_CODE = `
// Physics Simulation Demo: Perfectly Aligned Bouncing Ball
const { gravity, bounciness, yPos } = leva.useControls({
  gravity: { value: 9.8, min: 1, max: 20 },
  bounciness: { value: 0.8, min: 0.1, max: 1.2 },
  yPos: { value: 5, min: 1, max: 10 }
});

const position = useRef(new THREE.Vector3(0, yPos, 0));
const velocity = useRef(new THREE.Vector3(0, 0, 0));
const [visualPos, setVisualPos] = useState([0, 5, 0]);
const [isUnstable, setIsUnstable] = useState(false);

useFrame((state, delta) => {
  const dt = Math.min(delta, 0.05);
  velocity.current.y -= gravity * dt;
  position.current.y += velocity.current.y * dt;

  if (position.current.y < 0.5) {
    position.current.y = 0.5;
    velocity.current.y *= -bounciness;
    if (Math.abs(velocity.current.y) > 50) setIsUnstable(true);
  } else {
    setIsUnstable(false);
  }

  setVisualPos([position.current.x, position.current.y, position.current.z]);
});

React.useEffect(() => {
  position.current.set(0, yPos, 0);
  velocity.current.set(0, 0, 0);
}, [yPos]);

return (
  <group>
    <drei.Grid infiniteSection args={[10, 10]} fadeDistance={40} sectionColor="#6B26D9" cellColor="#1e293b" />
    <mesh position={visualPos}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial 
        color={isUnstable ? "#ef4444" : "#6B26D9"} 
        metalness={0.6} 
        roughness={0.2} 
        emissive={isUnstable ? "#ef4444" : "#6B26D9"}
        emissiveIntensity={isUnstable ? 2 : 0.5}
      />
    </mesh>
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
      <ringGeometry args={[0.4, 0.6, 32]} />
      <meshBasicMaterial color="#6B26D9" opacity={0.3} transparent />
    </mesh>
    <drei.Text position={[0, 3, -3]} fontSize={0.5} color="#e2e8f0" anchorX="center">
      PhysiGen AI Ready
    </drei.Text>
  </group>
);
`;

const INITIAL_EXPLANATION = `
# Welcome to PhysiGen AI

PhysiGen AI generates interactive 3D physics simulations from natural language descriptions.

### Features:
- **Instant Library**: Access perfect simulations from the left menu.
- **Interactive Sliders**: Adjust physics in real-time.
- **Feynman Tutor**: Ask questions to understand the math.
`;

// Types for History
interface QAEntry {
  question: string;
  answer: string;
  timestamp: number;
  simulationTitle: string;
}

const App: React.FC = () => {
  const [status, setStatus] = useState<SimulationStatus>(SimulationStatus.IDLE);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'library' | 'history'>('library');
  const [refreshKey, setRefreshKey] = useState(0); 
  
  const [data, setData] = useState<{ 
    code: string; 
    explanation: string; 
    title: string;
    sources?: { title: string; uri: string }[];
  }>({
    code: INITIAL_CODE,
    explanation: INITIAL_EXPLANATION,
    title: "PhysiGen AI",
    sources: []
  });
  const [error, setError] = useState<string | null>(null);

  // History State: Global list for the session
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);

  // Local Custom Simulations (Imported from file)
  const [customSims, setCustomSims] = useState<Record<string, SimulationResponse>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ROUTER LOGIC ---
  const handleSimulationRequest = async (prompt: string) => {
    setError(null);
    setCurrentPrompt(prompt);

    const lowerPrompt = prompt.toLowerCase().trim();

    // 1. ROUTE: EXPLANATION (Feynman Tutor)
    const isQuestion = lowerPrompt.startsWith("why") || lowerPrompt.startsWith("how") || lowerPrompt.startsWith("explain") || lowerPrompt.endsWith("?");
    
    // 2. ROUTE: MODIFICATION (What If Engine)
    const isModification = (status === SimulationStatus.READY || status === SimulationStatus.IDLE) && 
                           (lowerPrompt.startsWith("make") || lowerPrompt.startsWith("change") || lowerPrompt.startsWith("add") || lowerPrompt.startsWith("set") || lowerPrompt.startsWith("turn"));

    if (isQuestion && data.code) {
      await performExplanation(prompt);
      return;
    }

    if (isModification && data.code) {
      await performModification(prompt);
      return;
    }

    // 3. ROUTE: GENERATION (Standard)
    await performGeneration(prompt);
  };

  const performGeneration = async (prompt: string) => {
    setStatus(SimulationStatus.GENERATING);
    try {
      const result = await generateSimulation(prompt);
      setData({
        code: result.componentCode,
        explanation: result.explanation,
        title: result.title,
        sources: result.sources
      });
      setRefreshKey(prev => prev + 1); // Ensure fresh mount
      setStatus(SimulationStatus.READY);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate simulation.");
      setStatus(SimulationStatus.ERROR);
    }
  };

  const performModification = async (prompt: string) => {
    setStatus(SimulationStatus.MODIFYING);
    try {
      const result = await modifySimulation(data.code, prompt);
      setData({
        code: result.componentCode,
        explanation: result.explanation, 
        title: result.title,
        sources: data.sources 
      });
      setRefreshKey(prev => prev + 1);
      setStatus(SimulationStatus.READY);
    } catch (err: any) {
      console.error(err);
      setError("Failed to modify simulation. Try a simpler request.");
      setStatus(SimulationStatus.READY);
    }
  };

  const performExplanation = async (question: string) => {
    const originalStatus = status;
    setStatus(SimulationStatus.EXPLAINING);
    try {
      const answer = await explainPhysics(data.code, question);
      
      const entry: QAEntry = { 
        question, 
        answer, 
        timestamp: Date.now(),
        simulationTitle: data.title
      };
      
      setQaHistory(prev => [entry, ...prev]);

      setData(prev => ({
        ...prev,
        explanation: `# Question: ${question}\n\n${answer}\n\n---\n\n${prev.explanation}`
      }));
      
      setStatus(originalStatus === SimulationStatus.IDLE ? SimulationStatus.READY : originalStatus);
    } catch (err: any) {
      setError("Failed to generate explanation.");
      setStatus(originalStatus);
    }
  };

  const handlePresetClick = async (key: string) => {
    setStatus(SimulationStatus.GENERATING);
    setError(null);
    
    // Check custom sims first, then built-in
    const sim = customSims[key] || PERFECT_SIMULATIONS[key];
    
    if (!sim) {
      setStatus(SimulationStatus.ERROR);
      return;
    }

    setCurrentPrompt(sim.title);
    
    // Fake loading delay - shorter for custom files
    const delay = customSims[key] ? 200 : 1500;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    setData({
      code: sim.componentCode,
      explanation: sim.explanation,
      title: sim.title,
      sources: sim.sources || []
    });
    setRefreshKey(prev => prev + 1);
    setStatus(SimulationStatus.READY);
  };

  const handleReset = () => {
    const customKey = Object.keys(customSims).find(key => customSims[key].title === data.title);
    const libraryKey = Object.keys(PERFECT_SIMULATIONS).find(key => PERFECT_SIMULATIONS[key].title === data.title);

    const sim = customKey ? customSims[customKey] : (libraryKey ? PERFECT_SIMULATIONS[libraryKey] : null);

    if (sim) {
      setData({
        code: sim.componentCode,
        explanation: sim.explanation,
        title: sim.title,
        sources: []
      });
    }
    setRefreshKey(prev => prev + 1);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const title = file.name.replace(/\.(tsx|ts)$/i, "");
      
      const newSim: SimulationResponse = {
        title: title,
        componentCode: text,
        explanation: `# ${title}\n\n*Imported from local file*\n\nThis simulation was loaded directly from **${file.name}**.`,
        sources: []
      };

      const key = `custom-${Date.now()}`;
      setCustomSims(prev => ({ ...prev, [key]: newSim }));
      
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleRuntimeError = useCallback((msg: string) => {
    setError(`Runtime Error: ${msg}`);
  }, []);

  const getStatusText = () => {
    switch(status) {
      case SimulationStatus.GENERATING: return "Researching & Building...";
      case SimulationStatus.MODIFYING: return "Applying Physics Changes...";
      case SimulationStatus.EXPLAINING: return "Consulting Feynman...";
      default: return data.title;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-white font-sans">
      
      {/* LEFT SIDEBAR: Menu & Controls */}
      <div className="w-80 flex flex-col border-r border-zinc-800 bg-zinc-950 z-20 shrink-0">
        
        {/* Branding Header */}
        <div className="h-16 flex items-center px-5 border-b border-zinc-800 shrink-0 bg-zinc-950/50">
           <div className="bg-[#6B26D9]/20 p-2 rounded-lg mr-3">
              <Atom className="w-5 h-5 text-[#6B26D9]" />
           </div>
           <div>
              <h1 className="font-bold text-white tracking-tight leading-none">PhysiGen AI</h1>
              <span className="text-[10px] text-[#6B26D9] font-semibold tracking-wider uppercase">Physics Engine</span>
           </div>
           <button 
             onClick={handleReset}
             className="ml-auto p-1.5 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded transition-colors"
             title="Reset Simulation"
           >
             <RotateCcw className="w-4 h-4" />
           </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 shrink-0">
           <button 
             onClick={() => setActiveTab('library')}
             className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'library' ? 'bg-[#6B26D9]/10 text-[#a78bfa] border-b-2 border-[#6B26D9]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
           >
             <Library className="w-3.5 h-3.5" /> Library
           </button>
           <button 
             onClick={() => setActiveTab('history')}
             className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'history' ? 'bg-[#6B26D9]/10 text-[#a78bfa] border-b-2 border-[#6B26D9]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
           >
             <History className="w-3.5 h-3.5" /> History
           </button>
        </div>

        {/* Scrollable List Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
           {activeTab === 'library' && (
             <div className="flex flex-col gap-1">
                {/* Import */}
                <div className="pb-3 border-b border-zinc-800 mb-3">
                  <input type="file" ref={fileInputRef} className="hidden" accept=".tsx,.ts" onChange={handleFileImport} />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#6B26D9]/10 hover:bg-[#6B26D9]/20 border border-[#6B26D9]/30 rounded-lg text-xs font-semibold text-[#a78bfa] transition-all group">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Simulation (.tsx)</span>
                  </button>
                  <p className="text-[10px] text-zinc-600 text-center mt-1.5">Accepts .tsx / .ts component files</p>
                </div>
                
                {/* Custom Sims */}
                {Object.keys(customSims).length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">My Simulations</div>
                    {Object.keys(customSims).map((key) => (
                      <button key={key} onClick={() => handlePresetClick(key)} disabled={status !== SimulationStatus.READY && status !== SimulationStatus.IDLE} className="flex items-center gap-3 px-3 py-2 rounded-lg text-left text-zinc-300 text-sm font-medium hover:bg-zinc-800 hover:text-white transition-all group">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#6B26D9] group-hover:scale-125 transition-all shrink-0" />
                        <span className="truncate">{customSims[key].title}</span>
                      </button>
                    ))}
                    <div className="h-px bg-zinc-800 mx-2 my-2" />
                  </>
                )}
                
                {/* Built-in */}
                <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Built-in Examples</div>
                {Object.keys(PERFECT_SIMULATIONS).map((key) => (
                  <button key={key} onClick={() => handlePresetClick(key)} disabled={status !== SimulationStatus.READY && status !== SimulationStatus.IDLE} className="flex items-center gap-3 px-3 py-2 rounded-lg text-left text-zinc-400 text-sm font-medium hover:bg-zinc-800 hover:text-white transition-all group">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 group-hover:bg-[#6B26D9] transition-colors shrink-0" />
                    <span className="truncate">{PERFECT_SIMULATIONS[key].title}</span>
                  </button>
                ))}
             </div>
           )}

           {activeTab === 'history' && (
             <div className="flex flex-col gap-3">
                {qaHistory.length === 0 ? (
                  <div className="text-center py-8 text-zinc-600 text-xs italic">
                    No questions asked yet.<br/>Use the input on the right!
                  </div>
                ) : (
                  qaHistory.map((entry, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2 text-[10px] text-[#a78bfa] uppercase font-bold">
                        <Box className="w-3 h-3" />
                        <span className="truncate">{entry.simulationTitle}</span>
                      </div>
                      <div className="text-xs font-medium text-white mb-1.5">"{entry.question}"</div>
                      <div className="text-[10px] text-zinc-400 pl-2 border-l-2 border-zinc-800">{entry.answer.substring(0, 100)}...</div>
                    </div>
                  ))
                )}
             </div>
           )}
        </div>

        {/* CONTROLS PANEL (Fixed at Bottom of Left Sidebar) */}
        <div className="h-1/3 min-h-[250px] border-t border-zinc-800 bg-zinc-900 flex flex-col relative shrink-0">
           {/* We use a container for Leva to fill */}
           <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
              <Leva 
                fill 
                flat 
                titleBar={{ title: 'Controls', filter: false }}
                theme={{
                  colors: {
                    elevation1: '#18181b', // Zinc 900
                    elevation2: '#27272a', // Zinc 800
                    elevation3: '#3f3f46', // Zinc 700
                    accent1: '#6B26D9',    // Purple
                    accent2: '#7C3AED',    // Purple 600
                    accent3: '#9333EA',    // Purple 500
                    highlight1: '#a1a1aa',
                    highlight2: '#d4d4d8',
                    highlight3: '#f4f4f5',
                    vivid1: '#e4e4e7',
                  },
                  sizes: {
                    rootWidth: '100%',
                    controlWidth: '140px'
                  }
                }}
              />
           </div>
        </div>

      </div>

      {/* CENTER: 3D Canvas */}
      <div className="flex-1 relative h-full bg-black">
        {/* Simplified Header Overlay */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-3">
           <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${status === SimulationStatus.GENERATING ? 'bg-[#6B26D9] animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-xs font-mono font-medium text-zinc-300">
                {status === SimulationStatus.GENERATING ? "Generating..." : data.title}
              </span>
           </div>
        </div>

        {/* Loading Overlay */}
        {(status === SimulationStatus.GENERATING || status === SimulationStatus.MODIFYING) && (
          <div className="absolute inset-0 z-30 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-[#6B26D9] animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Atom className="w-6 h-6 text-[#6B26D9] animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-1">
                   {status === SimulationStatus.MODIFYING ? "Modifying Simulation" : "Building Simulation"}
                </h3>
                <p className="text-zinc-400 text-sm">
                   {status === SimulationStatus.MODIFYING ? "Applying physics changes..." : "Solving differential equations..."}
                </p>
              </div>
            </div>
          </div>
        )}

        <DynamicScene key={refreshKey} code={data.code} onError={handleRuntimeError} />
        
        <InputBar 
          onSubmit={handleSimulationRequest} 
          isLoading={status !== SimulationStatus.READY && status !== SimulationStatus.IDLE} 
        />
        
        {/* Error Notification */}
        {error && (
          <div className="absolute top-20 right-6 max-w-sm bg-red-950/90 border border-red-500/50 backdrop-blur-md text-red-200 px-4 py-3 rounded-xl shadow-2xl z-50 flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-red-500 mb-0.5">System Error</h3>
              <p className="text-xs leading-relaxed opacity-90">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)} 
              className="ml-auto hover:bg-red-900/50 p-1 rounded text-red-400 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: Explanation Panel */}
      <div className="w-[400px] xl:w-[500px] h-full hidden lg:block border-l border-zinc-800 shadow-2xl z-20 shrink-0">
        <ExplanationPanel 
          title={data.title} 
          content={data.explanation} 
          sources={data.sources}
          onAskQuestion={(q) => performExplanation(q)} 
          isAnswering={status === SimulationStatus.EXPLAINING}
        />
      </div>

    </div>
  );
};

export default App;