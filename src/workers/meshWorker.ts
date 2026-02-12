// Web Worker for calculating mesh geometry with vertex colors
// This runs in a separate thread to avoid blocking the UI
// Uses heightmap data from Python for WYSIWYG consistency

import type { 
  ModelGeometrySettings, 
  PrintSettings, 
  ColorPlanSettings, 
  Filament,
  ColorStop 
} from '../types';
import { generateReliefMesh } from '../core/generateReliefMesh';

// Message types for communication with main thread
export interface MeshWorkerInput {
  heightmapData: {
    data: Float32Array;  // Heightmap values in mm (already processed by Python)
    width: number;
    height: number;
  };
  modelGeometry: ModelGeometrySettings;
  printSettings: PrintSettings;
  colorPlan: ColorPlanSettings;
  filaments: Filament[];
  resolution?: number; // Max segments for performance (default 150)
}

export interface MeshWorkerOutput {
  type: 'progress' | 'complete' | 'error';
  progress?: number; // 0-100
  message?: string;
  result?: {
    positions: Float32Array;
    indices: Uint32Array;
    colors: Float32Array;
    dimensions: {
      width: number;
      height: number;
    };
  };
  error?: string;
}

// Helper to parse hex color to RGB (0-1)
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

// three.js expects vertex colors in linear space (renderer outputs sRGB).
// Our preview computations operate in sRGB, so we convert sRGB -> linear here
// to keep 3D colors visually consistent with the 2D preview.
function srgbToLinear(c: number): number {
  const v = Math.max(0, Math.min(1, c));
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// Find filament for a given depth based on color stops
function findFilamentForDepth(
  depth: number,
  sortedStops: ColorStop[],
  filamentMap: Map<string, Filament>,
  defaultFilament: Filament
): Filament {
  const EPS = 1e-6;
  for (const stop of sortedStops) {
    if (depth <= stop.thresholdZMm + EPS) {
      const f = filamentMap.get(stop.filamentId);
      if (f) return f;
    }
  }
  // If out of range (or float32 rounding pushed past the last stop),
  // fall back to the last filament (most opaque), matching legacy behavior.
  return defaultFilament;
}

// Calculate color with physically correct transmission model
// Uses real depth in mm and td = ln(2)/d50
// At depth = d50: 50% of light passes through
function calculateTransmissionColor(
  filament: Filament,
  depth: number
): [number, number, number] {
  const [fr, fg, fb] = hexToRgb(filament.hexColor); // sRGB 0..1
  
  // Physically correct: td = ln(2)/d50, depth in mm
  // At depth = d50: atten = exp(-ln(2)) = 0.5
  const atten = Math.exp(-filament.td * depth);
  
  // Blend with white (backlit simulation)
  // Final = white * atten + filamentColor * (1 - atten)
  const rSrgb = 1.0 * atten + fr * (1 - atten);
  const gSrgb = 1.0 * atten + fg * (1 - atten);
  const bSrgb = 1.0 * atten + fb * (1 - atten);
  
  return [srgbToLinear(rSrgb), srgbToLinear(gSrgb), srgbToLinear(bSrgb)];
}

// Main mesh generation function
function generateMeshWithColors(input: MeshWorkerInput): MeshWorkerOutput['result'] {
  const { 
    heightmapData, 
    printSettings, 
    colorPlan, 
    filaments,
    resolution = 150 
  } = input;
  
  // Prepare filament lookup
  const enabledFilaments = filaments
    .filter(f => f.enabled)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  
  const filamentMap = new Map(enabledFilaments.map(f => [f.id, f]));
  const sortedStops = [...colorPlan.stops]
    .filter((s) => filamentMap.has(s.filamentId))
    .sort((a, b) => a.thresholdZMm - b.thresholdZMm);
  const defaultFilament =
    enabledFilaments[enabledFilaments.length - 1] ??
    filaments[filaments.length - 1] ??
    filaments[0];
  
  // Report progress
  self.postMessage({ type: 'progress', progress: 10, message: 'Generating geometry…' });

  const relief = generateReliefMesh({
    heightmap: heightmapData,
    printSettings,
    resolution,
    mirrorX: false,
  });

  self.postMessage({ type: 'progress', progress: 55, message: 'Computing colors…' });

  const vertexCount = relief.positions.length / 3;
  const colors = new Float32Array(vertexCount * 3);
  const bottomColor: [number, number, number] = [
    srgbToLinear(0.3),
    srgbToLinear(0.3),
    srgbToLinear(0.3),
  ];

  for (let i = 0; i < relief.topVertexCount; i++) {
    const depth = relief.heightsMm[i];
    const filament = findFilamentForDepth(depth, sortedStops, filamentMap, defaultFilament);
    const [r, g, b] = calculateTransmissionColor(filament, depth);
    const ci = i * 3;
    colors[ci] = r;
    colors[ci + 1] = g;
    colors[ci + 2] = b;
  }

  for (let i = relief.topVertexCount; i < vertexCount; i++) {
    const ci = i * 3;
    colors[ci] = bottomColor[0];
    colors[ci + 1] = bottomColor[1];
    colors[ci + 2] = bottomColor[2];
  }

  self.postMessage({ type: 'progress', progress: 90, message: 'Finalizing…' });

  return {
    positions: relief.positions,
    indices: relief.indices,
    colors,
    dimensions: {
      width: relief.dimensions.width,
      height: relief.dimensions.height,
    },
  };
}

// Worker message handler
self.onmessage = (event: MessageEvent<MeshWorkerInput>) => {
  try {
    self.postMessage({ type: 'progress', progress: 0, message: 'Starting...' });
    
    const result = generateMeshWithColors(event.data);
    
    self.postMessage({ 
      type: 'complete', 
      progress: 100,
      result 
    } as MeshWorkerOutput);
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    } as MeshWorkerOutput);
  }
};
