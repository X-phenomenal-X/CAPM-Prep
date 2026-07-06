import { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  Environment,
  Lightformer,
  ContactShadows,
  MeshReflectorMaterial,
  Stars,
  PresentationControls,
  Float,
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import Tower from './Tower.jsx';
import { loadProgress, readinessPct, charterName } from './readiness.js';

function Scene({ readiness }) {
  return (
    <>
      <color attach="background" args={['#07090d']} />
      <fog attach="fog" args={['#07090d', 14, 30]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-4, 7, 5]} intensity={1.1} color="#cfe6f2" />
      <directionalLight position={[5, 3, -4]} intensity={0.35} color="#f4ad3d" />
      {/* procedural environment (no external HDRI fetch — stays offline) */}
      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 6, -9]} scale={[12, 4, 1]} color="#2b4a5c" />
        <Lightformer intensity={1.2} position={[-6, 2, 3]} scale={[3, 6, 1]} color="#76c4d8" />
        <Lightformer intensity={0.8} position={[6, 1, 2]} scale={[3, 5, 1]} color="#f4ad3d" />
      </Environment>
      <Stars radius={40} depth={20} count={1600} factor={3} saturation={0} fade speed={0.6} />
      <PresentationControls global polar={[-0.15, 0.35]} azimuth={[-Infinity, Infinity]} config={{ mass: 1, tension: 120 }} snap={false}>
        <Float speed={1.1} rotationIntensity={0.06} floatIntensity={0.15}>
          <group position={[0, -1.7, 0]}>
            <Tower readiness={readiness} />
          </group>
        </Float>
      </PresentationControls>
      {/* mirror plaza */}
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
  const urlR = useMemo(() => {
    const p = new URLSearchParams(location.search).get('r');
    const n = p == null ? NaN : +p;
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
  }, []);
  const [readiness, setReadiness] = useState(urlR != null ? urlR : saved != null ? saved : 42);
  const pm = charterName(progress);

  return (
    <div className="shell">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.9, 11.5], fov: 35 }} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <Scene readiness={readiness} />
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
        <div className="row">
          <span className="lab">{saved != null ? (pm ? `PM ${pm} · live readiness` : 'live readiness from your study data') : 'demo readiness — study in the classic app to drive this live'}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={readiness}
            onChange={(e) => setReadiness(+e.target.value)}
            aria-label="Readiness"
          />
        </div>
        <nav className="links">
          <a href="../capm-pro.html">Classic app</a>
          <a href="../capm-glass.html">Liquid Glass</a>
          <a href="../capm-ios.html">iOS build</a>
        </nav>
      </footer>
    </div>
  );
}
