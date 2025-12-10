export interface SimulationResponse {
  componentCode: string;
  explanation: string;
  title: string;
  sources?: { title: string; uri: string }[];
}

export interface SimulationState {
  isLoading: boolean;
  data: SimulationResponse | null;
  error: string | null;
}

export interface CompiledComponentProps {
  // Define any props passed to the dynamic component if necessary
}

// Extend Window interface to include Babel
declare global {
  interface Window {
    Babel: {
      transform: (code: string, options: any) => { code: string };
    };
  }
}

export enum SimulationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  MODIFYING = 'MODIFYING', // New status for code mutation
  EXPLAINING = 'EXPLAINING', // New status for Feynman Tutor
  COMPILING = 'COMPILING',
  READY = 'READY',
  ERROR = 'ERROR',
}