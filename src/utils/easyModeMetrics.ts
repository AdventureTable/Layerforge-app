import type { EasyModeRecipe, PrintSettings } from '../types';

const depthToLayer = (
  depthMm: number,
  firstLayerHeightMm: number,
  layerHeightMm: number
): number => {
  if (depthMm <= 0) return 0;
  if (depthMm <= firstLayerHeightMm) return 1;

  const remainingHeight = depthMm - firstLayerHeightMm;
  const additionalLayers = remainingHeight / layerHeightMm;
  const roundedLayers =
    Math.abs(additionalLayers - Math.round(additionalLayers)) < 0.0001
      ? Math.round(additionalLayers)
      : Math.ceil(additionalLayers);

  return 1 + roundedLayers;
};

export interface EasyModeRecipeMetrics {
  depthMm: number;
  totalLayers: number;
  swapsDistinctLayers: number;
  warnings: string[];
}

export const computeRecipeMetrics = (params: {
  recipe: EasyModeRecipe;
  printSettings: PrintSettings;
  selectedFilamentCount: number;
  minSwapGapLayers?: number;
}): EasyModeRecipeMetrics => {
  const { recipe, printSettings, selectedFilamentCount } = params;
  const minSwapGapLayers = params.minSwapGapLayers ?? 3;

  const warnings: string[] = [];
  if (selectedFilamentCount > 4) {
    warnings.push('Less is more: 2–4 filaments recommended');
  }
  if (Array.isArray(recipe.warnings) && recipe.warnings.length > 0) {
    warnings.push(...recipe.warnings);
  }

  const depthMm = recipe.maxDepthMm - recipe.minDepthMm;

  const reliefHeight = recipe.maxDepthMm + printSettings.baseLayerMm;
  const borderHeight = printSettings.hasBorder
    ? printSettings.borderDepthMm + printSettings.baseLayerMm
    : 0;
  const totalHeight = Math.max(reliefHeight, borderHeight);

  const firstLayer = printSettings.firstLayerHeightMm ?? printSettings.baseLayerMm;
  const totalLayers = depthToLayer(totalHeight, firstLayer, printSettings.layerHeightMm);

  // Swaps: unique layers at stop thresholds (in model Z)
  const layerSet = new Set<number>();
  const layers: number[] = [];
  for (const stop of recipe.stops) {
    const zInModel = stop.thresholdZMm + printSettings.baseLayerMm;
    const layer = depthToLayer(zInModel, firstLayer, printSettings.layerHeightMm);
    if (!layerSet.has(layer)) {
      layerSet.add(layer);
      layers.push(layer);
    }
  }
  layers.sort((a, b) => a - b);

  for (let i = 1; i < layers.length; i++) {
    if (layers[i] - layers[i - 1] < minSwapGapLayers) {
      warnings.push(`Swaps too close (<${minSwapGapLayers} layers)`);
      break;
    }
  }

  return {
    depthMm,
    totalLayers,
    swapsDistinctLayers: layerSet.size,
    warnings,
  };
};

