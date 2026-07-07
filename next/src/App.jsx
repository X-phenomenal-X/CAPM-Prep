import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Html,
  Environment,
  Lightformer,
  ContactShadows,
  MeshReflectorMaterial,
  Stars,
  PresentationControls,
  Float,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Tower, { ZONES, FLOORS, FLOOR_H, zoneCenterY } from './Tower.jsx';
import { loadProgress, readinessPct, charterName, domainStats, forecast, DOMAINS } from './readiness.js';

const TOWER_BASE_Y = -1.7;

/* cinematic intro dolly + focus camera moves, all eased per-frame */
function Rig({ focus }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const start = useRef(null);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);
  useFrame((st, dt) => {
    if (start.current == null) start.current = st.clock.elapsedTime;
    const t = st.clock.elapsedTime - start.current;
    const e = 1 - Math.pow(1 - Math.min(1, t / 2.6), 3); // intro ease-out
    const zone = ZONES.find((z) => z.id === focus);
    if (zone) {
      const fy = TOWER_BASE_Y + zoneCenterY(zone);
      tmpPos.set(1.6, fy + 0.5, 7.6);
      tmpLook.set(0, fy, 0);
    } else {
      tmpPos.set(0, 0.9 + (1 - e) * 3.4, 11.5 + (1 - e) * 7.5);
      tmpLook.set(0, 0, 0);
    }
    const k = 1 - Math.exp(-dt * 3);
    camera.position.lerp(tmpPos, k);
    look.current.lerp(tmpLook, k);
    camera.lookAt(look.current);
  });
  return null;
}

function Scene({ domains, focus, onFocus, introDone, pm }) {
  return (
    <>
      <color attach="background" args={['#07090d']} />
      <fog attach="fog" args={['#07090d', 14, 30]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-4, 7, 5]} intensity={1.1} color="#cfe6f2" />
      <directionalLight position={[5, 3, -4]} intensity={0.35} color="#f4ad3d" />
      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 6, -9]} scale={[12, 4, 1]} color="#2b4a5c" />
        <Lightformer intensity={1.2} position={[-6, 2, 3]} scale={[3, 6, 1]} color="#76c4d8" />
        <Lightformer intensity={0.8} position={[6, 1, 2]} scale={[3, 5, 1]} color="#f4ad3d" />
      </Environment>
      <Stars radius={40} depth={20} count={1600} factor={3} saturation={0} fade speed={0.6} />
      <Rig focus={focus} />
      <PresentationControls global polar={[-0.15, 0.35]} azimuth={[-Infinity, Infinity]} config={{ mass: 1, tension: 120 }} snap={false}>
        <Float speed={1.1} rotationIntensity={0.05} floatIntensity={0.12}>
          <group position={[0, TOWER_BASE_Y, 0]}>
            <Tower domains={domains} focus={focus} onFocus={onFocus} introDone={introDone} />
          </group>
        </Float>
      </PresentationControls>
      {/* 70% pass line: a glowing ring at exactly 70% of the tower's height */}
      <group position={[0, TOWER_BASE_Y + FLOOR_H * FLOORS * 0.7, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.62, 0.011, 8, 96]} />
          <meshStandardMaterial color="#0c1f16" emissive="#62cc83" emissiveIntensity={1.4} transparent opacity={0.85} />
        </mesh>
        <Html position={[1.9, 0, 0]} style={{ pointerEvents: 'none' }}>
          <div className="passlab">70% PASS LINE</div>
        </Html>
      </group>
      {pm && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TOWER_BASE_Y + 0.02, 0]}>
          <torusGeometry args={[2.3, 0.014, 8, 96]} />
          <meshStandardMaterial color="#0d1a20" emissive="#76c4d8" emissiveIntensity={0.9} transparent opacity={0.6} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.79, 0]}>
        <circleGeometry args={[9, 48]} />
        <MeshReflectorMaterial
          blur={[280, 90]}
          resolution={1024}
          mixBlur={0.9}
          mixStrength={1.6}
          roughness={0.8}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#0a0f14"
          metalness={0.55}
        />
      </mesh>
      <ContactShadows position={[0, -1.78, 0]} opacity={0.6} scale={8} blur={2.2} far={3} />
      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.18} darkness={0.72} />
      </EffectComposer>
    </>
  );
}

