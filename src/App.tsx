import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { Scene, type SceneHandle } from "./components/Scene";
import { SidePanel } from "./components/SidePanel";
import type { MainMessage } from "./lib/kinetics-types";
import { useReducedMotion } from "./lib/reducedMotion";
import { readState, writeState } from "./lib/url";
import KineticsWorker from "./worker/kinetics.worker.ts?worker";

const T_DEFAULT = 430;

export function App() {
  const initial = useMemo(() => readState(), []);
  const [T, setT] = useState<number>(initial.T ?? T_DEFAULT);
  const [conversion, setConversion] = useState(0);
  const [selectivity, setSelectivity] = useState(0);
  const [solving, setSolving] = useState(true);
  const [lut, setLut] = useState<THREE.DataTexture | null>(null);

  const reducedMotion = useReducedMotion();
  const sceneRef = useRef<SceneHandle>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);
  const lastApplied = useRef(-1);

  useEffect(() => {
    const worker = new KineticsWorker();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<MainMessage>) => {
      const msg = e.data;
      if (msg.type !== "result") return;
      // Drop stale solutions if the user is dragging the slider quickly.
      if (msg.id < lastApplied.current) return;
      lastApplied.current = msg.id;
      setConversion(msg.conversion);
      setSelectivity(msg.selectivity);
      setSolving(false);

      // TS 5.7 distinguishes ArrayBuffer vs SharedArrayBuffer in TypedArray
      // generics, while three's DataTexture overloads predate that split.
      // Copy into a fresh array so the buffer is unambiguously ArrayBuffer.
      const lutData = new Uint8Array(msg.lut.length);
      lutData.set(msg.lut);
      const tex = new THREE.DataTexture(
        lutData,
        msg.lutWidth,
        1,
        THREE.RGBAFormat,
        THREE.UnsignedByteType,
      );
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      setLut((prev) => {
        prev?.dispose();
        return tex;
      });
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Re-solve whenever T changes. Debounce via rAF so a slider drag doesn't
  // spam the worker — one job per animation frame is plenty.
  useEffect(() => {
    let scheduled = 0;
    scheduled = requestAnimationFrame(() => {
      const worker = workerRef.current;
      if (!worker) return;
      reqId.current += 1;
      setSolving(true);
      worker.postMessage({ type: "solve", id: reqId.current, T });
    });
    writeState({ T });
    return () => cancelAnimationFrame(scheduled);
  }, [T]);

  const onScreenshot = () => {
    const url = sceneRef.current?.takeScreenshot();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `plume-${Math.round(T)}K.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="app">
      <main className="canvas-wrap" aria-label="Reactor visualization">
        <Scene T={T} lut={lut} reducedMotion={reducedMotion} ref={sceneRef} />
      </main>
      <SidePanel
        T={T}
        onTChange={setT}
        conversion={conversion}
        selectivity={selectivity}
        reducedMotion={reducedMotion}
        solving={solving}
        onScreenshot={onScreenshot}
      />
    </div>
  );
}
