// Filament calibration data
export interface FilamentCalibration {
  method: 'backlit_step_wedge' | 'manual';
  d50Mm: number; // Thickness in mm where transmission = 95% blocked (almost opaque)
  layerHeightMm?: number;
  infillPercent?: number;
}

// Filament entity
export interface Filament {
  id: string;
  name: string;
  hexColor: string;
  td: number; // Transmission depth parameter (calculated from d50)
  d50Mm: number; // User input: thickness where 95% is blocked (almost opaque)
  enabled: boolean;
  orderIndex: number;
  notes?: string;
  calibration?: FilamentCalibration;
}

// ln(20) ≈ 2.996 - used for d95 calculation (5% transmission = 95% blocked)
const LN_20 = Math.log(20);

// Helper to calculate Td from d95 (thickness where 95% is blocked)
export const calculateTdFromD50 = (d95Mm: number): number => {
  if (d95Mm <= 0) return 1.0; // Default fallback
  return LN_20 / d95Mm; // ln(20) / d95
};

// Helper to calculate d95 from Td
export const calculateD50FromTd = (td: number): number => {
  if (td <= 0) return 0.85; // Default fallback
  return LN_20 / td;
};

// Helper to calculate recommended mesh resolution
export const calculateRecommendedResolution = (
  widthMm: number,
  heightMm: number,
  nozzleDiameter: number,
  imageWidth: number,
  imageHeight: number
): number => {
  const imageResolution = Math.max(imageWidth, imageHeight);
  const maxUsefulResolution = Math.max(widthMm, heightMm) / nozzleDiameter;
  const recommended = Math.min(imageResolution, maxUsefulResolution);
  // Clamp between 50 and image resolution
  return Math.max(50, Math.min(Math.round(recommended), imageResolution));
};

// Resolution status for UI indicator
export type ResolutionStatus = 'optimal' | 'excessive' | 'maximum';

export const getResolutionStatus = (
  current: number,
  recommended: number,
  imageResolution: number
): ResolutionStatus => {
  if (current >= imageResolution) return 'maximum';
  if (current > recommended) return 'excessive';
  return 'optimal';
};

// Model Geometry Settings
export interface ModelGeometrySettings {
  minDepthMm: number;
  maxDepthMm: number;
  gamma: number;
  contrast: number;
  offset: number;
  smoothing: number;
  spikeRemoval: 'none' | 'light' | 'medium' | 'strong';
  imageFormat: 'color' | 'luminance';
  detailSize: number;
  luminanceMethod:
    | 'rec601'
    | 'rec709'
    | 'max_channel'
    | 'scaled_max_channel'
    | 'combo'
    | 'color_aware'
    | 'color_pop';
  toneMappingMode: 'gamma' | 'curve';
  transferCurve: TransferCurvePoint[];
  dynamicDepth: boolean;
  invert: boolean;
}

export interface TransferCurvePoint {
  x: number;
  y: number;
}

// Print Settings
export interface PrintSettings {
  layerHeightMm: number;
  baseLayerMm: number;
  firstLayerHeightMm: number;  // Slicer's first layer height (for accurate layer count)
  widthMm: number;
  heightMm: number;
  borderWidthMm: number;
  borderDepthMm: number;
  hasBorder: boolean;
  wireframePreview: boolean;
  transparentMode: boolean;
  // Mesh resolution settings
  nozzleDiameter: number;           // Default: 0.4mm
  meshResolution: number;            // Calculated or manual
  meshResolutionManuallySet: boolean; // Flag for UX - true if user edited manually
}

// Color Stop for sliders
export interface ColorStop {
  filamentId: string;
  thresholdZMm: number;
}

// Color Plan Settings
export interface ColorPlanSettings {
  mode: 'transmission' | 'distance';
  stops: ColorStop[];
}

// Lighting Settings for preview
export interface LightingSettings {
  mode: 'frontlit' | 'backlit';
  ledTemp: number; // Kelvin
  intensity: number;
}

// Swap entry for export
export interface SwapEntry {
  layer: number;
  zMm: number;
  filamentId: string;
}

// Full project state
export interface ProjectState {
  // Image data
  imagePath: string | null;
  imageData: string | null; // base64 for preview
  imageAspectRatio: number; // width / height of loaded image
  
