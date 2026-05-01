import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { particlesFragment, particlesVertex } from "../shaders/particles";

export interface ParticlesProps {
  topY: number;
  bottomY: number;
  columnHalfWidth: number;
  count: number;
  lut: THREE.DataTexture;
  reducedMotion: boolean;
  // Higher inlet temperatures speed up flow; mapped from T externally.
  flowSpeed: number;
}

export function Particles({
  topY,
  bottomY,
  columnHalfWidth,
  count,
  lut,
  reducedMotion,
  flowSpeed,
}: ParticlesProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();
  const pixelRatio = gl.getPixelRatio();

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const speeds = new Float32Array(count);
    const height = topY - bottomY;
    for (let i = 0; i < count; i++) {
      // Sprinkle uniformly across the column cross-section in normalized units
      // (the shader scales x by columnHalfWidth so we keep [-1,1] here).
      positions[i * 3 + 0] = (Math.random() * 2 - 1);
      positions[i * 3 + 1] = bottomY + Math.random() * height;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * 0.05;
      seeds[i] = Math.random();
      // Per-particle speed jitter so the plume isn't a metronome
      speeds[i] = 0.7 + Math.random() * 0.6;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    return geo;
  }, [count, topY, bottomY]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTopY: { value: topY },
      uBottomY: { value: bottomY },
      uTSpeed: { value: flowSpeed },
      uReducedMotion: { value: reducedMotion ? 1 : 0 },
      uPointSize: { value: 14 },
      uPixelRatio: { value: pixelRatio },
      uColumnHalfWidth: { value: columnHalfWidth },
      uLut: { value: lut },
    }),
    [topY, bottomY, flowSpeed, reducedMotion, pixelRatio, columnHalfWidth, lut],
  );

  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.uniforms.uReducedMotion.value = reducedMotion ? 1 : 0;
    matRef.current.uniforms.uTSpeed.value = flowSpeed;
    matRef.current.uniforms.uLut.value = lut;
    matRef.current.uniformsNeedUpdate = true;
  }, [reducedMotion, flowSpeed, lut]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={particlesVertex}
        fragmentShader={particlesFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
