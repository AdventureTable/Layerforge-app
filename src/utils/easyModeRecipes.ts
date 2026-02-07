import type { Filament, ColorStop, EasyModeRecipe, TransferCurvePoint } from '../types';

export const EASY_MODE_CLEAR_TARGET = 0.85; // target transmission for "bright"
export const EASY_MODE_DARK_TARGET = 0.07; // target transmission for "dark"

export const EASY_MODE_MIN_MIN_DEPTH_MM = 0.24;
export const EASY_MODE_MAX_MAX_DEPTH_MM = 6.0;

export const EASY_MODE_SHALLOW_SCALE = 0.8;
export const EASY_MODE_DEEP_SCALE = 1.2;

export const EASY_MODE_REFINE_LOW = 0.9;
export const EASY_MODE_REFINE_HIGH = 1.1;

export const EASY_MODE_S_CURVE: TransferCurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.18 },
  { x: 0.5, y: 0.5 },
  { x: 0.75, y: 0.82 },
  { x: 1, y: 1 },
];

export const EASY_MODE_STRONG_S_CURVE: TransferCurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.12 },
  { x: 0.5, y: 0.5 },
  { x: 0.75, y: 0.88 },
  { x: 1, y: 1 },
];

export const EASY_MODE_LIFT_SHADOWS_CURVE: TransferCurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.28 },
  { x: 0.5, y: 0.58 },
  { x: 0.75, y: 0.85 },
  { x: 1, y: 1 },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const quantizeDown = (v: number, step: number) => Math.floor(v / step) * step;
const quantizeUp = (v: number, step: number) => Math.ceil(v / step) * step;
const quantizeNearest = (v: number, step: number) => Math.round(v / step) * step;

export interface AutoDepthRangeResult {
  minDepthMm: number;
  maxDepthMm: number;
}

export const autoDepthRangeFromFilaments = (
  filaments: Filament[],
  layerHeightMm: number,
  opts?: {
    clearTarget?: number;
    darkTarget?: number;
    minMinDepthMm?: number;
    maxMaxDepthMm?: number;
  }
): AutoDepthRangeResult => {
  const clearTarget = opts?.clearTarget ?? EASY_MODE_CLEAR_TARGET;
  const darkTarget = opts?.darkTarget ?? EASY_MODE_DARK_TARGET;
  const minMinDepthMm = opts?.minMinDepthMm ?? EASY_MODE_MIN_MIN_DEPTH_MM;
  const maxMaxDepthMm = opts?.maxMaxDepthMm ?? EASY_MODE_MAX_MAX_DEPTH_MM;

  const safeLayerH = layerHeightMm > 0 ? layerHeightMm : 0.08;

  const tds = filaments
    .map((f) => f.td)
    .filter((td) => Number.isFinite(td) && td > 0);

  if (tds.length === 0) {
    return {
      minDepthMm: quantizeNearest(0.48, safeLayerH),
      maxDepthMm: quantizeNearest(2.24, safeLayerH),
    };
  }

  const tdTranslucent = Math.min(...tds);
  const tdOpaque = Math.max(...tds);

  const minRaw = -Math.log(clearTarget) / tdTranslucent;
  const maxRaw = -Math.log(darkTarget) / tdOpaque;

  let minDepthMm = quantizeDown(minRaw, safeLayerH);
  let maxDepthMm = quantizeUp(maxRaw, safeLayerH);

  minDepthMm = clamp(minDepthMm, minMinDepthMm, maxMaxDepthMm - 2 * safeLayerH);
  maxDepthMm = clamp(maxDepthMm, minDepthMm + 2 * safeLayerH, maxMaxDepthMm);

  minDepthMm = quantizeNearest(minDepthMm, safeLayerH);
  maxDepthMm = quantizeNearest(maxDepthMm, safeLayerH);

  if (maxDepthMm < minDepthMm + 2 * safeLayerH) {
    maxDepthMm = minDepthMm + 2 * safeLayerH;
  }

  return { minDepthMm, maxDepthMm };
};

export interface WeightedStopsResult {
  stops: ColorStop[];
  hadCollisions: boolean;
}

