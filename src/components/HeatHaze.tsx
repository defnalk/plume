import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { hazeFragment, hazeVertex } from "../shaders/haze";

export interface HeatHazeProps {
  position: [number, number, number];
  width: number;
  height: number;
  intensity: number; // 0..~1.5, scales with reactor temperature
  reducedMotion: boolean;
}

export function HeatHaze({
  position,
  width,
  height,
  intensity,
  reducedMotion,
}: HeatHazeProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: intensity },
      uReducedMotion: { value: reducedMotion ? 1 : 0 },
      uColorHot: { value: new THREE.Color("#fbbf24") },
      uColorCool: { value: new THREE.Color("#7dd3fc") },
    }),
    // intentionally empty — uniforms object is mutated on prop changes below
    // so we don't blow away the running clock value
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    matRef.current.uniforms.uIntensity.value = intensity;
    matRef.current.uniforms.uReducedMotion.value = reducedMotion ? 1 : 0;
  });

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={hazeVertex}
        fragmentShader={hazeFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
