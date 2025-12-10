import React, { useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Environment, ContactShadows, Html } from '@react-three/drei';
import { useControls, button, folder } from 'leva';
import { compileComponent } from '../utils/compiler';
import { AlertTriangle } from 'lucide-react';

// --- Error Boundary Definitions (Must be defined before usage) ---

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: ''
  };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Runtime Error in Dynamic Component:", error);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// --- Component Definitions ---

interface DynamicSceneProps {
  code: string;
  onError: (error: string) => void;
}

const ErrorFallback = ({ error }: { error: string }) => (
  <Html center className="w-[400px]">
    <div className="bg-zinc-900/95 backdrop-blur-md border border-red-500/50 rounded-xl p-6 shadow-2xl text-center animate-in fade-in zoom-in duration-300">
      <div className="bg-red-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Runtime Error</h3>
      <p className="text-red-300 text-sm font-mono bg-black/30 p-3 rounded-lg overflow-x-auto mb-4 text-left">
        {error}
      </p>
      <p className="text-zinc-400 text-xs">
        Try modifying your request or checking the console for more details.
      </p>
    </div>
  </Html>
);

const SceneContent: React.FC<{ Component: React.FC<any> }> = ({ Component }) => {
  return <Component />;
};

// --- Main Scene Component ---

export const DynamicScene: React.FC<DynamicSceneProps> = React.memo(({ code, onError }) => {
  const controlsRef = useRef<any>(null);
  
  // 1. Define Global Controls for the Scene
  const { paused } = useControls('System', {
    'View': folder({
      'Reset Camera': button(() => {
        if (controlsRef.current) {
          controlsRef.current.reset();
        }
      })
    }),
    'Time Control': folder({
      paused: { value: false, label: 'Pause Simulation' }
    })
  });

  // Store settings in ref for use inside loop
  const simSettings = useRef({ paused });
  simSettings.current = { paused };

  // 2. Custom useFrame hook that acts as a "Gatekeeper"
  const customUseFrame = useCallback((callback: any, priority?: number) => {
    return useFrame((state, delta) => {
      if (simSettings.current.paused) {
        return; 
      }
      callback(state, delta);
    }, priority);
  }, []);

  // 3. Compile component with injected hook
  const Component = useMemo(() => {
    try {
      return compileComponent(code, { useFrame: customUseFrame });
    } catch (err: any) {
      onError(err.message || "Failed to compile code");
      return null;
    }
  }, [code, onError, customUseFrame]);

  if (!Component) return null;

  return (
    <div className="w-full h-full relative" id="sim-container">
      <Canvas shadows dpr={[1, 2]} className="w-full h-full bg-slate-950 block">
        <PerspectiveCamera makeDefault position={[0, 10, 20]} fov={50} />
        <OrbitControls ref={controlsRef} makeDefault />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />
        <Environment preset="city" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <group position={[0, 0, 0]}>
          <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.5} far={10} color="#000000" />
          <ErrorBoundary>
            <SceneContent Component={Component} />
          </ErrorBoundary>
        </group>
      </Canvas>
    </div>
  );
});