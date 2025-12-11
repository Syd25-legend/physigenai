import React, { useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Environment, ContactShadows, Html, Grid } from '@react-three/drei';
import { useControls, button, folder } from 'leva';
import { compileComponent } from '../utils/compiler';
import { AlertTriangle } from 'lucide-react';

// --- Error Boundary ---
interface ErrorBoundaryProps { children?: React.ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: string; }

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: '' };
  static getDerivedStateFromError(error: any) { return { hasError: true, error: error.message }; }
  componentDidCatch(error: any) { console.error("Runtime Error:", error); }
  render() {
    if (this.state.hasError) return <ErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}

// --- Error UI ---
const ErrorFallback = ({ error }: { error: string }) => (
  <Html center>
    <div className="bg-red-900/90 p-4 rounded-lg border border-red-500 text-white w-64 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2 font-bold text-red-300">
        <AlertTriangle size={16} /> Runtime Error
      </div>
      <div className="text-xs font-mono opacity-80 break-words">{error}</div>
    </div>
  </Html>
);

const SceneContent: React.FC<{ Component: React.FC<any> }> = ({ Component }) => {
  return <Component />;
};

interface DynamicSceneProps {
  code: string;
  onError: (error: string) => void;
}

// --- Main Component ---
export const DynamicScene: React.FC<DynamicSceneProps> = React.memo(({ code, onError }) => {
  const controlsRef = useRef<any>(null);
  
  // Global Pause Control
  const { paused } = useControls('System', {
    'View': folder({
      'Reset Camera': button(() => controlsRef.current?.reset())
    }),
    'Time': folder({
      paused: { value: false, label: 'Pause Physics' }
    })
  });

  const simSettings = useRef({ paused });
  simSettings.current = { paused };

  // Custom Frame Loop (Gatekeeper)
  const customUseFrame = useCallback((callback: any, priority?: number) => {
    return useFrame((state, delta) => {
      if (simSettings.current.paused) return; 
      callback(state, delta);
    }, priority);
  }, []);

  // Compile Code
  const Component = useMemo(() => {
    try {
      return compileComponent(code, { useFrame: customUseFrame });
    } catch (err: any) {
      onError(err.message || "Compilation failed");
      return null;
    }
  }, [code, onError, customUseFrame]);

  if (!Component) return null;

  return (
    <div className="w-full h-full relative" id="sim-container">
      <Canvas shadows dpr={[1, 2]} className="w-full h-full bg-black block">
        {/* 1. CAMERA & CONTROLS */}
        <PerspectiveCamera makeDefault position={[0, 6, 18]} fov={50} />
        <OrbitControls ref={controlsRef} makeDefault target={[0, 0, 0]} />
        
        {/* 2. BASE ENVIRONMENT (Always Visible) */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <Environment preset="city" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* 3. REFERENCE FLOOR (Guarantees visual context) */}
        <Grid 
           args={[20, 20]} 
           cellColor="#334155" 
           sectionColor="#475569" 
           fadeDistance={30} 
           position={[0, -0.01, 0]} 
        />
        
        {/* 4. DYNAMIC CONTENT */}
        <group position={[0, 0, 0]}>
          <ErrorBoundary>
            <SceneContent Component={Component} />
          </ErrorBoundary>
        </group>
      </Canvas>
    </div>
  );
});