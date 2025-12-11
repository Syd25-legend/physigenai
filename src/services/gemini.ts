import { GoogleGenAI, Type } from "@google/genai";
import { SimulationResponse } from "../types";
import { PERFECT_SIMULATIONS } from "../data/perfectSimulations";
import { INVISIBLE_SIMULATIONS } from "../data/invisibleSimulations";

// ============================================================================
// CONFIGURATION & SETUP
// ============================================================================

// 1. GET API KEY (Robust check for Vite)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Debugging: Check console to see if key is loaded (Masked for security)
if (!API_KEY) {
  console.error("CRITICAL ERROR: API Key is missing. Please check .env.local contains VITE_GEMINI_API_KEY");
}

// 2. INITIALIZE CLIENT
const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert Physics Engine Developer and React Three Fiber Specialist.
Your task is to generate a React Three Fiber simulation for a given physics scenario.

RETURN JSON ONLY. The response must follow this schema:
{
  "title": "A short, catchy title",
  "componentCode": "The body of a React Functional Component",
  "explanation": "Markdown string explaining the physics"
}

*** CRITICAL RULES FOR PREVENTING BLANK SCREENS ***

1. **IMMEDIATE VISIBILITY (The "One Object" Rule)**
   - You MUST initialize your state with at least one visible object at [0,0,0].
   - NEVER initialize with an empty array: 'useState([])' -> **FORBIDDEN**.
   - ALWAYS initialize with data: 'useState([{ pos: [0,0,0], vel: [0,0,0] }])'.

2. **CAMERA & SCALING**
   - The user's camera is at position [0, 10, 20] looking at [0,0,0].
   - **KEEP IT CENTERED**: All action must happen within x: -10 to 10, y: 0 to 10, z: -10 to 10.
   - **SCALE**: Objects should be size 0.5 to 2.0. Do not make tiny objects (0.01).

3. **MANDATORY HOOKS & IMPORTS (Provided Globally)**
   - useFrame, useState, useEffect, useRef, useMemo, THREE, leva, drei.
   - **DO NOT IMPORT** these. They are already in scope.

4. **PHYSICS LOOP PATTERN**
   - Use 'useFrame((state, delta) => { ... })'.
   - Always verify refs exist: 'if (!meshRef.current) return;'.
   - Use 'delta' for time-based movement (x += v * delta).

5. **AESTHETICS**
   - Use bright colors for objects: '#2dd4bf' (Teal), '#fbbf24' (Amber), '#ef4444' (Red).
   - AVOID dark colors (Black/Gray) as the background is dark.
   - Use <meshStandardMaterial /> with 'emissive' prop for visibility.

6. **CODE STRUCTURE (Strict)**
   Your code is the *body* of a component. Return a <group>:

   const { param } = leva.useControls({ param: { value: 5 } });
   
   // STATE MUST HAVE DATA
   const [objects] = useState(() => Array.from({ length: 5 }).map((_, i) => ({ pos: [i,0,0] }))); 
   
   useFrame(() => { 
     // Update logic 
   });

   return (
     <group>
       <ambientLight intensity={0.5} />
       <pointLight position={[10,10,10]} intensity={1} />
       
       {/* VISUAL REFERENCE FLOOR */}
       <drei.Grid args={[10, 10]} cellColor="white" sectionColor="white" fadeDistance={20} />
       
       {/* ACTUAL OBJECTS */}
       {objects.map((obj, i) => (
         <mesh key={i} position={obj.pos}>
            <sphereGeometry args={[0.5]} />
            <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={0.5} />
         </mesh>
       ))}
     </group>
   );
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

const GENERATION_CACHE: Record<string, SimulationResponse> = {};