export const computeWeightedStops = (
  filamentsInOrder: Filament[],
  minDepthMm: number,
  maxDepthMm: number,
  layerHeightMm: number
): WeightedStopsResult => {
  const safeLayerH = layerHeightMm > 0 ? layerHeightMm : 0.08;
  const minDepthQ = quantizeNearest(minDepthMm, safeLayerH);
  const maxDepthQ = quantizeNearest(maxDepthMm, safeLayerH);
  const range = maxDepthQ - minDepthQ;

  const weights = filamentsInOrder.map((f) => 1 / Math.max(1e-6, f.td));
  const sum = weights.reduce((acc, w) => acc + w, 0);

  let hadCollisions = false;
  let cum = 0;
  const rawThresholds = weights.map((w) => {
    cum += w / (sum || 1);
    return minDepthQ + range * cum;
  });

  const thresholds: number[] = [];
  let prev = minDepthQ;

  for (let i = 0; i < rawThresholds.length; i++) {
    const remaining = rawThresholds.length - 1 - i;
    const maxAllowed = maxDepthQ - remaining * safeLayerH;
    const minAllowed = prev + safeLayerH;

    let t = quantizeNearest(rawThresholds[i], safeLayerH);
    if (i === rawThresholds.length - 1) t = maxDepthQ;

    if (minAllowed > maxAllowed) {
      hadCollisions = true;
      t = maxAllowed;
    } else {
      if (t < minAllowed) {
        t = minAllowed;
        hadCollisions = true;
      }
      if (t > maxAllowed) {
        t = maxAllowed;
        hadCollisions = true;
      }
    }

    thresholds.push(t);
    prev = t;
  }

  const stops: ColorStop[] = filamentsInOrder.map((f, i) => ({
    filamentId: f.id,
    thresholdZMm: thresholds[i],
  }));

  return { stops, hadCollisions };
};

export const computeLinearStops = (
  filamentsInOrder: Filament[],
  minDepthMm: number,
  maxDepthMm: number,
  layerHeightMm: number
): WeightedStopsResult => {
  const safeLayerH = layerHeightMm > 0 ? layerHeightMm : 0.08;
  const minDepthQ = quantizeNearest(minDepthMm, safeLayerH);
  const maxDepthQ = quantizeNearest(maxDepthMm, safeLayerH);
  const range = maxDepthQ - minDepthQ;
  const n = filamentsInOrder.length;

  if (n === 0) return { stops: [], hadCollisions: false };

  let hadCollisions = false;
  const rawThresholds = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    rawThresholds[i] = minDepthQ + range * ((i + 1) / n);
  }

  const thresholds: number[] = [];
  let prev = minDepthQ;

  for (let i = 0; i < rawThresholds.length; i++) {
    const remaining = rawThresholds.length - 1 - i;
    const maxAllowed = maxDepthQ - remaining * safeLayerH;
    const minAllowed = prev + safeLayerH;

    let t = quantizeNearest(rawThresholds[i], safeLayerH);
    if (i === rawThresholds.length - 1) t = maxDepthQ;

    if (minAllowed > maxAllowed) {
      hadCollisions = true;
      t = maxAllowed;
    } else {
      if (t < minAllowed) {
        t = minAllowed;
        hadCollisions = true;
      }
      if (t > maxAllowed) {
        t = maxAllowed;
        hadCollisions = true;
      }
    }

    thresholds.push(t);
    prev = t;
  }

  const stops: ColorStop[] = filamentsInOrder.map((f, i) => ({
    filamentId: f.id,
    thresholdZMm: thresholds[i],
  }));

  return { stops, hadCollisions };
};

export const sortFilamentsByTd = (filaments: Filament[]): Filament[] => {
  return [...filaments].sort((a, b) => a.td - b.td);
};

