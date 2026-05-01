import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

import { HeatHaze } from "./HeatHaze";
import { Particles } from "./Particles";
import { Reactor } from "./Reactor";

const TOP_Y = 4.5;
const BOTTOM_Y = -4.5;
const COLUMN_HALF_WIDTH = 0.85;
const PARTICLE_COUNT = 600;

export interface SceneHandle {
  takeScreenshot: () => string | null;
}

export interface SceneProps {
  T: number;
  lut: THREE.DataTexture | null;
  reducedMotion: boolean;
}

export const Scene = forwardRef<SceneHandle, SceneProps>(function Scene(
  { T, lut, reducedMotion },
  ref,
) {
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      const gl = glRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!gl || !scene || !camera) return null;
      // Render synchronously so we capture the current frame, not a stale one.
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    },
  }));

  // Map inlet temperature to flow speed and haze intensity. Higher T → faster
  // throughput visually + more vigorous haze. Tuned by feel, not by Re.
  const flowSpeed = 0.6 + ((T - 380) / 280) * 1.6;
  const hazeIntensity = 0.35 + Math.max(0, (T - 380) / 280) * 1.4;

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [3.5, 0.5, 7.5], fov: 45 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={(state) => {
        glRef.current = state.gl;
        sceneRef.current = state.scene;
        cameraRef.current = state.camera as THREE.PerspectiveCamera;
        state.gl.setClearColor(new THREE.Color("#08080d"), 1);
        // ACES tonemapping compresses additive blending output into a
        // perceptual range. Without it, hundreds of overlapping particles
        // saturate the column to pure white.
        state.gl.toneMapping = THREE.ACESFilmicToneMapping;
        state.gl.toneMappingExposure = 0.95;
        state.gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 8, 5]} intensity={0.55} color="#fef3c7" />
      <directionalLight position={[-4, -2, 3]} intensity={0.25} color="#7dd3fc" />

      <Reactor topY={TOP_Y} bottomY={BOTTOM_Y} columnHalfWidth={COLUMN_HALF_WIDTH} />

      {lut && (
        <Particles
          topY={TOP_Y}
          bottomY={BOTTOM_Y}
          columnHalfWidth={COLUMN_HALF_WIDTH}
          count={PARTICLE_COUNT}
          lut={lut}
          reducedMotion={reducedMotion}
          flowSpeed={flowSpeed}
        />
      )}

      <HeatHaze
        position={[0, BOTTOM_Y - 1.6, 0.1]}
        width={3.0}
        height={2.4}
        intensity={hazeIntensity}
        reducedMotion={reducedMotion}
      />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={4}
        maxDistance={14}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.8}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
});
