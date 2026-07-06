import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const FLOORS = 16;
const W = 1.86, D = 1.24, FLOOR_H = 0.215;
const BASE_Y = 0;

const COOL = new THREE.Color('#76c4d8');
const AMBER = new THREE.Color('#f4ad3d');
const DARK = new THREE.Color('#0d141b');
const GREEN = new THREE.Color('#62cc83');

/* One lit floor: emissive core slab behind a glass band */
function Floor({ i, litRef }) {
  const mat = useRef();
  useFrame((state) => {
    if (!mat.current) return;
    const lit = litRef.current; // animated float, floors lit from bottom
    const t = THREE.MathUtils.clamp(lit - i, 0, 1);
    const frontier = i < lit && i + 1 > lit;
    const target = frontier ? AMBER : COOL;
    mat.current.color.lerpColors(DARK, target, t * 0.55);
    mat.current.emissive.lerpColors(new THREE.Color('#000000'), target, t);
    // per-floor life: subtle flicker on lit floors
    const fl = 0.9 + 0.1 * Math.sin(state.clock.elapsedTime * (1.3 + i * 0.37) + i * 17.0);
    mat.current.emissiveIntensity = t * (frontier ? 2.4 : 1.5) * fl;
  });
  return (
    <mesh position={[0, BASE_Y + FLOOR_H * (i + 0.5), 0]}>
      <boxGeometry args={[W * 0.94, FLOOR_H * 0.62, D * 0.94]} />
      <meshStandardMaterial ref={mat} color={DARK} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

/* Slab separators read as spandrel lines */
function Slabs() {
  const geo = useMemo(() => new THREE.BoxGeometry(W, FLOOR_H * 0.16, D), []);
  return (
    <group>
      {Array.from({ length: FLOORS + 1 }).map((_, i) => (
        <mesh key={i} geometry={geo} position={[0, BASE_Y + FLOOR_H * i, 0]}>
          <meshStandardMaterial color="#151c24" roughness={0.55} metalness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Beacon() {
  const mat = useRef();
  useFrame((state) => {
    if (mat.current)
      mat.current.emissiveIntensity = 0.4 + 3.2 * Math.pow(0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.4), 8);
  });
  return (
    <mesh position={[0, BASE_Y + FLOOR_H * FLOORS + 0.16, 0]}>
      <sphereGeometry args={[0.035, 12, 12]} />
      <meshStandardMaterial ref={mat} color="#33080a" emissive="#ff4433" emissiveIntensity={1} />
    </mesh>
  );
}

/* Topping-out: white final beam + evergreen, descends at 100% */
function ToppingOut({ litRef }) {
  const grp = useRef();
  useFrame(() => {
    if (!grp.current) return;
    const full = litRef.current >= FLOORS - 0.05;
    const targetY = full ? 0 : 0.9;
    const targetS = full ? 1 : 0.0001;
    grp.current.position.y += (targetY - grp.current.position.y) * 0.06;
    const s = grp.current.scale.x + (targetS - grp.current.scale.x) * 0.06;
    grp.current.scale.setScalar(s);
  });
  const topY = BASE_Y + FLOOR_H * FLOORS;
  return (
    <group ref={grp} position={[0, 0.9, 0]} scale={0.0001}>
      <mesh position={[0, topY + 0.28, 0]}>
        <boxGeometry args={[1.15, 0.05, 0.09]} />
        <meshStandardMaterial color="#e9edf2" roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[0, topY + 0.44, 0]}>
        <coneGeometry args={[0.11, 0.28, 8]} />
        <meshStandardMaterial color="#2c7a44" emissive={GREEN} emissiveIntensity={0.15} roughness={0.7} />
      </mesh>
    </group>
  );
}

/* Distant silhouettes so the tower lives in a city */
function City() {
  const boxes = useMemo(() => {
    const out = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.35;
      const r = 8.5 + ((i * 37) % 10) / 10 * 3.5;
      out.push({
        pos: [Math.cos(a) * r, 0.9 + ((i * 71) % 10) / 10 * 1.1, Math.sin(a) * r],
        scale: [0.9 + ((i * 53) % 10) / 10 * 0.9, 1.8 + ((i * 71) % 10) / 10 * 2.2, 0.9],
      });
    }
    return out;
  }, []);
  return (
    <group>
      {boxes.map((b, i) => (
        <mesh key={i} position={b.pos} scale={b.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#0a1016" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export default function Tower({ readiness }) {
  const litRef = useRef(0);
  const spin = useRef();
  useFrame((_, dt) => {
    const target = (readiness / 100) * FLOORS;
    litRef.current += (target - litRef.current) * Math.min(1, dt * 3.2);
    if (spin.current) spin.current.rotation.y += dt * 0.12;
  });
  return (
    <group ref={spin}>
      {/* emissive floors */}
      {Array.from({ length: FLOORS }).map((_, i) => (
        <Floor key={i} i={i} litRef={litRef} />
      ))}
      <Slabs />
      {/* PBR glass curtain wall — real transmission/refraction */}
      <mesh position={[0, BASE_Y + (FLOOR_H * FLOORS) / 2, 0]}>
        <boxGeometry args={[W * 1.04, FLOOR_H * FLOORS, D * 1.04]} />
        <meshPhysicalMaterial
          transmission={0.92}
          thickness={0.4}
          roughness={0.08}
          ior={1.5}
          color="#bfe3ee"
          attenuationColor="#76c4d8"
          attenuationDistance={4}
          transparent
        />
      </mesh>
      {/* parapet + base */}
      <mesh position={[0, BASE_Y + FLOOR_H * FLOORS + 0.045, 0]}>
        <boxGeometry args={[W * 1.1, 0.09, D * 1.1]} />
        <meshStandardMaterial color="#1a222b" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, BASE_Y - 0.09, 0]}>
        <boxGeometry args={[W * 1.16, 0.18, D * 1.16]} />
        <meshStandardMaterial color="#10161d" roughness={0.6} metalness={0.3} />
      </mesh>
      <Beacon />
      <ToppingOut litRef={litRef} />
      <City />
    </group>
  );
}
