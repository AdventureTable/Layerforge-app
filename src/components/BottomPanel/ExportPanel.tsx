import { useState } from 'react';
import { Stack, Text, Button } from '@mantine/core';
import { useProjectStore, depthToLayer } from '../../stores/projectStore';
import { SupportModal } from '../SupportModal';

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export function ExportPanel() {
  const {
    modelGeometry,
    printSettings,
    filaments,
    colorPlan,
    imageData,
    heightmapData,
    heightmapWidth,
    heightmapHeight,
    meshReady,
    setProcessing,
  } = useProjectStore();
  
  const [supportModalOpened, setSupportModalOpened] = useState(false);
  const hasImage = !!imageData;

  const handleExportSTL = async () => {
    if (!isTauri()) {
      alert('STL export requires the desktop app with Python sidecar');
      return;
    }
    
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      
      const path = await save({
        filters: [{ name: 'STL File', extensions: ['stl'] }],
        defaultPath: `model_depth_${modelGeometry.minDepthMm}-${modelGeometry.maxDepthMm}_lh${printSettings.layerHeightMm}.stl`,
      });

      if (path && heightmapData) {
        setProcessing(true);
        await invoke('export_stl', {
          request: {
            heightmap_base64: heightmapData,
            width: heightmapWidth,
            height: heightmapHeight,
            geometry: {
              min_depth_mm: modelGeometry.minDepthMm,
              max_depth_mm: modelGeometry.maxDepthMm,
              gamma: modelGeometry.gamma,
              contrast: modelGeometry.contrast,
              offset: modelGeometry.offset,
              smoothing: modelGeometry.smoothing,
              spike_removal: modelGeometry.spikeRemoval,
              invert: modelGeometry.invert,
            },
            print_settings: {
              layer_height_mm: printSettings.layerHeightMm,
              base_layer_mm: printSettings.baseLayerMm,
              width_mm: printSettings.widthMm,
              height_mm: printSettings.heightMm,
              border_width_mm: printSettings.borderWidthMm,
              border_depth_mm: printSettings.borderDepthMm,
              has_border: printSettings.hasBorder,
              mesh_resolution: printSettings.meshResolution,
            },
          },
          outputPath: path,
        });
        setProcessing(false);
        // Show support modal after successful export
        setSupportModalOpened(true);
      }
    } catch (error) {
      console.error('Failed to export STL:', error);
      setProcessing(false);
    }
  };

  const handleExportPlan = async (format: 'txt' | 'json') => {
    // Compute swaps from color plan
    // Add baseLayerMm to threshold since mesh generation adds it to depths
    // Fallback firstLayerHeightMm to baseLayerMm for backwards compatibility
    const firstLayer = printSettings.firstLayerHeightMm ?? printSettings.baseLayerMm;
    const swapEntries = colorPlan.stops.map((stop) => {
      const zInModel = stop.thresholdZMm + printSettings.baseLayerMm;
      const layer = depthToLayer(zInModel, firstLayer, printSettings.layerHeightMm);
      const filament = filaments.find(f => f.id === stop.filamentId);
      return {
        layer,
        z_mm: zInModel,
        filament_id: stop.filamentId,
        filament_name: filament?.name || stop.filamentId,
      };
    });

    const planData = {
      version: '1.0',
      generator: 'Layerforge',
      print_settings: {
        width_mm: printSettings.widthMm,
        height_mm: printSettings.heightMm,
        layer_height_mm: printSettings.layerHeightMm,
        first_layer_height_mm: printSettings.firstLayerHeightMm,
        base_layer_mm: printSettings.baseLayerMm,
        has_border: printSettings.hasBorder,
        border_width_mm: printSettings.borderWidthMm,
        border_depth_mm: printSettings.borderDepthMm,
      },
      geometry: {
        min_depth_mm: modelGeometry.minDepthMm,
        max_depth_mm: modelGeometry.maxDepthMm,
        gamma: modelGeometry.gamma,
        contrast: modelGeometry.contrast,
      },
      filaments: filaments.filter(f => f.enabled).map(f => ({
        id: f.id,
        name: f.name,
        hex_color: f.hexColor,
        td: f.td,
      })),
      swaps: swapEntries,
    };

    if (format === 'json') {
      const json = JSON.stringify(planData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'print_plan.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Generate TXT format
      const lines = [
        '=' .repeat(40),
        'CHEAPFORGE PRINT PLAN',
        '='.repeat(40),
        '',
        'MODEL SETTINGS',
        '-'.repeat(20),
        `Dimensions: ${printSettings.widthMm} x ${printSettings.heightMm} mm`,
        `Depth Range: ${modelGeometry.minDepthMm} - ${modelGeometry.maxDepthMm} mm`,
        `Layer Height: ${printSettings.layerHeightMm} mm`,
        `First Layer Height: ${printSettings.firstLayerHeightMm} mm`,
        '',
        'FILAMENTS',
        '-'.repeat(20),
        ...filaments.filter(f => f.enabled).map((f, i) => 
          `${i + 1}. ${f.name} (${f.hexColor}, Td=${f.td})`
        ),
        '',
        'SWAP PLAN',
        '-'.repeat(20),
        ...swapEntries.map(s => 
          `Layer ${s.layer} (${s.z_mm.toFixed(2)} mm): ${s.filament_name}`
        ),
        '',
        '='.repeat(40),
      ];
      const txt = lines.join('\n');
      const blob = new Blob([txt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'print_plan.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <>
      <Stack gap="xs" h="100%">
        <Text size="xs" fw={600}>
          Export
        </Text>

        <Button
          size="xs"
          fullWidth
          onClick={handleExportSTL}
          disabled={!meshReady}
          title={!meshReady ? 'Requires Python sidecar' : ''}
        >
          Export STL
        </Button>

        <Button
          size="xs"
          variant="light"
          fullWidth
          onClick={() => handleExportPlan('txt')}
          disabled={!hasImage || colorPlan.stops.length === 0}
        >
          Export Plan (TXT)
        </Button>

        <Button
          size="xs"
          variant="light"
          fullWidth
          onClick={() => handleExportPlan('json')}
          disabled={!hasImage || colorPlan.stops.length === 0}
        >
          Export Plan (JSON)
        </Button>

        <Text size="xs" c="dimmed" mt="auto">
          {hasImage ? (meshReady ? 'Ready' : 'Preview mode') : 'Load image first'}
        </Text>
      </Stack>

      <SupportModal 
        opened={supportModalOpened} 
        onClose={() => setSupportModalOpened(false)} 
      />
    </>
  );
}
