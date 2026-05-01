import { useMemo } from "react";
import * as THREE from "three";

export interface ReactorProps {
  topY: number;
  bottomY: number;
  columnHalfWidth: number;
}

// The vessel: two thin walls forming the cross-section of an axisymmetric
// packed bed, with rounded inlet/outlet caps and a scattered field of catalyst
// pellets between. Drawn with simple primitives — the visual interest is in
// the particles, not the geometry.
export function Reactor({ topY, bottomY, columnHalfWidth }: ReactorProps) {
  const wallHeight = topY - bottomY;
  const wallThickness = 0.05;

  const pelletPositions = useMemo(() => {
    // Catalyst pellets fill the central section of the bed. Use a quasi-random
    // jitter on a grid so it looks packed but not artificial.
    const positions: [number, number, number][] = [];
    const padTop = 0.6;
    const padBottom = 0.6;
    const yMin = bottomY + padBottom;
    const yMax = topY - padTop;
    const rows = 28;
    const cols = 5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols;
        const x = (u * 2 - 1) * (columnHalfWidth - 0.12);
        const yBase = yMin + ((r + 0.5) / rows) * (yMax - yMin);
        const jitterX = (Math.random() - 0.5) * 0.18;
        const jitterY = (Math.random() - 0.5) * 0.22;
        const z = (Math.random() - 0.5) * 0.12;
        positions.push([x + jitterX, yBase + jitterY, z]);
      }
    }
    return positions;
  }, [topY, bottomY, columnHalfWidth]);

  const pelletGeo = useMemo(() => new THREE.SphereGeometry(0.06, 12, 12), []);
  const pelletMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1f2937",
        metalness: 0.4,
        roughness: 0.55,
        emissive: "#0b1220",
      }),
    [],
  );

  // Pre-build instanced matrices for the pellets — far cheaper than N meshes.
  const pelletInstanced = useMemo(() => {
    const inst = new THREE.InstancedMesh(pelletGeo, pelletMat, pelletPositions.length);
    const m = new THREE.Matrix4();
    pelletPositions.forEach((p, i) => {
      m.makeTranslation(p[0], p[1], p[2]);
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
    return inst;
  }, [pelletPositions, pelletGeo, pelletMat]);

  return (
    <group>
      {/* Vessel walls */}
      <mesh position={[columnHalfWidth + wallThickness * 0.5, 0, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, 0.3]} />
        <meshStandardMaterial color="#52525b" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-(columnHalfWidth + wallThickness * 0.5), 0, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, 0.3]} />
        <meshStandardMaterial color="#52525b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Rounded inlet cap (top) */}
      <mesh position={[0, topY, 0]}>
        <torusGeometry args={[columnHalfWidth, 0.06, 12, 32, Math.PI]} />
        <meshStandardMaterial color="#71717a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Inlet feed pipe */}
      <mesh position={[0, topY + 0.45, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.9, 16]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.6} roughness={0.45} />
      </mesh>

      {/* Rounded outlet cap (bottom) */}
      <mesh position={[0, bottomY, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[columnHalfWidth, 0.06, 12, 32, Math.PI]} />
        <meshStandardMaterial color="#71717a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Outlet pipe */}
      <mesh position={[0, bottomY - 0.45, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.9, 16]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.6} roughness={0.45} />
      </mesh>

      <primitive object={pelletInstanced} />

      {/* Faint glow strip behind the column to read the species color band */}
      <mesh position={[0, 0, -0.4]}>
        <planeGeometry args={[columnHalfWidth * 2.6, wallHeight + 0.4]} />
        <meshBasicMaterial color="#0a0a0f" />
      </mesh>
    </group>
  );
}
