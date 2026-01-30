import {
  Stack,
  Text,
  NumberInput,
  Select,
  Switch,
  Group,
  Button,
  Slider,
  Box,
  Divider,
  Badge,
  Tooltip,
} from '@mantine/core';
import { useProjectStore, useRecommendedResolution, useImageResolution } from '../../stores/projectStore';
import { getResolutionStatus, calculateRecommendedResolution } from '../../types';

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export function ModelGeometry() {
  const {
    modelGeometry,
    printSettings,
    setModelGeometry,
    setPrintSettings,
    setMeshResolution,
    showResolutionChangeModal,
    liveUpdate,
    setLiveUpdate,
    lockAspectRatio,
    setLockAspectRatio,
    imageAspectRatio,
    imagePath,
    setProcessing,
    setHeightmapData,
    setMeshReady,
    initializeColorStops,
    heightmapWidth,
    heightmapHeight,
  } = useProjectStore();

  const recommendedResolution = useRecommendedResolution();
  const imageResolution = useImageResolution();
  const resolutionStatus = getResolutionStatus(
    printSettings.meshResolution,
    recommendedResolution,
    imageResolution || 1000
  );

  // Trigger regeneration only if Python sidecar is available
  const triggerRegeneration = async () => {
    if (!imagePath || !isTauri()) return;

    setProcessing(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // Get the latest state to avoid stale closure values
      const currentState = useProjectStore.getState();
      const currentGeometry = currentState.modelGeometry;
      
      const response = await invoke<{
        heightmap_base64: string;
        width: number;
        height: number;
      }>('process_image', {
        request: {
          image_path: imagePath,
          geometry: {
            min_depth_mm: currentGeometry.minDepthMm,
            max_depth_mm: currentGeometry.maxDepthMm,
            gamma: currentGeometry.gamma,
            contrast: currentGeometry.contrast,
            offset: currentGeometry.offset,
            smoothing: currentGeometry.smoothing,
            spike_removal: currentGeometry.spikeRemoval,
            invert: currentGeometry.invert,
          },
        },
      });

      setHeightmapData(
        response.heightmap_base64,
        response.width,
        response.height
      );
      setMeshReady(true);
      // Only initialize stops if none exist (preserve user's slider positions)
      const currentStops = useProjectStore.getState().colorPlan.stops;
      if (currentStops.length === 0) {
        initializeColorStops();
      }
    } catch (error) {
      // Silently ignore sidecar errors - the JS preview still works
      console.debug('Python sidecar not available, using JS preview');
    } finally {
      setProcessing(false);
    }
  };

  const handleChange = <K extends keyof typeof modelGeometry>(
    key: K,
    value: (typeof modelGeometry)[K]
  ) => {
    setModelGeometry({ [key]: value });
    if (liveUpdate) {
      triggerRegeneration();
    }
  };

  const handlePrintChange = <K extends keyof typeof printSettings>(
    key: K,
    value: (typeof printSettings)[K]
  ) => {
    setPrintSettings({ [key]: value });
    if (liveUpdate) {
      triggerRegeneration();
    }
  };

  // Check if resolution needs to change and handle modal logic
  const handleResolutionAffectingChange = (newWidthMm: number, newHeightMm: number, newNozzle?: number) => {
    const nozzle = newNozzle ?? printSettings.nozzleDiameter;
    
    if (heightmapWidth === 0 || heightmapHeight === 0) return;
    
    const newRecommended = calculateRecommendedResolution(
      newWidthMm,
      newHeightMm,
      nozzle,
      heightmapWidth,
      heightmapHeight
    );
    
    // If user has manually set resolution and it differs from new recommendation
    if (printSettings.meshResolutionManuallySet && newRecommended !== printSettings.meshResolution) {
      showResolutionChangeModal(newRecommended);
    }
  };

  // Handle width change with aspect ratio lock
  const handleWidthChange = (width: number) => {
    let newHeight = printSettings.heightMm;
    if (lockAspectRatio && imageAspectRatio > 0) {
      newHeight = Math.round(width / imageAspectRatio);
      setPrintSettings({ widthMm: width, heightMm: newHeight });
    } else {
      setPrintSettings({ widthMm: width });
    }
    handleResolutionAffectingChange(width, newHeight);
    if (liveUpdate) {
      triggerRegeneration();
    }
  };

  // Handle height change with aspect ratio lock
  const handleHeightChange = (height: number) => {
    let newWidth = printSettings.widthMm;
    if (lockAspectRatio && imageAspectRatio > 0) {
      newWidth = Math.round(height * imageAspectRatio);
      setPrintSettings({ widthMm: newWidth, heightMm: height });
    } else {
      setPrintSettings({ heightMm: height });
    }
    handleResolutionAffectingChange(newWidth, height);
    if (liveUpdate) {
      triggerRegeneration();
    }
  };

  // Handle nozzle diameter change
  const handleNozzleChange = (nozzle: number) => {
    setPrintSettings({ nozzleDiameter: nozzle });
    handleResolutionAffectingChange(printSettings.widthMm, printSettings.heightMm, nozzle);
  };

  // Handle manual resolution change
  const handleResolutionChange = (value: number) => {
    setMeshResolution(value, true); // Mark as manually set
  };

  // Get status badge color and text
  const getStatusBadge = () => {
    switch (resolutionStatus) {
      case 'optimal':
        return { color: 'forge', text: 'Optimal' };
      case 'excessive':
        return { color: 'forge.2', text: 'Excessive' };
      case 'maximum':
        return { color: 'red', text: 'Max Image' };
    }
  };
  const statusBadge = getStatusBadge();

  return (
    <Stack gap="xs" h="100%" style={{ minHeight: 0 }}>
      <Group justify="space-between" style={{ flexShrink: 0 }}>
        <Text size="xs" fw={600}>
          Model Geometry
        </Text>
        <Switch
          size="xs"
          label="Live"
          checked={liveUpdate}
          onChange={(e) => setLiveUpdate(e.currentTarget.checked)}
        />
      </Group>

      <Box style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, paddingRight: 4 }}>
        <Stack gap="xs">
          <Group gap="xs" grow>
        <NumberInput
          label="Min Depth (mm)"
          size="xs"
          value={modelGeometry.minDepthMm}
          onChange={(v) => handleChange('minDepthMm', Number(v) || 0)}
          min={0}
          max={modelGeometry.maxDepthMm - 0.1}
          step={0.04}
          decimalScale={2}
        />
        <NumberInput
          label="Max Depth (mm)"
          size="xs"
          value={modelGeometry.maxDepthMm}
          onChange={(v) => handleChange('maxDepthMm', Number(v) || 0)}
          min={modelGeometry.minDepthMm + 0.1}
          max={10}
          step={0.04}
          decimalScale={2}
        />
      </Group>

      <Group gap="xs" grow>
        <Box>
          <Text size="xs" mb={4}>
            Gamma: {modelGeometry.gamma.toFixed(2)}
          </Text>
          <Slider
            size="xs"
            value={modelGeometry.gamma}
            onChange={(v) => handleChange('gamma', v)}
            min={0.1}
            max={3}
            step={0.05}
          />
        </Box>
        <Box>
          <Text size="xs" mb={4}>
            Contrast: {modelGeometry.contrast.toFixed(2)}
          </Text>
          <Slider
            size="xs"
            value={modelGeometry.contrast}
            onChange={(v) => handleChange('contrast', v)}
            min={0.5}
            max={2}
            step={0.05}
          />
        </Box>
      </Group>

      <Group gap="xs" grow>
        <Box>
          <Text size="xs" mb={4}>
            Smoothing: {modelGeometry.smoothing.toFixed(2)}
          </Text>
          <Slider
            size="xs"
            value={modelGeometry.smoothing}
            onChange={(v) => handleChange('smoothing', v)}
            min={0}
            max={5}
            step={0.1}
          />
        </Box>
        <Select
          label="Spike Removal"
          size="xs"
          value={modelGeometry.spikeRemoval}
          onChange={(v) =>
            handleChange('spikeRemoval', v as 'none' | 'light' | 'medium' | 'strong')
          }
          data={[
            { value: 'none', label: 'None' },
            { value: 'light', label: 'Light' },
            { value: 'medium', label: 'Medium' },
            { value: 'strong', label: 'Strong' },
          ]}
        />
      </Group>

      <Group gap="xs">
        <Switch
          size="xs"
          label="Invert"
          checked={modelGeometry.invert}
          onChange={(e) => handleChange('invert', e.currentTarget.checked)}
        />
        <Switch
          size="xs"
          label="Border"
          checked={printSettings.hasBorder}
          onChange={(e) =>
            handlePrintChange('hasBorder', e.currentTarget.checked)
          }
        />
      </Group>

      <Divider />

      <Group gap="xs" align="flex-end">
        <NumberInput
          label="Width (mm)"
          size="xs"
          value={printSettings.widthMm}
          onChange={(v) => handleWidthChange(Number(v) || 100)}
          min={10}
          max={500}
          style={{ flex: 1 }}
        />
        <Button 
          size="xs" 
          variant={lockAspectRatio ? 'filled' : 'outline'}
          onClick={() => setLockAspectRatio(!lockAspectRatio)}
          style={{ height: 30, padding: '0 8px' }}
          title={lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
        >
          {lockAspectRatio ? '🔗' : '🔓'}
        </Button>
        <NumberInput
          label="Height (mm)"
          size="xs"
          value={printSettings.heightMm}
          onChange={(v) => handleHeightChange(Number(v) || 100)}
          min={10}
          max={500}
          style={{ flex: 1 }}
        />
        <NumberInput
          label="Layer (mm)"
          size="xs"
          value={printSettings.layerHeightMm}
          onChange={(v) => handlePrintChange('layerHeightMm', Number(v) || 0.08)}
          min={0.04}
          max={0.32}
          step={0.02}
          decimalScale={2}
          style={{ flex: 1 }}
        />
      </Group>

      <Divider />

      {/* Mesh Resolution Settings */}
      <Group gap="xs" align="flex-end">
        <NumberInput
          label="Nozzle (mm)"
          size="xs"
          value={printSettings.nozzleDiameter}
          onChange={(v) => handleNozzleChange(Number(v) || 0.4)}
          min={0.1}
          max={1.0}
          step={0.1}
          decimalScale={2}
          style={{ flex: 1 }}
        />
        <Box style={{ flex: 2 }}>
          <Group justify="space-between" mb={4}>
            <Text size="xs">Resolution: {printSettings.meshResolution}</Text>
            <Tooltip 
              label={
                resolutionStatus === 'optimal' 
                  ? 'Resolution matches printer capability' 
                  : resolutionStatus === 'excessive'
                  ? 'Higher than printer can reproduce'
                  : 'At maximum image resolution'
              }
            >
              <Badge size="xs" color={statusBadge.color} variant="light">
                {statusBadge.text}
              </Badge>
            </Tooltip>
          </Group>
          <Slider
            size="xs"
            value={printSettings.meshResolution}
            onChange={handleResolutionChange}
            min={50}
            max={Math.max(imageResolution || 500, 100)}
            step={10}
            marks={[
              { value: 50, label: '50' },
              { value: recommendedResolution, label: `${recommendedResolution}` },
              { value: Math.max(imageResolution || 500, 100), label: `${imageResolution || 500}` },
            ]}
          />
        </Box>
      </Group>

      <Text size="xs" c="dimmed">
        Recommended: {recommendedResolution} (based on {printSettings.nozzleDiameter}mm nozzle)
      </Text>

          {!liveUpdate && (
            <Button size="xs" onClick={triggerRegeneration}>
              Apply Changes
            </Button>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
