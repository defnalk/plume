// Shared type contract between the main thread and the kinetics worker.
// Species order is CH3OH, O2, H2O, HCHO, CO — matching the MATLAB source.

export type SpeciesIndex = 0 | 1 | 2 | 3 | 4;

export const SPECIES = ["CH3OH", "O2", "H2O", "HCHO", "CO"] as const;
export type SpeciesName = (typeof SPECIES)[number];

export interface SolveRequest {
  type: "solve";
  id: number;
  T: number;
}

export interface SolveResult {
  type: "result";
  id: number;
  T: number;
  z: Float32Array;
  // Per-species molar flowrate profile, length = z.length * 5, row major (z, species)
  F: Float32Array;
  conversion: number;
  selectivity: number;
  // A pre-baked 1D color lookup (RGB triplets) indexed by axial position 0..1.
  // Lets the GPU sample species mix without re-uploading per frame.
  lut: Uint8Array;
  lutWidth: number;
}

export type WorkerMessage = SolveRequest;
export type MainMessage = SolveResult;
