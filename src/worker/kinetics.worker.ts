/// <reference lib="webworker" />
// LHHW kinetics for methanol partial oxidation, ported from
// formaldehyde-reactor-design/RE_Group20_Part3ab.m. Integrates the species
// molar flowrate profile along reactor length with a fixed-step RK4 — small
// system, fast convergence, no need for a stiff solver here.

import type { MainMessage, WorkerMessage } from "../lib/kinetics-types";

const R_J = 8.314; // J / mol K
const P_TOT_ATM = 1.1 * 1.01325;
const D = 0.020;
const AREA = Math.PI * (D / 2) ** 2;
const RHO_CAT = 1500;
const BED_VOID = 0.4;
const FACTOR = AREA * RHO_CAT * (1 - BED_VOID);

const F_TOTAL = 3.5219e-4;
const F_N2 = F_TOTAL * (1 - 0.11 - 0.06 - 0.03);
const F0: [number, number, number, number, number] = [
  0.11 * F_TOTAL,
  0.06 * F_TOTAL,
  0.03 * F_TOTAL,
  0,
  0,
];

const L_MAX = 40;
const N_STEPS = 400; // 0.1 m steps — plenty for the visualization profile
const LUT_W = 256;

// Color anchors per species (linear sRGB-ish, baked into a Uint8 LUT)
const COLOR_CH3OH: [number, number, number] = [0.49, 0.83, 0.99]; // sky-cyan
const COLOR_O2: [number, number, number] = [0.62, 0.94, 0.62]; // pale green
const COLOR_H2O: [number, number, number] = [0.78, 0.78, 0.92]; // soft violet
const COLOR_HCHO: [number, number, number] = [0.99, 0.78, 0.27]; // amber
const COLOR_CO: [number, number, number] = [0.95, 0.36, 0.36]; // warning red

function lhhwRates(P_M: number, P_O2: number, P_W: number, P_H: number, T: number) {
  const k_M = 1.5e7 * Math.exp(-86_000 / (R_J * T));
  const K_M = 2.6e-4 * Math.exp(56_780 / (R_J * T));
  const K_O2 = 1.42e-5 * Math.exp(60_320 / (R_J * T));
  const K_H2O = 5.5e-7 * Math.exp(86_450 / (R_J * T));
  const k_CO = 3.5e2 * Math.exp(-46_000 / (R_J * T));

  const PH = Math.max(P_H, 1e-10);
  const sqrtO2 = Math.sqrt(Math.max(P_O2, 0));

  const num1 = k_M * K_M * P_M * K_O2 * sqrtO2;
  const den1 = (1 + K_M * P_M + K_H2O * P_W) * (1 + K_O2 * sqrtO2);
  const rHCHO = 0.44 * (num1 / Math.max(den1, 1e-30));

  const num2 = k_CO * PH * sqrtO2;
  const den2 = 1 + K_O2 * sqrtO2;
  const rCO = 0.44 * (num2 / Math.max(den2, 1e-30));

  return { r1: rHCHO, r2: rCO };
}

function deriv(F: Float64Array, T: number, out: Float64Array): void {
  const Fm = Math.max(F[0], 0);
  const Fo = Math.max(F[1], 0);
  const Fw = Math.max(F[2], 0);
  const Fh = Math.max(F[3], 0);
  const Fc = Math.max(F[4], 0);
  const Ftot = Fm + Fo + Fw + Fh + Fc + F_N2;

  const PM = (Fm / Ftot) * P_TOT_ATM;
  const PO = (Fo / Ftot) * P_TOT_ATM;
  const PW = (Fw / Ftot) * P_TOT_ATM;
  const PH = (Fh / Ftot) * P_TOT_ATM;

  const { r1, r2 } = lhhwRates(PM, PO, PW, PH, T);

  out[0] = -r1 * FACTOR;
  out[1] = (-0.5 * r1 - 0.5 * r2) * FACTOR;
  out[2] = (r1 + r2) * FACTOR;
  out[3] = (r1 - r2) * FACTOR;
  out[4] = r2 * FACTOR;
}

