import { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import { useProjectStore, useEnabledFilaments } from '../../stores/projectStore';
import type { TransferCurvePoint } from '../../types';

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

const computeLuminance = (r: number, g: number, b: number, method: string): number => {
  // r,g,b in 0..1
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

export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { imageData: sourceImageData, previewData, modelGeometry, colorPlan } = useProjectStore();
  const enabledFilaments = useEnabledFilaments();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImageData) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Load the original image
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw base image
      ctx.drawImage(img, 0, 0);

      // If we have preview data from Python, use it
      if (previewData) {
        const previewImg = new Image();
        previewImg.onload = () => {
          ctx.drawImage(previewImg, 0, 0);
        };
        previewImg.src = previewData;
        return;
      }

      // Otherwise, compute a simple JS-based preview
      if (enabledFilaments.length === 0 || colorPlan.stops.length === 0) return;

      const canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = canvasImageData.data;
      const {
        minDepthMm,
        maxDepthMm,
        gamma,
        contrast,
        offset,
        invert,
        luminanceMethod,
        toneMappingMode,
        transferCurve,
        dynamicDepth,
      } = modelGeometry;
      const depthRange = maxDepthMm - minDepthMm;

      // Sort stops by threshold
      const sortedStops = [...colorPlan.stops].sort(
        (a, b) => a.thresholdZMm - b.thresholdZMm
      );

      // Create a map of filament id to filament data
      const filamentMap = new Map(
        enabledFilaments.map((f) => [f.id, f])
      );

      const pxCount = data.length / 4;
      const processed = new Float32Array(pxCount);
      const curvePoints = normalizeCurvePoints(transferCurve);

      for (let pi = 0, di = 0; pi < pxCount; pi++, di += 4) {
        const r = data[di] / 255;
        const g = data[di + 1] / 255;
        const b = data[di + 2] / 255;

        const lum = computeLuminance(r, g, b, luminanceMethod);

        let v =
          toneMappingMode === 'curve'
            ? applyTransferCurve(lum, curvePoints)
            : applyGammaToneMapping(lum, gamma, contrast, offset);

        if (invert) v = 1 - v;

        processed[pi] = v;
      }

      if (dynamicDepth) {
        const pLow = percentileFromHistogram(processed, 2);
        const pHigh = percentileFromHistogram(processed, 98);
        const span = pHigh - pLow;
        if (span > 1e-6) {
          for (let pi = 0; pi < processed.length; pi++) {
            processed[pi] = clamp01((processed[pi] - pLow) / span);
          }
        }
      }

      for (let pi = 0, di = 0; pi < pxCount; pi++, di += 4) {
        const depth = minDepthMm + processed[pi] * depthRange;

        // Find which filament applies at this depth
        let filament = enabledFilaments[0];
        for (const stop of sortedStops) {
          if (depth <= stop.thresholdZMm) {
            const f = filamentMap.get(stop.filamentId);
            if (f) filament = f;
            break;
          }
        }

        // Parse hex color
        const hex = filament.hexColor;
        const fr = parseInt(hex.slice(1, 3), 16);
        const fg = parseInt(hex.slice(3, 5), 16);
        const fb = parseInt(hex.slice(5, 7), 16);

        // Physically correct transmission model
        // td = ln(2)/d50, depth in mm - at depth = d50: 50% light passes
        const atten = Math.exp(-filament.td * depth);

        // Blend with white (backlit simulation)
        data[di] = Math.round(255 * atten + fr * (1 - atten));
        data[di + 1] = Math.round(255 * atten + fg * (1 - atten));
        data[di + 2] = Math.round(255 * atten + fb * (1 - atten));
      }

      ctx.putImageData(canvasImageData, 0, 0);
    };
    img.src = sourceImageData;
  }, [sourceImageData, previewData, modelGeometry, colorPlan, enabledFilaments]);

  return (
    <Box
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        padding: 16,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
    </Box>
  );
}
