import { useMemo } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  ProjectState,
  Filament,
  ModelGeometrySettings,
  PrintSettings,
  ColorPlanSettings,
  LightingSettings,
  ColorStop,
  SwapEntry,
  ApplyEasyModeSetupParams,
} from '../types';
import {
  DEFAULT_MODEL_GEOMETRY,
  DEFAULT_PRINT_SETTINGS,
  DEFAULT_LIGHTING,
  DEFAULT_FILAMENTS,
  calculateRecommendedResolution,
  calculateTdFromD50,
  calculateD50FromTd,
} from '../types';

// localStorage key for persisting filaments
const FILAMENTS_STORAGE_KEY = 'layerforge-filaments';

// Load saved filaments from localStorage
const loadSavedFilaments = (): Filament[] => {
  try {
    const saved = localStorage.getItem(FILAMENTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load saved filaments:', error);
  }
  return DEFAULT_FILAMENTS;
};

// Save filaments to localStorage
const saveFilaments = (filaments: Filament[]) => {
  try {
    localStorage.setItem(FILAMENTS_STORAGE_KEY, JSON.stringify(filaments));
  } catch (error) {
    console.warn('Failed to save filaments:', error);
  }
};

// Extended state for resolution change modal
interface ResolutionModalState {
  showResolutionModal: boolean;
  pendingResolutionChange: number | null;
}

interface EasyModeWizardState {
  easyModeWizardOpen: boolean;
}

interface HeightmapProcessingState {
  heightmapRecomputeNonce: number;
}

interface ProjectActions {
  // Image actions
  setImage: (path: string, data: string) => void;
  clearImage: () => void;

  // Filament actions
  addFilament: (filament: Filament) => void;
  updateFilament: (id: string, updates: Partial<Filament>) => void;
  removeFilament: (id: string) => void;
  toggleFilament: (id: string) => void;
  reorderFilaments: (filaments: Filament[]) => void;
  replaceFilaments: (
    filaments: Filament[],
    resetStops?: 'if_invalid' | 'always' | 'never'
  ) => void;

  // Settings actions
  setModelGeometry: (settings: Partial<ModelGeometrySettings>) => void;
  setPrintSettings: (settings: Partial<PrintSettings>) => void;
  setColorPlan: (settings: Partial<ColorPlanSettings>) => void;
  setLighting: (settings: Partial<LightingSettings>) => void;

  // Mesh resolution actions
  setMeshResolution: (value: number, manual?: boolean) => void;
  updateMeshResolutionFromSettings: () => void;
  showResolutionChangeModal: (newRecommended: number) => void;
  hideResolutionChangeModal: () => void;
  acceptPendingResolution: () => void;
  rejectPendingResolution: () => void;

  // Color stops actions
  updateColorStop: (filamentId: string, thresholdZMm: number) => void;
  initializeColorStops: () => void;

  // Processing state
  setHeightmapData: (data: string, width: number, height: number) => void;
  setPreviewData: (data: string) => void;
  setMeshReady: (ready: boolean) => void;
  setSwaps: (swaps: SwapEntry[]) => void;
  setProcessing: (processing: boolean) => void;
  requestHeightmapRecompute: () => void;

  // UI state
  setActiveView: (view: 'image' | 'preview' | '3d') => void;
  setLiveUpdate: (enabled: boolean) => void;
  setLockAspectRatio: (locked: boolean) => void;
  setImageAspectRatio: (ratio: number) => void;
  markDirty: () => void;
  markClean: () => void;

  // Easy Mode wizard
  openEasyModeWizard: () => void;
  closeEasyModeWizard: () => void;
  applyEasyModeSetup: (params: ApplyEasyModeSetupParams) => void;

  // Project actions
  resetProject: () => void;
  loadProject: (state: Partial<ProjectState>) => void;
  getProjectJSON: () => string;
}

type ProjectStore = ProjectState & ProjectActions & ResolutionModalState & EasyModeWizardState & HeightmapProcessingState;

const initialState: ProjectState &
  ResolutionModalState &
  EasyModeWizardState &
  HeightmapProcessingState = {
  imagePath: null,
  imageData: null,
  imageAspectRatio: 1,
  filaments: loadSavedFilaments(),
  modelGeometry: DEFAULT_MODEL_GEOMETRY,
  printSettings: DEFAULT_PRINT_SETTINGS,
  colorPlan: {
    mode: 'transmission',
    stops: [],
  },
  lighting: DEFAULT_LIGHTING,
  heightmapData: null,
  heightmapWidth: 0,
  heightmapHeight: 0,
  previewData: null,
  meshReady: false,
  swaps: [],
  isDirty: false,
  isProcessing: false,
  liveUpdate: true,
  lockAspectRatio: true,
  activeView: 'image',
  // Resolution modal state
  showResolutionModal: false,
  pendingResolutionChange: null,
  // Easy Mode wizard
  easyModeWizardOpen: false,
  heightmapRecomputeNonce: 0,
};

export const useProjectStore = create<ProjectStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Image actions
    setImage: (path, data) =>
      set((state) => {
        // Reset color stops when loading a new image
        const enabledFilaments = state.filaments
          .filter((f) => f.enabled)
          .sort((a, b) => a.orderIndex - b.orderIndex);
        
        const { minDepthMm, maxDepthMm } = state.modelGeometry;
        const range = maxDepthMm - minDepthMm;
        const step = range / (enabledFilaments.length || 1);
        
        const stops = enabledFilaments.map((f, i) => ({
          filamentId: f.id,
          thresholdZMm: minDepthMm + step * (i + 1),
        }));

        return {
          imagePath: path,
          imageData: data,
          isDirty: true,
          meshReady: false,
          colorPlan: { ...state.colorPlan, stops },
          // Reset mesh resolution manual flag when loading new image
          printSettings: {
            ...state.printSettings,
            meshResolutionManuallySet: false,
          },
        };
      }),

    clearImage: () =>
      set({
        imagePath: null,
        imageData: null,
        heightmapData: null,
        previewData: null,
        meshReady: false,
        isDirty: true,
      }),

    // Filament actions
    addFilament: (filament) =>
      set((state) => ({
        filaments: [...state.filaments, filament],
        isDirty: true,
      })),

    updateFilament: (id, updates) =>
      set((state) => ({
        filaments: state.filaments.map((f) =>
          f.id === id ? { ...f, ...updates } : f
        ),
        isDirty: true,
      })),

    removeFilament: (id) =>
      set((state) => ({
        filaments: state.filaments.filter((f) => f.id !== id),
        colorPlan: {
          ...state.colorPlan,
          stops: state.colorPlan.stops.filter((s) => s.filamentId !== id),
        },
        isDirty: true,
      })),

    toggleFilament: (id) =>
      set((state) => ({
        filaments: state.filaments.map((f) =>
          f.id === id ? { ...f, enabled: !f.enabled } : f
        ),
        isDirty: true,
      })),

    reorderFilaments: (filaments) =>
      set({
        filaments: filaments.map((f, i) => ({ ...f, orderIndex: i })),
        isDirty: true,
      }),

    replaceFilaments: (filaments, resetStops = 'if_invalid') =>
      set((state) => {
        const seenIds = new Map<string, number>();

        const normalized = (filaments ?? [])
          .map((raw, index) => {
            const baseId =
              typeof raw?.id === 'string' && raw.id.trim()
                ? raw.id.trim()
                : `imported_${index}`;
            const count = seenIds.get(baseId) ?? 0;
            seenIds.set(baseId, count + 1);
            const id = count === 0 ? baseId : `${baseId}_${count + 1}`;

            const tdCandidate =
              typeof (raw as any)?.td === 'number' && Number.isFinite((raw as any).td)
                ? (raw as any).td
                : null;
            const d50Candidate =
              typeof (raw as any)?.d50Mm === 'number' && Number.isFinite((raw as any).d50Mm)
                ? (raw as any).d50Mm
                : null;

            const d50Mm =
              d50Candidate && d50Candidate > 0
                ? d50Candidate
                : tdCandidate && tdCandidate > 0
                  ? calculateD50FromTd(tdCandidate)
                  : 0.85;
            const td =
              tdCandidate && tdCandidate > 0 ? tdCandidate : calculateTdFromD50(d50Mm);

            return {
              ...raw,
              id,
              name:
                typeof raw?.name === 'string' && raw.name.trim()
                  ? raw.name.trim()
                  : baseId,
              hexColor: (() => {
                const rawHex =
                  typeof raw?.hexColor === 'string' && raw.hexColor.trim()
                    ? raw.hexColor.trim()
                    : '';
                const withHash = rawHex.startsWith('#') ? rawHex : `#${rawHex}`;
                return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : '#FFFFFF';
              })(),
              d50Mm,
              td,
              enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : true,
              orderIndex:
                typeof raw?.orderIndex === 'number' && Number.isFinite(raw.orderIndex)
                  ? raw.orderIndex
                  : index,
            } as Filament;
          })
          .map((f, i) => ({ f, i }))
          .sort((a, b) => (a.f.orderIndex - b.f.orderIndex) || (a.i - b.i))
          .map((entry, idx) => ({ ...entry.f, orderIndex: idx }));

        const shouldResetStops = (() => {
          if (resetStops === 'always') return true;
          if (resetStops === 'never') return false;

          const stops = state.colorPlan.stops;
          if (!Array.isArray(stops) || stops.length === 0) return true;

          const idSet = new Set(normalized.map((f) => f.id));
          for (const stop of stops) {
            if (!idSet.has(stop.filamentId)) return true;
          }

          const enabledSet = new Set(normalized.filter((f) => f.enabled).map((f) => f.id));
          const stopIdSet = new Set(stops.map((s) => s.filamentId));

          if (enabledSet.size !== stopIdSet.size) return true;
          for (const id of enabledSet) {
            if (!stopIdSet.has(id)) return true;
          }
          return false;
        })();

        const nextStops = (() => {
          if (!shouldResetStops) return state.colorPlan.stops;

          const enabledFilaments = normalized
            .filter((f) => f.enabled)
            .sort((a, b) => a.orderIndex - b.orderIndex);
          if (enabledFilaments.length === 0) return [];

          const { minDepthMm, maxDepthMm } = state.modelGeometry;
          const range = maxDepthMm - minDepthMm;
          const step = range / enabledFilaments.length;

          return enabledFilaments.map((f, i) => ({
            filamentId: f.id,
            thresholdZMm: minDepthMm + step * (i + 1),
          }));
        })();

        return {
          filaments: normalized,
          colorPlan: { ...state.colorPlan, stops: nextStops },
          isDirty: true,
        };
      }),

    // Settings actions
    setModelGeometry: (settings) =>
      set((state) => ({
        modelGeometry: { ...state.modelGeometry, ...settings },
        isDirty: true,
        meshReady: false,
      })),

    setPrintSettings: (settings) =>
      set((state) => {
        const newSettings = { ...state.printSettings, ...settings };
        
        // Check if resolution-affecting fields changed
        const resolutionAffectingFields: (keyof PrintSettings)[] = ['widthMm', 'heightMm', 'nozzleDiameter'];
        const affectsResolution = resolutionAffectingFields.some(
          field => settings[field] !== undefined && settings[field] !== state.printSettings[field]
        );
        
        let showResolutionModal = state.showResolutionModal;
        let pendingResolutionChange = state.pendingResolutionChange;

        // Auto-update mesh resolution when possible (web UX):
        // - If the user hasn't manually set it, keep it synced to the recommendation.
        // - If the user HAS manually set it, surface the resolution change modal.
        if (affectsResolution && state.heightmapWidth > 0 && state.heightmapHeight > 0) {
          const recommended = calculateRecommendedResolution(
            newSettings.widthMm,
            newSettings.heightMm,
            newSettings.nozzleDiameter,
            state.heightmapWidth,
            state.heightmapHeight
          );

          if (!state.printSettings.meshResolutionManuallySet) {
            newSettings.meshResolution = recommended;
            newSettings.meshResolutionManuallySet = false;
          } else if (recommended !== state.printSettings.meshResolution) {
            showResolutionModal = true;
            pendingResolutionChange = recommended;
          }
        }
        
        return {
          printSettings: newSettings,
          isDirty: true,
          // Print settings do not affect the heightmap; keep current readiness.
          meshReady: state.meshReady,
          showResolutionModal,
          pendingResolutionChange,
        };
      }),

    // Mesh resolution actions
    setMeshResolution: (value, manual = false) =>
      set((state) => ({
        printSettings: {
          ...state.printSettings,
          meshResolution: value,
          meshResolutionManuallySet: manual ? true : state.printSettings.meshResolutionManuallySet,
        },
        isDirty: true,
      })),

    updateMeshResolutionFromSettings: () =>
      set((state) => {
        const { widthMm, heightMm, nozzleDiameter } = state.printSettings;
        const { heightmapWidth, heightmapHeight } = state;
        
        if (heightmapWidth === 0 || heightmapHeight === 0) {
          return state; // No image loaded
        }
        
        const recommended = calculateRecommendedResolution(
          widthMm,
          heightMm,
          nozzleDiameter,
          heightmapWidth,
          heightmapHeight
        );
        
        return {
          printSettings: {
            ...state.printSettings,
            meshResolution: recommended,
            meshResolutionManuallySet: false,
          },
        };
      }),

    showResolutionChangeModal: (newRecommended) =>
      set({
        showResolutionModal: true,
        pendingResolutionChange: newRecommended,
      }),

    hideResolutionChangeModal: () =>
      set({
        showResolutionModal: false,
        pendingResolutionChange: null,
      }),

    acceptPendingResolution: () =>
      set((state) => ({
        printSettings: {
          ...state.printSettings,
          meshResolution: state.pendingResolutionChange ?? state.printSettings.meshResolution,
          meshResolutionManuallySet: false,
        },
        showResolutionModal: false,
        pendingResolutionChange: null,
      })),

    rejectPendingResolution: () =>
      set({
        showResolutionModal: false,
        pendingResolutionChange: null,
      }),

    setColorPlan: (settings) =>
      set((state) => ({
        colorPlan: { ...state.colorPlan, ...settings },
        isDirty: true,
      })),

    setLighting: (settings) =>
      set((state) => ({
        lighting: { ...state.lighting, ...settings },
      })),

    // Color stops actions
    updateColorStop: (filamentId, thresholdZMm) =>
      set((state) => {
        const existingIndex = state.colorPlan.stops.findIndex(
          (s) => s.filamentId === filamentId
        );
        let newStops: ColorStop[];

        if (existingIndex >= 0) {
          newStops = state.colorPlan.stops.map((s) =>
            s.filamentId === filamentId ? { ...s, thresholdZMm } : s
          );
        } else {
          newStops = [...state.colorPlan.stops, { filamentId, thresholdZMm }];
        }

        // Sort stops by threshold
        newStops.sort((a, b) => a.thresholdZMm - b.thresholdZMm);

        return {
          colorPlan: { ...state.colorPlan, stops: newStops },
          isDirty: true,
        };
      }),

    initializeColorStops: () =>
      set((state) => {
        const enabledFilaments = state.filaments
          .filter((f) => f.enabled)
          .sort((a, b) => a.orderIndex - b.orderIndex);

        if (enabledFilaments.length === 0) return state;

        const { minDepthMm, maxDepthMm } = state.modelGeometry;
        const range = maxDepthMm - minDepthMm;
        const step = range / enabledFilaments.length;

        const stops: ColorStop[] = enabledFilaments.map((f, i) => ({
          filamentId: f.id,
          thresholdZMm: minDepthMm + step * (i + 1),
        }));

        return {
          colorPlan: { ...state.colorPlan, stops },
        };
      }),

    // Processing state
    setHeightmapData: (data, width, height) =>
      set((state) => {
        // Recalculate mesh resolution if not manually set
        let newResolution = state.printSettings.meshResolution;
        if (!state.printSettings.meshResolutionManuallySet) {
          newResolution = calculateRecommendedResolution(
            state.printSettings.widthMm,
            state.printSettings.heightMm,
            state.printSettings.nozzleDiameter,
            width,
            height
          );
        }
        
        return {
          heightmapData: data,
          heightmapWidth: width,
          heightmapHeight: height,
          printSettings: {
            ...state.printSettings,
            meshResolution: newResolution,
          },
        };
      }),

    setPreviewData: (data) => set({ previewData: data }),

    setMeshReady: (ready) => set({ meshReady: ready }),

    setSwaps: (swaps) => set({ swaps }),

    setProcessing: (processing) => set({ isProcessing: processing }),

    requestHeightmapRecompute: () =>
      set((state) => ({
        heightmapRecomputeNonce: state.heightmapRecomputeNonce + 1,
      })),

    // UI state
    setActiveView: (view) => set({ activeView: view }),

    setLiveUpdate: (enabled) => set({ liveUpdate: enabled }),

    setLockAspectRatio: (locked) => set({ lockAspectRatio: locked }),

    setImageAspectRatio: (ratio) => set({ imageAspectRatio: ratio }),

    markDirty: () => set({ isDirty: true }),

    markClean: () => set({ isDirty: false }),

    // Easy Mode wizard
    openEasyModeWizard: () => set({ easyModeWizardOpen: true }),

    closeEasyModeWizard: () => set({ easyModeWizardOpen: false }),

    applyEasyModeSetup: (params) =>
      set((state) => {
        const selectedSet = new Set(params.selectedFilamentIds);

        // Ensure a stable, valid selected order
        const currentFilamentIds = new Set(state.filaments.map((f) => f.id));
        const recipeOrderUnique: string[] = [];
        const seen = new Set<string>();
        for (const id of params.recipe.filamentOrderIds) {
          if (seen.has(id)) continue;
          seen.add(id);
          if (!selectedSet.has(id)) continue;
          if (!currentFilamentIds.has(id)) continue;
          recipeOrderUnique.push(id);
        }

        const selectedIdsStable = params.selectedFilamentIds.filter((id) => currentFilamentIds.has(id));
        const missingSelected = selectedIdsStable.filter((id) => !recipeOrderUnique.includes(id));
        const finalSelectedOrder = [...recipeOrderUnique, ...missingSelected];

        const restIds = [...state.filaments]
          .filter((f) => !selectedSet.has(f.id))
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((f) => f.id);

        const finalOrderIds = [...finalSelectedOrder, ...restIds];
        const byId = new Map(state.filaments.map((f) => [f.id, f]));

        const newFilaments: Filament[] = finalOrderIds
          .map((id, orderIndex) => {
            const f = byId.get(id);
            if (!f) return null;
            return {
              ...f,
              enabled: selectedSet.has(id),
              orderIndex,
            };
          })
          .filter((v): v is Filament => v !== null);

        const recipe = params.recipe;

        const nextGeometry: ModelGeometrySettings = {
          ...state.modelGeometry,
          minDepthMm: recipe.minDepthMm,
          maxDepthMm: recipe.maxDepthMm,
          dynamicDepth: recipe.dynamicDepth,
          luminanceMethod: recipe.luminanceMethod,
          toneMappingMode: recipe.toneMappingMode,
          gamma: recipe.toneMappingMode === 'gamma' ? recipe.gamma ?? 1.0 : 1.0,
          contrast: recipe.toneMappingMode === 'gamma' ? recipe.contrast ?? 1.0 : 1.0,
          offset: recipe.toneMappingMode === 'gamma' ? recipe.offset ?? 0.0 : 0.0,
          transferCurve:
            recipe.toneMappingMode === 'curve'
              ? recipe.transferCurve ?? state.modelGeometry.transferCurve
              : state.modelGeometry.transferCurve,
        };

        const nextPrintSettings = params.image
          ? {
              ...state.printSettings,
              widthMm: params.image.widthMm,
              heightMm: params.image.heightMm,
            }
          : state.printSettings;

        return {
          // Image (optional)
          ...(params.image
            ? {
                imagePath: params.image.path,
                imageData: params.image.dataUrl,
                imageAspectRatio: params.image.aspectRatio,
              }
            : null),

          filaments: newFilaments,
          modelGeometry: nextGeometry,
          printSettings: nextPrintSettings,
          colorPlan: {
            ...state.colorPlan,
            stops: recipe.stops,
          },

          // Clear derived artifacts to avoid stale mesh/preview data
          heightmapData: null,
          heightmapWidth: 0,
          heightmapHeight: 0,
          previewData: null,
          meshReady: false,

          activeView: 'preview',
          isDirty: true,
          heightmapRecomputeNonce: state.heightmapRecomputeNonce + 1,
        };
      }),

    // Project actions
    resetProject: () => set(initialState),

    loadProject: (state) =>
      set((current) => {
        const loadedStops = state.colorPlan?.stops;
        const loadedMode = state.colorPlan?.mode;

        return {
          ...current,
          ...state,
          modelGeometry: {
            ...DEFAULT_MODEL_GEOMETRY,
            ...(state.modelGeometry ?? {}),
          },
          printSettings: {
            ...DEFAULT_PRINT_SETTINGS,
            ...(state.printSettings ?? {}),
          },
          lighting: {
            ...DEFAULT_LIGHTING,
            ...(state.lighting ?? {}),
          },
          colorPlan: {
            mode: loadedMode ?? 'transmission',
            stops: Array.isArray(loadedStops) ? loadedStops : [],
          },
          // Clear derived artifacts (always recompute in web)
          heightmapData: null,
          heightmapWidth: 0,
          heightmapHeight: 0,
          previewData: null,
          meshReady: false,
          // Force recompute even if image/settings match previous session
          heightmapRecomputeNonce: current.heightmapRecomputeNonce + 1,
          isDirty: false,
        };
      }),

    getProjectJSON: () => {
      const state = get();
      const project = {
        imagePath: state.imagePath,
        imageData: state.imageData,
        imageAspectRatio: state.imageAspectRatio,
        filaments: state.filaments,
        modelGeometry: state.modelGeometry,
        printSettings: state.printSettings,
        colorPlan: state.colorPlan,
        lighting: state.lighting,
      };
      return JSON.stringify(project, null, 2);
    },
  }))
);

