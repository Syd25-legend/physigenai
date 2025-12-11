
import { SimulationResponse } from "../types";

export const PERFECT_SIMULATIONS: Record<string, SimulationResponse> = {
  "newton's cradle": {
    title: "Newton's Cradle",
    explanation: `
# Newton's Cradle

Demonstrates the laws of **conservation of momentum** and **conservation of energy**.

### Physics Principles
1. **Momentum**: When a ball collides, velocity is transferred through the stationary balls to the last one.
2. **Elastic Collision**: Kinetic energy is conserved (mostly), allowing the cycle to repeat indefinitely in an ideal system.
    `,
    componentCode: `
// Newton's Cradle - Adjustable Swing Count
const { count, swingCount, speed, maxAngle } = leva.useControls({
  count: { value: 5, min: 3, max: 10, step: 1 },
  swingCount: { value: 1, min: 1, max: 4, step: 1, label: "Balls Swinging" },
  speed: { value: 3, min: 1, max: 10 },
  maxAngle: { value: 0.5, min: 0.1, max: 1.0, label: "Swing Height" }
});

const timeRef = useRef(0);
const [spheres, setSpheres] = useState([]);

// Initialize geometry positions
useEffect(() => {
  setSpheres(Array.from({ length: count }).map((_, i) => ({
    id: i,
    offset: (i - (count - 1) / 2) * 1.01 // Spacing slightly > diameter to avoid clipping
  })));
}, [count]);

useFrame((state, delta) => {
  timeRef.current += delta * speed;
});

// Sub-component for individual pendulum physics
const Pendulum = ({ index, total, offset, timeRef, maxAngle, swingCount }) => {
  const meshRef = useRef();
  const lineRef = useRef();
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    // Cycle is 2*PI. 
    // 0 -> PI: Left side swings in/out
    // PI -> 2PI: Right side swings out/in
    
    const t = timeRef.current % (Math.PI * 2);
    let angle = 0;

    const isLeftSwinger = index < swingCount;
    const isRightSwinger = index >= total - swingCount;
    
    if (isLeftSwinger) {
      if (t > Math.PI) {
         angle = 0; // Stationary
      } else {
         if (t < Math.PI) {
            angle = Math.sin(t - Math.PI/2) * maxAngle;
            if (angle < 0) angle = 0; // Clamped when hitting
         } 
      }
    } else if (isRightSwinger) {
       if (t >= Math.PI) {
          angle = Math.sin(t + Math.PI/2) * maxAngle;
          if (angle > 0) angle = 0; // Inverted direction for right side
       }
    }
    
    // Advanced Phase Logic for proper transfer feel
    const cycle = timeRef.current % (Math.PI * 2);
    if (isLeftSwinger) {
       if (cycle < Math.PI) {
          angle = Math.abs(Math.sin(cycle)) * maxAngle;
       } else {
          angle = 0;
       }
    } else if (isRightSwinger) {
       if (cycle >= Math.PI) {
          angle = -Math.abs(Math.sin(cycle)) * maxAngle;
       } else {
          angle = 0;
       }
    }

    const length = 4;
    meshRef.current.position.x = offset - Math.sin(angle) * length;
    meshRef.current.position.y = 4 - Math.cos(angle) * length; 
    
    // Update string
    if (lineRef.current) {
      const positions = new Float32Array([
         offset, 4, 0, // Pivot point
         meshRef.current.position.x, meshRef.current.position.y, 0
      ]);
      lineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      <line ref={lineRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#94a3b8" opacity={0.5} transparent />
      </line>
      <mesh ref={meshRef} position={[offset, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial 
          color="#e2e8f0" 
          metalness={1} 
          roughness={0.1} 
          envMapIntensity={2} 
        />
      </mesh>
    </>
  );
};

return (
  <group position={[0, 2, 0]}>
    <drei.OrbitControls makeDefault position={[0, 5, 12]} />
    
    <mesh position={[0, 4, 0]}>
      <boxGeometry args={[count * 1.2 + 2, 0.2, 4]} />
      <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh position={[-(count * 1.2 + 2)/2 + 0.5, 2, 0]}>
       <cylinderGeometry args={[0.1, 0.1, 4]} />
       <meshStandardMaterial color="#334155" />
    </mesh>
    <mesh position={[(count * 1.2 + 2)/2 - 0.5, 2, 0]}>
       <cylinderGeometry args={[0.1, 0.1, 4]} />
       <meshStandardMaterial color="#334155" />
    </mesh>

    {spheres.map((s, i) => (
      <Pendulum key={s.id} index={i} total={count} offset={s.offset} timeRef={timeRef} maxAngle={maxAngle} swingCount={swingCount} />
    ))}
  </group>
);
`
  },

  "double pendulum": {
    title: "Double Pendulum Chaos",
    explanation: `
# Double Pendulum

A classic example of a **Chaotic System**.

### Key Concepts
*   **Sensitivity to Initial Conditions**: Tiny changes in starting angle lead to drastically different paths (Butterfly Effect).
*   **Lagrangian Mechanics**: Used to derive the equations of motion as standard Newtonian force vectors are difficult to apply here.
    `,
    componentCode: `
// Double Pendulum using Lagrangian Mechanics
const { r1, r2, m1, m2, gravity } = leva.useControls({
  r1: { value: 3, min: 1, max: 5 },
  r2: { value: 3, min: 1, max: 5 },
  m1: { value: 10, min: 1, max: 20 },
  m2: { value: 10, min: 1, max: 20 },
  gravity: { value: 9.8, min: 1, max: 20 }
});

const state = useRef({
  a1: Math.PI / 2, 
  a2: Math.PI / 2, 
  a1_v: 0,         
  a2_v: 0          
});

const [trail, setTrail] = useState([]);
const p1Ref = useRef();
const p2Ref = useRef();
const lineRef = useRef();

useEffect(() => {
  setTrail([]);
  state.current = { a1: Math.PI / 2 + 0.01, a2: Math.PI / 2, a1_v: 0, a2_v: 0 };
}, [r1, r2, m1, m2, gravity]);

useFrame((_, delta) => {
  const dt = Math.min(delta, 0.05) * 2; 
  const { a1, a2, a1_v, a2_v } = state.current;
  
  const num1 = -gravity * (2 * m1 + m2) * Math.sin(a1);
  const num2 = -m2 * gravity * Math.sin(a1 - 2 * a2);
  const num3 = -2 * Math.sin(a1 - a2) * m2;
  const num4 = a2_v * a2_v * r2 + a1_v * a1_v * r1 * Math.cos(a1 - a2);
  const den = r1 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
  
  const a1_a = (num1 + num2 + num3 * num4) / den;

  const num5 = 2 * Math.sin(a1 - a2);
  const num6 = (a1_v * a1_v * r1 * (m1 + m2));
  const num7 = gravity * (m1 + m2) * Math.cos(a1);
  const num8 = a2_v * a2_v * r2 * m2 * Math.cos(a1 - a2);
  const den2 = r2 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
  
  const a2_a = (num5 * (num6 + num7 + num8)) / den2;

  state.current.a1_v += a1_a * dt;
  state.current.a2_v += a2_a * dt;
  state.current.a1 += state.current.a1_v * dt;
  state.current.a2 += state.current.a2_v * dt;

  const x1 = r1 * Math.sin(state.current.a1);
  const y1 = -r1 * Math.cos(state.current.a1);
  const x2 = x1 + r2 * Math.sin(state.current.a2);
  const y2 = y1 - r2 * Math.cos(state.current.a2);

  if (p1Ref.current) p1Ref.current.position.set(x1, y1, 0);
  if (p2Ref.current) p2Ref.current.position.set(x2, y2, 0);
  
  if (lineRef.current) {
    const positions = new Float32Array([0, 0, 0, x1, y1, 0, x2, y2, 0]);
    lineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineRef.current.geometry.attributes.position.needsUpdate = true;
  }
});

return (
  <group position={[0, 5, 0]}>
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="#ffffff" linewidth={3} />
    </line>
    
    <mesh ref={p1Ref}>
      <sphereGeometry args={[0.5]} />
      <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={0.5} />
    </mesh>
    
    <group>
      <mesh ref={p2Ref}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
      </mesh>
      {/* Use Drei Trail on the second pendulum bob */}
      <drei.Trail
        width={2}
        length={20}
        color="#fbbf24"
        attenuation={(t) => t * t}
        target={p2Ref} 
      />
    </group>
    
    <mesh position={[0,0,0]}>
      <sphereGeometry args={[0.2]} />
      <meshBasicMaterial color="white" />
    </mesh>
  </group>
);
`
  },

  "optical bench": {
    title: "Interactive Optical Bench",
    explanation: `
# Optical Bench Simulator

Experiment with **Geometric Optics**.

### Instructions
*   **Drag & Drop**: Click and drag components to move them.
*   **Controls**: Add Lenses/Mirrors using the menu. Adjust Refractive Index.

### Physics
*   **Snell's Law**: $n_1 \sin(\theta_1) = n_2 \sin(\theta_2)$ governs refraction.
*   **Reflection**: Angle of incidence equals angle of reflection.
    `,
    componentCode: `
const { refractiveIndex, mirrorRotation } = leva.useControls("Settings", { 
  refractiveIndex: { value: 1.5, min: 1.0, max: 2.5 },
  mirrorRotation: { value: 45, min: 0, max: 360, label: "Mirror Angle (Deg)" }
});

const [items, setItems] = useState([
  { id: 1, type: "source", pos: [-8, 0, 0], rot: 0 },
  { id: 2, type: "lens", pos: [0, 0, 0], rot: 0 },
  { id: 3, type: "mirror", pos: [8, 0, 0], rot: -Math.PI/4 }
]);
const [draggingId, setDraggingId] = useState(null);
const { controls } = useThree();

leva.useControls("Tools", {
  "Add Source": leva.button(() => setItems(p => [...p, { id: Date.now(), type: "source", pos: [-5, 0, 0], rot: 0 }])),
  "Add Lens": leva.button(() => setItems(p => [...p, { id: Date.now(), type: "lens", pos: [2, 0, 0], rot: 0 }])),
  "Add Mirror": leva.button(() => setItems(p => [...p, { id: Date.now(), type: "mirror", pos: [5, 0, 0], rot: -Math.PI/4 }])),
  "Clear All": leva.button(() => setItems([]))
});

useEffect(() => {
  setItems(prev => prev.map(i => i.type === "mirror" ? { ...i, rot: THREE.MathUtils.degToRad(mirrorRotation) } : i));
}, [mirrorRotation]);

useEffect(() => {
  if (controls) controls.enabled = !draggingId;
}, [draggingId, controls]);

// Ray Tracing Logic
const rayLines = useMemo(() => {
  const allLines = []; // Store lines as simple point pairs for easy rendering
  
  items.filter(i => i.type === 'source').forEach(source => {
    let origin = new THREE.Vector3(source.pos[0], source.pos[1], source.pos[2]);
    let direction = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), source.rot);
    let currentPoints = [origin.clone()];
    
    // Bounce up to 10 times
    for (let b = 0; b < 10; b++) {
      let closestDist = Infinity;
      let hitObject = null;
      let hitPoint = null;
      let normal = null;

      items.filter(i => i.id !== source.id).forEach(item => {
        const itemPos = new THREE.Vector3(item.pos[0], item.pos[1], item.pos[2]);

        if (item.type === 'lens') {
          const sphereRadius = 1.2;
          const m = origin.clone().sub(itemPos);
          const bVal = m.dot(direction);
          const c = m.dot(m) - sphereRadius * sphereRadius;
          
          if (c > 0 && bVal > 0) return;
          const discr = bVal * bVal - c;
          
          if (discr >= 0) {
             const t = -bVal - Math.sqrt(discr);
             if (t > 0.001 && t < closestDist) {
               closestDist = t;
               hitObject = item;
               hitPoint = origin.clone().add(direction.clone().multiplyScalar(t));
               normal = hitPoint.clone().sub(itemPos).normalize();
             }
          }
        } else if (item.type === 'mirror') {
           // Infinite Plane intersection for simplicity
           const planeNormal = new THREE.Vector3(-1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), item.rot).normalize();
           const denom = direction.dot(planeNormal);
           
           if (Math.abs(denom) > 0.0001) {
             const t = itemPos.clone().sub(origin).dot(planeNormal) / denom;
             // Check if hit point is within "mirror size" (box approx)
             if (t > 0.001 && t < closestDist) {
               const testPoint = origin.clone().add(direction.clone().multiplyScalar(t));
               if (testPoint.distanceTo(itemPos) < 2.5) { // Mirror Height/Width approx
                   closestDist = t;
                   hitObject = item;
                   hitPoint = testPoint;
                   normal = planeNormal;
               }
             }
           }
        }
      });

      if (hitObject && hitPoint) {
         currentPoints.push(hitPoint.clone());
         origin = hitPoint.clone();
         
         if (hitObject.type === 'mirror') {
           direction.reflect(normal);
         } else if (hitObject.type === 'lens') {
           // Simple thin lens approximation or refraction
           // Flip normal if exiting?
           // Simplification: Bend towards center axis
           const entering = direction.dot(normal) < 0;
           if (entering) {
             direction.lerp(normal.clone().negate(), 0.3 * (refractiveIndex - 1)).normalize();
           } else {
             // Exiting
             direction.lerp(normal, 0.1).normalize();
           }
         }
      } else {
        // No hit, extend to infinity
        currentPoints.push(origin.clone().add(direction.clone().multiplyScalar(50)));
        break; 
      }
    }
    allLines.push(currentPoints);
  });
  return allLines;
}, [items, refractiveIndex]);

return (
  <group>
    <ambientLight intensity={0.2} />
    <pointLight position={[0, 20, 0]} intensity={1} />
    <drei.Grid args={[10, 10]} cellColor="#1e293b" sectionColor="#334155" infiniteSection />
    
    <mesh 
      rotation={[-Math.PI/2, 0, 0]} 
      visible={false}
      onPointerMove={(e) => {
        if (draggingId) {
          const pt = e.point;
          setItems(prev => prev.map(i => i.id === draggingId ? { ...i, pos: [pt.x, 0, pt.z] } : i));
        }
      }}
      onPointerUp={() => setDraggingId(null)}
    >
       <planeGeometry args={[100, 100]} />
    </mesh>

    {items.map(item => (
      <group key={item.id} position={item.pos} rotation={[0, item.rot, 0]}>
        <mesh 
          onPointerDown={(e) => { e.stopPropagation(); setDraggingId(item.id); }}
          onPointerOver={() => document.body.style.cursor = 'grab'}
          onPointerOut={() => document.body.style.cursor = 'auto'}
        >
          {item.type === 'source' && (
            <>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
            </>
          )}
          {item.type === 'lens' && (
            <>
              <sphereGeometry args={[1.2, 32, 16]} />
              <meshPhysicalMaterial transmission={1} roughness={0} thickness={2} ior={refractiveIndex} color="#a5f3fc" />
            </>
          )}
          {item.type === 'mirror' && (
            <>
              <boxGeometry args={[0.2, 2, 4]} />
              <meshStandardMaterial color="#94a3b8" metalness={1} roughness={0} />
            </>
          )}
        </mesh>
        
        {item.type === 'mirror' && (
           <mesh position={[0, 1.5, 0]} onClick={(e) => {
             e.stopPropagation();
             setItems(prev => prev.map(i => i.id === item.id ? { ...i, rot: i.rot + Math.PI/8 } : i));
           }}>
             <cylinderGeometry args={[0.2, 0.2, 0.5]} />
             <meshStandardMaterial color="red" />
           </mesh>
        )}
      </group>
    ))}

    {rayLines.map((points, i) => (
       <drei.Line 
         key={i} 
         points={points} 
         color="#fbbf24" 
         lineWidth={4} 
         transparent 
         opacity={0.8} 
       />
    ))}
  </group>
);
`
  },

  "solar system": {
    title: "Full Solar System",
    explanation: `
# Solar System Orbitals

A scale model (distance compressed) of the entire solar system.

### Physics
*   **Gravity**: $F = G \frac{m_1 m_2}{r^2}$ governs the motion.
*   **Orbital Mechanics**: Planets are initialized with velocity $v = \sqrt{GM/r}$ perpendicular to the sun.
    `,
    componentCode: `
const { speed } = leva.useControls({ speed: { value: 1, min: 0, max: 10 } });
const G = 1;
const SUN_MASS = 1000;

const [planets, setPlanets] = useState([
  { name: "Mercury", mass: 1, pos: [5, 0, 0], vel: [0, 0, Math.sqrt(G * SUN_MASS / 5)], color: "#a1a1aa", scale: 0.38 },
  { name: "Venus", mass: 2, pos: [8, 0, 0], vel: [0, 0, Math.sqrt(G * SUN_MASS / 8)], color: "#eab308", scale: 0.95 },
  { name: "Earth", mass: 2, pos: [11, 0, 0], vel: [0, 0, Math.sqrt(G * SUN_MASS / 11)], color: "#3b82f6", scale: 1 },
  { name: "Mars", mass: 1.5, pos: [15, 0, 0], vel: [0, 0, Math.sqrt(G * SUN_MASS / 15)], color: "#ef4444", scale: 0.53 },
  { name: "Jupiter", mass: 10, pos: [24, 0, 0], vel: [0, 0, Math.sqrt(G * SUN_MASS / 24)], color: "#d97706", scale: 3 },
  { name: "Saturn", mass: 8, pos: [32, 0, 0], vel: [0, 0, Math.sqrt(G * SUN_MASS / 32)], color: "#fcd34d", scale: 2.5 },
  { name: "Uranus", mass: 6, pos: [42, 0, 0], vel: [0, 0, Math.sqrt(G * SUN_MASS / 42)], color: "#22d3ee", scale: 2 },
  { name: "Neptune", mass: 6, pos: [54, 0, 0], vel: [0, 0, Math.sqrt(G * SUN_MASS / 54)], color: "#3b82f6", scale: 2 }
]);

const planetRefs = useRef([]);

useFrame((_, delta) => {
  const dt = Math.min(delta, 0.05) * speed;
  
  planets.forEach((p, i) => {
    const mesh = planetRefs.current[i];
    if (!mesh) return;

    const r = mesh.position.length();
    const force = (G * SUN_MASS) / (r * r);
    const fx = -mesh.position.x / r * force;
    const fz = -mesh.position.z / r * force;

    p.vel[0] += fx * dt;
    p.vel[2] += fz * dt;
    mesh.position.x += p.vel[0] * dt;
    mesh.position.z += p.vel[2] * dt;
    p.pos = [mesh.position.x, 0, mesh.position.z];
  });
});

return (
  <group>
    <ambientLight intensity={0.1} />
    <pointLight position={[0, 0, 0]} intensity={2} color="#fbbf24" />
    <drei.Stars radius={150} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />

    <mesh position={[0,0,0]}>
      <sphereGeometry args={[2.5, 64, 64]} />
      <meshStandardMaterial emissive="#fbbf24" emissiveIntensity={3} color="#fbbf24" />
      <pointLight distance={100} intensity={2} />
    </mesh>

    {planets.map((p, i) => (
      <group key={p.name}>
        <mesh 
          ref={el => planetRefs.current[i] = el} 
          position={new THREE.Vector3(...p.pos)}
        >
          <sphereGeometry args={[0.5 * p.scale, 32, 32]} />
          <meshStandardMaterial color={p.color} />
          <drei.Html position={[0, p.scale + 0.5, 0]} distanceFactor={15}>
            <div className="text-slate-200 text-[10px] font-mono bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10 whitespace-nowrap">
              {p.name}
            </div>
          </drei.Html>
          {p.name === "Saturn" && (
            <mesh rotation={[-Math.PI/3, 0, 0]}>
              <ringGeometry args={[1.5, 2.5, 32]} />
              <meshStandardMaterial color="#fcd34d" opacity={0.6} transparent side={THREE.DoubleSide} />
            </mesh>
          )}
        </mesh>
        <drei.Trail
            width={1}
            length={40}
            color={p.color}
            attenuation={(t) => t}
            target={planetRefs.current[i] ? { current: planetRefs.current[i] } : undefined}
         />
        <mesh rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[Math.sqrt(p.pos[0]**2 + p.pos[2]**2) - 0.05, Math.sqrt(p.pos[0]**2 + p.pos[2]**2) + 0.05, 128]} />
          <meshBasicMaterial color="white" opacity={0.05} transparent side={THREE.DoubleSide} />
        </mesh>
      </group>
    ))}
  </group>
);
`
  },

  "galton board": {
    title: "Galton Board (Probability)",
    explanation: `
# Galton Board

Visualizing the **Normal Distribution** (Bell Curve).

### Mechanism
Balls fall through a grid of pegs. At each peg, a ball has a 50/50 chance of bouncing left or right.
    `,
    componentCode: `
const { ballCount } = leva.useControls({ ballCount: { value: 400, min: 50, max: 1000, step: 10 } });
const engine = useRef(Matter.Engine.create());
const [balls, setBalls] = useState([]);

// Reset the world whenever ballCount changes
useEffect(() => {
  const world = engine.current.world;
  Matter.World.clear(world);
  Matter.Engine.clear(engine.current);
  setBalls([]); // Clear React state too
  
  // 1. GRAVITY (Downwards)
  engine.current.gravity.y = 1; // Standard MatterJS gravity
  engine.current.gravity.scale = 0.001; 

  // 2. PEGS - STATIC PHYSICS BODIES
  const rows = 12;
  const pegSpacing = 1.5;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j <= i; j++) {
      const x = (j - i / 2) * pegSpacing;
      const y = i * pegSpacing + 2; 
      const peg = Matter.Bodies.circle(x, y, 0.2, { 
        isStatic: true, 
        restitution: 0.5, 
        friction: 0.05
      });
      Matter.World.add(world, peg);
    }
  }

  // 3. BUCKETS
  for (let i = 0; i < 24; i++) {
     const x = (i - 12) * pegSpacing + (pegSpacing/2);
     const wall = Matter.Bodies.rectangle(x, rows * pegSpacing + 5, 0.1, 10, { isStatic: true, friction: 0 });
     Matter.World.add(world, wall);
  }
  
  // 4. FLOOR
  const floor = Matter.Bodies.rectangle(0, rows * pegSpacing + 10, 60, 2, { isStatic: true });
  Matter.World.add(world, floor);

  return () => {
    Matter.World.clear(world);
    Matter.Engine.clear(engine.current);
  };
}, [ballCount]);

useFrame((_, delta) => {
  // Update physics
  Matter.Engine.update(engine.current, 1000 / 60);
  
  // Spawn only if we are under the limit
  if (balls.length < ballCount && Math.random() > 0.5) {
    const jitterX = (Math.random() - 0.5) * 0.2; 
    const body = Matter.Bodies.circle(jitterX, -5, 0.3, { 
      restitution: 0.6, 
      friction: 0.005,
      density: 0.04
    });

    Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: 1 }); // Initial push down
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.5);

    Matter.World.add(engine.current.world, body);
    setBalls(prev => [...prev, body]);
  }
});

// Component for Individual Physics Ball
const PhysicsBall = ({ body }) => {
  const ref = useRef();
  useFrame(() => { 
    if (ref.current) {
        // MatterJS Y goes down, ThreeJS Y goes up. Invert Y for display.
        ref.current.position.set(body.position.x, -body.position.y + 10, 0);
        if (body.position.y > 50) body.isDead = true;
    }
  });
  if (body.isDead) return null;
  return <mesh ref={ref}><sphereGeometry args={[0.3]} /><meshStandardMaterial color="#2dd4bf" /></mesh>;
};

// INSTANCED MESH FOR PEGS (Replaces drei.Instances to avoid context errors)
const PegsInstances = () => {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    if (!meshRef.current) return;
    const rows = 12;
    const pegSpacing = 1.5;
    let index = 0;
    
    // Match the physics loop logic for positioning
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j <= i; j++) {
            const x = (j - i / 2) * pegSpacing;
            const y = -(i * pegSpacing + 2) + 10; // Invert logic to match ThreeJS visual space
            
            dummy.position.set(x, y, 0);
            dummy.rotation.set(Math.PI/2, 0, 0); // Cylinder rotation
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(index++, dummy.matrix);
        }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  // Calculate total pegs: Sum(1 to 12) = 78
  return (
    <instancedMesh ref={meshRef} args={[null, null, 78]}>
      <cylinderGeometry args={[0.2, 0.2, 0.5]} />
      <meshStandardMaterial color="#64748b" />
    </instancedMesh>
  );
};

return (
  <group position={[0, 2, 0]}>
    <drei.OrthographicCamera makeDefault position={[0, 0, 40]} zoom={18} />
    
    <PegsInstances />
    
    <mesh position={[0, -16, 0]}><boxGeometry args={[40, 2, 1]} /><meshStandardMaterial color="#334155" /></mesh>
    
    {balls.map(b => <PhysicsBall key={b.id} body={b} />)}
    
    <drei.Text position={[0, -19, 0]} color="white" fontSize={1.5}>Galton Probability Distribution</drei.Text>
  </group>
);
`
  },

  "three-body problem": {
    title: "Three-Body Problem",
    explanation: `
# The Three-Body Problem

A classic problem in physics where three celestial bodies interact gravitationally. 

### Why it's Special
Unlike the two-body problem (which has a stable, predictable solution like Earth orbiting the Sun), the three-body problem is mathematically **chaotic**. 
This means it is impossible to predict the exact positions of the bodies indefinitely into the future, as tiny errors grow exponentially.

### Visuals
The colored trails show the complex "spaghetti" orbits that form before one body is inevitably ejected from the system.
    `,
    componentCode: `
const { G, speed } = leva.useControls({
  G: { value: 1, min: 0.1, max: 2 },
  speed: { value: 1, min: 0.1, max: 3 }
});

// Initial Conditions (Figure-8 ish or random stable-ish start)
// Using refs to hold state so we don't re-render the whole component tree every frame
const bodiesRef = useRef([
  { id: 1, mass: 10, pos: new THREE.Vector3(10, 0, 0), vel: new THREE.Vector3(0, 1, 0), color: "#2dd4bf" },
  { id: 2, mass: 10, pos: new THREE.Vector3(-10, 0, 0), vel: new THREE.Vector3(0, -1, 0), color: "#f472b6" },
  { id: 3, mass: 10, pos: new THREE.Vector3(0, 10, 0), vel: new THREE.Vector3(-1, 0, 0), color: "#fbbf24" }
]);

const meshes = useRef([]);

useFrame((_, delta) => {
  const dt = Math.min(delta, 0.05) * speed;
  const bodies = bodiesRef.current;
  
  // Symplectic Integration Step 1: Calc Forces
  const forces = bodies.map(() => new THREE.Vector3());
  
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const p1 = bodies[i].pos;
      const p2 = bodies[j].pos;
      const distVec = p2.clone().sub(p1);
      const r = distVec.length();
      
      // Softening to prevent explosion at r=0
      const fMag = (G * bodies[i].mass * bodies[j].mass) / (r * r + 0.1); 
      const fVec = distVec.normalize().multiplyScalar(fMag);
      
      forces[i].add(fVec);
      forces[j].sub(fVec);
    }
  }

  // Update Bodies
  bodies.forEach((b, i) => {
    // a = F/m
    const accel = forces[i].divideScalar(b.mass);
    
    // v = v + a*dt
    b.vel.add(accel.multiplyScalar(dt));
    
    // p = p + v*dt
    b.pos.add(b.vel.clone().multiplyScalar(dt));
    
    // Update Mesh directly
    if (meshes.current[i]) {
      meshes.current[i].position.copy(b.pos);
    }
  });
});

return (
  <group>
    <ambientLight intensity={0.2} />
    <pointLight position={[0, 0, 0]} intensity={2} />
    <drei.Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />

    {bodiesRef.current.map((b, i) => (
      <group key={b.id}>
        <mesh ref={el => meshes.current[i] = el} position={b.pos}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.5} />
        </mesh>
        
        {/* Use Drei Trail for high performance trails */}
        <drei.Trail
          width={2} 
          length={40} 
          color={b.color} 
          attenuation={(t) => t * t}
          target={meshes.current[i] ? { current: meshes.current[i] } : undefined}
        />
      </group>
    ))}
  </group>
);
`
  },

  "fourier series": {
    title: "Fourier Series Visualization",
    explanation: `
# Fourier Series

Visualizing how complex waveforms can be constructed by adding simple rotating circles.

### Square Wave
This simulation approximates a **Square Wave** by summing odd harmonics of a sine wave.
Formula: $\\sum_{n=1,3,5...} \\frac{4}{n\\pi} \\sin(n\\theta)$

### Controls
*   **Terms**: Increase to add more circles (harmonics) and sharpen the square shape.
    `,
    componentCode: `
const { terms, speed } = leva.useControls({
  terms: { value: 5, min: 1, max: 50, step: 1 },
  speed: { value: 1, min: 0.1, max: 3 }
});

const timeRef = useRef(0);
const waveRef = useRef([]);
const lineRef = useRef();
const waveLineRef = useRef();

useFrame((_, delta) => {
  timeRef.current += delta * speed;
  const t = timeRef.current;
  
  let x = 0;
  let y = 0;
  const points = [new THREE.Vector3(0, 0, 0)];
  
  // Calculate Circle Chain
  for (let i = 0; i < terms; i++) {
    const n = i * 2 + 1; // Odd harmonics: 1, 3, 5...
    const radius = 4 / (n * Math.PI) * 3; // Scale up for visibility
    
    const prevX = x;
    const prevY = y;
    
    x += radius * Math.cos(n * t);
    y += radius * Math.sin(n * t);
    
    points.push(new THREE.Vector3(x, y, 0));
  }
  
  // Update "Arm" Line
  if (lineRef.current) {
    const flatPoints = points.flatMap(p => [p.x, p.y, 0]);
    lineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flatPoints), 3));
    lineRef.current.geometry.attributes.position.needsUpdate = true;
  }
  
  // Update Wave History
  waveRef.current.unshift(y);
  if (waveRef.current.length > 500) waveRef.current.pop();
  
  // Update "Wave" Line (shifted to the right)
  if (waveLineRef.current) {
    const wavePoints = [];
    // Connection line from tip to wave start
    wavePoints.push(x, y, 0);
    wavePoints.push(5, y, 0);
    
    // The wave itself
    waveRef.current.forEach((val, i) => {
      wavePoints.push(5 + i * 0.1, val, 0);
    });
    
    const arr = new Float32Array(wavePoints);
    waveLineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    waveLineRef.current.geometry.attributes.position.needsUpdate = true;
    waveLineRef.current.geometry.setDrawRange(0, wavePoints.length / 3);
  }
});

return (
  <group position={[-5, 0, 0]}>
    <drei.OrthographicCamera makeDefault position={[0, 0, 20]} zoom={30} />
    
    {/* The Rotating Arm */}
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="white" linewidth={2} />
    </line>
    
    {/* The Resulting Wave */}
    <line ref={waveLineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="#2dd4bf" linewidth={2} />
    </line>
    
    <mesh position={[0,0,0]}>
      <sphereGeometry args={[0.2]} />
      <meshBasicMaterial color="white" />
    </mesh>
    
    <drei.Text position={[0, -5, 0]} fontSize={0.8} color="#94a3b8">
      Square Wave Approximation
    </drei.Text>
  </group>
);
`
  },

  "wave interference": {
    title: "3D Wave Interference",
    explanation: `
# Wave Interference

Visualizing the superposition of two wave sources in a Ripple Tank.

### Physics
*   **Constructive Interference**: When two wave peaks meet, they combine to form a higher peak (Cyan).
*   **Destructive Interference**: When a peak meets a trough, they cancel out (Dark Blue).
*   **Formula**: $Z = A \\sin(k r_1 - \\omega t) + A \\sin(k r_2 - \\omega t)$
    `,
    componentCode: `
const { frequency, separation, amplitude } = leva.useControls({
  frequency: { value: 2, min: 0.5, max: 5 },
  separation: { value: 3, min: 0, max: 10 },
  amplitude: { value: 1, min: 0.1, max: 2 }
});

const meshRef = useRef();
const timeRef = useRef(0);

// Create geometry once
const geometry = useMemo(() => new THREE.PlaneGeometry(20, 20, 128, 128), []);

useFrame((_, delta) => {
  timeRef.current += delta * 2;
  const t = timeRef.current;
  
  if (!meshRef.current) return;
  
  const positions = meshRef.current.geometry.attributes.position;
  const colors = [];
  
  // Source positions
  const s1 = new THREE.Vector2(-separation, 0);
  const s2 = new THREE.Vector2(separation, 0);
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    
    // Distances
    const d1 = Math.sqrt((x - s1.x)**2 + (y - s1.y)**2);
    const d2 = Math.sqrt((x - s2.x)**2 + (y - s2.y)**2);
    
    // Superposition
    const z = amplitude * (Math.sin(d1 * frequency - t) + Math.sin(d2 * frequency - t));
    
    positions.setZ(i, z);
    
    // Color map based on height
    // High = Cyan (#2dd4bf), Low = Blue/Black
    const n = (z / (amplitude * 2)) + 0.5; // Normalized 0-1
    const c = new THREE.Color().setHSL(0.5, 0.8, n * 0.5 + 0.1);
    colors.push(c.r, c.g, c.b);
  }
  
  positions.needsUpdate = true;
  meshRef.current.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
});

return (
  <group rotation={[-Math.PI/3, 0, 0]}>
    <pointLight position={[0, 10, 10]} intensity={1} />
    
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} metalness={0.5} roughness={0.2} />
    </mesh>
    
    {/* Source Markers */}
    <mesh position={[-separation, 0, 0]}>
      <sphereGeometry args={[0.2]} />
      <meshBasicMaterial color="white" />
    </mesh>
    <mesh position={[separation, 0, 0]}>
      <sphereGeometry args={[0.2]} />
      <meshBasicMaterial color="white" />
    </mesh>
  </group>
);
`
  },

  "interactive cloth": {
    title: "Interactive Cloth",
    explanation: `
# Interactive Cloth Simulation (Verlet)

A soft body physics simulation using **Verlet Integration**.

### Controls
*   **Interaction**: Click and drag the cloth particles.
*   **Obstacle**: Toggle the obstacle to see collision.
*   **Shape**: Switch between Sphere and Cube obstacles.
*   **Density**: Adjust the resolution of the cloth (higher = smoother but slower).

### Collision Physics
*   **Sphere**: Simple distance check ($d < r$).
*   **Cube**: Axis-Aligned Bounding Box (AABB) check. Points inside the box are projected to the nearest surface.
    `,
    componentCode: `
const { windStrength, stiffness, obstacleEnabled, obstacleShape, obstacleSize, obstacleX, obstacleY, obstacleZ, resolution } = leva.useControls({
  windStrength: { value: 2, min: 0, max: 10 },
  stiffness: { value: 1, min: 0.1, max: 2 },
  obstacleEnabled: { value: false, label: "Enable Obstacle" },
  obstacleShape: { value: 'Sphere', options: ['Sphere', 'Cube'], label: "Shape" },
  obstacleSize: { value: 1.5, min: 0.5, max: 3, label: "Size (Radius)" },
  obstacleX: { value: 0, min: -10, max: 10, label: "Pos X" },
  obstacleY: { value: 0, min: -10, max: 10, label: "Pos Y" },
  obstacleZ: { value: -2, min: -10, max: 10, label: "Pos Z" },
  resolution: { value: 30, min: 10, max: 50, step: 1, label: "Cloth Density" }
});

const CLOTH_WIDTH = 10;
const ROW = resolution;
const COL = resolution;
const REST_DIST = CLOTH_WIDTH / (resolution - 1);

// Initialize Particles
const [particles, setParticles] = useState([]);
const [indices, setIndices] = useState([]);

// Reset when resolution changes
useEffect(() => {
  const p = [];
  const idx = [];
  
  // Particles
  for(let y=0; y<ROW; y++) {
    for(let x=0; x<COL; x++) {
      p.push({
        pos: new THREE.Vector3((x - COL/2)*REST_DIST, (ROW - y)*REST_DIST, 0),
        oldPos: new THREE.Vector3((x - COL/2)*REST_DIST, (ROW - y)*REST_DIST, 0),
        pinned: y===0
      });
    }
  }
  
  // Indices
  for(let y=0; y<ROW-1; y++) {
    for(let x=0; x<COL-1; x++) {
      const a = y*COL + x;
      const b = y*COL + x + 1;
      const c = (y+1)*COL + x;
      const d = (y+1)*COL + x + 1;
      idx.push(a, b, d);
      idx.push(a, d, c);
    }
  }
  
  setParticles(p);
  setIndices(idx);
}, [resolution]);

const geometryRef = useRef();
const { camera, raycaster, pointer, controls } = useThree();
const dragIdx = useRef(-1);

useFrame((_, delta) => {
  if (particles.length === 0) return;

  const dt = Math.min(delta, 0.03); 
  const drag = 0.99;
  const wind = new THREE.Vector3(0, 0, windStrength * Math.sin(Date.now() * 0.001));
  const obstaclePos = new THREE.Vector3(obstacleX, obstacleY, obstacleZ);

  // --- MOUSE INTERACTION ---
  if (dragIdx.current !== -1) {
     raycaster.setFromCamera(pointer, camera);
     const planeZ = new THREE.Plane(new THREE.Vector3(0,0,1), 0);
     const target = new THREE.Vector3();
     raycaster.ray.intersectPlane(planeZ, target);
     
     if (target) {
       particles[dragIdx.current].pos.copy(target);
       particles[dragIdx.current].oldPos.copy(target);
     }
  }

  // 1. Verlet Integration & Collision
  particles.forEach((p, i) => {
    if(p.pinned || i === dragIdx.current) return;
    
    const velocity = p.pos.clone().sub(p.oldPos).multiplyScalar(drag);
    p.oldPos.copy(p.pos);
    
    const force = new THREE.Vector3(0, -9.8, 0).add(wind).multiplyScalar(dt * dt);
    p.pos.add(velocity).add(force);
    
    // Obstacle Collision
    if (obstacleEnabled) {
      if (obstacleShape === 'Sphere') {
        const diff = p.pos.clone().sub(obstaclePos);
        const dist = diff.length();
        if (dist < obstacleSize + 0.1) {
          diff.normalize().multiplyScalar(obstacleSize + 0.1);
          p.pos.copy(obstaclePos).add(diff);
          p.oldPos.copy(p.pos).sub(velocity.multiplyScalar(0.5));
        }
      } else {
        // Cube (AABB)
        const extent = obstacleSize + 0.1; // Margin
        const local = p.pos.clone().sub(obstaclePos);
        
        if (Math.abs(local.x) < extent && Math.abs(local.y) < extent && Math.abs(local.z) < extent) {
           // Inside: find nearest face
           const dists = [
             extent - Math.abs(local.x),
             extent - Math.abs(local.y),
             extent - Math.abs(local.z)
           ];
           const minAxis = dists.indexOf(Math.min(...dists));
           
           if (minAxis === 0) local.x = Math.sign(local.x) * extent;
           if (minAxis === 1) local.y = Math.sign(local.y) * extent;
           if (minAxis === 2) local.z = Math.sign(local.z) * extent;
           
           p.pos.copy(obstaclePos).add(local);
           p.oldPos.copy(p.pos).sub(velocity.multiplyScalar(0.5));
        }
      }
    }
  });

  // 2. Constraint Solving
  const iterations = Math.floor(stiffness * 5);
  for(let i=0; i<iterations; i++) {
    for(let y=0; y<ROW; y++) {
      for(let x=0; x<COL-1; x++) {
        const idx1 = y*COL + x;
        const idx2 = y*COL + x + 1;
        resolveConstraint(particles[idx1], particles[idx2]);
      }
    }
    for(let y=0; y<ROW-1; y++) {
      for(let x=0; x<COL; x++) {
        const idx1 = y*COL + x;
        const idx2 = (y+1)*COL + x;
        resolveConstraint(particles[idx1], particles[idx2]);
      }
    }
  }

  // Update Geometry
  if (geometryRef.current) {
    const positions = geometryRef.current.attributes.position.array;
    particles.forEach((p, i) => {
      positions[i*3] = p.pos.x;
      positions[i*3+1] = p.pos.y;
      positions[i*3+2] = p.pos.z;
    });
    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.computeVertexNormals();
  }
});

const resolveConstraint = (p1, p2) => {
  const diff = p1.pos.clone().sub(p2.pos);
  const dist = diff.length();
  if (dist === 0) return;
  const correction = diff.multiplyScalar((1 - REST_DIST/dist) * 0.5);
  const isPinned1 = p1.pinned || particles.indexOf(p1) === dragIdx.current;
  const isPinned2 = p2.pinned || particles.indexOf(p2) === dragIdx.current;
  if (!isPinned1) p1.pos.sub(correction);
  if (!isPinned2) p2.pos.add(correction);
  if (isPinned1 && !isPinned2) p2.pos.add(correction);
  if (!isPinned1 && isPinned2) p1.pos.sub(correction);
};

const handlePointerDown = (e) => {
  e.stopPropagation();
  let minD = Infinity;
  let idx = -1;
  const point = e.point;
  particles.forEach((p, i) => {
    const d = p.pos.distanceTo(point);
    if (d < 1 && d < minD) { minD = d; idx = i; }
  });
  if (idx !== -1) {
    dragIdx.current = idx;
    document.body.style.cursor = 'grabbing';
    if (controls) controls.enabled = false;
  }
};

const handlePointerUp = () => {
  dragIdx.current = -1;
  document.body.style.cursor = 'auto';
  if (controls) controls.enabled = true;
};

if (particles.length === 0) return null;

return (
  <group>
    <ambientLight intensity={0.5} />
    <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
    
    <mesh 
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOver={() => document.body.style.cursor = 'grab'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute 
          attach="attributes-position"
          count={particles.length}
          array={new Float32Array(particles.length * 3)}
          itemSize={3}
        />
        <bufferAttribute 
          attach="index"
          count={indices.length}
          array={new Uint16Array(indices)}
          itemSize={1}
        />
      </bufferGeometry>
      <meshStandardMaterial color="#2dd4bf" side={THREE.DoubleSide} wireframe={false} />
    </mesh>
    
    <mesh position={[0, ROW*REST_DIST, 0]}>
      <boxGeometry args={[COL*REST_DIST + 1, 0.2, 0.2]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
    
    {obstacleEnabled && (
      <mesh position={[obstacleX, obstacleY, obstacleZ]}>
        {obstacleShape === 'Sphere' ? (
           <sphereGeometry args={[obstacleSize, 32, 32]} />
        ) : (
           <boxGeometry args={[obstacleSize * 2, obstacleSize * 2, obstacleSize * 2]} />
        )}
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
      </mesh>
    )}
    
    <mesh visible={false} onPointerUp={handlePointerUp} position={[0,0,-1]}>
       <planeGeometry args={[100, 100]} />
    </mesh>
  </group>
);
`
  },

  "black hole": {
    title: "Black Hole Lensing",
    explanation: `
# Gravitational Lensing

Visualizing how a massive object like a **Black Hole** bends light.

### General Relativity
According to Einstein, massive objects curve spacetime. Light follows this curvature.
This simulation uses a **GLSL Shader** to bend a background starfield grid around the central sphere (Event Horizon).
The effect scales with $1/r$, creating the characteristic "Einstein Ring".
    `,
    componentCode: `
const { mass } = leva.useControls({ mass: { value: 0.5, min: 0.1, max: 2.0 } });

const LensingShader = {
  uniforms: {
    time: { value: 0 },
    mass: { value: 0.5 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  },
  vertexShader: \`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  \`,
  fragmentShader: \`
    uniform float time;
    uniform float mass;
    varying vec2 vUv;
    
    // Hash function for stars
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    float grid(vec2 uv) {
      vec2 grid = abs(fract(uv * 20.0) - 0.5) / fwidth(uv * 20.0);
      float line = min(grid.x, grid.y);
      return 1.0 - min(line, 1.0);
    }

    void main() {
      vec2 uv = vUv * 2.0 - 1.0; 
      float r = length(uv);
      
      // Schwarzschild Radius (Event Horizon) - grows with mass
      float rs = 0.2 * mass; 
      
      // "Gulping" Black Void
      if (r < rs) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
      
      // Accretion Disk Inner Edge (Photon Sphere)
      float accretionStart = rs * 1.5;
      
      // Gravitational Lensing Distortion
      // The deflection is stronger closer to the black hole
      float distStrength = mass * 0.4;
      float deflection = distStrength / r; 
      
      // Pull texture coordinates inwards (towards center)
      vec2 offset = normalize(-uv) * deflection * 0.5;
      vec2 distortedUV = vUv + offset;
      
      // Background Pattern (Grid + Stars)
      // Animate the grid slowly to show the warping
      float g = grid(distortedUV + time * 0.02);
      
      // Stars
      float starVal = random(floor(distortedUV * 50.0));
      float star = step(0.98, starVal) * (sin(time * 5.0 + starVal * 100.0)*0.5 + 0.5);
      
      // Accretion Disk (Glowing Ring)
      float disk = 0.0;
      float diskR = r + deflection; // Apparent radius after bending
      
      // Disk logic: Band between rs*2 and rs*5
      float diskInner = rs * 2.0;
      float diskOuter = rs * 5.0;
      
      if (diskR > diskInner && diskR < diskOuter) {
         float angle = atan(uv.y, uv.x);
         float noise = sin(angle * 10.0 + time * 2.0 + 1.0/r * 10.0);
         float intensity = smoothstep(diskOuter, diskInner, diskR); // Brighter inside
         disk = intensity * (0.8 + 0.2 * noise);
      }
      
      // Doppler Beaming (one side brighter)
      disk *= 1.0 + 0.5 * uv.x / r; 
      
      vec3 bgColor = vec3(g * 0.15 + star);
      vec3 diskColor = vec3(1.0, 0.5, 0.1) * disk * 3.0; // Hot Orange
      
      gl_FragColor = vec4(bgColor + diskColor, 1.0);
    }
  \`
};

const shaderRef = useRef();

useFrame((state) => {
  if (shaderRef.current) {
    shaderRef.current.uniforms.time.value = state.clock.elapsedTime;
    shaderRef.current.uniforms.mass.value = mass;
  }
});

return (
  <group>
    <mesh>
      <planeGeometry args={[20, 12]} />
      <shaderMaterial 
        ref={shaderRef} 
        args={[LensingShader]} 
        side={THREE.DoubleSide}
        transparent
      />
    </mesh>
    <drei.Text position={[0, -5, 0]} color="#fbbf24">
      Event Horizon & Lensing
    </drei.Text>
  </group>
);
`
  },

  "rutherford scattering": {
    title: "Rutherford Scattering",
    explanation: `
# The Gold Foil Experiment

The experiment that proved atoms have a dense, positively charged **Nucleus**.

### Key Observations
*   **Most pass straight through**: Atoms are mostly empty space.
*   **Small fraction deflected > 90°**: They passed near a dense positive charge (nucleus).
*   **1 in 8,000 bounce back**: Direct hit with the massive nucleus.

### Controls
*   **Aim at Center**: Locks the beam rotation to face the nucleus (0,0,0) when dragging.
*   **Beam Intensity**: Amount of alpha particles.
    `,
    componentCode: `
const { beamIntensity, spawnAngle, particleSpeed, aimAtCenter } = leva.useControls({ 
  beamIntensity: { value: 200, min: 50, max: 500 },
  spawnAngle: { value: 0, min: -90, max: 90, label: "Beam Angle" },
  particleSpeed: { value: 20, min: 5, max: 30 },
  aimAtCenter: { value: true, label: "Aim at Center" }
});

const meshRef = useRef();
const particles = useRef([]);
const dummy = useMemo(() => new THREE.Object3D(), []);
const beamPos = useRef(new THREE.Vector3(-16, 0, 0));
const isDragging = useRef(false);
const { camera, raycaster, pointer, controls } = useThree();

const spawnSpread = 8; 

// Initialize Particle Pool
useEffect(() => {
  particles.current = Array.from({ length: 800 }).map(() => ({
    pos: new THREE.Vector3(-20, 0, 0),
    vel: new THREE.Vector3(0, 0, 0),
    active: false
  }));
}, []);

const nuclei = [
  new THREE.Vector3(0, 0, 0), // Main center nucleus
  new THREE.Vector3(3, 3, 0),
  new THREE.Vector3(-3, -3, 0),
  new THREE.Vector3(3, -3, 0),
  new THREE.Vector3(-3, 3, 0)
];

useFrame((_, delta) => {
  const dt = Math.min(delta, 0.05);

  // DRAG LOGIC
  if (isDragging.current) {
    raycaster.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    if (target) {
       beamPos.current.x = target.x;
       beamPos.current.y = target.y;
    }
  }
  
  // Angle Logic
  let currentAngle = spawnAngle;
  if (aimAtCenter) {
     // Calculate angle to point at (0,0,0) from beamPos
     const dx = 0 - beamPos.current.x;
     const dy = 0 - beamPos.current.y;
     currentAngle = THREE.MathUtils.radToDeg(Math.atan2(dy, dx));
  }
  
  // Spawn logic
  let spawnCount = 0;
  const spawnRate = Math.ceil(beamIntensity / 60);
  
  const angleRad = THREE.MathUtils.degToRad(currentAngle);
  const dir = new THREE.Vector3(Math.cos(angleRad), Math.sin(angleRad), 0);
  const perp = new THREE.Vector3(-Math.sin(angleRad), Math.cos(angleRad), 0); 

  for (let p of particles.current) {
    if (!p.active && spawnCount < spawnRate) {
      p.active = true;
      const spreadOffset = (Math.random() - 0.5) * spawnSpread;
      
      // Spawn closer to beam to avoid gap
      p.pos.copy(beamPos.current)
           .add(dir.clone().multiplyScalar(1.0))
           .add(perp.clone().multiplyScalar(spreadOffset));
      
      const speed = particleSpeed * (0.95 + Math.random() * 0.1);
      p.vel.copy(dir).multiplyScalar(speed);
      
      spawnCount++;
    }
    
    if (p.active) {
      // Physics: Coulomb Repulsion F = k/r^2
      // Tuned for visual effect: Stronger close range force for big deflections
      for (let n of nuclei) {
        const distVec = p.pos.clone().sub(n);
        const rSq = distVec.lengthSq();
        
        // Improve stability very close to nucleus
        const effectiveR = Math.max(rSq, 0.05); 
        
        // Force Magnitude
        // Increase this to see more back-scattering
        const forceMag = 80 / effectiveR; 
        
        const accel = distVec.normalize().multiplyScalar(forceMag);
        p.vel.add(accel.multiplyScalar(dt));
      }
      p.pos.add(p.vel.clone().multiplyScalar(dt));
      
      if (p.pos.length() > 60) p.active = false;
      
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
    } else {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
    }
    meshRef.current.setMatrixAt(particles.current.indexOf(p), dummy.matrix);
  }
  meshRef.current.instanceMatrix.needsUpdate = true;
});

const handlePointerDown = (e) => {
  e.stopPropagation();
  isDragging.current = true;
  if (controls) controls.enabled = false;
  document.body.style.cursor = 'grabbing';
};

const handlePointerUp = () => {
  isDragging.current = false;
  if (controls) controls.enabled = true;
  document.body.style.cursor = 'grab';
};

// Beam Visual
const beamMeshRef = useRef();
useFrame(() => {
   if(beamMeshRef.current) {
      beamMeshRef.current.position.copy(beamPos.current);
      // Update visual rotation to match aim
      let angle = spawnAngle;
      if (aimAtCenter) {
         const dx = -beamPos.current.x;
         const dy = -beamPos.current.y;
         angle = THREE.MathUtils.radToDeg(Math.atan2(dy, dx));
      }
      beamMeshRef.current.rotation.z = THREE.MathUtils.degToRad(angle);
   }
});

return (
  <group onPointerUp={handlePointerUp}>
    {nuclei.map((n, i) => (
      <mesh key={i} position={n}>
        {/* Center Nucleus slightly larger */}
        <sphereGeometry args={[i===0 ? 0.4 : 0.25]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>
    ))}
    
    <instancedMesh ref={meshRef} args={[null, null, 800]}>
      <sphereGeometry args={[0.08]} />
      <meshBasicMaterial color="#2dd4bf" />
    </instancedMesh>
    
    <group ref={beamMeshRef} position={[-16, 0, 0]}>
        <mesh 
           onPointerDown={handlePointerDown}
           onPointerOver={() => document.body.style.cursor = 'grab'}
           onPointerOut={() => document.body.style.cursor = 'auto'}
        >
           <planeGeometry args={[4, spawnSpread + 4]} />
           <meshBasicMaterial visible={false} />
        </mesh>
        
        <mesh>
           <boxGeometry args={[2, spawnSpread, 0.1]} />
           <meshBasicMaterial color="#2dd4bf" transparent opacity={0.1} />
           <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(2, spawnSpread, 0.1)]} />
              <lineBasicMaterial color="#2dd4bf" />
           </lineSegments>
        </mesh>
        
        <mesh position={[0, 0, 0.2]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="white" />
        </mesh>
        
        <drei.Text position={[0, spawnSpread/2 + 2, 0]} fontSize={0.5} color="#2dd4bf">
           Emitter
        </drei.Text>
        
        {/* Arrow indicating direction */}
        <mesh position={[1.5, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
           <coneGeometry args={[0.5, 1, 4]} />
           <meshBasicMaterial color="#2dd4bf" />
        </mesh>
    </group>

    <drei.Text position={[0, -12, 0]} color="white" fontSize={0.6}>
      Scattering creates the "nucleus" shadow
    </drei.Text>
  </group>
);
`
  },

  "soft body": {
    title: "Interactive Jello Cube",
    explanation: `
# Soft Body Physics

Simulating a "Jello" cube using a **Spring-Mass** system.

### Stability Fixes
* **Air Resistance**: Added global damping to stop phantom drifting.
* **Sub-Stepping**: Physics runs 10x per frame for stiffness.
* **Ground Friction**: Prevents sliding on the floor.

### Controls
* **Drag**: Grab corners to throw.
* **Stiffness**: Structural integrity (0 = liquid-like).
* **Damping**: How fast it stops moving (Air resistance).
* **Resolution**: Grid density (higher = jiggle more).
    `,
    componentCode: `
const { stiffness, damping, mass, size, resolution } = leva.useControls({
  stiffness: { value: 600, min: 0, max: 2000, label: "Stiffness" },
  damping: { value: 0.98, min: 0.90, max: 0.999, label: "Air Resistance" },
  mass: { value: 1, min: 0.1, max: 5, label: "Mass" },
  size: { value: 3, min: 1, max: 5, label: "Size" },
  resolution: { value: 2, min: 2, max: 4, step: 1, label: "Grid Res" },
  "Reset": leva.button(() => shouldReset.current = true)
});

// Physics State
const particles = useRef([]);
const springs = useRef([]);
const shouldReset = useRef(true);

// Visual Refs
// Use InstancedMesh for particles for performance
const meshRef = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);
const dragIdx = useRef(-1);
const { camera, raycaster, pointer, controls } = useThree();

// Line Ref (Single BufferGeometry for all lines)
const lineRef = useRef();

// Initialization Logic
const init = () => {
  const p = [];
  const s = [];
  
  // Create Particles Grid (resolution x resolution x resolution)
  const step = size / (resolution - 1);
  const offset = size / 2;
  
  for(let z=0; z<resolution; z++) {
    for(let y=0; y<resolution; y++) {
       for(let x=0; x<resolution; x++) {
          p.push({
            pos: new THREE.Vector3(x*step - offset, y*step + 3, z*step - offset),
            oldPos: new THREE.Vector3(x*step - offset, y*step + 3, z*step - offset),
            mass: 1
          });
       }
    }
  }
  
  particles.current = p;

  // Create Springs (Structural + Shear + Bend)
  // Structural: Direct neighbors
  const getIdx = (x, y, z) => z*resolution*resolution + y*resolution + x;
  
  const addSpring = (i, j) => {
     const p1 = particles.current[i].pos;
     const p2 = particles.current[j].pos;
     s.push({ a: i, b: j, restLen: p1.distanceTo(p2) });
  };

  for(let z=0; z<resolution; z++) {
    for(let y=0; y<resolution; y++) {
       for(let x=0; x<resolution; x++) {
          const i = getIdx(x,y,z);
          // Structural
          if (x+1 < resolution) addSpring(i, getIdx(x+1, y, z));
          if (y+1 < resolution) addSpring(i, getIdx(x, y+1, z));
          if (z+1 < resolution) addSpring(i, getIdx(x, y, z+1));
          
          // Shear (Face diagonals)
          if (x+1 < resolution && y+1 < resolution) addSpring(i, getIdx(x+1, y+1, z));
          if (x+1 < resolution && y+1 < resolution) addSpring(getIdx(x+1,y,z), getIdx(x, y+1, z));
          
          if (z+1 < resolution && y+1 < resolution) addSpring(i, getIdx(x, y+1, z+1));
          if (z+1 < resolution && y+1 < resolution) addSpring(getIdx(x,y,z+1), getIdx(x, y+1, z));
          
          if (x+1 < resolution && z+1 < resolution) addSpring(i, getIdx(x+1, y, z+1));
          if (x+1 < resolution && z+1 < resolution) addSpring(getIdx(x+1,y,z), getIdx(x, y, z+1));
          
          // Cross Bend (Body diagonals) - only for cubes?
          if (x+1 < resolution && y+1 < resolution && z+1 < resolution) {
             addSpring(i, getIdx(x+1, y+1, z+1));
             addSpring(getIdx(x+1, y, z), getIdx(x, y+1, z+1));
             addSpring(getIdx(x, y+1, z), getIdx(x+1, y, z+1));
             addSpring(getIdx(x, y, z+1), getIdx(x+1, y+1, z));
          }
       }
    }
  }
  
  springs.current = s;
  shouldReset.current = false;
  
  // Initialize line geometry buffer
  if (lineRef.current) {
    const count = s.length * 2;
    lineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  }
};

useEffect(() => {
   shouldReset.current = true;
}, [resolution, size]);

// Frame Loop
useFrame((_, delta) => {
  if (shouldReset.current) init();
  if (particles.current.length === 0) return;

  const subSteps = 5;
  const dt = Math.min(delta, 0.02) / subSteps; 

  // Physics Sub-stepping
  for (let step = 0; step < subSteps; step++) {
    particles.current.forEach((p, i) => {
      if (i === dragIdx.current) return; 

      // Verlet Integration
      const vel = p.pos.clone().sub(p.oldPos).multiplyScalar(damping);
      p.oldPos.copy(p.pos);
      
      const gravity = new THREE.Vector3(0, -9.8 * mass, 0).multiplyScalar(dt * dt);
      p.pos.add(vel).add(gravity);

      // Floor Collision
      if (p.pos.y < 0) {
        p.pos.y = 0;
        // Friction
        const friction = 0.8;
        p.oldPos.x += (p.pos.x - p.oldPos.x) * friction;
        p.oldPos.z += (p.pos.z - p.oldPos.z) * friction;
      }
    });

    // Constraints
    // Relax more times for stability
    for (let j = 0; j < 2; j++) {
      springs.current.forEach(({ a, b, restLen }) => {
        const p1 = particles.current[a];
        const p2 = particles.current[b];
        const delta = p2.pos.clone().sub(p1.pos);
        const dist = delta.length();
        if (dist === 0) return;
        
        const diff = (dist - restLen) / dist;
        const correction = delta.multiplyScalar(diff * 0.5 * (stiffness / 1000));
        
        if (a !== dragIdx.current) p1.pos.add(correction);
        if (b !== dragIdx.current) p2.pos.sub(correction);
      });
    }
  }

  // Mouse Interaction (Drag)
  if (dragIdx.current !== -1) {
    raycaster.setFromCamera(pointer, camera);
    const p = particles.current[dragIdx.current];
    const planeNormal = camera.getWorldDirection(new THREE.Vector3());
    const plane = new THREE.Plane(planeNormal, -p.pos.dot(planeNormal));
    
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    
    if (target) {
      p.pos.copy(target);
      p.oldPos.copy(target); 
    }
  }

  // Update Visuals (Particles)
  if (meshRef.current) {
    particles.current.forEach((p, i) => {
      dummy.position.copy(p.pos);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }
  
  // Update Lines
  if (lineRef.current) {
    const pos = lineRef.current.geometry.attributes.position.array;
    let idx = 0;
    springs.current.forEach(({ a, b }) => {
      const p1 = particles.current[a].pos;
      const p2 = particles.current[b].pos;
      pos[idx++] = p1.x; pos[idx++] = p1.y; pos[idx++] = p1.z;
      pos[idx++] = p2.x; pos[idx++] = p2.y; pos[idx++] = p2.z;
    });
    lineRef.current.geometry.attributes.position.needsUpdate = true;
    lineRef.current.geometry.setDrawRange(0, springs.current.length * 2);
  }
});

const handlePointerDown = (e) => {
  e.stopPropagation();
  let minD = Infinity;
  let idx = -1;
  particles.current.forEach((p, i) => {
    const d = p.pos.distanceTo(e.point);
    if (d < 1 && d < minD) { minD = d; idx = i; }
  });
  if (idx !== -1) {
    dragIdx.current = idx;
    document.body.style.cursor = 'grabbing';
    if (controls) controls.enabled = false;
  }
};

const handlePointerUp = () => {
  dragIdx.current = -1;
  document.body.style.cursor = 'auto';
  if (controls) controls.enabled = true;
};

return (
  <group onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
    <ambientLight intensity={0.5} />
    <pointLight position={[10, 10, 10]} intensity={1} />
    
    <instancedMesh ref={meshRef} args={[null, null, resolution*resolution*resolution]}>
       <sphereGeometry args={[0.2]} />
       <meshStandardMaterial color="#fbbf24" />
    </instancedMesh>

    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="#2dd4bf" transparent opacity={0.3} />
    </line>
    
    <gridHelper args={[20, 20, 0x334155, 0x1e293b]} />
    <mesh visible={false} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[100,100]} /></mesh>
  </group>
);
`
  },

  "audio visualizer": {
    title: "Fourier Audio Visualizer",
    explanation: `
# Fourier Transform (FFT)

Visualizing signals as frequencies.

### Signal Processing
Any complex signal (like music) can be decomposed into a sum of simple sine waves of different frequencies.
This display shows the **Amplitude** (height) of specific frequency bands, arranged in a circle.
(Note: This uses simulated data for the demo).
    `,
    componentCode: `
const { smoothing } = leva.useControls({ smoothing: { value: 0.8, min: 0.1, max: 0.99 } });
const count = 64;
const meshRef = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);
const data = useRef(new Array(count).fill(0));

useFrame((state, delta) => {
  if (!meshRef.current) return;
  
  const time = state.clock.elapsedTime;
  
  // Update Simulated FFT Data
  for (let i = 0; i < count; i++) {
    // Generate noise based on sine waves to simulate a beat
    const target = (Math.sin(time * 10 + i * 0.5) + 1) * 0.5
                 * (Math.sin(time * 2) + 1) // Beat
                 * (Math.random() * 0.5 + 0.5);
                 
    data.current[i] += (target - data.current[i]) * (1 - smoothing);
  }
  
  // Update Instances
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 5;
    const h = data.current[i] * 5 + 0.1;
    
    dummy.position.set(Math.cos(angle) * radius, h / 2, Math.sin(angle) * radius);
    dummy.rotation.y = -angle;
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    
    meshRef.current.setMatrixAt(i, dummy.matrix);
  }
  meshRef.current.instanceMatrix.needsUpdate = true;
});

return (
  <group rotation={[Math.PI/6, 0, 0]}>
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[0.3, 1, 0.3]} />
      <meshStandardMaterial color="#2dd4bf" toneMapped={false} emissive="#2dd4bf" emissiveIntensity={2} />
    </instancedMesh>
    <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0]}>
      <circleGeometry args={[4.5, 64]} />
      <meshBasicMaterial color="black" />
    </mesh>
  </group>
);
`
  },

"gravitron": {
    title: "The Gravitron (Carnival Physics)",
    explanation: "Experience circular motion! As the ride spins, the wall pushes you in (Normal Force). If fast enough, friction ($f = \\mu N$) overcomes gravity, and you stick to the wall when the floor drops.",
    componentCode: `
const { speed, floorDrop, friction } = useControls({
  speed: { value: 1, min: 0, max: 5, label: "Spin Speed" },
  floorDrop: { value: false, label: "Drop Floor!" },
  friction: { value: 0.5, min: 0.1, max: 1.0, label: "Wall Friction" }
});

const rider = useRef({ y: 1, velY: 0 });
const group = useRef();
const riderMesh = useRef();
const floorMesh = useRef();

useFrame((state, dt) => {
  const t = state.clock.elapsedTime;
  const angularVel = speed * 2;
  const radius = 4;
  const g = 9.8;
  
  // Rotate the whole room
  if (group.current) group.current.rotation.y = -t * angularVel;
  
  // Physics Calculation
  const centripetalAccel = angularVel * angularVel * radius;
  const normalForce = centripetalAccel; // Mass = 1
  const maxFriction = normalForce * friction;
  
  // Vertical Motion
  let accelY = -g;
  
  // If touching wall (which is always true in this setup), friction acts up
  if (maxFriction >= g) {
     // Static friction is enough to hold against gravity
     accelY = 0; 
     rider.current.velY = 0;
  } else {
     // Kinetic friction slows the fall
     accelY = -g + maxFriction;
  }
  
  // Floor constraint
  const floorLevel = floorDrop ? -5 : 0;
  
  if (rider.current.y > floorLevel) {
     rider.current.velY += accelY * dt;
     rider.current.y += rider.current.velY * dt;
  } else {
     rider.current.y = floorLevel;
     rider.current.velY = 0;
  }
  
  // Update Rider Visuals
  if (riderMesh.current) {
     riderMesh.current.position.set(4, rider.current.y + 1, 0); // Stuck to wall at x=4
  }
  
  if (floorMesh.current) {
     floorMesh.current.position.y = floorLevel;
  }
});

return (
  <group>
    {/* Spinning Room Container */}
    <group ref={group}>
       {/* Wall segments */}
       {Array.from({length: 8}).map((_, i) => (
          <mesh key={i} position={[Math.cos(i/8*Math.PI*2)*4.2, 0, Math.sin(i/8*Math.PI*2)*4.2]} rotation={[0, -i/8*Math.PI*2, 0]}>
             <boxGeometry args={[0.5, 12, 3.5]} />
             <meshStandardMaterial color={i%2===0 ? "#ef4444" : "#facc15"} />
          </mesh>
       ))}
       
       {/* The Rider */}
       <mesh ref={riderMesh}>
          <boxGeometry args={[0.8, 2, 0.8]} />
          <meshStandardMaterial color="#22d3ee" />
          <drei.Html position={[0, 0, 0]} center><div style={{fontSize:'20px'}}>🤮</div></drei.Html>
       </mesh>
       
       {/* The Floor */}
       <mesh ref={floorMesh} rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[4, 32]} />
          <meshStandardMaterial color="#334155" />
       </mesh>
    </group>
    
    <drei.Grid args={[30, 30]} position={[0, -6, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
  },

  "gravity assist": {
    title: "Orbital Slingshot (Gravity Assist)",
    explanation: "Pilot a spacecraft! Fly close to the moving Jupiter to steal some of its momentum and boost your speed without using fuel.",
    componentCode: `
const { launchSpeed, launchAngle } = useControls({
  launchSpeed: { value: 12, min: 5, max: 20 },
  launchAngle: { value: 45, min: 0, max: 90 }
});

const [launched, setLaunched] = useState(false);
const ship = useRef({ pos: new THREE.Vector3(-15, 0, 5), vel: new THREE.Vector3(0,0,0) });
const planet = useRef({ pos: new THREE.Vector3(0,0,0), vel: new THREE.Vector3(-3, 0, 0) }); // Planet moves left
const trail = useRef([]);
const line = useRef();
const shipMesh = useRef();
const planetMesh = useRef();

// Reset logic
useEffect(() => {
   if(!launched) {
      ship.current.pos.set(-15, 0, 5);
      planet.current.pos.set(10, 0, -2);
      trail.current = [];
   }
}, [launched]);

useControls({ "LAUNCH 🚀": button(() => {
   const rad = launchAngle * Math.PI / 180;
   ship.current.vel.set(Math.cos(rad) * launchSpeed, 0, -Math.sin(rad) * launchSpeed);
   setLaunched(true);
})});

useControls({ "RESET": button(() => setLaunched(false)) });

useFrame((_, dt) => {
   if (!launched) return;
   
   const G = 50; // Strong gravity for effect
   const dtSim = Math.min(dt, 0.02);
   
   // Move Planet
   planet.current.pos.x += -3 * dtSim; // Planet moves constant speed
   
   // Gravity Calculation
   const distVec = new THREE.Vector3().subVectors(planet.current.pos, ship.current.pos);
   const r = distVec.length();
   
   if (r > 1) { // Collision guard
      const force = distVec.normalize().multiplyScalar(G / (r*r));
      ship.current.vel.add(force.multiplyScalar(dtSim));
   }
   
   // Move Ship
   ship.current.pos.add(ship.current.vel.clone().multiplyScalar(dtSim));
   
   // Update Visuals
   if(shipMesh.current) shipMesh.current.position.copy(ship.current.pos);
   if(planetMesh.current) planetMesh.current.position.copy(planet.current.pos);
   
   // Trail
   if (trail.current.length < 500) {
      trail.current.push(ship.current.pos.x, ship.current.pos.y, ship.current.pos.z);
      if(line.current) {
         line.current.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trail.current), 3));
         line.current.geometry.setDrawRange(0, trail.current.length/3);
         line.current.geometry.attributes.position.needsUpdate = true;
      }
   }
});

