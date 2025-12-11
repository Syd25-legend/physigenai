import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import * as Fiber from '@react-three/fiber';
import * as Drei from '@react-three/drei';
import * as Leva from 'leva';
import * as Matter from 'matter-js';

/**
 * Transpiles and evaluates a string of React code into a usable Component.
 * @param codeBody The body of the functional component (hooks + return statement).
 * @param overrides Optional dictionary of hooks/functions to override in the component scope.
 * @returns A React Functional Component.
 */
export const compileComponent = (
  codeBody: string, 
  overrides: { useFrame?: typeof Fiber.useFrame } = {}
): React.FC<any> | null => {
  try {
    let cleanBody = codeBody.trim();

    // 1. Aggressively remove Import statements (Global regex, case insensitive, multiline support)
    //    Matches "import ... from ...;" or "import ...;"
    cleanBody = cleanBody.replace(/^\s*import\s+[\s\S]*?;\s*$/gm, '');
    //    Fallback for imports without semicolons at end of line
    cleanBody = cleanBody.replace(/^\s*import\s+.*$/gm, '');

    // 2. Determine Compilation Strategy
    //    Strategy A: Full Module (The AI output a complete file with "export default")
    //    Strategy B: Hook Body (The AI output just the inside of a component)
    
    let sourceCode = '';
    let returnStatement = '';
    
    const hasExportDefault = /export\s+default\s+/.test(cleanBody);

    if (hasExportDefault) {
      // STRATEGY A: Handle Full Module
      // We want to execute this code in the function scope, NOT wrapped in another component.
      
      // Check for: "export default function Name"
      const funcMatch = cleanBody.match(/export\s+default\s+function\s+([a-zA-Z0-9_]+)/);
      // Check for: "export default Name" (where Name is defined earlier)
      const varMatch = cleanBody.match(/export\s+default\s+([a-zA-Z0-9_]+)/);
      
      if (funcMatch) {
        // Replace "export default function Foo" with "function Foo"
        cleanBody = cleanBody.replace(/export\s+default\s+function/, 'function');
        returnStatement = `return ${funcMatch[1]};`;
      } else if (varMatch) {
        // Replace "export default Foo" with empty string (Foo is already defined)
        cleanBody = cleanBody.replace(/export\s+default\s+[a-zA-Z0-9_]+;?/, '');
        returnStatement = `return ${varMatch[1]};`;
      } else {
        // Anonymous export: "export default () => {}" -> "const DynamicComponent = () => {}"
        cleanBody = cleanBody.replace(/export\s+default\s+/, 'const DynamicComponent = ');
        returnStatement = `return DynamicComponent;`;
      }
      
      sourceCode = cleanBody;
    } else {
      // STRATEGY B: Handle Body Only
      // Wrap the loose code in a component function
      sourceCode = `
        const DynamicComponent = (props) => {
          ${cleanBody}
        };
      `;
      returnStatement = `return DynamicComponent;`;
    }

    // 3. Transpile JSX/ES6 to ES5 using Babel Standalone
    if (!window.Babel) {
      throw new Error("Babel not loaded");
    }

    // We must try-catch the transform separately to identify syntax errors in generation
    let transformed;
    try {
      transformed = window.Babel.transform(sourceCode, {
        presets: ['react', 'env'],
        filename: 'dynamic.js',
        compact: false, // Easier debugging
      }).code;
    } catch (babelErr) {
      console.error("Babel Transform Failed on:", sourceCode);
      throw babelErr;
    }

    // 4. Create a Function that returns the component.
    //    We explicitly destructure global hooks so the AI code (which assumes global scope or named imports) works.
    const createComponent = new Function(
      'React',
      'THREE',
      'three', 
      'useFrame',
      'useThree',
      'useLoader',
      'drei',
      'drive', 
      'leva',
      'ReactThreeFiber',
      'Matter',
      `
      // Inject React Hooks into Top-Level Scope
      const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, useReducer } = React;
      
      // Inject Leva Hooks into Top-Level Scope
      const { useControls, button, folder, monitor } = leva;
      
      ${transformed}
      
      ${returnStatement}
      `
    );

    // Ensure we have the correct Matter object
    const safeMatter = (Matter as any).default || Matter;

    // 5. Execute the creator function
    const Component = createComponent(
      React,
      THREE,
      THREE, 
      overrides.useFrame || Fiber.useFrame,
      Fiber.useThree,
      Fiber.useLoader,
      Drei,
      Drei,
      Leva,
      Fiber,
      safeMatter
    );

    return Component;
  } catch (err) {
    console.error("Compilation Error:", err);
    throw err;
  }
};