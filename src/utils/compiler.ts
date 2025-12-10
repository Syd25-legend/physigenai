import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import * as Fiber from '@react-three/fiber';
import * as Drei from '@react-three/drei';
import * as Leva from 'leva';
import * as Matter from 'matter-js';

/**
 * Transpiles and evaluates a string of React code into a usable Component.
 * 
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

    // SANITIZATION:
    // The AI sometimes ignores instructions and generates a full "export default function App() { ... }" module.
    // We need to strip this wrapper to get the raw hooks/JSX body.
    if (cleanBody.includes('export default function')) {
      // Remove the export statement line
      cleanBody = cleanBody.replace(/export\s+default\s+function\s+[\w]+\s*\([^\)]*\)\s*\{/, '');
      // Remove the last closing brace of the file.
      // NOTE: We only remove the last character if it is a brace, to avoid breaking helper functions.
      // Ideally, the AI should not define helper functions outside the main component if using "export default", 
      // but if it does, this simplistic strip might break. 
      // However, for single-component outputs (requested), this works.
      cleanBody = cleanBody.replace(/\}\s*$/, '');
    }
    
    // Remove any 'import' statements if present (AI sometimes adds them despite instructions)
    cleanBody = cleanBody.replace(/^import\s+.*$/gm, '');

    // 1. Wrap the body in a functional component definition.
    // Note: We do NOT include the return statement in the source passed to Babel.
    // Babel treats top-level returns as errors if it parses as a module.
    const sourceCode = `
      const DynamicComponent = (props) => {
        ${cleanBody}
      };
    `;

    // 2. Transpile JSX/ES6 to ES5 using Babel Standalone
    if (!window.Babel) {
      throw new Error("Babel not loaded");
    }

    const transformed = window.Babel.transform(sourceCode, {
      presets: ['react', 'env'],
      filename: 'dynamic.js',
    }).code;

    // 3. Create a Function that returns the component.
    //    We inject dependencies as arguments to this function wrapper.
    const createComponent = new Function(
      'React',
      'THREE',
      'three', // Alias for THREE (lowercase) to be forgiving
      'useFrame',
      'useThree',
      'useLoader',
      'drei',
      'drive', // Inject 'drive' as alias for 'drei'
      'leva',
      'ReactThreeFiber', // Inject ReactThreeFiber as a global to prevent ReferenceErrors
      'Matter', // Inject Matter.js for 2D physics
      `
      const { useState, useEffect, useRef, useMemo, useCallback } = React;
      ${transformed}
      return DynamicComponent;
      `
    );

    // Ensure we have the correct Matter object (handle ESM default export)
    const safeMatter = (Matter as any).default || Matter;

    // 4. Execute the creator function with the actual dependencies.
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