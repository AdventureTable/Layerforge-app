import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjectStore } from '../stores/projectStore';

/**
 * Hook for managing image processing and mesh generation.
 * Handles debounced regeneration when model geometry changes.
 */
export function useProcessing() {
  const {
    imagePath,
    modelGeometry,
    printSettings,
    colorPlan,
    filaments,
    liveUpdate,
    isProcessing,
    setProcessing,
    setHeightmapData,
    setPreviewData,
    setMeshReady,
    setSwaps,
    initializeColorStops,
  } = useProjectStore();

  const debounceRef = useRef<number | null>(null);

  const processImage = useCallback(async () => {
    if (!imagePath) return;

    setProcessing(true);
    try {
      const response = await invoke<{
        heightmap_base64: string;
        width: number;
        height: number;
      }>('process_image', {
        request: {
          image_path: imagePath,
          geometry: {
            min_depth_mm: modelGeometry.minDepthMm,
            max_depth_mm: modelGeometry.maxDepthMm,
            gamma: modelGeometry.gamma,
            contrast: modelGeometry.contrast,
            offset: modelGeometry.offset,
            smoothing: modelGeometry.smoothing,
            spike_removal: modelGeometry.spikeRemoval,
            luminance_method: modelGeometry.luminanceMethod,
            tone_mapping_mode: modelGeometry.toneMappingMode,
            transfer_curve: modelGeometry.transferCurve,
            dynamic_depth: modelGeometry.dynamicDepth,
            invert: modelGeometry.invert,
          },
        },
      });

      setHeightmapData(
        response.heightmap_base64,
        response.width,
        response.height
      );
      setMeshReady(true);
      initializeColorStops();
    } catch (error) {
      console.error('Failed to process image:', error);
    } finally {
      setProcessing(false);
    }
  }, [
    imagePath,
    modelGeometry,
    setProcessing,
    setHeightmapData,
    setMeshReady,
    initializeColorStops,
  ]);

  const computePreview = useCallback(async () => {
    const state = useProjectStore.getState();
    if (!state.heightmapData) return;

    try {
      const response = await invoke<string>('compute_preview', {
        request: {
          heightmap_base64: state.heightmapData,
          width: state.heightmapWidth,
          height: state.heightmapHeight,
          filaments: state.filaments
            .filter((f) => f.enabled)
            .map((f) => ({
              id: f.id,
              name: f.name,
              hex_color: f.hexColor,
              td: f.td,
              enabled: f.enabled,
              order_index: f.orderIndex,
            })),
          stops: state.colorPlan.stops.map((s) => ({
            filament_id: s.filamentId,
            threshold_z_mm: s.thresholdZMm,
          })),
          geometry: {
            min_depth_mm: state.modelGeometry.minDepthMm,
            max_depth_mm: state.modelGeometry.maxDepthMm,
            gamma: state.modelGeometry.gamma,
            contrast: state.modelGeometry.contrast,
            offset: state.modelGeometry.offset,
            smoothing: state.modelGeometry.smoothing,
            spike_removal: state.modelGeometry.spikeRemoval,
            luminance_method: state.modelGeometry.luminanceMethod,
            tone_mapping_mode: state.modelGeometry.toneMappingMode,
            transfer_curve: state.modelGeometry.transferCurve,
            dynamic_depth: state.modelGeometry.dynamicDepth,
            invert: state.modelGeometry.invert,
          },
        },
      });

      setPreviewData(response);
    } catch (error) {
      console.error('Failed to compute preview:', error);
    }
  }, [setPreviewData]);

  const computeSwaps = useCallback(async () => {
    const state = useProjectStore.getState();
    if (state.colorPlan.stops.length === 0) return;

    try {
      const response = await invoke<
        Array<{ layer: number; z_mm: number; filament_id: string }>
      >('compute_swaps', {
        request: {
          stops: state.colorPlan.stops.map((s) => ({
            filament_id: s.filamentId,
            threshold_z_mm: s.thresholdZMm,
          })),
          layer_height_mm: state.printSettings.layerHeightMm,
          min_depth_mm: state.modelGeometry.minDepthMm,
          max_depth_mm: state.modelGeometry.maxDepthMm,
        },
      });

      setSwaps(
        response.map((s) => ({
          layer: s.layer,
          zMm: s.z_mm,
          filamentId: s.filament_id,
        }))
      );
    } catch (error) {
      console.error('Failed to compute swaps:', error);
    }
  }, [setSwaps]);

  const debouncedProcess = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      processImage();
    }, 250);
  }, [processImage]);

  // Auto-process when image is loaded
  useEffect(() => {
    if (imagePath && liveUpdate) {
      debouncedProcess();
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [imagePath, liveUpdate, debouncedProcess]);

  return {
    processImage,
    computePreview,
    computeSwaps,
    debouncedProcess,
    isProcessing,
  };
}
