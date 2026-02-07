import type { EasyModeRecipe, Filament, ModelGeometrySettings, TransferCurvePoint } from '../types';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const normalizeCurvePoints = (points: TransferCurvePoint[] | undefined | null): TransferCurvePoint[] => {
  const cleaned =
    points
      ?.filter((p) => typeof p?.x === 'number' && typeof p?.y === 'number')
      .map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) })) ?? [];

  const inner = cleaned.filter((p) => p.x > 0 && p.x < 1);
  const combined = [{ x: 0, y: 0 }, ...inner, { x: 1, y: 1 }].sort((a, b) => a.x - b.x);

  // De-duplicate by x (keep last)
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

const computeLuminance = (
  r: number,
  g: number,
  b: number,
  method: ModelGeometrySettings['luminanceMethod']
): number => {
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
    case 'combo':
      return clamp01(0.5 * rec709 + 0.5 * maxc);
    case 'color_aware': {
      const sat = (maxc - minc) / (maxc + 1e-6);
      return clamp01((1 - sat) * rec709 + sat * maxc);
    }
    case 'color_pop':
      return clamp01(rec709 + 0.25 * (maxc - minc));
    case 'rec601':
    default:
      return clamp01(0.299 * r + 0.587 * g + 0.114 * b);
  }
};

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

const hexToRgb255 = (hex: string): [number, number, number] => {
  const safe = hex?.startsWith('#') ? hex : `#${hex ?? ''}`;
  const r = parseInt(safe.slice(1, 3), 16);
  const g = parseInt(safe.slice(3, 5), 16);
  const b = parseInt(safe.slice(5, 7), 16);
  return [
    Number.isFinite(r) ? r : 255,
    Number.isFinite(g) ? g : 255,
    Number.isFinite(b) ? b : 255,
  ];
};

export interface ThumbnailSource {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

export const prepareThumbnailSource = async (
  imageDataUrl: string,
  maxPx = 240
): Promise<ThumbnailSource> => {
  const img = new Image();
  img.decoding = 'async';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });

  const maxDim = Math.max(img.width, img.height);
  const scale = maxDim > maxPx ? maxPx / maxDim : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to acquire canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return { width, height, rgba: new Uint8ClampedArray(imageData.data) };
};

export const renderRecipeThumbnailFromSource = (params: {
  source: ThumbnailSource;
  recipe: EasyModeRecipe;
  filaments: Filament[];
  invert: boolean;
}): string => {
  const { source, recipe, filaments, invert } = params;

  const width = source.width;
  const height = source.height;
  const data = source.rgba;
  const pxCount = width * height;

  if (pxCount <= 0 || filaments.length === 0 || recipe.stops.length === 0) {
    const blank = document.createElement('canvas');
    blank.width = Math.max(1, width);
    blank.height = Math.max(1, height);
    return blank.toDataURL('image/png');
  }

  const curvePoints = normalizeCurvePoints(recipe.transferCurve);
  const processed = new Float32Array(pxCount);

  const gamma = recipe.gamma ?? 1.0;
  const contrast = recipe.contrast ?? 1.0;
  const offset = recipe.offset ?? 0.0;

  for (let pi = 0, di = 0; pi < pxCount; pi++, di += 4) {
    const r = data[di] / 255;
    const g = data[di + 1] / 255;
    const b = data[di + 2] / 255;

    const lum = computeLuminance(r, g, b, recipe.luminanceMethod);
    let v =
      recipe.toneMappingMode === 'curve'
        ? applyTransferCurve(lum, curvePoints)
        : applyGammaToneMapping(lum, gamma, contrast, offset);

    if (invert) v = 1 - v;
    processed[pi] = v;
  }

  if (recipe.dynamicDepth) {
    const pLow = percentileFromHistogram(processed, 2);
    const pHigh = percentileFromHistogram(processed, 98);
    const span = pHigh - pLow;
    if (span > 1e-6) {
      for (let i = 0; i < processed.length; i++) {
        processed[i] = clamp01((processed[i] - pLow) / span);
      }
    }
  }

  const depthRange = recipe.maxDepthMm - recipe.minDepthMm;
  const sortedStops = [...recipe.stops].sort((a, b) => a.thresholdZMm - b.thresholdZMm);
  const filamentMap = new Map(filaments.map((f) => [f.id, f]));
  const defaultFilament = filaments[0];

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return outCanvas.toDataURL('image/png');

  const outImageData = outCtx.createImageData(width, height);
  const out = outImageData.data;

  for (let pi = 0, di = 0; pi < pxCount; pi++, di += 4) {
    const depth = recipe.minDepthMm + processed[pi] * depthRange;

    let filament: Filament = defaultFilament;
    for (const stop of sortedStops) {
      if (depth <= stop.thresholdZMm) {
        const f = filamentMap.get(stop.filamentId);
        if (f) filament = f;
        break;
      }
    }

    const [fr, fg, fb] = hexToRgb255(filament.hexColor);
    const atten = Math.exp(-filament.td * depth);

    out[di] = Math.max(0, Math.min(255, Math.round(255 * atten + fr * (1 - atten))));
    out[di + 1] = Math.max(0, Math.min(255, Math.round(255 * atten + fg * (1 - atten))));
    out[di + 2] = Math.max(0, Math.min(255, Math.round(255 * atten + fb * (1 - atten))));
    out[di + 3] = 255;
  }

  outCtx.putImageData(outImageData, 0, 0);
  return outCanvas.toDataURL('image/png');
};

export async function* renderRecipeThumbnailsBatch(params: {
  imageDataUrl: string;
  recipes: EasyModeRecipe[];
  filaments: Filament[];
  invert: boolean;
  maxPx?: number;
  shouldCancel?: () => boolean;
}): AsyncGenerator<{ id: string; dataUrl: string; index: number; total: number }, void, void> {
  const { imageDataUrl, recipes, filaments, invert } = params;
  const maxPx = params.maxPx ?? 240;
  const shouldCancel = params.shouldCancel ?? (() => false);

  const source = await prepareThumbnailSource(imageDataUrl, maxPx);

  for (let i = 0; i < recipes.length; i++) {
    if (shouldCancel()) return;
    const recipe = recipes[i];
    const dataUrl = renderRecipeThumbnailFromSource({
      source,
      recipe,
      filaments,
      invert,
    });
    yield { id: recipe.id, dataUrl, index: i, total: recipes.length };

    // Yield to keep UI responsive
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((r) => setTimeout(r, 0));
  }
}
