import type { ModelGeometrySettings, TransferCurvePoint } from '../types';

export const MAX_HEIGHTMAP_DIM = 2048;

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

export interface DecodedImage {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

export type HeightmapGeometryInput = Pick<
  ModelGeometrySettings,
  | 'minDepthMm'
  | 'maxDepthMm'
  | 'gamma'
  | 'contrast'
  | 'offset'
  | 'smoothing'
  | 'spikeRemoval'
  | 'luminanceMethod'
  | 'toneMappingMode'
  | 'transferCurve'
  | 'dynamicDepth'
  | 'invert'
>;

const normalizeCurvePoints = (points: TransferCurvePoint[] | undefined | null): TransferCurvePoint[] => {
  const cleaned =
    points
      ?.filter((p) => typeof p?.x === 'number' && typeof p?.y === 'number')
      .map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) })) ?? [];

  const inner = cleaned.filter((p) => p.x > 0 && p.x < 1);
  const combined = [{ x: 0, y: 0 }, ...inner, { x: 1, y: 1 }].sort((a, b) => a.x - b.x);

  const deduped: TransferCurvePoint[] = [];
  for (const p of combined) {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.x - p.x) < 1e-6) {
      deduped[deduped.length - 1] = p;
    } else {
      deduped.push(p);
    }
  }

  return deduped;
};

const applyTransferCurve = (t: number, points: TransferCurvePoint[]): number => {
  const x = clamp01(t);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (x < a.x) continue;
    if (x > b.x) continue;
    const span = b.x - a.x;
    if (span <= 1e-9) return clamp01(b.y);
    const u = (x - a.x) / span;
    return clamp01(a.y + u * (b.y - a.y));
  }
  return clamp01(points[points.length - 1]?.y ?? x);
};

const applyGammaToneMapping = (t: number, gamma: number, contrast: number, offset: number): number => {
  let v = clamp01(t);
  v = Math.pow(v, gamma);
  v = (v - 0.5) * contrast + 0.5;
  v = v + offset;
  return clamp01(v);
};

const computeLuminance = (r: number, g: number, b: number, method: ModelGeometrySettings['luminanceMethod']): number => {
  const maxc = Math.max(r, g, b);
  const minc = Math.min(r, g, b);
  const rec709 = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  switch (method) {
    case 'rec709':
      return clamp01(rec709);
    case 'max_channel':
      return clamp01(maxc);
    case 'scaled_max_channel':
      return clamp01((r + g + b) / 3);
    case 'combo': {
      const maxCh = maxc;
      return clamp01(0.5 * rec709 + 0.5 * maxCh);
    }
    case 'color_aware': {
      const sat = (maxc - minc) / (maxc + 1e-6);
      const maxCh = maxc;
      return clamp01((1 - sat) * rec709 + sat * maxCh);
    }
    case 'color_pop':
      return clamp01(rec709 + 0.25 * (maxc - minc));
    case 'rec601':
    default:
      return clamp01(0.299 * r + 0.587 * g + 0.114 * b);
  }
};

export async function decodeImageDataUrl(imageDataUrl: string, maxDim: number): Promise<DecodedImage> {
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/i.exec(dataUrl);
    if (!match) {
      throw new Error('Invalid data URL');
    }

    const mime = match[1] || 'application/octet-stream';
    const isBase64 = !!match[2];
    const payload = match[3] || '';

    if (!isBase64) {
      const decoded = decodeURIComponent(payload);
      return new Blob([decoded], { type: mime });
    }

    const bytes = base64ToUint8Array(payload);
    return new Blob([bytes], { type: mime });
  };

  let blob: Blob;
  try {
    const response = await fetch(imageDataUrl);
    blob = await response.blob();
  } catch {
    blob = dataUrlToBlob(imageDataUrl);
  }
  const bitmap = await createImageBitmap(blob);

  let targetW = bitmap.width;
  let targetH = bitmap.height;

  const maxSide = Math.max(targetW, targetH);
  if (maxSide > maxDim) {
    const scale = maxDim / maxSide;
    targetW = Math.max(1, Math.round(targetW * scale));
    targetH = Math.max(1, Math.round(targetH * scale));
  }

  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(targetW, targetH)
      : (() => {
          if (typeof document === 'undefined') {
            throw new Error('Canvas decoding requires OffscreenCanvas support');
          }
          const c = document.createElement('canvas');
          c.width = targetW;
          c.height = targetH;
          return c;
        })();

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) {
    (ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'high';
  }

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  const imgData = ctx.getImageData(0, 0, targetW, targetH);

  bitmap.close();

  return { width: targetW, height: targetH, rgba: imgData.data };
}

