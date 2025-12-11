import { SimulationResponse } from "../types";

export const INVISIBLE_SIMULATIONS: Record<string, SimulationResponse> = {
    // 1. Heavy vs Light Collision
    "heavy cube": {
        title: "Momentum Transfer: Heavy vs Light",
        explanation: "Demonstrates conservation of momentum ($p=mv$). A heavy object transfers significant velocity to a lighter one upon impact.",
        componentCode: `
const { v1, m1, m2, restitution } = useControls({ 
  v1: { value: 8, min: 1, max: 20, label: "Cube Velocity" }, 
  m1: { value: 20, min: 1, max: 50, label: "Cube Mass (kg)" }, 
  m2: { value: 1, min: 0.1, max: 5, label: "Sphere Mass (kg)" },
  restitution: { value: 0.9, min: 0, max: 1, label: "Bounciness" }
});

const [p1, setP1] = useState({ pos: -12, vel: v1 });
const [p2, setP2] = useState({ pos: 0, vel: 0 });

useFrame((_, delta) => {
  const dt = Math.min(delta, 0.05);
  if (p1.pos + 1.5 >= p2.pos - 0.5) {
     const u1 = p1.vel;
     const u2 = p2.vel;
     const v1f = (m1 * u1 + m2 * u2 + m2 * restitution * (u2 - u1)) / (m1 + m2);
     const v2f = (m1 * u1 + m2 * u2 + m1 * restitution * (u1 - u2)) / (m1 + m2);
     setP1(p => ({ ...p, vel: v1f }));
     setP2(p => ({ ...p, vel: v2f }));
  }
  const friction = 0.99;
  setP1(p => ({ ...p, pos: p.pos + p.vel * dt, vel: p.vel * friction }));
  setP2(p => ({ ...p, pos: p.pos + p.vel * dt, vel: p.vel * friction }));
});

useEffect(() => { setP1({ pos: -12, vel: v1 }); setP2({ pos: 0, vel: 0 }); }, [v1, m1, m2, restitution]);

return (
  <group>
    <mesh position={[p1.pos, 1, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#ef4444" />
      <drei.Html position={[0, 1.5, 0]} center><div style={{color: 'white', background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '4px'}}>{m1}kg</div></drei.Html>
    </mesh>
    <mesh position={[p2.pos, 0.5, 0]}>
      <sphereGeometry args={[0.5]} />
      <meshStandardMaterial color="#2dd4bf" />
      <drei.Html position={[0, 1, 0]} center><div style={{color: 'white', background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '4px'}}>{m2}kg</div></drei.Html>
    </mesh>
    <drei.Grid args={[30, 10]} position={[0, -0.01, 0]} cellColor="#475569" sectionColor="#cbd5e1" fadeDistance={25} />
  </group>
);`
    },

    // 2. Snow Particles
    "snow": {
        title: "Accumulating Snow",
        explanation: "Snowflakes (modeled as hexagonal crystals) fall with air resistance and turbulence. They detect collision with the cube and accumulate on its top surface.",
        componentCode: `
const { count, fallSpeed, windX, windZ, turbulence } = useControls({
  count: { value: 2000, min: 500, max: 5000, step: 100 },
  fallSpeed: { value: 2, min: 0.5, max: 8 },
  windX: { value: 0.5, min: -3, max: 3 },
  windZ: { value: 0, min: -3, max: 3 },
  turbulence: { value: 0.3, min: 0, max: 1 }
});

const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);

// Particle State: { pos, offset, landed, life }
const particles = useMemo(() => Array.from({length: 5000}).map(() => ({
  pos: new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 + 10, Math.random() * 20 - 10),
  offset: Math.random() * 100, // For noise
  landed: false,
  meltTimer: 0,
  rotationSpeed: Math.random() * 0.1
})), []);

useFrame(({ clock }, delta) => {
  const t = clock.elapsedTime;
  const simDt = Math.min(delta, 0.05);
  
  // Cube Boundaries (Center 0,0,0, Size 4x2x4)
  // Top surface is at y = 1 (since height is 2 and center is -1, wait... let's define the cube clearly below)
  // Let's assume visual cube is at [0, 0, 0] with size [4, 2, 4]. So top is y=1.
  const cubeHalfSize = 2; 
  const cubeTop = 1;

  let activeCount = 0;

  for (let i = 0; i < count; i++) {
    const p = particles[i];
    
    if (p.landed) {
       // Melting Logic (stay for a while then respawn)
       p.meltTimer += simDt;
       if (p.meltTimer > 5 + Math.random() * 5) { // Stay for 5-10s
          p.landed = false;
          p.meltTimer = 0;
          p.pos.set(Math.random() * 20 - 10, 20, Math.random() * 20 - 10);
       }
    } else {
       // Falling Physics
       p.pos.y -= fallSpeed * 0.02;
       p.pos.x += (windX + Math.sin(t + p.offset) * turbulence) * 0.01;
       p.pos.z += (windZ + Math.cos(t + p.offset) * turbulence) * 0.01;
       
       // Rotation (flutter)
       dummy.rotation.x += p.rotationSpeed;
       dummy.rotation.z += p.rotationSpeed;

       // Collision Detection with Cube Top
       // Check if within X/Z bounds of cube
       if (Math.abs(p.pos.x) < cubeHalfSize && Math.abs(p.pos.z) < cubeHalfSize) {
          // Check if hitting the top surface (with slight tolerance)
          if (p.pos.y <= cubeTop && p.pos.y > cubeTop - 0.2) {
             p.pos.y = cubeTop + 0.05; // Snap to top surface (plus small offset)
             p.landed = true;
             // Reset rotation to lie flat-ish
             dummy.rotation.set(Math.PI/2, Math.random(), 0); 
          }
       }

       // Reset if fell below floor
       if (p.pos.y < -5) {
          p.pos.y = 20;
          p.pos.x = Math.random() * 20 - 10;
          p.pos.z = Math.random() * 20 - 10;
       }
    }

    dummy.position.copy(p.pos);
    
    // Scale down landed flakes slightly
    const scale = p.landed ? 0.12 : 0.15;
    dummy.scale.set(scale, scale, scale); // Flattened Y scale done in geometry
    
    if (!p.landed) {
        // Spin while falling
        dummy.rotation.y = t + p.offset;
    }
    
    dummy.updateMatrix();
    mesh.current.setMatrixAt(i, dummy.matrix);
  }
  mesh.current.instanceMatrix.needsUpdate = true;
});

return (
  <group>
    <instancedMesh ref={mesh} args={[null, null, count]}>
      {/* 6-sided Cylinder = Hexagon Snowflake Proxy */}
      <cylinderGeometry args={[0.2, 0.2, 0.05, 6]} /> 
      <meshStandardMaterial color="white" roughness={0.1} />
    </instancedMesh>
    
    {/* The Collector Cube */}
    <mesh position={[0, 0, 0]}>
       <boxGeometry args={[4, 2, 4]} />
       <meshStandardMaterial color="#3b82f6" />
    </mesh>
    
    {/* Ground Plane */}
    <mesh position={[0, -1.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
       <planeGeometry args={[20, 20]} />
       <meshStandardMaterial color="#1e293b" />
    </mesh>
    
    <drei.Grid args={[30, 30]} position={[0, -1, 0]} cellColor="#64748b" sectionColor="#94a3b8" fadeDistance={30} />
  </group>
);`
    },


    // 3. Feather Drop
    "feather": {
        title: "Freefall: Vacuum vs Air",
        explanation: "In a vacuum, all objects fall at the same rate. In air, drag force slows down the lighter feather.",
        componentCode: `
const { isVacuum, gravity, dragCoeff } = useControls({ 
  isVacuum: { value: false, label: "Vacuum Mode" },
  gravity: { value: 9.8, min: 1, max: 20 },
  dragCoeff: { value: 2.0, min: 0.1, max: 5.0, label: "Air Resistance" }
});

const ball = useRef();
const feather = useRef();
const [time, setTime] = useState(0);
const startHeight = 12;

useFrame((_, dt) => {
  if (time < 10) setTime(t => t + dt);
  if (ball.current) {
     const ballDrag = isVacuum ? 0 : 0.1; 
     const v = gravity * time * (1 - ballDrag * 0.1); 
     let y = startHeight - 0.5 * v * time;
     if (y < 0.5) y = 0.5;
     ball.current.position.y = y;
  }
  if (feather.current) {
     const effGravity = isVacuum ? gravity : (gravity / dragCoeff);
     let y = startHeight - 0.5 * effGravity * time * time;
     if (!isVacuum && y > 0.1) {
        feather.current.rotation.z = Math.sin(time * 5) * 0.5;
        feather.current.position.x = 2 + Math.sin(time * 3) * 1.5;
     }
     if (y < 0.1) y = 0.1;
     feather.current.position.y = y;
  }
});

useControls({ "Restart Drop": button(() => setTime(0)) });

return (
  <group>
     <mesh ref={ball} position={[-2, startHeight, 0]}>
       <sphereGeometry args={[0.5]} />
       <meshStandardMaterial color="#ef4444" />
       <drei.Html position={[0, 1, 0]} center><div style={{color:'white'}}>Heavy</div></drei.Html>
     </mesh>
     <mesh ref={feather} position={[2, startHeight, 0]}>
       <boxGeometry args={[1, 0.05, 0.5]} />
       <meshStandardMaterial color="white" />
       <drei.Html position={[0, 1, 0]} center><div style={{color:'white'}}>Feather</div></drei.Html>
     </mesh>
     <drei.Text position={[0, 8, -5]} fontSize={1} color={isVacuum ? "#facc15" : "#60a5fa"}>
       {isVacuum ? "VACUUM (No Air)" : "ATMOSPHERE (Air Resistance)"}
     </drei.Text>
     <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#475569" sectionColor="#94a3b8" />
  </group>
);`
    },

    // 4. Projectile Motion
    "projectile": {
        title: "Cannonball Trajectory",
        explanation: "Simulates parabolic motion with gravity and initial velocity.",
        componentCode: `
const { angle, velocity, gravity, height } = useControls({ 
  angle: { value: 45, min: 0, max: 90 }, 
  velocity: { value: 18, min: 5, max: 30 },
  gravity: { value: 9.8, min: 1, max: 20 },
  height: { value: 0, min: 0, max: 10, label: "Platform Height" }
});

const ball = useRef();
const trailPoints = useRef([]);
const line = useRef();

useFrame((state) => {
  const t = (state.clock.elapsedTime % 4) * 1.5;
  const rad = angle * Math.PI / 180;
  const x = velocity * Math.cos(rad) * t;
  const y = height + (velocity * Math.sin(rad) * t) - (0.5 * gravity * t * t);
  
  if (ball.current) {
     if (y >= 0.25) {
       ball.current.position.set(x - 10, y, 0);
       if (t < 0.1) trailPoints.current = [];
       trailPoints.current.push(x - 10, y, 0);
     } else {
       ball.current.position.set(x - 10, 0.25, 0);
     }
  }
  
  if (line.current && trailPoints.current.length > 0) {
      line.current.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trailPoints.current), 3));
      line.current.geometry.setDrawRange(0, trailPoints.current.length / 3);
      line.current.geometry.attributes.position.needsUpdate = true;
  }
});

return (
  <group>
    <mesh position={[-10, height/2, 0]}>
       <boxGeometry args={[2, height || 0.1, 2]} />
       <meshStandardMaterial color="#475569" />
    </mesh>
    <mesh ref={ball}>
      <sphereGeometry args={[0.25]} />
      <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
    </mesh>
    <line ref={line}>
       <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={300} array={new Float32Array(900)} itemSize={3} />
       </bufferGeometry>
       <lineBasicMaterial color="#fbbf24" linewidth={2} />
    </line>
    <drei.Grid args={[50, 20]} position={[0, -0.01, 0]} cellColor="#334155" sectionColor="#64748b" />
  </group>
);`
    },

    // 5. Buoyancy
    "floating": {
        title: "Archimedes Buoyancy",
        explanation: "An object floats if the buoyant force ($F_b = \\rho g V$) equals its weight.",
        componentCode: `
const { fluidDensity, objectDensity, gravity, drag } = useControls({ 
  fluidDensity: { value: 1.0, min: 0.5, max: 2.0, label: "Water Density" },
  objectDensity: { value: 0.5, min: 0.1, max: 1.5, label: "Block Density" },
  gravity: { value: 9.8, min: 1, max: 20 },
  drag: { value: 0.05, min: 0, max: 0.2 }
});

const block = useRef();
const velocity = useRef(0);
const position = useRef(5);

useFrame((_, dt) => {
  const cubeHeight = 2;
  const bottomY = position.current - cubeHeight/2;
  let submergedFactor = 0;
  if (bottomY < 0) {
     const submergedHeight = Math.min(cubeHeight, -bottomY);
     submergedFactor = submergedHeight / cubeHeight;
  }
  const weight = objectDensity * gravity;
  const buoyancy = submergedFactor * fluidDensity * gravity * 1.5;
  const dragForce = velocity.current * drag * (submergedFactor > 0 ? 5 : 0.1);
  const accel = buoyancy - weight - dragForce;
  velocity.current += accel * dt;
  position.current += velocity.current * dt;
  
  if (block.current) {
    block.current.position.y = position.current;
    block.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.05 * submergedFactor;
    block.current.rotation.z = Math.cos(Date.now() * 0.0013) * 0.05 * submergedFactor;
  }
});

return (
  <group>
    <mesh position={[0, -1.5, 0]}>
      <boxGeometry args={[10, 3, 10]} />
      <meshPhysicalMaterial color="#3b82f6" transmission={0.8} opacity={0.6} transparent roughness={0.1} />
    </mesh>
    <drei.Grid args={[10, 10]} position={[0, 0.01, 0]} cellColor="#1e3a8a" sectionColor="#60a5fa" fadeDistance={15} />
    <mesh ref={block}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color={objectDensity < fluidDensity ? "#fbbf24" : "#57534e"} />
      <drei.Html center><div style={{color:'black', fontWeight:'bold'}}>{objectDensity.toFixed(1)} g/cm³</div></drei.Html>
    </mesh>
  </group>
);`
    },

    // 6. Spring
    "spring": {
        title: "Hooke's Law (Spring)",
        explanation: "$F = -kx - cv$. A mass on a spring oscillates with simple harmonic motion.",
        componentCode: `
const { k, damping, mass, startPos } = useControls({ 
  k: { value: 10, min: 1, max: 30, label: "Stiffness (k)" }, 
  damping: { value: 0.1, min: 0, max: 1, label: "Damping (c)" },
  mass: { value: 1, min: 0.5, max: 5 },
  startPos: { value: 6, min: 2, max: 8 }
});

const pos = useRef(startPos);
const vel = useRef(0);
const mesh = useRef();
const springVis = useRef();

useEffect(() => { pos.current = startPos; vel.current = 0; }, [k, damping, mass, startPos]);

useFrame((_, dt) => {
  const gravity = 9.8;
  const fSpring = -k * (pos.current - 8);
  const fDamp = -damping * vel.current;
  const fGrav = -mass * gravity;
  const accel = (fSpring + fDamp + fGrav) / mass;
  vel.current += accel * dt;
  pos.current += vel.current * dt;
  if(mesh.current) mesh.current.position.y = pos.current;
  if (springVis.current) {
     const points = [];
     const coils = 12;
     for(let i=0; i<=coils; i++) {
        const y = 8 + (pos.current - 8) * (i/coils);
        const r = 0.5;
        const theta = i * Math.PI * 2;
        points.push(Math.cos(theta)*r, y, Math.sin(theta)*r);
     }
     springVis.current.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
     springVis.current.geometry.attributes.position.needsUpdate = true;
  }
});

return (
  <group>
    <mesh position={[0, 8, 0]}><boxGeometry args={[4, 0.2, 4]} /><meshStandardMaterial color="#334155"/></mesh>
    <line ref={springVis}>
       <bufferGeometry />
       <lineBasicMaterial color="#94a3b8" linewidth={3} />
    </line>
    <mesh ref={mesh}>
      <sphereGeometry args={[1]} />
      <meshStandardMaterial color="#ec4899" />
    </mesh>
    <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    // 7. Friction Ramp
    "ramp": {
        title: "Friction on Inclined Plane",
        explanation: "Box slides if gravitational component $mg \\sin\\theta$ exceeds static friction $\\mu N$.",
        componentCode: `
const { angle, mu, gravity } = useControls({ 
  angle: { value: 25, min: 0, max: 60, label: "Ramp Angle" }, 
  mu: { value: 0.4, min: 0, max: 1, label: "Friction Coeff" },
  gravity: { value: 9.8, min: 1, max: 20 }
});

const box = useRef();
const dist = useRef(0);
const vel = useRef(0);

useFrame((_, dt) => {
  const rad = angle * Math.PI / 180;
  const fGravity = gravity * Math.sin(rad);
  const normalForce = gravity * Math.cos(rad);
  const fFriction = normalForce * mu;
  let acc = fGravity - fFriction;
  if (acc < 0) acc = 0;
  vel.current += acc * dt;
  dist.current += vel.current * dt;
  if (dist.current > 15) { dist.current = 0; vel.current = 0; }
  if (box.current) {
    box.current.rotation.z = -rad;
    const startX = -6;
    const startY = 6;
    const dx = dist.current * Math.cos(rad);
    const dy = dist.current * Math.sin(rad);
    box.current.position.set(startX + dx, startY - dy + 0.5, 0);
  }
});

return (
  <group>
     <mesh rotation={[0, 0, -angle * Math.PI / 180]} position={[-6 + 7.5 * Math.cos(angle*Math.PI/180), 6 - 7.5 * Math.sin(angle*Math.PI/180), 0]}>
       <boxGeometry args={[15, 0.2, 4]} />
       <meshStandardMaterial color="#64748b" />
     </mesh>
     <mesh ref={box}>
       <boxGeometry args={[1, 1, 1]} />
       <meshStandardMaterial color={vel.current > 0 ? "#22c55e" : "#ef4444"} />
       <drei.Html position={[0, 1, 0]} center>
         <div style={{background:'rgba(0,0,0,0.5)', color:'white', padding:'2px', borderRadius:'4px'}}>{vel.current > 0.1 ? "Sliding" : "Stuck"}</div>
       </drei.Html>
     </mesh>
     <drei.Grid args={[30, 10]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    // 8. Dominoes
    "domino": {
        title: "Chain Reaction (Dominoes)",
        explanation: "Potential energy converting to kinetic energy in a chain.",
        componentCode: `
const { count, spacing, speed } = useControls({
  count: { value: 15, min: 5, max: 30, step: 1 },
  spacing: { value: 1.2, min: 0.8, max: 2.0 },
  speed: { value: 10, min: 1, max: 20, label: "Push Speed" }
});

const [fallenIndex, setFallenIndex] = useState(0);
useFrame(({ clock }) => {
  const t = clock.elapsedTime * speed;
  setFallenIndex(Math.floor(t));
});

return (
  <group position={[-count/2, 0, 0]}>
    {Array.from({length: count}).map((_, i) => {
       let angle = 0;
       if (i < fallenIndex) angle = -1.2;
       else if (i === fallenIndex) angle = -0.4;
       return (
         <mesh key={i} position={[i * spacing, 1, 0]} rotation={[0, 0, angle]}>
           <boxGeometry args={[0.2, 2, 1]} />
           <meshStandardMaterial color={i < fallenIndex ? "#2dd4bf" : "white"} />
         </mesh>
       );
    })}
    <drei.Grid args={[50, 10]} position={[count/2, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    // 9. Rope
    "rope": {
        title: "Catenary Rope",
        explanation: "A hanging chain forms a Catenary curve.",
        componentCode: `
const { sag, points, wind } = useControls({ 
  sag: { value: 2.5, min: 0.1, max: 5 },
  points: { value: 50, min: 10, max: 100 },
  wind: { value: 0, min: 0, max: 2 }
});
const line = useRef();
useFrame(({ clock }) => {
  if (!line.current) return;
  const t = clock.elapsedTime;
  const positions = new Float32Array(points * 3);
  for(let i=0; i<points; i++) {
     const progress = i / (points - 1);
     const x = (progress * 10) - 5;
     const windOffset = Math.sin(t * 2 + x) * wind * Math.sin(progress * Math.PI);
     const a = 10 / sag; 
     const y = (a * Math.cosh(x / a)) - (a * Math.cosh(5 / a)) + 5;
     positions[i*3] = x;
     positions[i*3+1] = y;
     positions[i*3+2] = windOffset;
  }
  line.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
});
return (
  <group>
    <line ref={line}>
       <bufferGeometry />
       <lineBasicMaterial color="#facc15" linewidth={4} />
    </line>
    <mesh position={[-5, 2.5, 0]}><cylinderGeometry args={[0.1, 0.1, 5]} /><meshStandardMaterial color="#94a3b8" /></mesh>
    <mesh position={[5, 2.5, 0]}><cylinderGeometry args={[0.1, 0.1, 5]} /><meshStandardMaterial color="#94a3b8" /></mesh>
    <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    // 10. Galaxy
    "galaxy": {
        title: "Spiral Galaxy",
        explanation: "Galactic structure using density waves.",
        componentCode: `
const { stars, arms, spiral, speed, tilt } = useControls({
  stars: { value: 3000, min: 1000, max: 10000 },
  arms: { value: 3, min: 2, max: 8, step: 1 },
  spiral: { value: 1.5, min: 0, max: 3 },
  speed: { value: 0.5, min: 0, max: 2 },
  tilt: { value: 0.2, min: 0, max: 1 }
});
const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);
useFrame(({ clock }) => {
   const t = clock.elapsedTime * speed;
   for(let i=0; i<stars; i++) {
      const armIndex = i % arms;
      const radius = (i / stars) * 10 + 0.5;
      const spinAngle = radius * spiral; 
      const armAngle = (armIndex / arms) * Math.PI * 2;
      const angle = armAngle + spinAngle + t * (5/radius);
      const randomOffset = Math.random() - 0.5;
      const x = Math.cos(angle) * radius + randomOffset * 0.5;
      const z = Math.sin(angle) * radius + randomOffset * 0.5;
      const y = (Math.random() - 0.5) * (10/radius) * tilt;
      dummy.position.set(x, y, z);
      const scale = (Math.random() * 0.05 + 0.01) * (15/radius);
      dummy.scale.setScalar(scale > 0.15 ? 0.15 : scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
   }
   mesh.current.instanceMatrix.needsUpdate = true;
});
return (
  <group>
    <instancedMesh ref={mesh} args={[null, null, stars]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="white" toneMapped={false} />
    </instancedMesh>
    <drei.Grid args={[30, 30]} position={[0, -5, 0]} cellColor="#1e293b" sectionColor="#334155" fadeDistance={20} />
  </group>
);`
    },

    // 11. Boids
    "flocking": {
        title: "Boids (Flocking)",
        explanation: "Separation, Alignment, and Cohesion.",
        componentCode: `
const { count, speed, separation, alignment, cohesion } = useControls({
  count: { value: 150, min: 50, max: 300 },
  speed: { value: 1.5, min: 0.5, max: 3 },
  separation: { value: 1, min: 0, max: 2 },
  alignment: { value: 1, min: 0, max: 2 },
  cohesion: { value: 1, min: 0, max: 2 }
});
const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);
const boids = useMemo(() => Array.from({length: 400}).map(() => ({
  pos: new THREE.Vector3((Math.random()-0.5)*10, (Math.random()-0.5)*5 + 5, (Math.random()-0.5)*10),
  vel: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize()
})), []);

useFrame((_, dt) => {
  const simDt = Math.min(dt, 0.05);
  for (let i = 0; i < count; i++) {
     const b = boids[i];
     let sep = new THREE.Vector3();
     let ali = new THREE.Vector3();
     let coh = new THREE.Vector3();
     let neighbors = 0;
     for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const b2 = boids[j];
        const dist = b.pos.distanceTo(b2.pos);
        if (dist < 3) {
           sep.add(b.pos.clone().sub(b2.pos).normalize().divideScalar(dist));
           ali.add(b2.vel);
           coh.add(b2.pos);
           neighbors++;
        }
     }
     if (neighbors > 0) {
        sep.divideScalar(neighbors).multiplyScalar(separation);
        ali.divideScalar(neighbors).normalize().multiplyScalar(alignment);
        coh.divideScalar(neighbors).sub(b.pos).normalize().multiplyScalar(cohesion);
        b.vel.add(sep.multiplyScalar(simDt));
        b.vel.add(ali.multiplyScalar(simDt));
        b.vel.add(coh.multiplyScalar(simDt));
     }
     if (b.pos.y < 1) b.vel.y += 2 * simDt;
     if (b.pos.length() > 15) b.vel.sub(b.pos.clone().normalize().multiplyScalar(simDt));
     b.vel.clampLength(speed * 0.5, speed);
     b.pos.add(b.vel.clone().multiplyScalar(simDt * 5));
     dummy.position.copy(b.pos);
     dummy.lookAt(b.pos.clone().add(b.vel));
     dummy.scale.set(0.2, 0.2, 0.6);
     dummy.updateMatrix();
     mesh.current.setMatrixAt(i, dummy.matrix);
  }
  mesh.current.instanceMatrix.needsUpdate = true;
});
return (
  <group>
    <instancedMesh ref={mesh} args={[null, null, count]}>
       <coneGeometry args={[1, 1, 4]} rotation={[Math.PI/2, 0, 0]} />
       <meshStandardMaterial color="#22d3ee" roughness={0.4} />
    </instancedMesh>
    <drei.Grid args={[40, 40]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    // 12. Ideal Gas
    "gas": {
        title: "Ideal Gas",
        explanation: "Particles in a box. Temperature = average kinetic energy.",
        componentCode: `
const { temperature, count, boxSize } = useControls({ 
  temperature: { value: 1.5, min: 0.5, max: 5, label: "Temperature (KE)" }, 
  count: { value: 100, min: 10, max: 300 },
  boxSize: { value: 8, min: 4, max: 12 } 
});
const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);
const particles = useMemo(() => Array.from({length: 300}).map(() => ({
   pos: new THREE.Vector3((Math.random()-0.5)*4, (Math.random()-0.5)*4 + 5, (Math.random()-0.5)*4),
   dir: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize()
})), []);

useFrame((_, dt) => {
  const limit = boxSize / 2;
  const speed = temperature * 5;
  const simDt = Math.min(dt, 0.05);
  for (let i=0; i<count; i++) {
     const p = particles[i];
     p.pos.add(p.dir.clone().multiplyScalar(speed * simDt));
     if (p.pos.x > limit) { p.pos.x = limit; p.dir.x *= -1; }
     if (p.pos.x < -limit) { p.pos.x = -limit; p.dir.x *= -1; }
     if (p.pos.y > limit + 5) { p.pos.y = limit + 5; p.dir.y *= -1; }
     if (p.pos.y < -limit + 5) { p.pos.y = -limit + 5; p.dir.y *= -1; }
     if (p.pos.z > limit) { p.pos.z = limit; p.dir.z *= -1; }
     if (p.pos.z < -limit) { p.pos.z = -limit; p.dir.z *= -1; }
     dummy.position.copy(p.pos);
     dummy.scale.setScalar(0.3);
     dummy.updateMatrix();
     mesh.current.setMatrixAt(i, dummy.matrix);
  }
  mesh.current.instanceMatrix.needsUpdate = true;
});
return (
  <group>
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color={temperature > 3 ? "#ef4444" : "#3b82f6"} />
    </instancedMesh>
    <mesh position={[0, 5, 0]}>
      <boxGeometry args={[boxSize, boxSize, boxSize]} />
      <meshBasicMaterial color="white" wireframe opacity={0.3} transparent />
    </mesh>
    <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    // 13. Centripetal
    "centripetal": {
        title: "Centripetal Force",
        explanation: "String tension provides the inward force to keep the ball in a circle.",
        componentCode: `
const { speed, radius, mass } = useControls({ 
  speed: { value: 3, min: 1, max: 8 },
  radius: { value: 4, min: 2, max: 7 },
  mass: { value: 1, min: 0.5, max: 3 }
});
const ball = useRef();
const line = useRef();
useFrame(({ clock }) => {
   const t = clock.elapsedTime * speed * 0.5;
   const x = Math.cos(t) * radius;
   const z = Math.sin(t) * radius;
   if(ball.current) {
     ball.current.position.set(x, 1, z);
     ball.current.scale.setScalar(0.5 * Math.pow(mass, 0.33));
   }
   if(line.current) {
     const pos = new Float32Array([0, 1, 0, x, 1, z]);
     line.current.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
     line.current.geometry.attributes.position.needsUpdate = true;
   }
});
return (
   <group>
     <mesh ref={ball}><sphereGeometry args={[1]} /><meshStandardMaterial color="#ef4444" /></mesh>
     <line ref={line}><bufferGeometry /><lineBasicMaterial color="white" linewidth={2} /></line>
     <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.2, 0.2, 1]} /><meshStandardMaterial color="#64748b" /></mesh>
     <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },

    // 14. Chaos
    "chaos": {
        title: "Lorenz Attractor",
        explanation: "Chaotic system where small changes lead to vast differences.",
        componentCode: `
const { speed, sigma, rho, beta } = useControls({ 
  speed: { value: 1, min: 0, max: 3 },
  sigma: { value: 10, min: 5, max: 20 },
  rho: { value: 28, min: 10, max: 40 },
  beta: { value: 2.66, min: 1, max: 5 }
});
const points = 4000;
const line = useRef();
const head = useRef();
useFrame(({ clock }) => {
   const arr = [];
   let x = 0.1, y = 0, z = 0;
   const dt = 0.005;
   for(let i=0; i<points; i++) {
     const dx = sigma * (y - x);
     const dy = x * (rho - z) - y;
     const dz = x * y - beta * z;
     x += dx * dt; y += dy * dt; z += dz * dt;
     arr.push(x, y + 5, z);
   }
   if(line.current) {
      line.current.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arr), 3));
      line.current.geometry.attributes.position.needsUpdate = true;
   }
   if(head.current) {
      head.current.position.set(x, y + 5, z);
   }
});
return (
  <group scale={[0.4, 0.4, 0.4]}>
     <line ref={line}><bufferGeometry /><lineBasicMaterial color="#a3e635" linewidth={2} /></line>
     <mesh ref={head}><sphereGeometry args={[1]} /><meshStandardMaterial color="white" emissive="white" emissiveIntensity={1} /></mesh>
     <drei.Grid args={[60, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    // 15. Rain
    "rain": {
        title: "Rain Simulation",
        explanation: "Terminal velocity and wind effects.",
        componentCode: `
const { density, speed, wind, angle } = useControls({
  density: { value: 2000, min: 500, max: 5000 },
  speed: { value: 1.5, min: 0.5, max: 3 },
  wind: { value: 0.5, min: 0, max: 5 },
  angle: { value: 0.1, min: -0.5, max: 0.5 }
});
const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);
useFrame(({ clock }) => {
   const t = clock.elapsedTime * speed;
   for(let i=0; i<density; i++) {
      const hOffset = (i * 13.5) % 20;
      let y = 20 - ((t * 20 + hOffset) % 20);
      const xOffset = (i * 91.1) % 20 - 10;
      const zOffset = (i * 33.3) % 20 - 10;
      let x = xOffset + (20 - y) * angle * wind;
      let z = zOffset;
      dummy.position.set(x, y, z);
      dummy.rotation.z = angle * wind;
      dummy.scale.set(0.02, 0.5 + speed * 0.2, 0.02);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
   }
   mesh.current.instanceMatrix.needsUpdate = true;
});
return (
  <group>
     <instancedMesh ref={mesh} args={[null, null, density]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.6} />
     </instancedMesh>
     <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
       <planeGeometry args={[20, 20]} />
       <meshStandardMaterial color="#1e293b" roughness={0.1} metalness={0.8} />
     </mesh>
     <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#475569" sectionColor="#64748b" />
  </group>
);`
    },

    // 16. DNA
    "dna": {
        title: "DNA Double Helix",
        explanation: "Molecular geometry structure.",
        componentCode: `
const { rotationSpeed, strandGap, pairs } = useControls({
  rotationSpeed: { value: 1, min: 0, max: 5 },
  strandGap: { value: 3, min: 1, max: 5 },
  pairs: { value: 30, min: 10, max: 100 }
});
const group = useRef();
useFrame(({ clock }) => {
  if (group.current) group.current.rotation.y = clock.elapsedTime * rotationSpeed * 0.5;
});
return (
  <group>
    <group ref={group} position={[0, 6, 0]}>
      {Array.from({length: pairs}).map((_, i) => {
         const y = (i - pairs/2) * 0.4;
         const angle = i * 0.4;
         const r = 2;
         return (
           <group key={i} position={[0, y, 0]}>
              <mesh position={[Math.cos(angle)*r, 0, Math.sin(angle)*r]}><sphereGeometry args={[0.3]} /><meshStandardMaterial color="#22d3ee" /></mesh>
              <mesh position={[Math.cos(angle+Math.PI)*r, 0, Math.sin(angle+Math.PI)*r]}><sphereGeometry args={[0.3]} /><meshStandardMaterial color="#f472b6" /></mesh>
              <mesh rotation={[0, -angle, 0]} scale={[r*2, 0.1, 0.1]}><boxGeometry /><meshStandardMaterial color="white" /></mesh>
           </group>
         )
      })}
    </group>
    <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    // 17. Traffic
    "traffic": {
        title: "Traffic Wave",
        explanation: "Phantom traffic jams caused by reaction delays.",
        componentCode: `
const { carCount, reactionTime, perturbation } = useControls({
  carCount: { value: 25, min: 10, max: 50 },
  reactionTime: { value: 0.1, min: 0.01, max: 0.5 },
  perturbation: { value: false, label: "Trigger Brake" }
});
const radius = 8;
const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);
const cars = useMemo(() => Array.from({length: 60}).map((_, i) => ({
   angle: (i / 25) * Math.PI * 2,
   speed: 1.0,
   color: new THREE.Color("yellow")
})), []);
useFrame((_, dt) => {
   const idealGap = (Math.PI * 2) / carCount;
   for(let i=0; i<carCount; i++) {
     const car = cars[i];
     const nextCar = cars[(i+1)%carCount];
     let dist = nextCar.angle - car.angle;
     if (dist < 0) dist += Math.PI * 2;
     if (perturbation && i === 0 && Math.random() > 0.95) car.speed = 0.2;
     if (dist < idealGap * 0.8) car.speed += (0 - car.speed) * 0.1;
     else if (dist < idealGap) car.speed += (nextCar.speed - car.speed) * 0.05;
     else if (car.speed < 1.5) car.speed += 0.01;
     car.angle += car.speed * dt * 0.5;
     dummy.position.set(Math.cos(car.angle)*radius, 0.5, Math.sin(car.angle)*radius);
     dummy.lookAt(0, 0.5, 0);
     dummy.rotation.y += Math.PI/2;
     const c = new THREE.Color().setHSL(car.speed * 0.3, 1, 0.5);
     dummy.scale.set(1, 1, 1);
     dummy.updateMatrix();
     mesh.current.setMatrixAt(i, dummy.matrix);
     mesh.current.setColorAt(i, c);
   }
   mesh.current.instanceMatrix.needsUpdate = true;
});
return (
   <group>
     <instancedMesh ref={mesh} args={[null, null, carCount]}><boxGeometry args={[1, 0.5, 2]} /><meshStandardMaterial /></instancedMesh>
     <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}><ringGeometry args={[7, 9, 64]} /><meshStandardMaterial color="#1e293b" /></mesh>
     <drei.Grid args={[30, 30]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },

    // 18. Heat
    "heat": {
        title: "Thermal Diffusion",
        explanation: "Heat flows from hot to cold.",
        componentCode: `
const { sourceTemp, decay } = useControls({ 
  sourceTemp: { value: 1, min: 0.5, max: 2 },
  decay: { value: 0.3, min: 0.1, max: 1 }
});
const size = 15;
const grid = useMemo(() => {
   return Array.from({length: size*size}).map((_, i) => ({
      x: (i % size) - size/2,
      z: Math.floor(i / size) - size/2,
      temp: 0
   }));
}, []);
const mesh = useRef();
useFrame(({ clock }) => {
   const t = clock.elapsedTime;
   const colors = [];
   grid.forEach((cell, i) => {
      const sx = Math.sin(t) * 4;
      const sz = Math.cos(t * 0.7) * 4;
      const d = Math.sqrt((cell.x-sx)**2 + (cell.z-sz)**2);
      cell.temp = Math.max(0, sourceTemp - d * decay);
      const c = new THREE.Color().setHSL(0.6 - (cell.temp * 0.6), 1, 0.5);
      colors.push(c.r, c.g, c.b);
   });
   if(mesh.current) {
      mesh.current.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      mesh.current.geometry.attributes.color.needsUpdate = true;
   }
});
return (
  <group>
    <points ref={mesh} position={[0.5, 0.5, 0.5]}>
       <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={grid.length} array={new Float32Array(grid.flatMap(g => [g.x * 0.8, 0, g.z * 0.8]))} itemSize={3} />
       </bufferGeometry>
       <pointsMaterial vertexColors size={0.6} />
    </points>
    <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },
    // 19. Fireworks
    "fireworks": {
        title: "Fireworks Physics",
        explanation: "Projectile motion with radial distribution. Particles start at a single point and expand outward while being pulled down by gravity.",
        componentCode: `
const { burstCount, gravity, power, drag } = useControls({
  burstCount: { value: 200, min: 50, max: 1000 },
  gravity: { value: 9.8, min: 1, max: 20 },
  power: { value: 15, min: 5, max: 30, label: "Explosion Power" },
  drag: { value: 0.5, min: 0, max: 2, label: "Air Resistance" }
});

// Simulation State
const simState = useRef({ 
  exploding: false, 
  particles: [] 
});

const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);

// Initialize Particles Pool
useEffect(() => {
  simState.current.particles = Array.from({ length: 1000 }).map(() => ({
    pos: new THREE.Vector3(0, -10, 0), // Start hidden
    vel: new THREE.Vector3(0, 0, 0),
    color: new THREE.Color(),
    active: false
  }));
}, []);

// Launch Function
const launch = () => {
  simState.current.exploding = true;
  const count = Math.min(burstCount, 1000);
  
  // Random base color for this burst
  const baseHue = Math.random();
  
  for(let i=0; i<count; i++) {
     const p = simState.current.particles[i];
     p.active = true;
     // Start at center height
     p.pos.set(0, 15, 0); 
     
     // Random spherical direction
     const theta = Math.random() * Math.PI * 2;
     const phi = Math.acos((Math.random() * 2) - 1);
     const speed = Math.random() * power;
     
     p.vel.set(
       speed * Math.sin(phi) * Math.cos(theta),
       speed * Math.sin(phi) * Math.sin(theta),
       speed * Math.cos(phi)
     );
     
     // Color variation
     p.color.setHSL(baseHue + (Math.random()-0.5)*0.1, 1, 0.6);
  }
};

useControls({ "💥 LAUNCH BURST": button(launch) });

useFrame((_, dt) => {
   if (!mesh.current || !simState.current.exploding) return;
   
   const simDt = Math.min(dt, 0.05);
   let activeCount = 0;

   simState.current.particles.forEach((p, i) => {
      if (!p.active) {
         // Hide inactive particles
         dummy.position.set(0, -100, 0); 
         dummy.scale.set(0,0,0);
      } else {
         activeCount++;
         
         // Physics
         p.vel.y -= gravity * simDt; // Gravity
         p.vel.multiplyScalar(1 - (drag * simDt)); // Drag
         p.pos.add(p.vel.clone().multiplyScalar(simDt));
         
         // Floor Collision
         if (p.pos.y < 0) {
            p.pos.y = 0;
            p.vel.set(0,0,0);
            p.active = false; // Stop rendering if hit floor
         }

         dummy.position.copy(p.pos);
         dummy.scale.setScalar(0.15); // Particle Size
         dummy.updateMatrix();
         
         mesh.current.setMatrixAt(i, dummy.matrix);
         mesh.current.setColorAt(i, p.color);
      }
   });
   
   mesh.current.instanceMatrix.needsUpdate = true;
   if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
});

return (
   <group>
      <instancedMesh ref={mesh} args={[null, null, 1000]}>
         <sphereGeometry />
         <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      
      {/* Launch Cannon */}
      <mesh position={[0, 1, 0]}>
         <cylinderGeometry args={[0.5, 0.8, 2]} />
         <meshStandardMaterial color="#475569" />
      </mesh>
      
      <drei.Grid args={[40, 40]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },


    // 20. Magnet
    "magnet": {
        title: "Ferromagnetism Simulation",
        explanation: "Control the magnetic field. When ON, dipoles align and are attracted to the poles. When OFF, gravity takes over and they scatter.",
        componentCode: `
const { magnetize, strength, gravity, particleCount } = useControls({
  magnetize: { value: true, label: "🧲 Magnet Active" },
  strength: { value: 50, min: 10, max: 100, label: "Magnetic Force" },
  gravity: { value: 9.8, min: 0, max: 20 },
  particleCount: { value: 500, min: 100, max: 1000 }
});

const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);

// Initialize Particles with random positions around the scene
const particles = useMemo(() => Array.from({length: 1000}).map(() => ({
   pos: new THREE.Vector3((Math.random()-0.5)*10, Math.random()*5, (Math.random()-0.5)*10),
   vel: new THREE.Vector3(0,0,0),
   attached: false
})), []);

useFrame((_, dt) => {
   const simDt = Math.min(dt, 0.05);
   
   // Magnet Poles Positions
   const northPole = new THREE.Vector3(0, 5, 0);
   const southPole = new THREE.Vector3(0, 3, 0);
   
   for(let i=0; i<particleCount; i++) {
      const p = particles[i];
      
      if (magnetize) {
         // --- MAGNETIC PHYSICS ---
         
         // 1. Determine closest pole
         const dN = p.pos.distanceTo(northPole);
         const dS = p.pos.distanceTo(southPole);
         const target = dN < dS ? northPole : southPole;
         const dist = dN < dS ? dN : dS;
         
         // 2. Attraction Force (Inverse Square Law roughly)
         if (dist > 0.6) { // If not touching
            p.attached = false;
            const dir = target.clone().sub(p.pos).normalize();
            // F = strength / r^2
            const force = dir.multiplyScalar(strength / (dist * dist + 0.1)); 
            p.vel.add(force.multiplyScalar(simDt));
            
            // Drag/Damping while flying
            p.vel.multiplyScalar(0.95);
         } else {
            // 3. Attach (Stick to surface)
            p.attached = true;
            p.vel.set(0,0,0);
            // Jitter slightly to form a cluster not a single point
            p.pos.lerp(target, 0.1); 
         }
         
         // Orient towards field lines (visual)
         dummy.lookAt(target);
         
      } else {
         // --- GRAVITY PHYSICS (Detached) ---
         p.attached = false;
         p.vel.y -= gravity * simDt;
         
         // Floor Collision
         if (p.pos.y < 0.2) {
            p.pos.y = 0.2;
            p.vel.y *= -0.5; // Bounce
            p.vel.x *= 0.9;  // Friction
            p.vel.z *= 0.9;
         }
         
         dummy.rotation.set(0,0,0); // Reset rotation
      }
      
      // Update Position
      if (!p.attached) {
         p.pos.add(p.vel.clone().multiplyScalar(simDt));
      }

      // Update Instance
      dummy.position.copy(p.pos);
      dummy.scale.set(0.05, 0.05, 0.2); // Elongated iron filing shape
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
   }
   
   mesh.current.instanceMatrix.needsUpdate = true;
});

return (
   <group>
      <instancedMesh ref={mesh} args={[null, null, particleCount]}>
         <boxGeometry />
         <meshStandardMaterial color={magnetize ? "#a5f3fc" : "#94a3b8"} />
      </instancedMesh>
      
      {/* Magnet Visual */}
      <group position={[0, 4, 0]}>
         <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 2]} />
            <meshStandardMaterial color="#ef4444" />
            <drei.Html position={[0,0,0.6]}><div style={{color:'white', fontWeight:'bold'}}>N</div></drei.Html>
         </mesh>
         <mesh position={[0, -1, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 2]} />
            <meshStandardMaterial color="#3b82f6" />
            <drei.Html position={[0,0,0.6]}><div style={{color:'white', fontWeight:'bold'}}>S</div></drei.Html>
         </mesh>
      </group>
      
      <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },


    // 21. Lissajous
    "lissajous": {
        title: "Lissajous Curve",
        explanation: "Complex harmonic motion.",
        componentCode: `
const { a, b, delta, speed } = useControls({ 
  a: { value: 3, min: 1, max: 10, step: 1, label: "Freq X" }, 
  b: { value: 2, min: 1, max: 10, step: 1, label: "Freq Y" },
  delta: { value: 1.57, min: 0, max: 6.28, label: "Phase Shift" },
  speed: { value: 1, min: 0, max: 5 }
});
const line = useRef();
const dot = useRef();
useFrame(({ clock }) => {
   const tTotal = clock.elapsedTime * speed;
   const pts = [];
   const resolution = 200;
   for(let t=0; t<Math.PI*2; t+= (Math.PI*2)/resolution) {
      pts.push(Math.sin(a*t + delta)*5, Math.sin(b*t)*5 + 5, 0);
   }
   if(dot.current) {
      const curT = tTotal % (Math.PI*2);
      dot.current.position.set(Math.sin(a*curT + delta)*5, Math.sin(b*curT)*5 + 5, 0);
   }
   if (line.current) {
     line.current.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
     line.current.geometry.attributes.position.needsUpdate = true;
   }
});
return (
   <group>
     <line ref={line}><bufferGeometry /><lineBasicMaterial color="#22d3ee" linewidth={3} /></line>
     <mesh ref={dot}><sphereGeometry args={[0.4]} /><meshStandardMaterial color="#facc15" emissive="#facc15" /></mesh>
     <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },

    // 22. Sound
    "sound": {
        title: "Doppler Effect (Sound)",
        explanation: "Wavefronts bunch up in direction of motion.",
        componentCode: `
const { speed, emitRate } = useControls({ 
  speed: { value: 3, min: 0, max: 6, label: "Source Speed" },
  emitRate: { value: 5, min: 1, max: 10, label: "Frequency" }
});
const source = useRef();
const ringsRef = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);
const waves = useMemo(() => Array.from({length: 100}).map(() => ({ active: false, x: 0, z: 0, birth: 0 })), []);
const lastSpawn = useRef(0);
useFrame(({ clock }) => {
   const t = clock.elapsedTime;
   const sourceX = Math.sin(t * 0.5) * 8;
   if(source.current) source.current.position.set(sourceX, 0.5, 0);
   const interval = 1 / emitRate;
   if (t - lastSpawn.current > interval) {
      const w = waves.find(w => !w.active);
      if (w) {
         w.active = true;
         w.x = sourceX;
         w.z = 0;
         w.birth = t;
      }
      lastSpawn.current = t;
   }
   waves.forEach((w, i) => {
      if (!w.active) {
         dummy.scale.set(0, 0, 0);
      } else {
         const age = t - w.birth;
         const radius = age * 2 + 0.5; 
         if (radius > 15) w.active = false;
         dummy.position.set(w.x, 0.02, w.z);
         dummy.scale.set(radius, radius, 1);
         dummy.rotation.x = -Math.PI/2;
      }
      dummy.updateMatrix();
      ringsRef.current.setMatrixAt(i, dummy.matrix);
   });
   ringsRef.current.instanceMatrix.needsUpdate = true;
});
return (
   <group>
     <mesh ref={source}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" />
     </mesh>
     <instancedMesh ref={ringsRef} args={[null, null, 100]}>
        <ringGeometry args={[0.9, 1.0, 64]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.6} />
     </instancedMesh>
     <drei.Grid args={[30, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },

    // 23. Prism
    "prism": {
        title: "Prism Refraction",
        explanation: "Dispersion of light.",
        componentCode: `
const { ior, dispersion } = useControls('Prism Physics', {
  ior: { value: 0.5, min: 0, max: 1.0, label: "Bending Strength" },
  dispersion: { value: 0.2, min: 0.1, max: 0.5, label: "Spread" }
});
const [lights, setLights] = useState([{ id: 1, pos: [-6, 2, 2] }]);
const [draggingId, setDraggingId] = useState(null);
useControls('Tools', {
   "Add Light": button(() => setLights(l => [...l, { id: Date.now(), pos: [-6, Math.random()*3+1, Math.random()*4-2] }])),
   "Clear Lights": button(() => setLights([{ id: 1, pos: [-6, 2, 0] }]))
});
const SPECTRUM = ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#9400d3"];
const planeRef = useRef();
const { raycaster, camera, pointer, controls } = useThree();
const handlePointerMove = (e) => {
   if (draggingId && planeRef.current) {
      raycaster.setFromCamera(pointer, camera);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), target);
      if (target) setLights(prev => prev.map(l => l.id === draggingId ? { ...l, pos: [target.x, target.y, 0] } : l));
   }
};
const handlePointerDown = (e, id) => {
  e.stopPropagation();
  setDraggingId(id);
  if (controls) controls.enabled = false;
};
const handlePointerUp = () => {
  setDraggingId(null);
  if (controls) controls.enabled = true;
};
return (
   <group onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 1.5, 0]}>
         <cylinderGeometry args={[2, 2, 3, 3]} />
         <meshPhysicalMaterial transmission={0.9} roughness={0} thickness={2} color="white" ior={1.5} clearcoat={1} />
      </mesh>
      {lights.map(light => {
         const dx = 0 - light.pos[0];
         const dy = 1.5 - light.pos[1];
         const angle = Math.atan2(dy, dx);
         const dist = Math.sqrt(dx*dx + dy*dy);
         return (
            <group key={light.id}>
               <mesh position={[light.pos[0], light.pos[1], 0]} onPointerDown={(e) => handlePointerDown(e, light.id)} onPointerOver={() => document.body.style.cursor = 'move'} onPointerOut={() => document.body.style.cursor = 'auto'}>
                  <boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="white" emissive="white" emissiveIntensity={2} />
               </mesh>
               <mesh position={[light.pos[0] + dx/2, light.pos[1] + dy/2, 0]} rotation={[0, 0, angle]}>
                  <boxGeometry args={[dist, 0.05, 0.05]} /><meshBasicMaterial color="white" opacity={0.8} transparent />
               </mesh>
               {SPECTRUM.map((color, i) => {
                  const bend = ior + (i * dispersion * 0.1); 
                  const exitAngle = angle - bend;
                  return (
                     <mesh key={i} position={[0 + Math.cos(exitAngle)*3, 1.5 + Math.sin(exitAngle)*3, 0]} rotation={[0, 0, exitAngle]}>
                        <boxGeometry args={[6, 0.03 + (i*0.005), 0.02]} /><meshBasicMaterial color={color} opacity={0.8} transparent />
                     </mesh>
                  );
               })}
            </group>
         );
      })}
      <mesh ref={planeRef} visible={false}><planeGeometry args={[100, 100]} /></mesh>
      <drei.Grid args={[30, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },

    // 24. Gyro
    "gyro": {
        title: "Gyroscopic Precession",
        explanation: "Torque causes precession.",
        componentCode: `
const { spinSpeed, precessionSpeed } = useControls({
  spinSpeed: { value: 15, min: 0, max: 30 },
  precessionSpeed: { value: 1, min: 0, max: 5 }
});
const group = useRef();
const wheel = useRef();
useFrame(({ clock }) => {
   const t = clock.elapsedTime;
   if(group.current) group.current.rotation.y = t * precessionSpeed * 0.5;
   if(wheel.current) wheel.current.rotation.x += spinSpeed * 0.05;
});
return (
   <group>
      <group ref={group} position={[0, 4, 0]}>
         <mesh position={[2, 0, 0]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.1, 0.1, 4]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
         <group position={[4, 0, 0]} rotation={[0, 0, Math.PI/2]}>
            <mesh ref={wheel}>
               <cylinderGeometry args={[2, 2, 0.5, 32]} /><meshStandardMaterial color="gold" metalness={0.8} roughness={0.2} />
               <mesh position={[0, 1, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshBasicMaterial color="black" /></mesh>
            </mesh>
         </group>
         <mesh position={[-1, 0, 0]}><sphereGeometry args={[0.8]} /><meshStandardMaterial color="#475569" /></mesh>
      </group>
      <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.2, 0.5, 4]} /><meshStandardMaterial color="#64748b" /></mesh>
      <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },

    // 25. Atom
    "atom": {
        title: "Bohr Model",
        explanation: "Electrons orbiting nucleus.",
        componentCode: `
const { speed } = useControls({ speed: { value: 1, min: 0, max: 5 } });
const e1 = useRef(); const e2 = useRef(); const e3 = useRef();
useFrame(({ clock }) => {
   const t = clock.elapsedTime * speed;
   if(e1.current) e1.current.position.set(Math.cos(t*2)*3, 0, Math.sin(t*2)*3);
   if(e2.current) e2.current.position.set(Math.cos(t*3)*4, Math.sin(t*3)*4, 0);
   if(e3.current) e3.current.position.set(0, Math.cos(t*2.5)*5, Math.sin(t*2.5)*5);
});
return (
   <group position={[0, 5, 0]}>
      <mesh><sphereGeometry args={[1]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} /></mesh>
      <mesh ref={e1}><sphereGeometry args={[0.3]} /><meshStandardMaterial color="#22d3ee" emissive="#22d3ee" /></mesh>
      <mesh ref={e2}><sphereGeometry args={[0.3]} /><meshStandardMaterial color="#22d3ee" emissive="#22d3ee" /></mesh>
      <mesh ref={e3}><sphereGeometry args={[0.3]} /><meshStandardMaterial color="#22d3ee" emissive="#22d3ee" /></mesh>
      <mesh rotation={[Math.PI/2,0,0]}><ringGeometry args={[2.95, 3.05, 64]} /><meshBasicMaterial color="#334155" side={THREE.DoubleSide} /></mesh>
      <mesh><ringGeometry args={[3.95, 4.05, 64]} /><meshBasicMaterial color="#334155" side={THREE.DoubleSide} /></mesh>
      <mesh rotation={[0,Math.PI/2,0]}><ringGeometry args={[4.95, 5.05, 64]} /><meshBasicMaterial color="#334155" side={THREE.DoubleSide} /></mesh>
      <drei.Grid args={[20, 20]} position={[0, -5, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },

    // 26. Sorting
    "sort": {
        title: "Bubble Sort",
        explanation: "Visualizing sorting.",
        componentCode: `
const { count, speed } = useControls({ 
  count: { value: 20, min: 10, max: 50, step: 1 },
  speed: { value: 50, min: 10, max: 200, label: "Delay (ms)" }
});
const [arr, setArr] = useState([]);
useEffect(() => { setArr(Array.from({length: count}, () => Math.random() * 8 + 1)); }, [count]);
useEffect(() => {
   const interval = setInterval(() => {
      setArr(prev => {
         const newArr = [...prev];
         let swapped = false;
         for(let i=0; i<newArr.length-1; i++) {
            if(newArr[i] > newArr[i+1]) {
               [newArr[i], newArr[i+1]] = [newArr[i+1], newArr[i]];
               swapped = true;
               break;
            }
         }
         return swapped ? newArr : newArr;
      });
   }, speed);
   return () => clearInterval(interval);
}, [count, speed]);
return (
   <group position={[-count/2 * 0.6, 0, 0]}>
      {arr.map((h, i) => (
         <mesh key={i} position={[i * 0.6, h/2, 0]}>
            <boxGeometry args={[0.5, h, 0.5]} />
            <meshStandardMaterial color={\`hsl(\${h*30}, 70%, 50%)\`} />
         </mesh>
      ))}
      <drei.Grid args={[50, 20]} position={[count/2 * 0.6, 0, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },

    // 27. Brownian
    "brownian": {
        title: "Brownian Motion",
        explanation: "Random walk.",
        componentCode: `
const { temperature } = useControls({ temperature: { value: 1, min: 0.1, max: 3 } });
const particle = useRef();
const path = useRef([]);
const line = useRef();
useFrame(() => {
   if(!particle.current) return;
   const jitter = 0.1 * temperature;
   particle.current.position.x += (Math.random()-0.5) * jitter;
   particle.current.position.y += (Math.random()-0.5) * jitter;
   particle.current.position.z += (Math.random()-0.5) * jitter;
   if (particle.current.position.y < 0.5) particle.current.position.y = 0.5;
   path.current.push(particle.current.position.x, particle.current.position.y, particle.current.position.z);
   if (path.current.length > 500) path.current.splice(0,3);
   if(line.current) {
      line.current.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(path.current), 3));
      line.current.geometry.attributes.position.needsUpdate = true;
      line.current.geometry.setDrawRange(0, path.current.length/3);
   }
});
return (
   <group>
      <mesh ref={particle} position={[0, 5, 0]}>
         <sphereGeometry args={[0.5]} />
         <meshStandardMaterial color="#facc15" />
      </mesh>
      <line ref={line}>
         <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={600} array={new Float32Array(1800)} itemSize={3} />
         </bufferGeometry>
         <lineBasicMaterial color="white" opacity={0.5} transparent />
      </line>
      <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },

    // 28. Sand
    "sand": {
        title: "Sandpile",
        explanation: "Avalanche dynamics.",
        componentCode: `
const { rate, spread } = useControls({ 
  rate: { value: 5, min: 1, max: 20 },
  spread: { value: 2, min: 0.5, max: 5 } 
});
const count = 800;
const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);
useFrame(({ clock }) => {
   const t = clock.elapsedTime;
   const activeCount = Math.min(count, Math.floor(t * rate * 10));
   for(let i=0; i<activeCount; i++) {
      const r = Math.pow(Math.random(), 0.5) * spread * (1 + i/count); 
      const angle = Math.random() * Math.PI * 2;
      let h = (spread * 1.5) - r * 0.8; 
      if (h < 0.2) h = 0.2;
      dummy.position.set(Math.cos(angle)*r, h, Math.sin(angle)*r);
      dummy.scale.setScalar(0.15);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
   }
   mesh.current.instanceMatrix.needsUpdate = true;
   mesh.current.count = activeCount;
});
return (
  <group>
    <instancedMesh ref={mesh} args={[null, null, count]}>
       <boxGeometry />
       <meshStandardMaterial color="#d97706" />
    </instancedMesh>
    <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    // 29. Tesla
    "tesla": {
        title: "Tesla Coil",
        explanation: "High voltage arcs.",
        componentCode: `
const { arcs, jitter } = useControls({
  arcs: { value: 5, min: 1, max: 10, step: 1 },
  jitter: { value: 1, min: 0, max: 2 }
});
const lines = useRef([]);
useFrame(({ clock }) => {
   if (Math.floor(clock.elapsedTime * 15) % 2 === 0) return;
   lines.current.forEach((line, i) => {
      if (i >= arcs) { line.visible = false; return; }
      line.visible = true;
      const pts = [];
      const segments = 10;
      const start = new THREE.Vector3(0, 6, 0);
      const end = new THREE.Vector3((Math.random()-0.5)*10, 0, (Math.random()-0.5)*10);
      for(let s=0; s<=segments; s++) {
         const alpha = s/segments;
         const p = new THREE.Vector3().lerpVectors(start, end, alpha);
         if (s > 0 && s < segments) {
            p.add(new THREE.Vector3((Math.random()-0.5)*jitter, (Math.random()-0.5)*jitter, (Math.random()-0.5)*jitter));
         }
         pts.push(p.x, p.y, p.z);
      }
      line.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
      line.geometry.attributes.position.needsUpdate = true;
   });
});
return (
   <group>
      <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.5, 1, 6]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0, 6, 0]}><torusGeometry args={[1.5, 0.4, 16, 50]} rotation={[Math.PI/2,0,0]} /><meshStandardMaterial color="#94a3b8" metalness={1} roughness={0.2} /></mesh>
      {Array.from({length: 10}).map((_, i) => (
         <line key={i} ref={el => lines.current[i] = el}>
            <bufferGeometry />
            <lineBasicMaterial color="#a78bfa" linewidth={3} />
         </line>
      ))}
      <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },

    // 30. Diffraction (Optimized)
    "diffraction": {
        title: "Double Slit Wave Interference",
        explanation: "Visualizing the actual water/light waves as they pass through two slits. Notice how the waves overlap to create peaks (constructive) and troughs (destructive).",
        componentCode: `
const { frequency, separation, speed } = useControls({
  frequency: { value: 8, min: 1, max: 20 },
  separation: { value: 3, min: 0.5, max: 6 },
  speed: { value: 2, min: 0, max: 5 }
});

const mesh = useRef();
// Optimization: Reduced segments from 128 -> 60 for smooth performance
const geometry = useMemo(() => new THREE.PlaneGeometry(20, 20, 60, 60), []);

useFrame(({ clock }) => {
   if (!mesh.current) return;
   const t = clock.elapsedTime * speed;
   
   const posAttr = mesh.current.geometry.attributes.position;
   const colors = [];
   const count = posAttr.count;
   
   // Slit positions (Sources)
   const s1x = -separation / 2;
   const s2x = separation / 2;
   
   for(let i=0; i<count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i); // Using Y as depth in plane space
      
      let zVal = 0;
      
      // Only calculate ripples "after" the wall (y < 5)
      if (y < 4.8) {
          const d1 = Math.sqrt((x - s1x)**2 + (y - 5)**2);
          const d2 = Math.sqrt((x - s2x)**2 + (y - 5)**2);
          
          // Superposition Principle
          const w1 = Math.sin(d1 * frequency - t);
          const w2 = Math.sin(d2 * frequency - t);
          
          zVal = (w1 + w2) * 0.5;
          
          // Dampen amplitude with distance to prevent infinite peaks
          zVal /= (1 + (d1+d2)*0.15);
      }
      
      posAttr.setZ(i, zVal);
      
      // Color Mapping: Cyan (Peaks) -> Blue (Troughs)
      // Normalized roughly between 0 and 1
      const brightness = (zVal + 0.5) * 0.8; 
      const c = new THREE.Color().setHSL(0.55, 0.9, Math.max(0.1, brightness));
      colors.push(c.r, c.g, c.b);
   }
   
   posAttr.needsUpdate = true;
   mesh.current.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
   mesh.current.geometry.attributes.color.needsUpdate = true;
});

return (
   <group>
      {/* Wall with Slits */}
      <group position={[0, 0.5, 5]}>
        <mesh position={[0, 0, 0]}><boxGeometry args={[10, 1, 0.5]} /><meshStandardMaterial color="#334155" /></mesh>
        <mesh position={[-separation/2 - 1, 0, 0]}><boxGeometry args={[separation, 1, 0.5]} /><meshStandardMaterial color="#334155" /></mesh>
        <mesh position={[separation/2 + 1, 0, 0]}><boxGeometry args={[separation, 1, 0.5]} /><meshStandardMaterial color="#334155" /></mesh>
      </group>
      
      {/* The Wave Surface */}
      <mesh ref={mesh} geometry={geometry} rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0]}>
         <meshStandardMaterial vertexColors metalness={0.8} roughness={0.2} />
      </mesh>
      
      <drei.Grid args={[20, 20]} position={[0, -0.5, 0]} cellColor="#334155" sectionColor="#475569" />
   </group>
);`
    },

    "monkey hunter": {
        title: "The Monkey and The Hunter",
        explanation: "To hit a target falling from rest, you must aim directly at it. Gravity affects both the projectile and the target equally.",
        componentCode: `
const { speed, showPath } = useControls({ speed: { value: 15, min: 10, max: 25 }, showPath: true });
const [fired, setFired] = useState(false);
const projectile = useRef();
const monkey = useRef();
const time = useRef(0);

useFrame((_, dt) => {
   if (!fired) return;
   time.current += dt;
   const t = time.current;
   const g = 9.8;
   
   // Target starts at (10, 10)
   const mx = 10;
   const my = 10 - 0.5 * g * t * t;
   
   // Projectile aimed at (10, 10)
   const angle = Math.atan2(10, 10);
   const px = speed * Math.cos(angle) * t;
   const py = speed * Math.sin(angle) * t - 0.5 * g * t * t;
   
   if (monkey.current) monkey.current.position.set(mx, Math.max(0, my), 0);
   if (projectile.current) projectile.current.position.set(px, Math.max(0, py), 0);
});

useControls({ "FIRE": button(() => { setFired(true); time.current=0; }) });

return (
  <group>
     <mesh ref={projectile} position={[0, 0, 0]}><sphereGeometry args={[0.3]} /><meshStandardMaterial color="red" /></mesh>
     <mesh ref={monkey} position={[10, 10, 0]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#8b5cf6" /></mesh>
     <mesh position={[10, 10, 0]}><sphereGeometry args={[0.2]} /><meshBasicMaterial color="white" /></mesh> {/* Aim point */}
     <drei.Grid args={[30, 20]} position={[0, -0.1, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    "atwood machine": {
        title: "Atwood's Machine",
        explanation: "Two masses connected by a pulley. Acceleration $a = g(m_2-m_1)/(m_1+m_2)$.",
        componentCode: `
const { m1, m2 } = useControls({ m1: { value: 2, min: 1, max: 5 }, m2: { value: 3, min: 1, max: 5 } });
const p1 = useRef();
const p2 = useRef();
const time = useRef(0);

useFrame((_, dt) => {
   time.current += dt;
   const a = 9.8 * (m2 - m1) / (m1 + m2);
   const dist = 0.5 * a * time.current * time.current;
   
   if (p1.current && p2.current) {
      let y1 = 5 + dist;
      let y2 = 5 - dist;
      // Limits
      if (y1 > 9) { y1 = 9; y2 = 1; }
      if (y2 > 9) { y2 = 9; y1 = 1; }
      p1.current.position.y = y1;
      p2.current.position.y = y2;
   }
});

return (
  <group>
     <mesh position={[0, 10, 0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[1, 1, 0.5]} /><meshStandardMaterial color="gray" /></mesh>
     <mesh ref={p1} position={[-1, 5, 0]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#ef4444" /></mesh>
     <mesh ref={p2} position={[1, 5, 0]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#3b82f6" /></mesh>
     <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    "railgun": {
        title: "Electromagnetic Railgun",
        explanation: "Lorentz force ($F = ILB$) accelerates a projectile along conductive rails.",
        componentCode: `
const { current, field } = useControls({ current: { value: 5, min: 1, max: 10 }, field: { value: 2, min: 1, max: 5 } });
const proj = useRef();
const vel = useRef(0);

useFrame((_, dt) => {
   const force = current * field; // F = I * L * B (simplified)
   const acc = force;
   vel.current += acc * dt;
   if(proj.current) {
      proj.current.position.x += vel.current * dt;
      if (proj.current.position.x > 10) { proj.current.position.x = -10; vel.current = 0; }
   }
});

return (
  <group>
     <mesh position={[0, 0, -1]}><boxGeometry args={[20, 0.5, 0.5]} /><meshStandardMaterial color="#f59e0b" /></mesh>
     <mesh position={[0, 0, 1]}><boxGeometry args={[20, 0.5, 0.5]} /><meshStandardMaterial color="#f59e0b" /></mesh>
     <mesh ref={proj} position={[-10, 0.25, 0]}><boxGeometry args={[1, 0.5, 2]} /><meshStandardMaterial color="silver" /></mesh>
     <drei.Grid args={[20, 10]} position={[0, -0.5, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    "cyclotron": {
        title: "Cyclotron Particle Accelerator",
        explanation: "A charged particle spirals outward in a magnetic field as it is accelerated by an electric field across the gap.",
        componentCode: `
const { bField, voltage } = useControls({ bField: { value: 1, min: 0.5, max: 2 }, voltage: { value: 0.5, min: 0.1, max: 1 } });
const particle = useRef();
const trail = useRef([]);
const state = useRef({ pos: new THREE.Vector3(0,0,0), vel: new THREE.Vector3(1,0,0) });

useFrame((_, dt) => {
   const s = state.current;
   // Magnetic Force F = qv x B (Centripetal)
   const speed = s.vel.length();
   const r = (1 * speed) / (1 * bField); // r = mv / qB
   
   // Simply rotate velocity vector
   s.vel.applyAxisAngle(new THREE.Vector3(0,1,0), (speed/r) * dt);
   s.pos.add(s.vel.clone().multiplyScalar(dt));
   
   // Gap acceleration (x axis crossing)
   if (Math.abs(s.pos.x) < 0.1 && Math.abs(s.pos.z) < 0.5) {
      s.vel.multiplyScalar(1 + voltage * 0.05);
   }
   
   if(particle.current) particle.current.position.copy(s.pos);
});

return (
  <group>
     <mesh ref={particle}><sphereGeometry args={[0.2]} /><meshStandardMaterial color="#22d3ee" /></mesh>
     <mesh position={[-2, -0.1, 0]}><cylinderGeometry args={[2, 2, 0.1, 32, 1, false, Math.PI/2, Math.PI]} /><meshStandardMaterial color="#334155" /></mesh>
     <mesh position={[2, -0.1, 0]}><cylinderGeometry args={[2, 2, 0.1, 32, 1, false, -Math.PI/2, Math.PI]} /><meshStandardMaterial color="#334155" /></mesh>
     <drei.Grid args={[20, 20]} position={[0, -0.2, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    "half life": {
        title: "Radioactive Decay (Half-Life)",
        explanation: "Random decay of atomic nuclei. The time it takes for half the sample to decay is the half-life.",
        componentCode: `
const { halfLife } = useControls({ halfLife: { value: 3, min: 1, max: 10 } });
const atoms = useMemo(() => Array.from({length: 400}).map(() => ({ 
   pos: [Math.random()*10 - 5, 0.2, Math.random()*10 - 5], 
   decayTime: -Math.log(Math.random()) * halfLife 
})), [halfLife]);

const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);

useFrame(({ clock }) => {
   const t = clock.elapsedTime;
   let decayedCount = 0;
   
   atoms.forEach((atom, i) => {
      const isDecayed = t > atom.decayTime;
      if (isDecayed) decayedCount++;
      
      dummy.position.set(...atom.pos);
      dummy.scale.setScalar(0.2);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      mesh.current.setColorAt(i, isDecayed ? new THREE.Color("#334155") : new THREE.Color("#ef4444"));
   });
   mesh.current.instanceMatrix.needsUpdate = true;
   mesh.current.instanceColor.needsUpdate = true;
});

return (
  <group>
     <instancedMesh ref={mesh} args={[null, null, 400]}>
        <sphereGeometry />
        <meshStandardMaterial />
     </instancedMesh>
     <drei.Grid args={[20, 20]} position={[0, -0.1, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    "newton cooling": {
        title: "Newton's Law of Cooling",
        explanation: "Rate of cooling is proportional to the temperature difference with the environment.",
        componentCode: `
const { startTemp, envTemp, k } = useControls({ 
  startTemp: { value: 100, min: 50, max: 200 }, 
  envTemp: { value: 20, min: 0, max: 50 },
  k: { value: 0.5, min: 0.1, max: 2 } 
});

const mesh = useRef();
const text = useRef();

useFrame(({ clock }) => {
   const t = clock.elapsedTime;
   // T(t) = T_env + (T_0 - T_env) * e^(-kt)
   const currentTemp = envTemp + (startTemp - envTemp) * Math.exp(-k * t);
   
   if(mesh.current) {
      // Color map: Hot (Red) -> Cold (Blue)
      const ratio = (currentTemp - envTemp) / (200 - envTemp);
      mesh.current.material.color.setHSL(0.7 - ratio * 0.7, 1, 0.5);
   }
});

return (
  <group>
     <mesh ref={mesh} position={[0, 1, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial />
     </mesh>
     <drei.Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    "solar sail": {
        title: "Solar Sail (Radiation Pressure)",
        explanation: "Momentum transfer from photons pushes the sail.",
        componentCode: `
const { lightIntensity } = useControls({ lightIntensity: { value: 5, min: 1, max: 10 } });
const sail = useRef();
const vel = useRef(0);

useFrame((_, dt) => {
   const acc = lightIntensity * 0.5;
   vel.current += acc * dt;
   if(sail.current) {
      sail.current.position.z -= vel.current * dt;
      if(sail.current.position.z < -20) { sail.current.position.z = 0; vel.current = 0; }
   }
});

return (
  <group>
     <mesh position={[0, 0, 5]}><sphereGeometry args={[1]} /><meshBasicMaterial color="#facc15" /></mesh> {/* Sun */}
     <mesh ref={sail} position={[0, 0, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="silver" side={THREE.DoubleSide} />
     </mesh>
     <drei.Grid args={[20, 50]} position={[0, -2, -10]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    "polarizer": {
        title: "Optical Polarizer",
        explanation: "Filters light waves based on orientation. Crossed polarizers block all light.",
        componentCode: `
const { angle1, angle2 } = useControls({ angle1: { value: 0, min: 0, max: 90 }, angle2: { value: 90, min: 0, max: 90 } });

return (
  <group>
     {/* Source Light */}
     <mesh position={[0, 0, 5]}><cylinderGeometry args={[0.5, 0.5, 5]} rotation={[Math.PI/2,0,0]} /><meshBasicMaterial color="#facc15" opacity={0.5} transparent /></mesh>
     
     {/* Filter 1 */}
     <mesh position={[0, 0, 2]} rotation={[0,0,angle1*Math.PI/180]}>
        <boxGeometry args={[3, 3, 0.1]} />
        <meshStandardMaterial color="#475569" opacity={0.5} transparent />
        <mesh position={[0,0,0.1]}><boxGeometry args={[0.1, 2.5, 0.01]} /><meshBasicMaterial color="black"/></mesh>
     </mesh>
     
     {/* Light between */}
     <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.5, 0.5, 3]} rotation={[Math.PI/2,0,0]} /><meshBasicMaterial color="#facc15" opacity={0.5} transparent /></mesh>
     
     {/* Filter 2 */}
     <mesh position={[0, 0, -2]} rotation={[0,0,angle2*Math.PI/180]}>
        <boxGeometry args={[3, 3, 0.1]} />
        <meshStandardMaterial color="#475569" opacity={0.5} transparent />
        <mesh position={[0,0,0.1]}><boxGeometry args={[0.1, 2.5, 0.01]} /><meshBasicMaterial color="black"/></mesh>
     </mesh>
     
     {/* Result Light */}
     <mesh position={[0, 0, -5]}>
        <cylinderGeometry args={[0.5, 0.5, 3]} rotation={[Math.PI/2,0,0]} />
        <meshBasicMaterial 
           color="#facc15" 
           opacity={0.5 * Math.pow(Math.cos((angle1-angle2)*Math.PI/180), 2)} 
           transparent 
        />
     </mesh>
     <drei.Grid args={[20, 20]} position={[0, -2, 0]} cellColor="#334155" sectionColor="#475569" />
  </group>
);`
    },

    "diffusion": {
        title: "Particle Diffusion",
        explanation: "Particles spreading from an area of high concentration to low concentration due to random motion.",
        componentCode: `
const particles = useMemo(() => Array.from({length: 500}).map(() => ({
   pos: new THREE.Vector3((Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5, (Math.random()-0.5)*0.5),
   vel: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(0.05)
})), []);

const mesh = useRef();
const dummy = useMemo(() => new THREE.Object3D(), []);

useFrame(() => {
   particles.forEach((p, i) => {
      p.pos.add(p.vel);
      // Bounce off invisible walls
      if(Math.abs(p.pos.x) > 5) p.vel.x *= -1;
      if(Math.abs(p.pos.y) > 5) p.vel.y *= -1;
      if(Math.abs(p.pos.z) > 5) p.vel.z *= -1;
      
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(0.1);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
   });
   mesh.current.instanceMatrix.needsUpdate = true;
});

return (
  <group>
     <instancedMesh ref={mesh} args={[null, null, 500]}><sphereGeometry /><meshStandardMaterial color="#a78bfa" /></instancedMesh>
     <mesh><boxGeometry args={[10, 10, 10]} /><meshBasicMaterial color="white" wireframe opacity={0.2} transparent /></mesh>
  </group>
);`
    }



};