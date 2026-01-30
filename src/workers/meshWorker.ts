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

// Find filament for a given depth based on color stops
function findFilamentForDepth(
  depth: number,
  sortedStops: ColorStop[],
  filamentMap: Map<string, Filament>,
  defaultFilament: Filament
): Filament {
  for (const stop of sortedStops) {
    if (depth <= stop.thresholdZMm) {
      const f = filamentMap.get(stop.filamentId);
      if (f) return f;
    }
  }
  return defaultFilament;
}

// Calculate color with physically correct transmission model
// Uses real depth in mm and td = ln(2)/d50
// At depth = d50: 50% of light passes through
function calculateTransmissionColor(
  filament: Filament,
  depth: number
): [number, number, number] {
  const [fr, fg, fb] = hexToRgb(filament.hexColor);
  
  // Physically correct: td = ln(2)/d50, depth in mm
  // At depth = d50: atten = exp(-ln(2)) = 0.5
  const atten = Math.exp(-filament.td * depth);
  
  // Blend with white (backlit simulation)
  // Final = white * atten + filamentColor * (1 - atten)
  const r = 1.0 * atten + fr * (1 - atten);
  const g = 1.0 * atten + fg * (1 - atten);
  const b = 1.0 * atten + fb * (1 - atten);
  
  return [r, g, b];
}