export default function App() {
  const progress = useMemo(() => loadProgress(), []);
  const saved = readinessPct(progress);
  const live = saved != null;
  const urlR = useMemo(() => {
    const p = new URLSearchParams(location.search).get('r');
    const n = p == null ? NaN : +p;
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
  }, []);
  const [demo, setDemo] = useState(urlR != null ? urlR : 42);
  const [focus, setFocus] = useState(null);
  const [tab, setTab] = useState('tower');
  const introDone = useRef(false);
  setTimeout(() => { introDone.current = true; }, 4500);

  const domains = useMemo(() => {
    if (live && urlR == null) return domainStats(progress);
    const wiggle = { d1: 0.04, d2: -0.05, d3: 0.02, d4: -0.03 };
    return DOMAINS.map((d) => ({
      ...d,
      mastery: Math.max(0, Math.min(1, demo / 100 + wiggle[d.id])),
      attempted: 0,
    }));
  }, [live, progress, demo, urlR]);

  const readiness = live && urlR == null
    ? saved
    : Math.round(domains.reduce((a, d) => a + (d.weight / 100) * d.mastery, 0) * 100);
  const pm = charterName(progress);
  const focusDomain = focus ? domains.find((d) => d.id === focus) : null;
  const fc = useMemo(() => (progress ? forecast(progress) : { state: 'need', pts: [] }), [progress]);

  return (
    <div className="shell">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 4.3, 19], fov: 35 }}
        gl={{ antialias: true }}
        onPointerMissed={() => setFocus(null)}
      >
        <Suspense fallback={null}>
          <Scene domains={domains} focus={focus} onFocus={setFocus} introDone={introDone} pm={pm} />
        </Suspense>
      </Canvas>

      <header className="hud top">
        <div>
          <div className="brand">CAPM PREP</div>
          <div className="sub">NEXT-GEN 3D · REACT THREE FIBER</div>
        </div>
        <div className="pill">{Math.round(readiness)}%</div>
      </header>

      <footer className="hud bottom">
        {tab === 'domains' && (
          <div className="panel">
            {domains.map((d) => (
              <button
                key={d.id}
                className={'domrow' + (focus === d.id ? ' on' : '')}
                style={{ '--dc': d.color }}
                onClick={() => setFocus(focus === d.id ? null : d.id)}
              >
                <span className="dot" />
                <span className="dn">{d.short}</span>
                <span className="dbar"><i style={{ width: `${Math.round(d.mastery * 100)}%` }} /></span>
                <span className="dp">{Math.round(d.mastery * 100)}%</span>
                <span className="dw">{d.weight}%</span>
                <a className="drill" href={`../capm-pro.html#drill=${d.id}`} onClick={(e) => e.stopPropagation()}>Drill →</a>
              </button>
            ))}
            <div className="panelhint">tap a domain — the tower focuses its floors · weight = share of the real exam</div>
          </div>
        )}
        {tab === 'forecast' && (
          <div className="panel">
            {fc.pts && fc.pts.length >= 2 ? (
              <svg className="spark" viewBox="0 0 260 64" preserveAspectRatio="none">
                <line x1="0" x2="260" y1={64 - (70 / 100) * 60 - 2} y2={64 - (70 / 100) * 60 - 2} stroke="#62cc83" strokeDasharray="4 4" strokeWidth="1" opacity="0.6" />
                <polyline
                  fill="none" stroke="#76c4d8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                  points={fc.pts.map((v, i) => `${(i / (fc.pts.length - 1)) * 252 + 4},${64 - (v / 100) * 60 - 2}`).join(' ')}
                />
              </svg>
            ) : (
              <span className="lab">Take at least two mocks in the classic app and your pace projection appears here.</span>
            )}
            {fc.state === 'hit' && <span className="lab" style={{ color: '#62cc83' }}>Pass line cleared — best mock {Math.round(fc.best)}%. Hold the pace.</span>}
            {fc.state === 'flat' && <span className="lab" style={{ color: '#f4ad3d' }}>Trend flat at ~{Math.round(fc.last)}% — clear the mistake bank to start it climbing.</span>}
            {fc.state === 'project' && (
              <span className="lab">
                Projected to cross 70% in <b style={{ color: '#76c4d8' }}>{fc.daysFromNow} days</b> (~{fc.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                {fc.margin != null && (fc.onTrack ? ' — on track for your exam date' : ` — ${Math.abs(fc.margin)} days past your exam date`)}
              </span>
            )}
            <a className="drillbig" href="../capm-pro.html#mock">Take a mock now →</a>
          </div>
        )}
        {tab === 'tower' && (
          <div className="panel">
            <span className="lab">
              {focusDomain
                ? `Domain ${focusDomain.code} · ${focusDomain.short} — tap elsewhere to release`
                : live
                  ? (pm ? `PM ${pm} · live readiness from your study data` : 'live readiness from your study data')
                  : 'demo mode — study in the classic app to drive this live'}
            </span>
            {focusDomain && (
              <a className="drillbig" href={`../capm-pro.html#drill=${focusDomain.id}`}>Drill {focusDomain.short} now →</a>
            )}
            {!live || urlR != null ? (
              <input type="range" min="0" max="100" value={demo} onChange={(e) => setDemo(+e.target.value)} aria-label="Demo readiness" />
            ) : null}
            <div className="panelhint">drag to orbit · tap the tower to inspect a domain zone</div>
          </div>
        )}
        <nav className="links">
          <button className={'tabbtn' + (tab === 'tower' ? ' on' : '')} onClick={() => setTab('tower')}>Tower</button>
          <button className={'tabbtn' + (tab === 'domains' ? ' on' : '')} onClick={() => setTab('domains')}>Domains</button>
          <button className={'tabbtn' + (tab === 'forecast' ? ' on' : '')} onClick={() => setTab('forecast')}>Forecast</button>
          <a href="../capm-pro.html">Classic</a>
          <a href="../capm-glass.html">Glass</a>
        </nav>
      </footer>
    </div>
  );
}