export function rgbaToToneMappedLuminance(rgba: Uint8ClampedArray, width: number, height: number, geometry: HeightmapGeometryInput): Float32Array {
  const pxCount = width * height;
  const out = new Float32Array(pxCount);
  const curvePoints = normalizeCurvePoints(geometry.transferCurve);

  for (let pi = 0, di = 0; pi < pxCount; pi++, di += 4) {
    const r = rgba[di] / 255;
    const g = rgba[di + 1] / 255;
    const b = rgba[di + 2] / 255;

    const lum = computeLuminance(r, g, b, geometry.luminanceMethod);
    out[pi] =
      geometry.toneMappingMode === 'curve'
        ? applyTransferCurve(lum, curvePoints)
        : applyGammaToneMapping(lum, geometry.gamma, geometry.contrast, geometry.offset);
  }

  return out;
}

const percentileFromHistogram = (values: Float32Array, pct: number): number => {
  const bins = 512;
  const hist = new Uint32Array(bins);
  let count = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    const idx = Math.min(bins - 1, Math.max(0, Math.floor(clamp01(v) * (bins - 1))));
    hist[idx]++;
    count++;
  }

  if (count === 0) return 0;
  const target = (pct / 100) * count;
  let cum = 0;
  for (let i = 0; i < bins; i++) {
    cum += hist[i];
    if (cum >= target) return i / (bins - 1);
  }
  return 1;
};

export function applyInvertAndDynamicDepth(values: Float32Array, invert: boolean, dynamicDepth: boolean): Float32Array {
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let v = clamp01(values[i]);
    if (invert) v = 1 - v;
    out[i] = v;
  }

  if (!dynamicDepth) return out;

  const pLow = percentileFromHistogram(out, 2);
  const pHigh = percentileFromHistogram(out, 98);
  const span = pHigh - pLow;
  if (span <= 1e-6) return out;

  for (let i = 0; i < out.length; i++) {
    out[i] = clamp01((out[i] - pLow) / span);
  }

  return out;
}

export function mapToDepthMm(values01: Float32Array, minDepthMm: number, maxDepthMm: number): Float32Array {
  const out = new Float32Array(values01.length);
  const range = maxDepthMm - minDepthMm;
  for (let i = 0; i < values01.length; i++) {
    out[i] = minDepthMm + clamp01(values01[i]) * range;
  }
  return out;
}

export function float32ToBase64(data: Float32Array): string {
  return arrayBufferToBase64(data.buffer);
}

export function base64ToFloat32(base64: string): Float32Array {
  const bytes = base64ToUint8Array(base64);
  return new Float32Array(bytes.buffer);
}

export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000; // 32KB
  const chunks: string[] = [];

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }

  return btoa(chunks.join(''));
}

const kernelSizeForSpikeRemoval = (level: ModelGeometrySettings['spikeRemoval']): number => {
  switch (level) {
    case 'light':
      return 3;
    case 'medium':
      return 5;
    case 'strong':
      return 7;
    case 'none':
    default:
      return 0;
  }
};

const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function medianFilter(values01: Float32Array, width: number, height: number, level: ModelGeometrySettings['spikeRemoval']): Float32Array {
  const k = kernelSizeForSpikeRemoval(level);
  if (k <= 1) return values01;

  const half = Math.floor(k / 2);
  const out = new Float32Array(values01.length);
  const window = new Float32Array(k * k);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let wi = 0;
      for (let dy = -half; dy <= half; dy++) {
        const sy = clampInt(y + dy, 0, height - 1);
        const row = sy * width;
        for (let dx = -half; dx <= half; dx++) {
          const sx = clampInt(x + dx, 0, width - 1);
          window[wi++] = values01[row + sx];
        }
      }

      // Sort small window and take median (typed array sorts numerically)
      window.sort();
      out[y * width + x] = window[Math.floor(window.length / 2)] ?? values01[y * width + x];
    }
  }

  return out;
}

export function gaussianBlur(values01: Float32Array, width: number, height: number, sigma: number): Float32Array {
  if (sigma <= 0) return values01;

  const radius = clampInt(Math.ceil(sigma * 3), 1, 64);
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);

  let sum = 0;
  const denom = 2 * sigma * sigma;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / denom);
    kernel[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;

  const tmp = new Float32Array(values01.length);
  const out = new Float32Array(values01.length);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let kx = -radius; kx <= radius; kx++) {
        const sx = clampInt(x + kx, 0, width - 1);
        acc += values01[row + sx] * kernel[kx + radius];
      }
      tmp[row + x] = acc;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let ky = -radius; ky <= radius; ky++) {
        const sy = clampInt(y + ky, 0, height - 1);
        acc += tmp[sy * width + x] * kernel[ky + radius];
      }
      out[row + x] = acc;
    }
  }

  return out;
}