function rk4Step(F: Float64Array, T: number, h: number): void {
  const k1 = new Float64Array(5);
  const k2 = new Float64Array(5);
  const k3 = new Float64Array(5);
  const k4 = new Float64Array(5);
  const tmp = new Float64Array(5);

  deriv(F, T, k1);
  for (let i = 0; i < 5; i++) tmp[i] = F[i] + 0.5 * h * k1[i];
  deriv(tmp, T, k2);
  for (let i = 0; i < 5; i++) tmp[i] = F[i] + 0.5 * h * k2[i];
  deriv(tmp, T, k3);
  for (let i = 0; i < 5; i++) tmp[i] = F[i] + h * k3[i];
  deriv(tmp, T, k4);
  for (let i = 0; i < 5; i++) {
    F[i] = F[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    if (F[i] < 0) F[i] = 0;
  }
}

function solve(T: number) {
  const h = L_MAX / N_STEPS;
  const z = new Float32Array(N_STEPS + 1);
  const F = new Float32Array((N_STEPS + 1) * 5);

  const state = new Float64Array(F0);
  z[0] = 0;
  for (let s = 0; s < 5; s++) F[s] = F0[s];

  for (let i = 1; i <= N_STEPS; i++) {
    rk4Step(state, T, h);
    z[i] = i * h;
    for (let s = 0; s < 5; s++) F[i * 5 + s] = state[s];
  }

  const F_M_out = state[0];
  const F_HCHO_out = state[3];
  const conversion = (F0[0] - F_M_out) / F0[0];
  const consumed = F0[0] - F_M_out;
  const selectivity = consumed > 1e-12 ? F_HCHO_out / consumed : 0;

  // Build a 1D color LUT by interpolating along z and mixing species colors
  // by their mole fraction at each station. This is what the particle shader
  // samples to color a particle by its current axial position. RGBA because
  // three.js dropped RGB DataTexture support in r152+.
  const lut = new Uint8Array(LUT_W * 4);
  for (let i = 0; i < LUT_W; i++) {
    const u = i / (LUT_W - 1);
    const fz = u * N_STEPS;
    const i0 = Math.floor(fz);
    const i1 = Math.min(i0 + 1, N_STEPS);
    const t = fz - i0;

    const f = new Array<number>(5);
    let total = F_N2;
    for (let s = 0; s < 5; s++) {
      const a = F[i0 * 5 + s];
      const b = F[i1 * 5 + s];
      f[s] = a + (b - a) * t;
      total += f[s];
    }

    const x_M = f[0] / total;
    const x_O = f[1] / total;
    const x_W = f[2] / total;
    const x_H = f[3] / total;
    const x_C = f[4] / total;
    // Normalize within the reactive species for visualization punch — the
    // color should track the *mix among reactants/products*, not get washed
    // out by the inert nitrogen.
    const w = x_M + x_O + x_W + x_H + x_C;
    const inv = w > 1e-9 ? 1 / w : 0;

    const r =
      (COLOR_CH3OH[0] * x_M +
        COLOR_O2[0] * x_O +
        COLOR_H2O[0] * x_W +
        COLOR_HCHO[0] * x_H +
        COLOR_CO[0] * x_C) *
      inv;
    const g =
      (COLOR_CH3OH[1] * x_M +
        COLOR_O2[1] * x_O +
        COLOR_H2O[1] * x_W +
        COLOR_HCHO[1] * x_H +
        COLOR_CO[1] * x_C) *
      inv;
    const b =
      (COLOR_CH3OH[2] * x_M +
        COLOR_O2[2] * x_O +
        COLOR_H2O[2] * x_W +
        COLOR_HCHO[2] * x_H +
        COLOR_CO[2] * x_C) *
      inv;

    lut[i * 4 + 0] = Math.round(Math.min(1, Math.max(0, r)) * 255);
    lut[i * 4 + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255);
    lut[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
    lut[i * 4 + 3] = 255;
  }

  return { z, F, conversion, selectivity, lut };
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  if (msg.type !== "solve") return;
  const { id, T } = msg;
  const { z, F, conversion, selectivity, lut } = solve(T);
  const result: MainMessage = {
    type: "result",
    id,
    T,
    z,
    F,
    conversion,
    selectivity,
    lut,
    lutWidth: LUT_W,
  };
  (self as unknown as Worker).postMessage(result, [
    z.buffer,
    F.buffer,
    lut.buffer,
  ]);
};