const hashStringToU32 = (input: string): number => {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const clampToStep = (value: number, step: number) => {
  const safeStep = step > 0 ? step : 0.08;
  return quantizeNearest(value, safeStep);
};

const mutateAdjacentSwaps = (orderIds: string[], swaps: number, rng: () => number): string[] => {
  if (orderIds.length < 2 || swaps <= 0) return [...orderIds];
  const next = [...orderIds];
  for (let s = 0; s < swaps; s++) {
    const i = Math.max(0, Math.min(next.length - 2, Math.floor(rng() * (next.length - 1))));
    const tmp = next[i];
    next[i] = next[i + 1];
    next[i + 1] = tmp;
  }
  return next;
};

export const generateExploreRecipes = (params: {
  selectedFilaments: Filament[];
  layerHeightMm: number;
}): EasyModeRecipe[] => {
  const { selectedFilaments, layerHeightMm } = params;
  const ordered = sortFilamentsByTd(selectedFilaments);
  const filamentOrderIds = ordered.map((f) => f.id);
  const base = autoDepthRangeFromFilaments(ordered, layerHeightMm);
  const baseRange = base.maxDepthMm - base.minDepthMm;

  const depthOptions = [
    { key: 'shallow', label: 'Shallow', scale: EASY_MODE_SHALLOW_SCALE },
    { key: 'deep', label: 'Deep', scale: EASY_MODE_DEEP_SCALE },
  ] as const;

  const toneOptions = [
    { key: 'gamma', label: 'Gamma', mode: 'gamma' as const },
    { key: 'curve', label: 'Curve', mode: 'curve' as const },
  ] as const;

  const stopOptions = [
    { key: 'weighted', label: 'Weighted', strategy: 'weighted' as const },
    { key: 'linear', label: 'Linear', strategy: 'linear' as const },
  ] as const;

  const luminanceOptions = [
    { key: 'rec601', label: 'Rec.601', method: 'rec601' as const },
    { key: 'rec709', label: 'Rec.709', method: 'rec709' as const },
  ] as const;

  const recipes: EasyModeRecipe[] = [];

  for (const depth of depthOptions) {
    for (const tone of toneOptions) {
      for (const stopOpt of stopOptions) {
        for (const lum of luminanceOptions) {
          const range = baseRange * depth.scale;
          const minDepthMm = base.minDepthMm;
          let maxDepthMm = minDepthMm + range;
          maxDepthMm = clamp(maxDepthMm, minDepthMm + 2 * layerHeightMm, EASY_MODE_MAX_MAX_DEPTH_MM);
          maxDepthMm = quantizeNearest(maxDepthMm, layerHeightMm);

          // Fractional factorial: use 4 binary factors (depth/tone/stops/luminance) and derive dynamicDepth
          // to keep 16 tiles while still showing Dyn ON/OFF.
          const dynamicDepth = Boolean(
            (depth.key === 'deep' ? 1 : 0) ^
              (tone.key === 'curve' ? 1 : 0) ^
              (stopOpt.key === 'linear' ? 1 : 0) ^
              (lum.key === 'rec709' ? 1 : 0)
          );

          const { stops, hadCollisions } =
            stopOpt.strategy === 'linear'
              ? computeLinearStops(ordered, minDepthMm, maxDepthMm, layerHeightMm)
              : computeWeightedStops(ordered, minDepthMm, maxDepthMm, layerHeightMm);

          const warnings: string[] = [];
          if (hadCollisions) warnings.push('Depth range too small for clean stops');

          const id = `explore_${depth.key}_${tone.key}_${stopOpt.key}_${lum.key}`;
          const label = `${depth.label} • ${tone.label} • ${dynamicDepth ? 'Dyn ON' : 'Dyn OFF'} • ${stopOpt.label} stops • ${lum.label}`;

          const recipe: EasyModeRecipe = {
            id,
            label,
            minDepthMm,
            maxDepthMm,
            dynamicDepth,
            luminanceMethod: lum.method,
            toneMappingMode: tone.mode,
            gamma: tone.mode === 'gamma' ? 1.0 : undefined,
            contrast: tone.mode === 'gamma' ? 1.0 : undefined,
            offset: tone.mode === 'gamma' ? 0.0 : undefined,
            transferCurve: tone.mode === 'curve' ? EASY_MODE_S_CURVE : undefined,
            stopStrategy: stopOpt.strategy,
            filamentOrderIds,
            stops,
            warnings: warnings.length ? warnings : undefined,
          };

          recipes.push(recipe);
        }
      }
    }
  }

  return recipes;
};

export const generateRefineRecipes = (params: {
  center: EasyModeRecipe;
  selectedFilaments: Filament[];
  layerHeightMm: number;
  roundIndex: number;
}): EasyModeRecipe[] => {
  const { center, selectedFilaments, layerHeightMm, roundIndex } = params;
  const safeLayerH = layerHeightMm > 0 ? layerHeightMm : 0.08;

  const byId = new Map(selectedFilaments.map((f) => [f.id, f]));
  const selectedByTd = sortFilamentsByTd(selectedFilaments);

  // Normalize center order to the currently selected filament set.
  const baseOrderIds = (() => {
    const fromCenter = Array.isArray(center.filamentOrderIds) ? center.filamentOrderIds : [];
    const out: string[] = [];
    const seen = new Set<string>();

    for (const id of fromCenter) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (!byId.has(id)) continue;
      out.push(id);
    }

    // Add missing filaments (by Td) to keep a stable baseline
    for (const f of selectedByTd) {
      if (!seen.has(f.id)) out.push(f.id);
    }

    return out;
  })();

  const baseRange = Math.max(2 * safeLayerH, center.maxDepthMm - center.minDepthMm);
  const depthScales = [0.9, 0.95, 1.05, 1.1] as const;

  const luminancePool: EasyModeRecipe['luminanceMethod'][] = [
    'rec601',
    'rec709',
    'combo',
    'color_aware',
    'color_pop',
    'max_channel',
  ];

  const curvePresets: Array<{ key: string; curve: TransferCurvePoint[] }> = [
    { key: 'curveS', curve: EASY_MODE_S_CURVE },
    { key: 'curveStrongS', curve: EASY_MODE_STRONG_S_CURVE },
    { key: 'curveLift', curve: EASY_MODE_LIFT_SHADOWS_CURVE },
  ];

  const seedBase = hashStringToU32(`${center.id}|${roundIndex}`);

  const resolveOrder = (orderIds: string[]) => {
    const filamentsInOrder = orderIds
      .map((id) => byId.get(id))
      .filter((f): f is Filament => Boolean(f));
    return filamentsInOrder.length > 0 ? filamentsInOrder : selectedByTd;
  };

  const buildVariant = (variantIndex: number, kind: 'elite' | 'mut' | 'explore'): EasyModeRecipe => {
    const seed = (seedBase ^ hashStringToU32(`v${variantIndex}`)) >>> 0;
    const rng = mulberry32(seed);

    // Start from center values
    const minDepthMm = clampToStep(center.minDepthMm, safeLayerH);

    // Depth: mutate range (maxDepth only)
    let maxDepthMm = clampToStep(center.maxDepthMm, safeLayerH);
    let depthScale = 1.0;
    if (kind !== 'elite') {
      depthScale = kind === 'explore' ? (rng() < 0.5 ? 0.85 : 1.25) : depthScales[(variantIndex - 1) % depthScales.length];
      const nextRange = baseRange * depthScale;
      maxDepthMm = clampToStep(minDepthMm + nextRange, safeLayerH);
      maxDepthMm = clamp(maxDepthMm, minDepthMm + 2 * safeLayerH, EASY_MODE_MAX_MAX_DEPTH_MM);
      maxDepthMm = clampToStep(maxDepthMm, safeLayerH);
    }

    // Dynamic depth: 25% toggle (explore: 50%)
    const dynToggleProb = kind === 'explore' ? 0.5 : 0.25;
    const dynamicDepth = kind === 'elite' ? center.dynamicDepth : rng() < dynToggleProb ? !center.dynamicDepth : center.dynamicDepth;

    // Tone mapping: 40% toggle (explore: 50%)
    const toneToggleProb = kind === 'explore' ? 0.5 : 0.4;
    const toneMappingMode: EasyModeRecipe['toneMappingMode'] =
      kind === 'elite'
        ? center.toneMappingMode
        : rng() < toneToggleProb
          ? center.toneMappingMode === 'gamma'
            ? 'curve'
            : 'gamma'
          : center.toneMappingMode;

    // Gamma params (only if gamma)
    const baseGamma = center.toneMappingMode === 'gamma' ? center.gamma ?? 1.0 : 1.0;
    const baseContrast = center.toneMappingMode === 'gamma' ? center.contrast ?? 1.0 : 1.0;
    const baseOffset = center.toneMappingMode === 'gamma' ? center.offset ?? 0.0 : 0.0;

    const mutateScalar = (value: number, deltaMax: number, min: number, max: number) => {
      const delta = (rng() * 2 - 1) * deltaMax;
      return clamp(value + delta, min, max);
    };

    const gamma =
      toneMappingMode === 'gamma' && kind !== 'elite'
        ? mutateScalar(baseGamma, kind === 'explore' ? 0.2 : 0.12, 0.85, 1.35)
        : toneMappingMode === 'gamma'
          ? baseGamma
          : undefined;

    const contrast =
      toneMappingMode === 'gamma' && kind !== 'elite'
        ? mutateScalar(baseContrast, kind === 'explore' ? 0.25 : 0.15, 0.85, 1.35)
        : toneMappingMode === 'gamma'
          ? baseContrast
          : undefined;

    const offset =
      toneMappingMode === 'gamma' && kind !== 'elite'
        ? mutateScalar(baseOffset, kind === 'explore' ? 0.1 : 0.06, -0.12, 0.12)
        : toneMappingMode === 'gamma'
          ? baseOffset
          : undefined;

    const transferCurve =
      toneMappingMode === 'curve'
        ? kind === 'elite'
          ? center.transferCurve ?? EASY_MODE_S_CURVE
          : curvePresets[Math.floor(rng() * curvePresets.length)].curve
        : undefined;

    // Luminance method: mostly keep, explorers change (and ensure variety across explorers)
    const luminanceMethod: EasyModeRecipe['luminanceMethod'] = (() => {
      if (kind === 'elite') return center.luminanceMethod;

      if (kind === 'explore') {
        // Pick a method not equal to center if possible, deterministic by variant index.
        const filtered = luminancePool.filter((m) => m !== center.luminanceMethod);
        const fallbacks = filtered.length ? filtered : luminancePool;
        return fallbacks[(variantIndex - 13) % fallbacks.length];
      }

      // Mutations: 20% chance to switch between Rec.601/Rec.709, else keep.
      if (rng() < 0.2) return center.luminanceMethod === 'rec601' ? 'rec709' : 'rec601';
      return center.luminanceMethod;
    })();

    const baseStopStrategy: EasyModeRecipe['stopStrategy'] = center.stopStrategy ?? 'weighted';
    const stopStrategy: EasyModeRecipe['stopStrategy'] = (() => {
      if (kind === 'elite') return baseStopStrategy;
      if (kind === 'explore') {
        // Ensure at least some explorers flip strategy to show different layer splits.
        return (variantIndex - 13) % 2 === 0
          ? baseStopStrategy === 'weighted'
            ? 'linear'
            : 'weighted'
          : baseStopStrategy;
      }
      return rng() < 0.2 ? (baseStopStrategy === 'weighted' ? 'linear' : 'weighted') : baseStopStrategy;
    })();

    // Order: sometimes swap adjacent, explorers do 2 swaps always
    const swapCount = kind === 'explore' ? 2 : kind === 'mut' && rng() < 0.3 ? 1 : 0;
    const filamentOrderIds =
      swapCount > 0 ? mutateAdjacentSwaps(baseOrderIds, swapCount, rng) : [...baseOrderIds];

    const { stops, hadCollisions } =
      stopStrategy === 'linear'
        ? computeLinearStops(resolveOrder(filamentOrderIds), minDepthMm, maxDepthMm, safeLayerH)
        : computeWeightedStops(resolveOrder(filamentOrderIds), minDepthMm, maxDepthMm, safeLayerH);

    const warnings: string[] = [];
    if (hadCollisions) warnings.push('Depth range too small for clean stops');

    const pct = kind === 'elite' ? 0 : Math.round((depthScale - 1) * 100);
    const depthLabel = kind === 'elite' ? 'Keep' : `Range ${pct >= 0 ? '+' : ''}${pct}%`;
    const toneLabel =
      toneMappingMode === center.toneMappingMode ? `Tone ${toneMappingMode}` : `Tone ${toneMappingMode} (toggle)`;
    const dynLabel = dynamicDepth === center.dynamicDepth ? `Dyn ${dynamicDepth ? 'ON' : 'OFF'}` : `Dyn ${dynamicDepth ? 'ON' : 'OFF'} (toggle)`;
    const lumLabel = `Lum ${luminanceMethod}`;
    const stopsLabel =
      stopStrategy === baseStopStrategy ? `Stops ${stopStrategy}` : `Stops ${stopStrategy} (toggle)`;
    const orderLabel = swapCount > 0 ? `Order swap x${swapCount}` : 'Order keep';

    const label =
      kind === 'elite'
        ? 'Elite (keep)'
        : `${depthLabel} • ${toneLabel} • ${dynLabel} • ${lumLabel} • ${stopsLabel} • ${orderLabel}`;

    return {
      id: `refine_r${roundIndex}_${variantIndex}_${seed.toString(16)}`,
      label,
      minDepthMm,
      maxDepthMm,
      dynamicDepth,
      luminanceMethod,
      toneMappingMode,
      gamma,
      contrast,
      offset,
      transferCurve,
      stopStrategy,
      filamentOrderIds,
      stops,
      warnings: warnings.length ? warnings : undefined,
    };
  };

  const recipes: EasyModeRecipe[] = [];
  recipes.push(buildVariant(0, 'elite'));
  for (let i = 1; i <= 12; i++) recipes.push(buildVariant(i, 'mut'));
  for (let i = 13; i <= 15; i++) recipes.push(buildVariant(i, 'explore'));

  return recipes;
};
