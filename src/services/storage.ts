import { SimulationResponse } from "../types";

const STORAGE_KEY = "physigen_fixed_sims";

interface FixedSimulations {
  [promptKey: string]: SimulationResponse;
}

const normalizePrompt = (prompt: string): string => {
  return prompt.toLowerCase().trim();
};

export const saveFixedSimulation = (prompt: string, data: SimulationResponse) => {
  try {
    const existing = getStoredSimulations();
    const key = normalizePrompt(prompt);
    existing[key] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error("Failed to save simulation", e);
  }
};

export const removeFixedSimulation = (prompt: string) => {
  try {
    const existing = getStoredSimulations();
    const key = normalizePrompt(prompt);
    delete existing[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error("Failed to remove simulation", e);
  }
};

export const getFixedSimulation = (prompt: string): SimulationResponse | null => {
  try {
    const existing = getStoredSimulations();
    const key = normalizePrompt(prompt);
    return existing[key] || null;
  } catch (e) {
    return null;
  }
};

export const isSimulationFixed = (prompt: string): boolean => {
  return !!getFixedSimulation(prompt);
};

const getStoredSimulations = (): FixedSimulations => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};