// Subscribe to filament changes and persist to localStorage
useProjectStore.subscribe(
  (state) => state.filaments,
  (filaments) => {
    saveFilaments(filaments);
  }
);

// Selector hooks for derived state
export const useEnabledFilaments = () => {
  const filaments = useProjectStore((state) => state.filaments);
  return useMemo(
    () =>
      filaments
        .filter((f) => f.enabled)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [filaments]
  );
};

export const useActualDepth = () =>
  useProjectStore(
    (state) => state.modelGeometry.maxDepthMm - state.modelGeometry.minDepthMm
  );

// Helper function to convert depth (in mm) to layer number
// Accounts for first layer having different height than subsequent layers
export const depthToLayer = (
  depthMm: number,
  firstLayerHeightMm: number,
  layerHeightMm: number
): number => {
  if (depthMm <= 0) return 0;
  if (depthMm <= firstLayerHeightMm) return 1;
  
  // Calculate remaining height after first layer
  const remainingHeight = depthMm - firstLayerHeightMm;
  const additionalLayers = remainingHeight / layerHeightMm;
  
  // Round to handle floating point precision (e.g., 28.000000000000004 -> 28)
  // Only round if very close to an integer (within 0.0001)
  const roundedLayers = Math.abs(additionalLayers - Math.round(additionalLayers)) < 0.0001
    ? Math.round(additionalLayers)
    : Math.ceil(additionalLayers);
  
  return 1 + roundedLayers;
};

