import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { Html } from '@react-three/drei';

export default function MobiusStripSimulation() {
  // 1. Controls
  const { radius, stripWidth, twists, speed, particleSize, showWireframe } = useControls({
    radius: { value: 3.5, min: 1, max: 6 },
    stripWidth: { value: 1.2, min: 0.5, max: 3 },
    twists: { value: 1, min: 0, max: 5, step: 1, label: "Twist Count" },
    speed: { value: 1, min: 0, max: 4 },
    particleSize: { value: 0.15, min: 0.05, max: 0.5 },
    showWireframe: true
  });

  // FIX 1: Explicitly type the ref as a THREE.Mesh and initialize with null
  const particleRef = useRef<THREE.Mesh>(null);
  
  // 2. Geometry Generation
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const indices = [];
    const vertices = [];
    const colors = [];
    
    const segments = 128; 
    const widthSegments = 20; 

    for (let i = 0; i <= segments; i++) {
      const u = (i / segments) * Math.PI * 2;
      
      for (let j = 0; j <= widthSegments; j++) {
        const v = (j / widthSegments) * 2 - 1;

        const halfAngle = (u / 2) * twists;
        const widthFactor = v * (stripWidth / 2);
        
        const x = (radius + widthFactor * Math.cos(halfAngle)) * Math.cos(u);
        const z = (radius + widthFactor * Math.cos(halfAngle)) * Math.sin(u);
        const y = widthFactor * Math.sin(halfAngle);

        vertices.push(x, y, z);

        const color = new THREE.Color().setHSL(i / segments, 1, 0.5);
        colors.push(color.r, color.g, color.b);
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < widthSegments; j++) {
        const a = i * (widthSegments + 1) + j;
        const b = (i + 1) * (widthSegments + 1) + j;
        const c = (i + 1) * (widthSegments + 1) + (j + 1);
        const d = i * (widthSegments + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geom.setIndex(indices);
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    
    return geom;
  }, [radius, stripWidth, twists]);

  // 3. Animation Loop
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed * 0.5;
    
    const u = t; 
    const v = 0.6; 

    const halfAngle = (u / 2) * twists;
    const widthFactor = v * (stripWidth / 2);

    const x = (radius + widthFactor * Math.cos(halfAngle)) * Math.cos(u);
    const z = (radius + widthFactor * Math.cos(halfAngle)) * Math.sin(u);
    const y = widthFactor * Math.sin(halfAngle);

    // FIX 2: Check existence before accessing position
    if (particleRef.current) {
      particleRef.current.position.set(x, y, z);
    }
  });

  return (
    <group>
      {/* FIX 3: Removed 'side' prop from mesh, it belongs on material */}
      <mesh geometry={geometry}>
        <meshStandardMaterial 
          vertexColors 
          side={THREE.DoubleSide} 
          roughness={0.4} 
          metalness={0.1} 
        />
      </mesh>

      {showWireframe && (
        <mesh geometry={geometry}>
          <meshBasicMaterial 
            color="white" 
            wireframe 
            transparent 
            opacity={0.1} 
          />
        </mesh>
      )}

      <mesh ref={particleRef}>
        <sphereGeometry args={[particleSize, 32, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} />
        <pointLight distance={4} intensity={2} color="#fbbf24" />
      </mesh>

      <Html position={[0, 0, 0]} center>
        <div style={{
          color: 'white', 
          background: 'rgba(0,0,0,0.7)', 
          padding: '8px 12px', 
          borderRadius: '8px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}>
          Mobius Strip (Twists: {twists})
        </div>
      </Html>

      <gridHelper args={[20, 20, 0x334155, 0x1e293b]} position={[0, -3, 0]} />
    </group>
  );
}