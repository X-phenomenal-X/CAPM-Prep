import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export const FLOOR_H = 0.215;
const W = 1.86, D = 1.24;
const DARK = new THREE.Color('#0d141b');
const AMBER = new THREE.Color('#f4ad3d');
const GREEN = new THREE.Color('#62cc83');
const BLACK = new THREE.Color('#000000');

/* 16 floors split by exam weight: d1 36%→6, d2 17%→3, d3 20%→3, d4 27%→4 */
export const ZONES = [
  { id: 'd1', start: 0, count: 6 },
  { id: 'd2', start: 6, count: 3 },
  { id: 'd3', start: 9, count: 3 },
  { id: 'd4', start: 12, count: 4 },
];
export const FLOORS = 16;
export const zoneCenterY = (z) => FLOOR_H * (z.start + z.count / 2);

function Floor({ i, zoneColor, litRef, dimRef }) {
  const mat = useRef();
  const zc = useMemo(() => new THREE.Color(zoneColor), [zoneColor]);
  useFrame((state) => {
    if (!mat.current) return;
    const lit = litRef.current[i] || 0; // 0..1 per floor
    const frontier = lit > 0.02 && lit < 0.98;
    const target = frontier ? AMBER : zc;
    mat.current.color.lerpColors(DARK, target, lit * 0.5);
    mat.current.emissive.lerpColors(BLACK, target, lit);
    const fl = 0.9 + 0.1 * Math.sin(state.clock.elapsedTime * (1.3 + i * 0.37) + i * 17.0);
    mat.current.emissiveIntensity = lit * (frontier ? 2.2 : 1.5) * fl * (dimRef.current[i] || 1);
  });
  return (
    <mesh position={[0, FLOOR_H * (i + 0.5), 0]}>
      <boxGeometry args={[W * 0.94, FLOOR_H * 0.62, D * 0.94]} />
      <meshStandardMaterial ref={mat} color={DARK} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}

function Slabs() {
  const geo = useMemo(() => new THREE.BoxGeometry(W, FLOOR_H * 0.16, D), []);
  return (
    <group>
      {Array.from({ length: FLOORS + 1 }).map((_, i) => (
        <mesh key={i} geometry={geo} position={[0, FLOOR_H * i, 0]}>
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
    <mesh position={[0, FLOOR_H * FLOORS + 0.16, 0]}>
      <sphereGeometry args={[0.035, 12, 12]} />
      <meshStandardMaterial ref={mat} color="#33080a" emissive="#ff4433" emissiveIntensity={1} />
    </mesh>
  );
}

function ToppingOut({ fullRef }) {
  const grp = useRef();
  useFrame(() => {
    if (!grp.current) return;
    const full = fullRef.current;
    const targetY = full ? 0 : 0.9;
    const targetS = full ? 1 : 0.0001;
    grp.current.position.y += (targetY - grp.current.position.y) * 0.06;
    const s = grp.current.scale.x + (targetS - grp.current.scale.x) * 0.06;
    grp.current.scale.setScalar(s);
  });
  const topY = FLOOR_H * FLOORS;
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

/* one-shot particle celebration when the tower tops out */
function Confetti({ fullRef }) {
  const pts = useRef();
  const state = useRef({ born: -1 });
  const N = 240;
  const seeds = useMemo(() => {
    const a = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      a[i * 4] = Math.random() * Math.PI * 2;      // angle
      a[i * 4 + 1] = 0.6 + Math.random() * 1.6;    // speed
      a[i * 4 + 2] = 1.2 + Math.random() * 1.6;    // up velocity
      a[i * 4 + 3] = Math.random();                // hue pick
    }
    return a;
  }, []);
  const positions = useMemo(() => new Float32Array(N * 3), []);
  const colors = useMemo(() => {
    const c = new Float32Array(N * 3);
    const palette = [new THREE.Color('#76c4d8'), new THREE.Color('#f4ad3d'), new THREE.Color('#62cc83'), new THREE.Color('#bd92d6')];
    for (let i = 0; i < N; i++) {
      const col = palette[Math.floor(seeds[i * 4 + 3] * palette.length) % palette.length];
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    return c;
  }, [seeds]);
  useFrame((st) => {
    const now = st.clock.elapsedTime;
    if (fullRef.current && state.current.born < 0) state.current.born = now;
    if (!fullRef.current) state.current.born = -1;
    const t = state.current.born >= 0 ? now - state.current.born : -1;
    const arr = pts.current.geometry.attributes.position.array;
    const topY = FLOOR_H * FLOORS + 0.35;
    const life = 2.6;
    for (let i = 0; i < N; i++) {
      if (t < 0 || t > life) { arr[i * 3 + 1] = -999; continue; }
      const a = seeds[i * 4], sp = seeds[i * 4 + 1], up = seeds[i * 4 + 2];
      arr[i * 3] = Math.cos(a) * sp * t;
      arr[i * 3 + 1] = topY + up * t - 2.4 * t * t;
      arr[i * 3 + 2] = Math.sin(a) * sp * t;
    }
    pts.current.geometry.attributes.position.needsUpdate = true;
    pts.current.material.opacity = t >= 0 ? Math.max(0, 1 - t / life) : 0;
  });
  return (
    <points ref={pts}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={N} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={N} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0} depthWrite={false} />
    </points>
  );
}

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

export default function Tower({ domains, focus, onFocus, introDone }) {
  // per-floor lit amount [0..1], eased; per-floor dim for focus mode
  const litRef = useRef(new Array(FLOORS).fill(0));
  const dimRef = useRef(new Array(FLOORS).fill(1));
  const fullRef = useRef(false);
  const spin = useRef();

  useFrame((st, dt) => {
    const k = Math.min(1, dt * 2.6);
    let full = true;
    for (const z of ZONES) {
      const d = domains.find((x) => x.id === z.id);
      const m = d ? d.mastery : 0;
      for (let j = 0; j < z.count; j++) {
        const idx = z.start + j;
        // stagger the intro light-up bottom-to-top
        const gate = introDone.current ? 1 : Math.max(0, Math.min(1, (st.clock.elapsedTime - 1.2 - idx * 0.12) * 2));
        const target = Math.max(0, Math.min(1, m * z.count - j)) * gate;
        litRef.current[idx] += (target - litRef.current[idx]) * k;
        if (target < 0.98) full = false;
        const dimT = focus && focus !== z.id ? 0.16 : 1;
        dimRef.current[idx] += (dimT - dimRef.current[idx]) * Math.min(1, dt * 4);
      }
    }
    fullRef.current = full;
    if (spin.current) {
      if (focus) {
        // ease to front and hold while focused
        const r = spin.current.rotation.y % (Math.PI * 2);
        spin.current.rotation.y -= r * Math.min(1, dt * 3);
      } else {
        spin.current.rotation.y += dt * 0.12;
      }
    }
  });

  const focusZone = ZONES.find((z) => z.id === focus);
  const focusDomain = focusZone ? domains.find((x) => x.id === focusZone.id) : null;

  return (
    <group ref={spin}>
      {ZONES.map((z) =>
        Array.from({ length: z.count }).map((_, j) => (
          <Floor
            key={z.id + j}
            i={z.start + j}
            zoneColor={domains.find((x) => x.id === z.id)?.color || '#76c4d8'}
            litRef={litRef}
            dimRef={dimRef}
          />
        ))
      )}
      <Slabs />
      {/* invisible per-zone hitboxes */}
      {ZONES.map((z) => (
        <mesh
          key={'hit' + z.id}
          position={[0, zoneCenterY(z), 0]}
          onClick={(e) => { e.stopPropagation(); onFocus(focus === z.id ? null : z.id); }}
        >
          <boxGeometry args={[W * 1.2, FLOOR_H * z.count, D * 1.2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {/* PBR glass curtain wall */}
      <mesh position={[0, (FLOOR_H * FLOORS) / 2, 0]}>
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
      <mesh position={[0, FLOOR_H * FLOORS + 0.045, 0]}>
        <boxGeometry args={[W * 1.1, 0.09, D * 1.1]} />
        <meshStandardMaterial color="#1a222b" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, -0.09, 0]}>
        <boxGeometry args={[W * 1.16, 0.18, D * 1.16]} />
        <meshStandardMaterial color="#10161d" roughness={0.6} metalness={0.3} />
      </mesh>
      <Beacon />
      <ToppingOut fullRef={fullRef} />
      <Confetti fullRef={fullRef} />
      <City />
      {/* floating glass info card anchored to the focused zone */}
      {focusZone && focusDomain && (
        <Html position={[W * 0.9, zoneCenterY(focusZone), D * 0.7]} distanceFactor={6.5} transform={false} style={{ pointerEvents: 'none' }}>
          <div className="zonecard" style={{ '--zc': focusDomain.color }}>
            <div className="zc-code">DOMAIN {focusDomain.code} · {focusDomain.weight}% OF EXAM</div>
            <div className="zc-name">{focusDomain.short}</div>
            <div className="zc-bar"><i style={{ width: `${Math.round(focusDomain.mastery * 100)}%` }} /></div>
            <div className="zc-meta">{Math.round(focusDomain.mastery * 100)}% mastery · {focusDomain.attempted} answered</div>
          </div>
        </Html>
      )}
    </group>
  );
}
