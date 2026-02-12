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
  const safeLayerH = layerHeightMm > 0 ? layerHeightMm : 0.08;
  const orderedBase = sortFilamentsByTd(selectedFilaments);
  if (orderedBase.length === 0) return [];

  const baseOrderIds = orderedBase.map((f) => f.id);
  const byId = new Map(orderedBase.map((f) => [f.id, f]));

  const baseDepth = autoDepthRangeFromFilaments(orderedBase, safeLayerH);
  const baseRange = baseDepth.maxDepthMm - baseDepth.minDepthMm;

  const depthVariants = [
    { key: 'thin', label: 'Thin', scale: EASY_MODE_SHALLOW_SCALE },
    { key: 'thick', label: 'Thick', scale: EASY_MODE_DEEP_SCALE },
  ] as const;

  type OrderPreset = 'td' | 'swap_mid' | 'swap_dark';
  const applyOrderPreset = (orderIds: string[], preset: OrderPreset): string[] => {
    const n = orderIds.length;
    if (preset === 'td' || n < 2) return [...orderIds];

    const next = [...orderIds];
    const swap = (i: number, j: number) => {
      const tmp = next[i];
      next[i] = next[j];
      next[j] = tmp;
    };

    if (preset === 'swap_dark') {
      swap(n - 2, n - 1);
      return next;
    }

    // swap_mid: swap the two central IDs (fallback is still meaningful for n=2/3)
    const midRight = Math.floor(n / 2);
    const midLeft = Math.max(0, midRight - 1);
    if (midLeft !== midRight) swap(midLeft, midRight);
    return next;
  };

  const EXPLORE_LOOKS: Array<{
    key: string;
    label: string;
    luminanceMethod: EasyModeRecipe['luminanceMethod'];
    toneMappingMode: EasyModeRecipe['toneMappingMode'];
    transferCurve?: TransferCurvePoint[];
    gamma?: number;
    contrast?: number;
    offset?: number;
    dynamicDepth: boolean;
    stopStrategy: EasyModeRecipe['stopStrategy'];
    orderPreset: OrderPreset;
  }> = [
    // Safe (6 looks → 12 tiles)
    {
      key: 'balanced',
      label: 'Balanced (Recommended)',
      luminanceMethod: 'rec709',
      toneMappingMode: 'curve',
      transferCurve: EASY_MODE_S_CURVE,
      dynamicDepth: true,
      stopStrategy: 'weighted',
      orderPreset: 'td',
    },
    {
      key: 'balanced_dyn_off',
      label: 'Balanced (Dyn OFF)',
      luminanceMethod: 'rec709',
      toneMappingMode: 'curve',
      transferCurve: EASY_MODE_S_CURVE,
      dynamicDepth: false,
      stopStrategy: 'weighted',
      orderPreset: 'td',
    },
    {
      key: 'contrast_strong_s',
      label: 'High contrast',
      luminanceMethod: 'rec709',
      toneMappingMode: 'curve',
      transferCurve: EASY_MODE_STRONG_S_CURVE,
      dynamicDepth: true,
      stopStrategy: 'weighted',
      orderPreset: 'td',
    },
    {
      key: 'lift_shadows',
      label: 'Lift shadows',
      luminanceMethod: 'rec709',
      toneMappingMode: 'curve',
      transferCurve: EASY_MODE_LIFT_SHADOWS_CURVE,
      dynamicDepth: true,
      stopStrategy: 'weighted',
      orderPreset: 'td',
    },
    {
      key: 'poster_linear',
      label: 'Posterized layers',
      luminanceMethod: 'rec709',
      toneMappingMode: 'gamma',
      gamma: 1.0,
      contrast: 1.0,
      offset: 0.0,
      dynamicDepth: false,
      stopStrategy: 'linear',
      orderPreset: 'td',
    },
    {
      key: 'legacy_rec601',
      label: 'Rec.601 (Legacy)',
      luminanceMethod: 'rec601',
      toneMappingMode: 'curve',
      transferCurve: EASY_MODE_S_CURVE,
      dynamicDepth: true,
      stopStrategy: 'weighted',
      orderPreset: 'td',
    },
    // Experimental (2 looks → 4 tiles)
    {
      key: 'color_pop',
      label: 'Color pop',
      luminanceMethod: 'color_pop',
      toneMappingMode: 'curve',
      transferCurve: EASY_MODE_STRONG_S_CURVE,
      dynamicDepth: true,
      stopStrategy: 'weighted',
      orderPreset: 'td',
    },
    {
      key: 'order_swap_mid',
      label: 'Order experiment (mid swap)',
      luminanceMethod: 'rec709',
      toneMappingMode: 'curve',
      transferCurve: EASY_MODE_S_CURVE,
      dynamicDepth: true,
      stopStrategy: 'weighted',
      orderPreset: 'swap_mid',
    },
  ];

  const resolveOrder = (orderIds: string[]) => {
    const filamentsInOrder = orderIds
      .map((id) => byId.get(id))
      .filter((f): f is Filament => Boolean(f));
    return filamentsInOrder.length > 0 ? filamentsInOrder : orderedBase;
  };

  const recipes: EasyModeRecipe[] = [];

  for (const depthVariant of depthVariants) {
    const minDepthMm = baseDepth.minDepthMm;
    let maxDepthMm = minDepthMm + baseRange * depthVariant.scale;
    maxDepthMm = clamp(maxDepthMm, minDepthMm + 2 * safeLayerH, EASY_MODE_MAX_MAX_DEPTH_MM);
    maxDepthMm = quantizeNearest(maxDepthMm, safeLayerH);
    maxDepthMm = clamp(maxDepthMm, minDepthMm + 2 * safeLayerH, EASY_MODE_MAX_MAX_DEPTH_MM);

    for (const look of EXPLORE_LOOKS) {
      const filamentOrderIds = applyOrderPreset(baseOrderIds, look.orderPreset);
      const filamentsInOrder = resolveOrder(filamentOrderIds);

      const { stops, hadCollisions } =
        look.stopStrategy === 'linear'
          ? computeLinearStops(filamentsInOrder, minDepthMm, maxDepthMm, safeLayerH)
          : computeWeightedStops(filamentsInOrder, minDepthMm, maxDepthMm, safeLayerH);

      const warnings: string[] = [];
      if (hadCollisions) warnings.push('Depth range too small for clean stops');

      recipes.push({
        id: `explore_${look.key}_${depthVariant.key}`,
        label: `${look.label} • ${depthVariant.label}`,
        minDepthMm,
        maxDepthMm,
        dynamicDepth: look.dynamicDepth,
        luminanceMethod: look.luminanceMethod,
        toneMappingMode: look.toneMappingMode,
        gamma: look.toneMappingMode === 'gamma' ? look.gamma ?? 1.0 : undefined,
        contrast: look.toneMappingMode === 'gamma' ? look.contrast ?? 1.0 : undefined,
        offset: look.toneMappingMode === 'gamma' ? look.offset ?? 0.0 : undefined,
        transferCurve: look.toneMappingMode === 'curve' ? look.transferCurve ?? EASY_MODE_S_CURVE : undefined,
        stopStrategy: look.stopStrategy,
        filamentOrderIds,
        stops,
        warnings: warnings.length ? warnings : undefined,
      });
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
      depthScale = kind === 'explore' ? (rng() < 0.5 ? 0.85 : 1.15) : depthScales[(variantIndex - 1) % depthScales.length];
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