  // Filaments
  filaments: Filament[];
  
  // Settings
  modelGeometry: ModelGeometrySettings;
  printSettings: PrintSettings;
  colorPlan: ColorPlanSettings;
  lighting: LightingSettings;
  
  // Derived/Cached data
  heightmapData: string | null; // base64
  heightmapWidth: number;
  heightmapHeight: number;
  previewData: string | null; // base64
  meshReady: boolean;
  swaps: SwapEntry[];
  
  // UI state
  isDirty: boolean;
  isProcessing: boolean;
  liveUpdate: boolean;
  lockAspectRatio: boolean;
  activeView: 'image' | 'preview' | '3d';
}

// Easy Mode (guided preview-first wizard)
export interface EasyModeDraftImage {
  path: string; // file name (web) or absolute path (tauri)
  dataUrl: string; // base64 data URL for preview
  aspectRatio: number;
  widthMm: number;
  heightMm: number;
}

export interface EasyModeRecipe {
  id: string; // stable per round+genome (used for thumbnail cache)
  label: string;

  // Depth mapping
  minDepthMm: number;
  maxDepthMm: number;
  dynamicDepth: boolean;

  // Luminance + tone mapping
  luminanceMethod: ModelGeometrySettings['luminanceMethod'];
  toneMappingMode: ModelGeometrySettings['toneMappingMode'];
  gamma?: number;
  contrast?: number;
  offset?: number;
  transferCurve?: TransferCurvePoint[];

  // Color plan
  stopStrategy: 'weighted' | 'linear';
  filamentOrderIds: string[]; // order used to distribute stops
  stops: ColorStop[];

  warnings?: string[];
}

export interface ApplyEasyModeSetupParams {
  image?: EasyModeDraftImage;
  selectedFilamentIds: string[];
  recipe: EasyModeRecipe;
}

// Default values
export const DEFAULT_MODEL_GEOMETRY: ModelGeometrySettings = {
  minDepthMm: 0.48,
  maxDepthMm: 2.24,
  gamma: 1.0,
  contrast: 1.0,
  offset: 0.0,
  smoothing: 0.0,
  spikeRemoval: 'none',
  imageFormat: 'luminance',
  detailSize: 1.0,
  luminanceMethod: 'rec601',
  toneMappingMode: 'gamma',
  transferCurve: [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.25 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.75 },
    { x: 1, y: 1 },
  ],
  dynamicDepth: false,
  invert: false,
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  layerHeightMm: 0.08,
  baseLayerMm: 0.16,
  firstLayerHeightMm: 0.16,  // Default same as baseLayerMm
  widthMm: 100,
  heightMm: 100,
  borderWidthMm: 2.0,
  borderDepthMm: 2.0,
  hasBorder: true,
  wireframePreview: false,
  transparentMode: false,
  nozzleDiameter: 0.4,
  meshResolution: 150,  // Default, will be recalculated when image loads
  meshResolutionManuallySet: false,
};

export const DEFAULT_LIGHTING: LightingSettings = {
  mode: 'backlit',
  ledTemp: 6500,
  intensity: 1.0,
};

export const DEFAULT_FILAMENTS: Filament[] = [
  {
    id: 'white',
    name: 'White',
    hexColor: '#FFFFFF',
    d50Mm: 6.0, // d95: ~6mm for white filament (very translucent)
    td: LN_20 / 6.0, // ≈ 0.5
    enabled: true,
    orderIndex: 0,
  },
  {
    id: 'gray',
    name: 'Gray',
    hexColor: '#808080',
    d50Mm: 3.0, // d95: ~3mm for gray filament
    td: LN_20 / 3.0, // ≈ 1.0
    enabled: true,
    orderIndex: 1,
  },
  {
    id: 'black',
    name: 'Black',
    hexColor: '#1A1A1A',
    d50Mm: 1.5, // d95: ~1.5mm for black filament (more opaque)
    td: LN_20 / 1.5, // ≈ 2.0
    enabled: true,
    orderIndex: 2,
  },
];

// Re-export LN_20 for use elsewhere if needed
export { LN_20 };
