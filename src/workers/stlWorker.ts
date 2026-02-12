import type { StlWorkerInput, StlWorkerOutput } from './stlWorkerTypes';
import { base64ToFloat32 } from '../core/heightmapPipeline';
import { generateReliefMesh } from '../core/generateReliefMesh';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const post = (msg: StlWorkerOutput, transfer?: Transferable[]) => {
  ctx.postMessage(msg, transfer ?? []);
};

const writeAsciiHeader = (u8: Uint8Array, text: string) => {
  const bytes = new TextEncoder().encode(text);
  u8.fill(0, 0, 80);
  u8.set(bytes.subarray(0, 80), 0);
};

const transformToStl = (x: number, y: number, z: number): [number, number, number] => {
  // Three.js view uses XZ as bed plane (Y up). Slicers use XY as bed plane (Z up).
  // Rotate +90° around X: (x, y, z) -> (x, -z, y)
  return [x, -z, y];
};

const writeTriangle = (
  dv: DataView,
  offset: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number
): number => {
  const [aX, aY, aZ] = transformToStl(ax, ay, az);
  const [bX, bY, bZ] = transformToStl(bx, by, bz);
  const [cX, cY, cZ] = transformToStl(cx, cy, cz);

  const abx = bX - aX;
  const aby = bY - aY;
  const abz = bZ - aZ;
  const acx = cX - aX;
  const acy = cY - aY;
  const acz = cZ - aZ;

  let nx = aby * acz - abz * acy;
  let ny = abz * acx - abx * acz;
  let nz = abx * acy - aby * acx;
  const nLen = Math.hypot(nx, ny, nz);
  if (nLen > 1e-12) {
    nx /= nLen;
    ny /= nLen;
    nz /= nLen;
  } else {
    nx = 0;
    ny = 0;
    nz = 0;
  }

  dv.setFloat32(offset, nx, true);
  dv.setFloat32(offset + 4, ny, true);
  dv.setFloat32(offset + 8, nz, true);

  dv.setFloat32(offset + 12, aX, true);
  dv.setFloat32(offset + 16, aY, true);
  dv.setFloat32(offset + 20, aZ, true);

  dv.setFloat32(offset + 24, bX, true);
  dv.setFloat32(offset + 28, bY, true);
  dv.setFloat32(offset + 32, bZ, true);

  dv.setFloat32(offset + 36, cX, true);
  dv.setFloat32(offset + 40, cY, true);
  dv.setFloat32(offset + 44, cZ, true);

  dv.setUint16(offset + 48, 0, true);
  return offset + 50;
};

const writeBox = (
  dv: DataView,
  offset: number,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number
): number => {
  const x0 = cx - sx / 2;
  const x1 = cx + sx / 2;
  const y0 = cy - sy / 2;
  const y1 = cy + sy / 2;
  const z0 = cz - sz / 2;
  const z1 = cz + sz / 2;

  const corners = [
    [x0, y0, z0], // 0
    [x1, y0, z0], // 1
    [x1, y0, z1], // 2
    [x0, y0, z1], // 3
    [x0, y1, z0], // 4
    [x1, y1, z0], // 5
    [x1, y1, z1], // 6
    [x0, y1, z1], // 7
  ] as const;

  const faces: Array<[number, number, number]> = [
    // Bottom
    [0, 2, 1],
    [0, 3, 2],
    // Top
    [4, 5, 6],
    [4, 6, 7],
    // Front
    [0, 1, 5],
    [0, 5, 4],
    // Back
    [2, 7, 3],
    [2, 6, 7],
    // Left
    [0, 4, 7],
    [0, 7, 3],
    // Right
    [1, 6, 2],
    [1, 5, 6],
  ];

  for (const [i0, i1, i2] of faces) {
    const a = corners[i0];
    const b = corners[i1];
    const c = corners[i2];
    offset = writeTriangle(dv, offset, a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }

  return offset;
};

self.onmessage = (event: MessageEvent<StlWorkerInput>) => {
  try {
    const { heightmapBase64, heightmapWidth, heightmapHeight, printSettings } = event.data;

    post({ type: 'progress', progress: 0, message: 'Decoding heightmap…' });
    const hmData = base64ToFloat32(heightmapBase64);
    if (hmData.length !== heightmapWidth * heightmapHeight) {
      throw new Error('Heightmap size mismatch');
    }

    post({ type: 'progress', progress: 15, message: 'Generating mesh…' });
    const relief = generateReliefMesh({
      heightmap: { data: hmData, width: heightmapWidth, height: heightmapHeight },
      printSettings,
      resolution: printSettings.meshResolution,
      mirrorX: false,
    });

    const reliefTriCount = relief.indices.length / 3;
    const borderTriCount = printSettings.hasBorder ? 48 : 0; // 4 boxes * 12 triangles
    const triCount = reliefTriCount + borderTriCount;

    post({ type: 'progress', progress: 40, message: 'Writing STL…' });
    const buffer = new ArrayBuffer(84 + triCount * 50);
    const dv = new DataView(buffer);
    const u8 = new Uint8Array(buffer);
    writeAsciiHeader(u8, 'LayerForge (web) - binary STL');
    dv.setUint32(80, triCount, true);

    let offset = 84;

    const positions = relief.positions;
    const indices = relief.indices;

    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i] * 3;
      const ib = indices[i + 1] * 3;
      const ic = indices[i + 2] * 3;

      offset = writeTriangle(
        dv,
        offset,
        positions[ia],
        positions[ia + 1],
        positions[ia + 2],
        positions[ib],
        positions[ib + 1],
        positions[ib + 2],
        positions[ic],
        positions[ic + 1],
        positions[ic + 2]
      );
    }

    if (printSettings.hasBorder) {
      post({ type: 'progress', progress: 70, message: 'Adding border…' });
      const innerW = relief.dimensions.width;
      const innerH = relief.dimensions.height;
      const bw = printSettings.borderWidthMm;
      const bh = printSettings.borderDepthMm + printSettings.baseLayerMm;
      const outerW = innerW + bw * 2;

      // Front / Back
      offset = writeBox(dv, offset, 0, bh / 2, innerH / 2 + bw / 2, outerW, bh, bw);
      offset = writeBox(dv, offset, 0, bh / 2, -innerH / 2 - bw / 2, outerW, bh, bw);

      // Left / Right
      offset = writeBox(dv, offset, -innerW / 2 - bw / 2, bh / 2, 0, bw, bh, innerH);
      offset = writeBox(dv, offset, innerW / 2 + bw / 2, bh / 2, 0, bw, bh, innerH);
    }

    post({ type: 'progress', progress: 100, message: 'Complete' });

    const stlBytes = new Uint8Array(buffer);
    post({ type: 'complete', stlBytes }, [stlBytes.buffer]);
  } catch (err) {
    post({
      type: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};
