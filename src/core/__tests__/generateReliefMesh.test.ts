import { describe, it, expect } from 'vitest';
import { generateReliefMesh } from '../generateReliefMesh';

describe('generateReliefMesh', () => {
  it('should generate expected vertex/index counts', () => {
    const hmW = 4;
    const hmH = 4;
    const hm = new Float32Array(hmW * hmH).fill(1.0);

    const mesh = generateReliefMesh({
      heightmap: { data: hm, width: hmW, height: hmH },
      printSettings: { widthMm: 100, heightMm: 100, layerHeightMm: 0.08, baseLayerMm: 0.16 },
      resolution: 3,
      mirrorX: false,
    });

    // segmentsX/Y = 3 => grid 4x4 => 16 top vertices => 32 total vertices
    expect(mesh.topVertexCount).toBe(16);
    expect(mesh.positions.length).toBe(32 * 3);

    // indices: 6*(sx*sy*2 + 2*sx + 2*sy) with sx=sy=3 => 180
    expect(mesh.indices.length).toBe(180);
    expect(mesh.indices.length % 3).toBe(0);
  });

  it('mirrorX should flip height sampling', () => {
    const hmW = 4;
    const hmH = 2;
    // Row-major: first column 1, last column 9
    const hm = new Float32Array([
      1, 2, 3, 9,
      1, 2, 3, 9,
    ]);

    const base = {
      heightmap: { data: hm, width: hmW, height: hmH },
      printSettings: { widthMm: 100, heightMm: 50, layerHeightMm: 1, baseLayerMm: 0.16 },
      resolution: 3,
    } as const;

    const noMirror = generateReliefMesh({ ...base, mirrorX: false });
    const mirrored = generateReliefMesh({ ...base, mirrorX: true });

    // Top-left grid point samples hmX=0 when not mirrored, hmX=3 when mirrored
    expect(noMirror.heightsMm[0]).toBeCloseTo(1.0);
    expect(mirrored.heightsMm[0]).toBeCloseTo(9.0);
  });
});
