import { GoogleGenAI, Type } from "@google/genai";
import { SimulationResponse } from "../types";
import { PERFECT_SIMULATIONS } from "../data/perfectSimulations";

// ============================================================================
// CONFIGURATION & SETUP
// ============================================================================

// 1. GET API KEY (Robust check for Vite)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Debugging: Check console to see if key is loaded (Masked for security)
if (!API_KEY) {
  console.error("CRITICAL ERROR: API Key is missing. Please check .env.local contains VITE_GEMINI_API_KEY");
} else {
  console.log("Gemini API Key loaded successfully:", API_KEY.substring(0, 5) + "...");
}

// 2. INITIALIZE CLIENT (ONCE for the whole file)
const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert Physics Engine Developer and React Three Fiber Specialist.
Your task is to generate a React Three Fiber simulation and a mathematical explanation for a given physics scenario.

RETURN JSON ONLY. The response must follow this schema:
{
  "title": "A short, catchy title for the scenario",
  "componentCode": "The body of a React Functional Component that renders the scene",
  "explanation": "A markdown string explaining the physics math, formulas, and what is happening."
}

GUIDELINES FOR 'componentCode':
1. It is the BODY of a functional component. Do NOT write 'export default function...'. Start writing the hooks and logic directly.
2. It MUST return a JSX element (usually a <group> or <>...</>).
3. AVAILABLE GLOBALS (Provided in scope - DO NOT IMPORT OR DESTRUCTURE THESE):
   - React hooks: useState, useEffect, useRef, useMemo, useCallback (Use directly)
   - R3F hooks: useFrame, useThree (Use directly)
   - THREE: The full Three.js namespace (Use 'THREE.Vector3', 'THREE.Color', 'THREE.Raycaster', etc.). **ALWAYS USE UPPERCASE 'THREE'**.
   - three: Alias for THREE.
   - drei: The @react-three/drei library. **USE NAMESPACED ACCESS ONLY** (e.g. <drei.Sphere>, <drei.Text>, <drei.Line>). DO NOT write 'const { Sphere } = drei'.
   - leva: The UI library. **USE NAMESPACED ACCESS ONLY** (e.g. leva.useControls, leva.button, leva.monitor). DO NOT destructure.
   - ReactThreeFiber: The @react-three/fiber namespace.
   - Matter: The matter-js library (Available if needed for 2D physics).

4. REACT SAFETY PROTOCOL (The "Master Code Skeleton" equivalent):
   To prevent "Ghost Simulations", "Blank Canvases", and Memory Leaks, you MUST follow these rules:

   A. BLANK CANVAS PROTECTION (CRITICAL):
      - **FORCEFUL SPAWNING**: You MUST generate visible 3D objects immediately.
      - **NO EMPTY STATES**: Initialize 'useState' with at least one object.
        - BAD: 'const [items, setItems] = useState([])'
        - GOOD: 'const [items, setItems] = useState([{ pos: [0,0,0], color: "red" }])'
      - **Camera**: Ensure the camera looks at the center (0,0,0).
      - **Lighting**: ALWAYS include <ambientLight intensity={0.5} />.
      - **Reference**: ALWAYS include <drei.Grid args={[10, 10]} /> so the user has spatial context.
   
   B. CLEANUP PROTOCOL (MANDATORY):
      - **Timers/Listeners**: If you use 'setInterval' or 'window.addEventListener', you **MUST** clear them in the 'useEffect' return function.
      - Example: 'useEffect(() => { const i = setInterval(...); return () => clearInterval(i); }, [])'.
      - **Physics Engines**: If using Matter.js or Cannon.js manually, you **MUST** stop/clear the world in the cleanup function.

   C. REF SAFETY:
      - **Initialization**: Always check refs before usage: 'if (!ref.current) return;'.
      - **Persistence**: Use 'useRef' to store mutable simulation state (engines, physics worlds) instead of global variables.

   D. CRASH PREVENTION:
      - NEVER use 'new Float32Array(N)' without 'Math.max(0, N)'.
      - **FORBIDDEN**: DO NOT use 'JSON.parse' or 'JSON.stringify' for cloning/comparing objects. This causes "undefined is not valid JSON" errors. Use spread syntax '{...obj}' or shallow comparison.

   E. INTERACTION SAFETY (DRAG & DROP):
      - **Viewport Locking**: If implementing Drag & Drop, you **MUST** lock the camera controls while dragging.
      - **Pattern**: 
        'const { controls } = useThree();'
        'onPointerDown={() => { if(controls) controls.enabled = false; }}'
        'onPointerUp={() => { if(controls) controls.enabled = true; }}'

