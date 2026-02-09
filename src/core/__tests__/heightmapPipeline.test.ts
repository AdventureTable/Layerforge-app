import { describe, it, expect } from 'vitest';
import { base64ToFloat32, float32ToBase64, mapToDepthMm, applyInvertAndDynamicDepth } from '../heightmapPipeline';

describe('heightmapPipeline', () => {
  it('float32ToBase64/base64ToFloat32 should roundtrip', () => {
    const input = new Float32Array([0, 1, 0.5, Math.PI, -1.25, 12345.5]);
    const b64 = float32ToBase64(input);
    const out = base64ToFloat32(b64);

    expect(out.length).toBe(input.length);
    for (let i = 0; i < input.length; i++) {
      expect(out[i]).toBe(input[i]);
    }
  });

  it('mapToDepthMm should map [0..1] into [min..max]', () => {
    const out = mapToDepthMm(new Float32Array([0, 0.5, 1]), 0.48, 2.24);
    expect(out[0]).toBeCloseTo(0.48);
    expect(out[1]).toBeCloseTo((0.48 + 2.24) / 2);
    expect(out[2]).toBeCloseTo(2.24);
  });

  it('applyInvertAndDynamicDepth should clamp and avoid NaNs', () => {
    const input = new Float32Array([-10, 0, 0.2, 0.5, 1, 10, Number.NaN]);
    const out = applyInvertAndDynamicDepth(input, true, true);
    for (const v of out) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