// Helper function to convert layer number to Z height in the model
// Inverse of depthToLayer
export const layerToModelZ = (
  layer: number,
  firstLayerHeightMm: number,
  layerHeightMm: number
): number => {
  if (layer <= 0) return 0;
  if (layer === 1) return firstLayerHeightMm;
  return firstLayerHeightMm + (layer - 1) * layerHeightMm;
};

// Calculate total model height (includes baseLayerMm added during mesh generation)
// When border is enabled, total height is the max of relief height and border height
export const useTotalModelHeight = () =>
  useProjectStore((state) => {
    const { maxDepthMm } = state.modelGeometry;
    const { baseLayerMm, hasBorder, borderDepthMm } = state.printSettings;
    
    const reliefHeight = maxDepthMm + baseLayerMm;
    const borderHeight = hasBorder ? borderDepthMm + baseLayerMm : 0;
    
    return Math.max(reliefHeight, borderHeight);
  });

export const useTotalLayers = () =>
  useProjectStore((state) => {
    const { maxDepthMm } = state.modelGeometry;
    const { baseLayerMm, hasBorder, borderDepthMm, firstLayerHeightMm, layerHeightMm } = state.printSettings;
    
    // Total height is the max of relief and border (when enabled)
    const reliefHeight = maxDepthMm + baseLayerMm;
    const borderHeight = hasBorder ? borderDepthMm + baseLayerMm : 0;
    const totalHeight = Math.max(reliefHeight, borderHeight);
    
    // Fallback for firstLayerHeightMm if not set (for backwards compatibility)
    // Default to baseLayerMm which is typically 0.16mm (same as default firstLayerHeightMm)
    const firstLayer = firstLayerHeightMm ?? baseLayerMm;
    
    return depthToLayer(totalHeight, firstLayer, layerHeightMm);
  });

// Selector for recommended mesh resolution
export const useRecommendedResolution = () => {
  const widthMm = useProjectStore((state) => state.printSettings.widthMm);
  const heightMm = useProjectStore((state) => state.printSettings.heightMm);
  const nozzleDiameter = useProjectStore((state) => state.printSettings.nozzleDiameter);
  const heightmapWidth = useProjectStore((state) => state.heightmapWidth);
  const heightmapHeight = useProjectStore((state) => state.heightmapHeight);
  
  return useMemo(() => {
    if (heightmapWidth === 0 || heightmapHeight === 0) {
      return 150; // Default when no image
    }
    return calculateRecommendedResolution(
      widthMm,
      heightMm,
      nozzleDiameter,
      heightmapWidth,
      heightmapHeight
    );
  }, [widthMm, heightMm, nozzleDiameter, heightmapWidth, heightmapHeight]);
};

// Selector for image resolution (max dimension)
export const useImageResolution = () => {
  const heightmapWidth = useProjectStore((state) => state.heightmapWidth);
  const heightmapHeight = useProjectStore((state) => state.heightmapHeight);
  return Math.max(heightmapWidth, heightmapHeight);
};