return (
  <group>
     {/* Ship */}
     <mesh ref={shipMesh} position={[-15, 0, 5]}>
        <coneGeometry args={[0.5, 1.5, 4]} rotation={[Math.PI/2, 0, 0]} />
        <meshStandardMaterial color="#facc15" />
     </mesh>
     
     {/* Planet */}
     <mesh ref={planetMesh} position={[10, 0, -2]}>
        <sphereGeometry args={[2]} />
        <meshStandardMaterial color="#ef4444" />
        <mesh scale={[1.5, 0.1, 1.5]}><ringGeometry args={[2.5, 4, 32]} /><meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} opacity={0.5} transparent /></mesh>
     </mesh>
     
     <line ref={line}><bufferGeometry /><lineBasicMaterial color="white" /></line>
     <drei.Grid args={[50, 50]} position={[0, -2, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
  },

  "electric hockey": {
    title: "Electric Field Hockey",
    explanation: "Steer the positive charge (Yellow) into the goal (Green) using repelling forces from the blue charges. Drag the blue charges to guide the path!",
    componentCode: `
// Game State
const [puck, setPuck] = useState({ pos: new THREE.Vector3(-8, 0, 0), vel: new THREE.Vector3(0,0,0), active: false });
// Draggable Obstacles (Positive Charges)
const [obstacles, setObstacles] = useState([
  { id: 1, pos: [-2, 0, 2] },
  { id: 2, pos: [0, 0, -2] },
  { id: 3, pos: [3, 0, 3] }
]);
const [draggingId, setDraggingId] = useState(null);

const { raycaster, camera, pointer, controls } = useThree();
const puckMesh = useRef();

// Controls
useControls({ "START": button(() => setPuck(p => ({ ...p, active: true })) ) });
useControls({ "RESET": button(() => setPuck({ pos: new THREE.Vector3(-8, 0, 0), vel: new THREE.Vector3(0,0,0), active: false })) });

useFrame((_, dt) => {
   if (!puck.active) return;
   const subSteps = 5;
   const dtSim = Math.min(dt, 0.05) / subSteps;
   
   for(let s=0; s<subSteps; s++) {
      // Calculate Force from all obstacles
      // F = k * q1 * q2 / r^2
      const force = new THREE.Vector3(0,0,0);
      obstacles.forEach(obs => {
         const obsPos = new THREE.Vector3(obs.pos[0], 0, obs.pos[2]);
         const dir = puck.pos.clone().sub(obsPos);
         const dist = dir.length();
         if (dist > 0.5) {
            dir.normalize().multiplyScalar(20 / (dist * dist)); // Repulsion
            force.add(dir);
         }
      });
      
      // Update Physics
      puck.vel.add(force.multiplyScalar(dtSim));
      puck.vel.multiplyScalar(0.99); // Friction
      puck.pos.add(puck.vel.clone().multiplyScalar(dtSim));
   }
   
   if (puckMesh.current) puckMesh.current.position.copy(puck.pos);
});

// Drag Logic
const handlePointerMove = (e) => {
   if (draggingId) {
      raycaster.setFromCamera(pointer, camera);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), target);
      setObstacles(prev => prev.map(o => o.id === draggingId ? { ...o, pos: [target.x, 0, target.z] } : o));
   }
};

const handleDown = (e, id) => { e.stopPropagation(); setDraggingId(id); if(controls) controls.enabled = false; };
const handleUp = () => { setDraggingId(null); if(controls) controls.enabled = true; };

return (
  <group onPointerMove={handlePointerMove} onPointerUp={handleUp}>
     {/* Goal */}
     <mesh position={[8, 0, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[1, 1.2, 32]} />
        <meshBasicMaterial color="#22c55e" />
        <drei.Html position={[0,0,0]}><div style={{color:'#22c55e', fontWeight:'bold'}}>GOAL</div></drei.Html>
     </mesh>
     
     {/* Puck */}
     <mesh ref={puckMesh} position={[-8, 0, 0]}>
        <sphereGeometry args={[0.4]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.5} />
        <drei.Html position={[0,0.6,0]}><div style={{color:'#facc15'}}>+</div></drei.Html>
     </mesh>
     
     {/* Obstacles */}
     {obstacles.map(obs => (
        <mesh 
           key={obs.id} 
           position={[obs.pos[0], 0, obs.pos[2]]}
           onPointerDown={(e) => handleDown(e, obs.id)}
           onPointerOver={() => document.body.style.cursor = 'move'}
           onPointerOut={() => document.body.style.cursor = 'auto'}
        >
           <sphereGeometry args={[0.6]} />
           <meshStandardMaterial color="#3b82f6" />
           <drei.Html position={[0,0.8,0]}><div style={{color:'#3b82f6'}}>+</div></drei.Html>
        </mesh>
     ))}
     
     <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#1e293b" />
     </mesh>
  </group>
);`
  },

  "mass spec": {
    title: "Mass Spectrometer",
    explanation: "Particles separate based on mass! In a magnetic field, the radius of curvature $r = mv/qB$ depends on mass. Heavier isotopes take wider turns.",
    componentCode: `
const { bField, eField } = useControls({
  bField: { value: 1.5, min: 0.5, max: 3, label: "Magnetic Field (B)" },
  eField: { value: 2, min: 1, max: 5, label: "Accel Voltage" }
});

const particles = useRef([]);
const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);

// Spawn particles continuously
useFrame(({ clock }, dt) => {
   const t = clock.elapsedTime;
   if (Math.random() > 0.8) {
      // Randomly spawn Light (mass=1) or Heavy (mass=2) isotope
      const isHeavy = Math.random() > 0.5;
      particles.current.push({
         pos: new THREE.Vector3(-10, 0, 0),
         vel: new THREE.Vector3(eField, 0, 0), // Initial push
         mass: isHeavy ? 2.5 : 1.5,
         color: isHeavy ? new THREE.Color("#ef4444") : new THREE.Color("#22d3ee"),
         life: 5
      });
   }
   
   let count = 0;
   particles.current.forEach((p, i) => {
      if (p.life <= 0) return;
      count++;
      p.life -= dt;
      
      // Physics: Lorentz Force F = q(v x B)
      // Since v is in XZ plane and B is Y, Force is perpendicular to v
      // This creates circular motion.
      // a = (q/m) * (v x B)
      
      const q = 5;
      const speed = p.vel.length();
      const radius = (p.mass * speed) / (q * bField);
      
      // We can simulate this analytically as a turn, or stepwise
      // Stepwise for simplicity:
      const forceDir = new THREE.Vector3(-p.vel.z, 0, p.vel.x).normalize(); // Perpendicular
      const forceMag = q * speed * bField;
      const accel = forceDir.multiplyScalar(forceMag / p.mass);
      
      p.vel.add(accel.multiplyScalar(dt));
      p.pos.add(p.vel.clone().multiplyScalar(dt));
      
      // Update Instance
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(0.3);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      mesh.current.setColorAt(i, p.color);
   });
   
   mesh.current.instanceMatrix.needsUpdate = true;
   mesh.current.instanceColor.needsUpdate = true;
   
   // Cleanup dead
   particles.current = particles.current.filter(p => p.life > 0);
});

return (
  <group>
     <instancedMesh ref={mesh} args={[null, null, 200]}>
        <sphereGeometry />
        <meshBasicMaterial />
     </instancedMesh>
     
     {/* Source */}
     <mesh position={[-11, 0, 0]} rotation={[0,0,-Math.PI/2]}><cylinderGeometry args={[0.5, 0.5, 2]} /><meshStandardMaterial color="gray" /></mesh>
     
     {/* Detector Screen */}
     <mesh position={[0, 0, -5]} rotation={[0, 0, 0]}><boxGeometry args={[15, 2, 0.5]} /><meshStandardMaterial color="#334155" /></mesh>
     
     <drei.Text position={[0, 3, 0]} rotation={[-Math.PI/2, 0, 0]} fontSize={1} color="#475569">B-Field Region (Up)</drei.Text>
     <drei.Grid args={[30, 20]} position={[0, -0.5, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
  },

  "wave machine": {
    title: "Transverse Wave Machine",
    explanation: "A chain of coupled oscillators. Moving the first bead sends a pulse down the line. Notice how each bead only moves up and down, but the wave energy moves forward.",
    componentCode: `
const { frequency, tension, damping } = useControls({
  frequency: { value: 2, min: 0, max: 5 },
  tension: { value: 0.8, min: 0.1, max: 1 },
  damping: { value: 0.02, min: 0, max: 0.1 }
});

const count = 50;
const beads = useMemo(() => Array.from({length: count}).map(() => ({ y: 0, vel: 0 })), []);
const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);

useFrame(({ clock }) => {
   const t = clock.elapsedTime;
   
   // Drive the first bead
   beads[0].y = Math.sin(t * frequency * 5) * 2;
   
   // Propagate physics (1D Wave Equation discretized)
   for (let i = 1; i < count - 1; i++) {
      // Force from neighbors
      const force = tension * (beads[i-1].y + beads[i+1].y - 2*beads[i].y);
      beads[i].vel += force;
      beads[i].vel *= (1 - damping);
      beads[i].y += beads[i].vel;
   }
   
   // Update Visuals
   for (let i = 0; i < count; i++) {
      dummy.position.set(i * 0.5 - 12, beads[i].y + 2, 0);
      dummy.scale.setScalar(0.4);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
   }
   mesh.current.instanceMatrix.needsUpdate = true;
});

return (
  <group>
     <instancedMesh ref={mesh} args={[null, null, count]}>
        <sphereGeometry />
        <meshStandardMaterial color="#22d3ee" />
     </instancedMesh>
     
     {/* Connection Lines (Simplified as a single rect for now, purely visual) */}
     <mesh position={[0, 2, 0]}><boxGeometry args={[25, 0.05, 0.05]} /><meshBasicMaterial color="gray" opacity={0.2} transparent /></mesh>
     
     <drei.Grid args={[30, 10]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
  },

  "monkey hunter": {
    title: "Monkey and Hunter",
    explanation: "Classic Paradox: If you aim directly at a falling target, will you hit it? YES! Because gravity affects the bullet and the monkey equally.",
    componentCode: `
const { bulletSpeed, dist } = useControls({
  bulletSpeed: { value: 15, min: 8, max: 30 },
  dist: { value: 15, min: 10, max: 20 }
});

const [fired, setFired] = useState(false);
const monkey = useRef();
const bullet = useRef();
const timer = useRef(0);

// Reset
useEffect(() => {
   setFired(false);
   timer.current = 0;
   if(monkey.current) monkey.current.position.set(dist, 10, 0);
   if(bullet.current) bullet.current.position.set(0, 0, 0);
}, [dist, bulletSpeed]);

useControls({ "FIRE!": button(() => setFired(true)) });
useControls({ "RESET": button(() => setFired(false)) });

useFrame((_, dt) => {
   // Aim Vector Calculation
   // Aiming at (dist, 10) from (0,0)
   const dx = dist;
   const dy = 10;
   const angle = Math.atan2(dy, dx);
   
   // Visualize Aim Line
   // (Omitted for brevity, but the bullet follows this initial vector)
   
   if (fired) {
      timer.current += dt;
      const t = timer.current;
      const g = 9.8;
      
      // Monkey: Freefall from (dist, 10)
      // y = y0 - 0.5gt^2
      const my = 10 - 0.5 * g * t * t;
      if (monkey.current) monkey.current.position.set(dist, Math.max(0, my), 0);
      
      // Bullet: Projectile
      // x = v*cos(theta)*t
      // y = v*sin(theta)*t - 0.5gt^2
      const bx = bulletSpeed * Math.cos(angle) * t;
      const by = bulletSpeed * Math.sin(angle) * t - 0.5 * g * t * t;
      
      if (bullet.current) bullet.current.position.set(bx, Math.max(0, by), 0);
   } else {
      // Reset positions just in case
      timer.current = 0;
      if(monkey.current) monkey.current.position.set(dist, 10, 0);
      if(bullet.current) bullet.current.position.set(0, 0, 0);
   }
});

return (
  <group>
     {/* Hunter/Cannon */}
     <mesh position={[0, 0, 0]} rotation={[0,0,Math.atan2(10,dist)]}>
        <boxGeometry args={[2, 0.5, 0.5]} />
        <meshStandardMaterial color="#475569" />
     </mesh>
     
     {/* Bullet */}
     <mesh ref={bullet}><sphereGeometry args={[0.3]} /><meshStandardMaterial color="black" /></mesh>
     
     {/* Monkey */}
     <mesh ref={monkey} position={[dist, 10, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f59e0b" />
        <drei.Html position={[0, 1, 0]} center><div style={{fontSize:'20px'}}>🐵</div></drei.Html>
     </mesh>
     
     {/* Aim Line */}
     <line>
        <bufferGeometry>
           <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([0,0,0, dist,10,0])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="red" dashSize={0.5} gapSize={0.2} />
     </line>
     
     <drei.Grid args={[40, 20]} position={[0, -0.5, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
  },

  "buoyancy lab": {
    title: "Buoyancy Lab",
    explanation: "Experiment with density! Objects with density < 1.0 (water) float. Throw them in and watch the splash.",
    componentCode: `
const { woodDensity, brickDensity } = useControls({
  woodDensity: { value: 0.6, min: 0.1, max: 0.9, label: "Wood Density" },
  brickDensity: { value: 2.5, min: 1.1, max: 5.0, label: "Brick Density" }
});

// Physics State [y, vy]
const wood = useRef({ y: 5, vy: 0 });
const brick = useRef({ y: 5, vy: 0 });
const woodMesh = useRef();
const brickMesh = useRef();

const updatePhysics = (obj, density, dt) => {
   const g = 9.8;
   const fluidDensity = 1.0;
   const drag = 2.0;
   
   // Forces
   let fBuoyancy = 0;
   let fDrag = 0;
   
   // Submerged logic
   if (obj.y < 0) { // Water level 0
      // Fully submerged (simplified)
      const submergedVol = 1.0; 
      fBuoyancy = submergedVol * fluidDensity * g;
      fDrag = -obj.vy * drag;
   } else if (obj.y < 1) {
      // Partially submerged
      const submergedVol = (1 - obj.y);
      fBuoyancy = submergedVol * fluidDensity * g;
      fDrag = -obj.vy * drag * submergedVol;
   }
   
   const weight = -density * g;
   const accel = (weight + fBuoyancy + fDrag) / density;
   
   obj.vy += accel * dt;
   obj.y += obj.vy * dt;
   
   // Floor constraint
   if (obj.y < -4) { obj.y = -4; obj.vy = 0; }
};

useFrame((_, dt) => {
   const simDt = Math.min(dt, 0.02);
   updatePhysics(wood.current, woodDensity, simDt);
   updatePhysics(brick.current, brickDensity, simDt);
   
   if(woodMesh.current) woodMesh.current.position.y = wood.current.y;
   if(brickMesh.current) brickMesh.current.position.y = brick.current.y;
});

// Reset
useControls({ "Reset Blocks": button(() => { wood.current = {y:5, vy:0}; brick.current = {y:5, vy:0}; }) });

return (
  <group>
     {/* Water */}
     <mesh position={[0, -2.5, 0]}>
        <boxGeometry args={[10, 5, 5]} />
        <meshPhysicalMaterial color="#3b82f6" transmission={0.8} opacity={0.6} transparent />
     </mesh>
     
     {/* Wood Block */}
     <mesh ref={woodMesh} position={[-2, 5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d97706" />
        <drei.Html><div style={{color:'white', fontWeight:'bold'}}>Wood</div></drei.Html>
     </mesh>
     
     {/* Brick Block */}
     <mesh ref={brickMesh} position={[2, 5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#7f1d1d" />
        <drei.Html><div style={{color:'white', fontWeight:'bold'}}>Brick</div></drei.Html>
     </mesh>
     
     <drei.Grid args={[20, 20]} position={[0, -5, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
  },

  "cyclotron": {
    title: "Cyclotron Accelerator",
    explanation: "Particles spiral outward as they accelerate across the gap between the two 'D' electrodes.",
    componentCode: `
const { voltage, bField } = useControls({
  voltage: { value: 0.5, min: 0.1, max: 2, label: "Gap Voltage" },
  bField: { value: 1, min: 0.5, max: 2, label: "Magnetic Field" }
});

const particle = useRef({ pos: new THREE.Vector3(0,0,0), vel: new THREE.Vector3(0.5,0,0) });
const mesh = useRef();
const trail = useRef([]);
const line = useRef();

useControls({ "Restart": button(() => { particle.current = { pos: new THREE.Vector3(0,0,0), vel: new THREE.Vector3(0.5,0,0) }; trail.current=[]; }) });

useFrame((_, dt) => {
   const p = particle.current;
   const simDt = Math.min(dt, 0.02);
   
   // Physics
   const speed = p.vel.length();
   const r = speed / bField; // r = mv/qB (m=1, q=1)
   
   // Circular motion (rotate velocity vector)
   const angle = (speed / r) * simDt;
   p.vel.applyAxisAngle(new THREE.Vector3(0,1,0), angle);
   p.pos.add(p.vel.clone().multiplyScalar(simDt));
   
   // Acceleration across gap (x=0)
   // If crossing x=0 (small slice), boost speed
   if (Math.abs(p.pos.x) < 0.05) {
      // Add energy in direction of motion
      p.vel.multiplyScalar(1 + voltage * 0.02);
   }
   
   if(mesh.current) mesh.current.position.copy(p.pos);
   
   // Trail
   if(trail.current.length < 1000) {
      trail.current.push(p.pos.x, p.pos.y, p.pos.z);
      if(line.current) {
         line.current.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trail.current), 3));
         line.current.geometry.setDrawRange(0, trail.current.length/3);
         line.current.geometry.attributes.position.needsUpdate = true;
      }
   }
});

return (
  <group>
     {/* Electrodes (Dees) */}
     <mesh position={[-2.1, 0, 0]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[2, 2, 0.2, 32, 1, false, Math.PI/2, Math.PI]} /><meshStandardMaterial color="#475569" /></mesh>
     <mesh position={[2.1, 0, 0]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[2, 2, 0.2, 32, 1, false, -Math.PI/2, Math.PI]} /><meshStandardMaterial color="#475569" /></mesh>
     
     <mesh ref={mesh}><sphereGeometry args={[0.15]} /><meshBasicMaterial color="#facc15" /></mesh>
     <line ref={line}><bufferGeometry /><lineBasicMaterial color="#facc15" /></line>
     
     <drei.Grid args={[20, 20]} position={[0, -0.5, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
  },

  "newtons rings": {
    title: "Newton's Rings (Interference)",
    explanation: "Interference pattern created by light reflecting between a spherical surface and a flat glass plate. The rings get closer together further out.",
    componentCode: `
const { radius, lambda } = useControls({
  radius: { value: 50, min: 10, max: 100, label: "Lens Radius (R)" },
  lambda: { value: 1, min: 0.5, max: 2, label: "Wavelength" }
});

const geometry = useMemo(() => new THREE.PlaneGeometry(10, 10, 128, 128), []);
const mesh = useRef();

useFrame(() => {
   if(!mesh.current) return;
   
   const pos = geometry.attributes.position;
   const colors = [];
   const center = new THREE.Vector2(0,0);
   
   for(let i=0; i<pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // Plane is XY
      
      const r = Math.sqrt(x*x + y*y);
      
      // Thickness t ~ r^2 / 2R
      const t = (r * r) / (2 * (radius/10)); // Scale factor for visual
      
      // Phase difference delta = 2t (approx)
      // Intensity I ~ cos^2(k * delta)
      // Color map based on intensity
      const phase = (2 * Math.PI * 2 * t) / (lambda * 0.1);
      const intensity = Math.cos(phase) ** 2;
      
      const c = new THREE.Color().setHSL(0.6 - intensity * 0.2, 1, intensity);
      colors.push(c.r, c.g, c.b);
   }
   
   mesh.current.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
   mesh.current.geometry.attributes.color.needsUpdate = true;
});

return (
  <group>
     <mesh ref={mesh} geometry={geometry} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.1, 0]}>
        <meshBasicMaterial vertexColors />
     </mesh>
     
     {/* Lens Glass Visual */}
     <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[5, 64, 16, 0, Math.PI*2, 0, 0.5]} />
        <meshPhysicalMaterial transmission={0.9} roughness={0} thickness={2} opacity={0.3} transparent />
     </mesh>
     
     <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
  },

  "coupled oscillators": {
    title: "Coupled Spring Oscillators",
    explanation: "Energy transfer between two masses connected by a spring. A classic example of 'beating' frequencies.",
    componentCode: `
const { kMiddle, kOuter } = useControls({
  kMiddle: { value: 2, min: 0.1, max: 10, label: "Coupling Spring (k2)" },
  kOuter: { value: 10, min: 5, max: 20, label: "Wall Springs (k1)" }
});

const m1 = useRef({ x: -2, v: 0 });
const m2 = useRef({ x: 2, v: 0 }); // Start displaced
const mesh1 = useRef();
const mesh2 = useRef();
const springL = useRef();
const springM = useRef();
const springR = useRef();

// Perturb
useControls({ "Push Left": button(() => m1.current.v += 5) });

useFrame((_, dt) => {
   const simDt = Math.min(dt, 0.05);
   
   // Forces
   // F1 = -k1*x1 + k2*(x2 - x1)
   // F2 = -k1*x2 - k2*(x2 - x1)
   
   // Equilibrium positions are -3 and 3
   const x1 = m1.current.x - (-3);
   const x2 = m2.current.x - 3;
   
   const f1 = -kOuter * x1 + kMiddle * (x2 - x1);
   const f2 = -kOuter * x2 - kMiddle * (x2 - x1);
   
   // Integrate
   m1.current.v += f1 * simDt;
   m2.current.v += f2 * simDt;
   
   // Damping
   m1.current.v *= 0.999;
   m2.current.v *= 0.999;
   
   m1.current.x += m1.current.v * simDt;
   m2.current.x += m2.current.v * simDt;
   
   // Visuals
   if(mesh1.current) mesh1.current.position.x = m1.current.x;
   if(mesh2.current) mesh2.current.position.x = m2.current.x;
   
   // Update springs
   const updateSpring = (ref, xA, xB) => {
      if(!ref.current) return;
      const pts = new Float32Array([-10,0,0, -5,0,0]); // Dummy
      // Actual drawing requires creating geometry every frame or scaling a cylinder
      // For speed, let's just scale cylinders
      const dist = xB - xA;
      ref.current.position.x = (xA + xB) / 2;
      ref.current.scale.y = dist; // We'll rotate z=90
   };
   
   updateSpring(springL, -8, m1.current.x);
   updateSpring(springM, m1.current.x, m2.current.x);
   updateSpring(springR, m2.current.x, 8);
});

return (
  <group>
     {/* Walls */}
     <mesh position={[-8, 1, 0]}><boxGeometry args={[0.5, 2, 2]} /><meshStandardMaterial color="#475569" /></mesh>
     <mesh position={[8, 1, 0]}><boxGeometry args={[0.5, 2, 2]} /><meshStandardMaterial color="#475569" /></mesh>
     
     {/* Masses */}
     <mesh ref={mesh1} position={[-3, 1, 0]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#22d3ee" /></mesh>
     <mesh ref={mesh2} position={[3, 1, 0]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#f472b6" /></mesh>
     
     {/* Springs (Visualized as thin cylinders) */}
     <mesh ref={springL} position={[-5.5, 1, 0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.1, 0.1, 1]} /><meshStandardMaterial color="white" /></mesh>
     <mesh ref={springM} position={[0, 1, 0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.1, 0.1, 1]} /><meshStandardMaterial color="white" /></mesh>
     <mesh ref={springR} position={[5.5, 1, 0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.1, 0.1, 1]} /><meshStandardMaterial color="white" /></mesh>
     
     <drei.Grid args={[20, 10]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
  }
};