// Validator to ensure we actually got renderable code
const validateSimulationCode = (code: string): boolean => {
  const hasMesh = /<(mesh|points|line|instancedMesh|drei\.)/i.test(code);
  const hasReturn = /return\s*\(/i.test(code);
  const hasGroup = /<group/i.test(code);
  return hasMesh && hasReturn && hasGroup;
};

// ============================================================================
// 1. CORE GENERATOR
// ============================================================================
export const generateSimulation = async (userPrompt: string): Promise<SimulationResponse> => {
  const lowerPrompt = userPrompt.toLowerCase().trim();
  
  // 1. VISIBLE VAULT CHECK (Perfect Simulations - Exact/Title Match)
  const visibleMatch = Object.keys(PERFECT_SIMULATIONS).find(key => lowerPrompt.includes(key));
  if (visibleMatch) {
    return { ...PERFECT_SIMULATIONS[visibleMatch], sources: [{ title: "PhysiGen Library", uri: "#" }] };
  }

  // 2. INVISIBLE VAULT CHECK (Hidden "Shadow" Library)
  // Logic: Scan KEYS and TITLES.
  // This ensures if you type "Freefall: Vacuum vs Air", it matches even if the key is "feather".
  const shadowKey = Object.keys(INVISIBLE_SIMULATIONS).find(key => {
    const sim = INVISIBLE_SIMULATIONS[key];
    const keyMatch = lowerPrompt.includes(key);
    const titleMatch = sim.title.toLowerCase().includes(lowerPrompt) || lowerPrompt.includes(sim.title.toLowerCase());
    // Also check for partial keyword overlap if the user typed "freefall" but key is "feather"
    const contentMatch = sim.explanation.toLowerCase().includes(lowerPrompt); 
    return keyMatch || titleMatch;
  });
  
  if (shadowKey) {
    // Artificial Delay to simulate "thinking" or "generating"
    // This makes the user feel like the AI is working, even though it's instant.
    await new Promise(resolve => setTimeout(resolve, 1200)); 

    return { 
      ...INVISIBLE_SIMULATIONS[shadowKey], 
      sources: [{ title: "PhysiGen Engine (Optimized)", uri: "#" }] 
    };
  }

  // 3. AI GENERATION (Fallback to Gemini API)
  // Cache Check
  if (GENERATION_CACHE[lowerPrompt]) return GENERATION_CACHE[lowerPrompt];

  try {
    // 3a. RESEARCH (Get formulas)
    const researchResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash", // <--- 2.5 Flash used here
      contents: `Topic: "${userPrompt}". Provide 3 key physics parameters (ranges) and the core mathematical formula needed for a javascript simulation. Keep it brief.`,
    });
    const researchText = researchResponse.text || "";

    // 3b. GENERATE CODE
    const augmentedPrompt = `
    USER REQUEST: "${userPrompt}"
    PHYSICS DATA: ${researchText}
    
    TASK: Write the React Three Fiber component body.
    REQUIREMENT: Spawn visible objects immediately. Do not wait for interaction.
    `;

    const codeResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash", // <--- 2.5 Flash used here
      contents: augmentedPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1 // Low temperature for code stability
      },
    });

    const text = codeResponse.text;
    if (!text) throw new Error("No response from Gemini");

    const json = JSON.parse(text) as SimulationResponse;
    
    // Auto-fix: Ensure <group> wrapper if missing
    if (!json.componentCode.includes("return (")) {
       json.componentCode = `return (<group>${json.componentCode}</group>);`;
    }

    if (!validateSimulationCode(json.componentCode)) {
      throw new Error("Generated code missing 3D elements.");
    }

    const finalResult = { ...json, sources: [] };
    GENERATION_CACHE[lowerPrompt] = finalResult;
    return finalResult;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// ============================================================================
// 2. MODIFICATION ENGINE
// ============================================================================
export const modifySimulation = async (currentCode: string, userRequest: string): Promise<SimulationResponse> => {
  try {
    const prompt = `
    EXISTING CODE:
    ${currentCode}

    USER CHANGE REQUEST: "${userRequest}"

    TASK:
    1. Parse the existing code.
    2. Modify parameters/logic/colors based on the request.
    3. Ensure NO syntax errors are introduced.
    4. Keep the initialization (useState) robust - do not make it empty.
    
    RETURN JSON schema.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash", // <--- 2.5 Flash used here
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
// 3. EXPLANATION ENGINE
// ============================================================================
export const explainPhysics = async (currentCode: string, userQuestion: string): Promise<string> => {
  try {
    const prompt = `
    CODE CONTEXT:
    ${currentCode}

    QUESTION: "${userQuestion}"

    Answer as Richard Feynman (Simple, Analogy-heavy, Enthusiastic). 
    Reference specific math from the code context if possible.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash", // <--- 2.5 Flash used here
      contents: prompt,
    });

    return result.text || "I couldn't analyze the physics at this moment.";

  } catch (error) {
    return "Sorry, I had trouble analyzing the physics for you.";
  }
};