5. AESTHETICS & ALIGNMENT (ELEGANT & SCIENTIFIC):
   - **Theme**: Scientific Elegance. Deep Zinc/Slate backgrounds.
   - **Colors**: Teal (#2dd4bf), Soft Blue (#60a5fa), Amber (#fbbf24). AVOID Neon.
   - **Materials**: Use <meshStandardMaterial> with metalness={0.6} roughness={0.2} and envMapIntensity={1}.
   - **ALIGNMENT**: 
     - Objects must be **perfectly aligned** (rotation=[0,0,0]) unless physics dictates otherwise.
     - Objects should sit 'on' the grid.

6. PHYSICS & CONTROLS:
   - **Interactive Sliders (MANDATORY)**:
     - Use 'leva.useControls' for ALL variables (Gravity, Mass, Velocity, Friction).
   - **Stability Checks**:
     - Inside 'useFrame', check for NaN/Infinity: 'if (isNaN(position.y)) reset();'.
   - **Integrator**: Use **Symplectic Euler** or **Verlet** (update Velocity, then Position).
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    componentCode: { type: Type.STRING },
    explanation: { type: Type.STRING },
  },
  required: ["title", "componentCode", "explanation"],
};

// In-memory cache for the current session
const GENERATION_CACHE: Record<string, SimulationResponse> = {};

// Validator
const validateSimulationCode = (code: string): boolean => {
  const hasMesh = /<(mesh|points|line|instancedMesh|drei\.)/i.test(code);
  const hasReturn = /return\s*\(/i.test(code);
  return hasMesh && hasReturn;
};

// ============================================================================
// 1. CORE GENERATOR (Creation)
// ============================================================================
export const generateSimulation = async (userPrompt: string): Promise<SimulationResponse> => {
  // Check Vault
  const lowerPrompt = userPrompt.toLowerCase().trim();
  const vaultMatch = Object.keys(PERFECT_SIMULATIONS).find(key => lowerPrompt.includes(key));

  if (vaultMatch) {
    console.log("Vault Hit!", vaultMatch);
    return {
      ...PERFECT_SIMULATIONS[vaultMatch],
      sources: [{ title: "PhysiGen Vault (Verified)", uri: "#" }]
    };
  }

  // Check Cache
  if (GENERATION_CACHE[lowerPrompt]) {
    console.log("Cache Hit!");
    return GENERATION_CACHE[lowerPrompt];
  }

  try {
    // RESEARCH PHASE
    const researchResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash", // UPDATED: Stable model to avoid 429
      contents: `Topic: "${userPrompt}". Task: Physics simulation parameters. Return brief key values (masses, formulas) only.`,
      config: { tools: [{ googleSearch: {} }], temperature: 0.1 }
    });

    const researchText = researchResponse.text || "No research data found.";
    const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map(chunk => chunk.web ? { title: chunk.web.title || "Source", uri: chunk.web.uri } : null)
      .filter((s): s is { title: string; uri: string } => s !== null && !!s.uri);

    // CODING PHASE
    const augmentedPrompt = `USER SCENARIO: "${userPrompt}"\nRESEARCH NOTES:\n${researchText}\nGenerate the React Three Fiber simulation JSON. Ensure visible objects, proper lighting, and Leva controls.`;

    const codeResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash", // UPDATED: Stable model to avoid 429
      contents: augmentedPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = codeResponse.text;
    if (!text) throw new Error("No response from Gemini");

    const json = JSON.parse(text) as SimulationResponse;
    const finalResult = { ...json, sources };

    if (!validateSimulationCode(json.componentCode)) {
      throw new Error("Simulation generation failed validation: No 3D objects detected.");
    }

    GENERATION_CACHE[lowerPrompt] = finalResult;
    return finalResult;

  } catch (error) {
    console.error("Gemini API Error in Generate:", error);
    throw error;
  }
};

// ============================================================================
// 2. THE "WHAT IF" ENGINE (Code Mutation)
// ============================================================================
export const modifySimulation = async (currentCode: string, userRequest: string): Promise<SimulationResponse> => {
  try {
    const prompt = `
    EXISTING COMPONENT CODE:
    ${currentCode}

    USER REQUEST: "${userRequest}"

    TASK:
    1. Analyze the existing code.
    2. Apply the user's requested changes (e.g., change colors, physics parameters, formulas, or logic).
    3. Ensure the code remains valid React Three Fiber code.
    4. Return the FULL updated component code.
    5. Update the explanation to describe WHAT changed.

    RETURN JSON: { "title": "Updated Title", "componentCode": "...", "explanation": "..." }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash", // UPDATED: Stable model to avoid 429
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      }
    });

    const text = result.text;
    if (!text) throw new Error("No modification generated");
    return JSON.parse(text) as SimulationResponse;

  } catch (error) {
    console.error("Modification Error:", error);
    throw error;
  }
};

// ============================================================================
// 3. THE "FEYNMAN" TUTOR (Contextual Explanation)
// ============================================================================
export const explainPhysics = async (currentCode: string, userQuestion: string): Promise<string> => {
  try {
    const prompt = `
    CONTEXT (The current running simulation code):
    ${currentCode}

    USER QUESTION: "${userQuestion}"

    TASK:
    You are Richard Feynman. Explain the answer simply, clearly, and engagingly.
    1. Analyze the code to see *exactly* how the physics is implemented.
    2. Answer the user's question by referencing the math/logic in the code.
    3. Keep it concise (under 200 words). Use Markdown for formatting.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash", // UPDATED: Stable model to avoid 429
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return result.text || "I couldn't explain that phenomenon.";

  } catch (error) {
    console.error("Explanation Error:", error);
    return "Sorry, I had trouble analyzing the physics for you.";
  }
};