// Main mesh generation function
function generateMeshWithColors(input: MeshWorkerInput): MeshWorkerOutput['result'] {
  const { 
    heightmapData, 
    modelGeometry, 
    printSettings, 
    colorPlan, 
    filaments,
    resolution = 150 
  } = input;
  
  const { width: hmW, height: hmH, data: hmData } = heightmapData;
  const { minDepthMm, maxDepthMm } = modelGeometry;
  const { widthMm, heightMm, layerHeightMm, baseLayerMm } = printSettings;
  
  const depthRange = maxDepthMm - minDepthMm;
  
  // Calculate mesh dimensions maintaining aspect ratio
  const hmAspect = hmW / hmH;
  const targetAspect = widthMm / heightMm;
  
  let meshWidth = widthMm;
  let meshHeight = heightMm;
  
  if (hmAspect > targetAspect) {
    meshHeight = widthMm / hmAspect;
  } else {
    meshWidth = heightMm * hmAspect;
  }
  
  // Downsample for performance
  const segmentsX = Math.min(resolution, hmW);
  const segmentsY = Math.min(resolution, hmH);
  
  // Prepare filament lookup
  const enabledFilaments = filaments
    .filter(f => f.enabled)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  
  const filamentMap = new Map(enabledFilaments.map(f => [f.id, f]));
  const sortedStops = [...colorPlan.stops].sort((a, b) => a.thresholdZMm - b.thresholdZMm);
  const defaultFilament = enabledFilaments[0] || filaments[0];
  
  // Report progress
  self.postMessage({ type: 'progress', progress: 10, message: 'Reading heightmap...' });
  
  // Create height and color data arrays
  const heights: number[][] = [];
  const vertexColors: [number, number, number][][] = [];
  
  for (let iy = 0; iy <= segmentsY; iy++) {
    heights[iy] = [];
    vertexColors[iy] = [];
    
    for (let ix = 0; ix <= segmentsX; ix++) {
      // Sample from heightmap (already in mm, already has gamma/contrast/smoothing applied)
      const hmX = Math.floor((ix / segmentsX) * (hmW - 1));
      const hmY = Math.floor((iy / segmentsY) * (hmH - 1));
      const hmIndex = hmY * hmW + hmX;
      
      // Get raw depth from heightmap (already processed by Python)
      const rawDepth = hmData[hmIndex];
      
      // Discretize to layer heights for accurate preview
      const discretizedDepth = Math.round(rawDepth / layerHeightMm) * layerHeightMm;
      
      heights[iy][ix] = discretizedDepth;
      
      // Find filament and calculate color
      const filament = findFilamentForDepth(discretizedDepth, sortedStops, filamentMap, defaultFilament);
      const color = calculateTransmissionColor(filament, discretizedDepth);
      vertexColors[iy][ix] = color;
    }
    
    // Report progress during height calculation
    if (iy % Math.floor(segmentsY / 5) === 0) {
      const progress = 10 + (iy / segmentsY) * 30;
      self.postMessage({ type: 'progress', progress, message: 'Processing heightmap...' });
    }
  }
  
  self.postMessage({ type: 'progress', progress: 40, message: 'Building geometry...' });
  
  // Build geometry
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  
  const halfW = meshWidth / 2;
  const halfH = meshHeight / 2;
  const dx = meshWidth / segmentsX;
  const dz = meshHeight / segmentsY;
  
  let vertexIndex = 0;
  
  const addVertex = (x: number, y: number, z: number, r: number, g: number, b: number) => {
    vertices.push(x, y, z);
    colors.push(r, g, b);
    return vertexIndex++;
  };
  
  // Top surface (relief) - XZ plane with Y as height
  const topIndices: number[][] = [];
  for (let iz = 0; iz <= segmentsY; iz++) {
    topIndices[iz] = [];
    for (let ix = 0; ix <= segmentsX; ix++) {
      const x = -halfW + ix * dx;
      const z = -halfH + iz * dz;
      const y = heights[iz][ix] + baseLayerMm;
      const [r, g, b] = vertexColors[iz][ix];
      topIndices[iz][ix] = addVertex(x, y, z, r, g, b);
    }
  }
  
  self.postMessage({ type: 'progress', progress: 50, message: 'Creating top surface...' });
  
  // Top surface faces
  for (let iz = 0; iz < segmentsY; iz++) {
    for (let ix = 0; ix < segmentsX; ix++) {
      const a = topIndices[iz][ix];
      const b = topIndices[iz][ix + 1];
      const c = topIndices[iz + 1][ix + 1];
      const d = topIndices[iz + 1][ix];
      indices.push(a, c, b, a, d, c);
    }
  }
  
  self.postMessage({ type: 'progress', progress: 60, message: 'Creating bottom surface...' });
  
  // Bottom surface (flat at Y=0) - use a neutral color
  const bottomColor: [number, number, number] = [0.3, 0.3, 0.3];
  const bottomIndices: number[][] = [];
  for (let iz = 0; iz <= segmentsY; iz++) {
    bottomIndices[iz] = [];
    for (let ix = 0; ix <= segmentsX; ix++) {
      const x = -halfW + ix * dx;
      const z = -halfH + iz * dz;
      bottomIndices[iz][ix] = addVertex(x, 0, z, ...bottomColor);
    }
  }
  
  // Bottom surface faces (reversed winding)
  for (let iz = 0; iz < segmentsY; iz++) {
    for (let ix = 0; ix < segmentsX; ix++) {
      const a = bottomIndices[iz][ix];
      const b = bottomIndices[iz][ix + 1];
      const c = bottomIndices[iz + 1][ix + 1];
      const d = bottomIndices[iz + 1][ix];
      indices.push(a, b, c, a, c, d);
    }
  }
  
  self.postMessage({ type: 'progress', progress: 75, message: 'Creating side walls...' });
  
  // Side walls with edge colors
  // Front edge (iz = 0)
  for (let ix = 0; ix < segmentsX; ix++) {
    const tl = topIndices[0][ix];
    const tr = topIndices[0][ix + 1];
    const bl = bottomIndices[0][ix];
    const br = bottomIndices[0][ix + 1];
    indices.push(tl, bl, br, tl, br, tr);
  }
  
  // Back edge (iz = segmentsY)
  for (let ix = 0; ix < segmentsX; ix++) {
    const tl = topIndices[segmentsY][ix];
    const tr = topIndices[segmentsY][ix + 1];
    const bl = bottomIndices[segmentsY][ix];
    const br = bottomIndices[segmentsY][ix + 1];
    indices.push(tl, tr, br, tl, br, bl);
  }
  
  // Left edge (ix = 0)
  for (let iz = 0; iz < segmentsY; iz++) {
    const tf = topIndices[iz][0];
    const tb = topIndices[iz + 1][0];
    const bf = bottomIndices[iz][0];
    const bb = bottomIndices[iz + 1][0];
    indices.push(tf, bf, bb, tf, bb, tb);
  }
  
  // Right edge (ix = segmentsX)
  for (let iz = 0; iz < segmentsY; iz++) {
    const tf = topIndices[iz][segmentsX];
    const tb = topIndices[iz + 1][segmentsX];
    const bf = bottomIndices[iz][segmentsX];
    const bb = bottomIndices[iz + 1][segmentsX];
    indices.push(tf, tb, bb, tf, bb, bf);
  }
  
  self.postMessage({ type: 'progress', progress: 90, message: 'Finalizing...' });
  
  return {
    positions: new Float32Array(vertices),
    indices: new Uint32Array(indices),
    colors: new Float32Array(colors),
    dimensions: {
      width: meshWidth,
      height: meshHeight,
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
