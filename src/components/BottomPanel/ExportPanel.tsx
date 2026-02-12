import { useEffect, useRef, useState } from 'react';
import { Stack, Text, Button } from '@mantine/core';
import { useProjectStore, depthToLayer } from '../../stores/projectStore';
import { SupportModal } from '../SupportModal';
import type { StlWorkerOutput } from '../../workers/stlWorkerTypes';

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
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState<string>('');
  const workerRef = useRef<Worker | null>(null);
  const hasImage = !!imageData;

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const handleExportSTL = async () => {
    if (!heightmapData || heightmapWidth === 0 || heightmapHeight === 0) return;

    // Cancel previous export worker
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportMessage('Starting…');
    setProcessing(true);

    const worker = new Worker(new URL('../../workers/stlWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<StlWorkerOutput>) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        setExportProgress(msg.progress);
        setExportMessage(msg.message ?? '');
        return;
      }

      if (msg.type === 'error') {
        console.error('STL export failed:', msg.error);
        setExportMessage(msg.error);
        setIsExporting(false);
        setProcessing(false);
        return;
      }

      if (msg.type === 'complete') {
        const filename = `model_depth_${modelGeometry.minDepthMm}-${modelGeometry.maxDepthMm}_lh${printSettings.layerHeightMm}.stl`;
        const blob = new Blob([msg.stlBytes], { type: 'model/stl' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        setIsExporting(false);
        setProcessing(false);
        setSupportModalOpened(true);
      }
    };

    worker.onerror = (event) => {
      console.error('STL worker error:', event.message);
      setExportMessage(event.message);
      setIsExporting(false);
      setProcessing(false);
    };

    worker.postMessage({
      heightmapBase64: heightmapData,
      heightmapWidth,
      heightmapHeight,
      printSettings: {
        widthMm: printSettings.widthMm,
        heightMm: printSettings.heightMm,
        layerHeightMm: printSettings.layerHeightMm,
        baseLayerMm: printSettings.baseLayerMm,
        hasBorder: printSettings.hasBorder,
        borderWidthMm: printSettings.borderWidthMm,
        borderDepthMm: printSettings.borderDepthMm,
        meshResolution: printSettings.meshResolution,
      },
    });
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
          disabled={!meshReady || isExporting}
          title={!meshReady ? 'Generate 3D data first' : ''}
        >
          {isExporting ? `Exporting… ${exportProgress}%` : 'Export STL'}
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
          {hasImage
            ? meshReady
              ? isExporting
                ? exportMessage || 'Exporting…'
                : 'Ready'
              : 'Processing…'
            : 'Load image first'}
        </Text>
      </Stack>

      <SupportModal 
        opened={supportModalOpened} 
        onClose={() => setSupportModalOpened(false)} 
      />
    </>
  );
}
