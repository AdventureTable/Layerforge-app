import type { PrintSettings } from '../types';

export interface HeightmapMm {
  data: Float32Array;
  width: number;
  height: number;
}

export interface ReliefMeshResult {
  positions: Float32Array;
  indices: Uint32Array;
  dimensions: {
    width: number;
    height: number;
  };
  topVertexCount: number;
  segmentsX: number;
  segmentsY: number;
  heightsMm: Float32Array; // sampled heights for top vertices (row-major)
}

const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function generateReliefMesh(params: {
  heightmap: HeightmapMm;
  printSettings: Pick<PrintSettings, 'widthMm' | 'heightMm' | 'baseLayerMm'>;
  resolution: number;
  mirrorX?: boolean;
}): ReliefMeshResult {
  const { heightmap, printSettings, resolution, mirrorX = false } = params;

  const { width: hmW, height: hmH, data: hmData } = heightmap;
  const { widthMm, heightMm, baseLayerMm } = printSettings;

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

  const segmentsX = Math.min(resolution, hmW);
  const segmentsY = Math.min(resolution, hmH);
  const gridW = segmentsX + 1;
  const gridH = segmentsY + 1;
  const topVertexCount = gridW * gridH;
  const vertexCount = topVertexCount * 2;

  const heightsMm = new Float32Array(topVertexCount);
  for (let iy = 0; iy <= segmentsY; iy++) {
    for (let ix = 0; ix <= segmentsX; ix++) {
      const hmX0 = Math.floor((ix / segmentsX) * (hmW - 1));
      const hmY = Math.floor((iy / segmentsY) * (hmH - 1));
      const hmX = mirrorX ? (hmW - 1) - hmX0 : hmX0;
      const rawDepth = hmData[hmY * hmW + hmX];
      heightsMm[iy * gridW + ix] = rawDepth;
    }
  }

  const positions = new Float32Array(vertexCount * 3);

  const halfW = meshWidth / 2;
  const halfH = meshHeight / 2;
  const dx = meshWidth / segmentsX;
  const dz = meshHeight / segmentsY;

  // Top vertices (relief)
  for (let iy = 0; iy <= segmentsY; iy++) {
    for (let ix = 0; ix <= segmentsX; ix++) {
      const topIndex = iy * gridW + ix;
      const x = -halfW + ix * dx;
      const z = -halfH + iy * dz;
      const y = heightsMm[topIndex] + baseLayerMm;
      const p = topIndex * 3;
      positions[p] = x;
      positions[p + 1] = y;
      positions[p + 2] = z;

      const bottomIndex = topVertexCount + topIndex;
      const pb = bottomIndex * 3;
      positions[pb] = x;
      positions[pb + 1] = 0;
      positions[pb + 2] = z;
    }
  }

  const topFaceIndices = segmentsX * segmentsY * 6;
  const bottomFaceIndices = segmentsX * segmentsY * 6;
  const sideFaceIndices = (2 * segmentsX + 2 * segmentsY) * 6;
  const indices = new Uint32Array(topFaceIndices + bottomFaceIndices + sideFaceIndices);

  const topAt = (iy: number, ix: number) => iy * gridW + ix;
  const bottomAt = (iy: number, ix: number) => topVertexCount + topAt(iy, ix);

  let ii = 0;

  // Top faces
  for (let iy = 0; iy < segmentsY; iy++) {
    for (let ix = 0; ix < segmentsX; ix++) {
      const a = topAt(iy, ix);
      const b = topAt(iy, ix + 1);
      const c = topAt(iy + 1, ix + 1);
      const d = topAt(iy + 1, ix);
      indices[ii++] = a;
      indices[ii++] = c;
      indices[ii++] = b;
      indices[ii++] = a;
      indices[ii++] = d;
      indices[ii++] = c;
    }
  }

  // Bottom faces (reversed winding)
  for (let iy = 0; iy < segmentsY; iy++) {
    for (let ix = 0; ix < segmentsX; ix++) {
      const a = bottomAt(iy, ix);
      const b = bottomAt(iy, ix + 1);
      const c = bottomAt(iy + 1, ix + 1);
      const d = bottomAt(iy + 1, ix);
      indices[ii++] = a;
      indices[ii++] = b;
      indices[ii++] = c;
      indices[ii++] = a;
      indices[ii++] = c;
      indices[ii++] = d;
    }
  }

  // Side walls
  // Front edge (iy = 0)
  for (let ix = 0; ix < segmentsX; ix++) {
    const tl = topAt(0, ix);
    const tr = topAt(0, ix + 1);
    const bl = bottomAt(0, ix);
    const br = bottomAt(0, ix + 1);
    indices[ii++] = tl;
    indices[ii++] = bl;
    indices[ii++] = br;
    indices[ii++] = tl;
    indices[ii++] = br;
    indices[ii++] = tr;
  }

  // Back edge (iy = segmentsY)
  for (let ix = 0; ix < segmentsX; ix++) {
    const tl = topAt(segmentsY, ix);
    const tr = topAt(segmentsY, ix + 1);
    const bl = bottomAt(segmentsY, ix);
    const br = bottomAt(segmentsY, ix + 1);
    indices[ii++] = tl;
    indices[ii++] = tr;
    indices[ii++] = br;
    indices[ii++] = tl;
    indices[ii++] = br;
    indices[ii++] = bl;
  }

  // Left edge (ix = 0)
  for (let iy = 0; iy < segmentsY; iy++) {
    const tf = topAt(iy, 0);
    const tb = topAt(iy + 1, 0);
    const bf = bottomAt(iy, 0);
    const bb = bottomAt(iy + 1, 0);
    indices[ii++] = tf;
    indices[ii++] = bf;
    indices[ii++] = bb;
    indices[ii++] = tf;
    indices[ii++] = bb;
    indices[ii++] = tb;
  }

  // Right edge (ix = segmentsX)
  for (let iy = 0; iy < segmentsY; iy++) {
    const tf = topAt(iy, segmentsX);
    const tb = topAt(iy + 1, segmentsX);
    const bf = bottomAt(iy, segmentsX);
    const bb = bottomAt(iy + 1, segmentsX);
    indices[ii++] = tf;
    indices[ii++] = tb;
    indices[ii++] = bb;
    indices[ii++] = tf;
    indices[ii++] = bb;
    indices[ii++] = bf;
  }

  return {
    positions,
    indices,
    dimensions: { width: meshWidth, height: meshHeight },
    topVertexCount,
    segmentsX,
    segmentsY,
    heightsMm,
  };
}
