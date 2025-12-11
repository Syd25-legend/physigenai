import React from 'react';
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

    // 1. Aggressively remove Import statements
    cleanBody = cleanBody.replace(/^\s*import\s+[\s\S]*?;\s*$/gm, '');
    cleanBody = cleanBody.replace(/^\s*import\s+.*$/gm, '');

    // 2. Determine Compilation Strategy
    let sourceCode = '';
    let returnStatement = '';
    
    const hasExportDefault = /export\s+default\s+/.test(cleanBody);

    if (hasExportDefault) {
      // STRATEGY A: Handle Full Module
      const funcMatch = cleanBody.match(/export\s+default\s+function\s+([a-zA-Z0-9_]+)/);
      const varMatch = cleanBody.match(/export\s+default\s+([a-zA-Z0-9_]+)/);
      
      if (funcMatch) {
        cleanBody = cleanBody.replace(/export\s+default\s+function/, 'function');
        returnStatement = `return ${funcMatch[1]};`;
      } else if (varMatch) {
        cleanBody = cleanBody.replace(/export\s+default\s+[a-zA-Z0-9_]+;?/, '');
        returnStatement = `return ${varMatch[1]};`;
      } else {
        cleanBody = cleanBody.replace(/export\s+default\s+/, 'const DynamicComponent = ');
        returnStatement = `return DynamicComponent;`;
      }
      sourceCode = cleanBody;
    } else {
      // STRATEGY B: Handle Body Only
      sourceCode = `
        const DynamicComponent = (props) => {
          ${cleanBody}
        };
      `;
      returnStatement = `return DynamicComponent;`;
    }

    // 3. Transpile JSX/TSX to ES5 using Babel Standalone
    if (!window.Babel) {
      throw new Error("Babel not loaded. Please ensure Babel is included in index.html");
    }

    let transformed;
    try {
      transformed = window.Babel.transform(sourceCode, {
        // FIX: Added 'typescript' preset to handle .tsx generics like useRef<Type>
        presets: ['react', 'env', 'typescript'], 
        filename: 'dynamic.tsx', // FIX: .tsx extension triggers TS parsing
        compact: false,
      }).code;
    } catch (babelErr) {
      console.error("Babel Transform Failed on:", sourceCode);
      throw babelErr;
    }

    // 4. Create a Function that returns the component.
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

      // Inject Common Drei Components into Top-Level Scope
      const { 
        Html, Text, Text3D, Float, Center, 
        OrbitControls, Environment, ContactShadows, 
        PerspectiveCamera, OrthographicCamera, Grid 
      } = drei;
      
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