import { useEffect, useState } from 'react';
import { Box, Group, Stack, Text, Slider, Badge, ActionIcon } from '@mantine/core';
import { useProjectStore, useEnabledFilaments } from '../../stores/projectStore';

// Helper to determine if a color is light (for text contrast)
function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export function ColorSliders() {
  const { 
    modelGeometry, 
    printSettings, 
    colorPlan, 
    updateColorStop, 
    initializeColorStops, 
    imageData,
    reorderFilaments,
    filaments,
  } = useProjectStore();
  const enabledFilaments = useEnabledFilaments();

  const { minDepthMm, maxDepthMm } = modelGeometry;
  const { layerHeightMm } = printSettings;

  // Initialize stops when filaments change or when there are no stops
  useEffect(() => {
    if (enabledFilaments.length > 0 && colorPlan.stops.length === 0) {
      initializeColorStops();
    }
  }, [enabledFilaments.length, colorPlan.stops.length, initializeColorStops]);

  // Add missing stops for new filaments
  useEffect(() => {
    if (enabledFilaments.length === 0) return;
    
    // Check if any enabled filament is missing a stop
    const existingStopIds = new Set(colorPlan.stops.map(s => s.filamentId));
    const missingFilaments = enabledFilaments.filter(f => !existingStopIds.has(f.id));
    
    if (missingFilaments.length > 0) {
      // Add stops for missing filaments at the end (max depth)
      missingFilaments.forEach((filament, index) => {
        // Distribute new filaments at the upper end of the range
        const offset = (index + 1) * 0.01;
        updateColorStop(filament.id, maxDepthMm - offset);
      });
    }
  }, [enabledFilaments, colorPlan.stops, maxDepthMm, updateColorStop]);

  // Re-initialize when image changes
  useEffect(() => {
    if (imageData && enabledFilaments.length > 0) {
      const timer = setTimeout(() => {
        if (colorPlan.stops.length === 0) {
          initializeColorStops();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [imageData, enabledFilaments.length, colorPlan.stops.length, initializeColorStops]);

  // Get sorted stops by threshold
  const sortedStops = [...colorPlan.stops].sort(
    (a, b) => a.thresholdZMm - b.thresholdZMm
  );

  // Find min/max for clamping each slider
  const getSliderBounds = (filamentId: string) => {
    const idx = sortedStops.findIndex((s) => s.filamentId === filamentId);
    const prevStop = sortedStops[idx - 1];
    const nextStop = sortedStops[idx + 1];

    const minVal = prevStop ? prevStop.thresholdZMm + 0.01 : minDepthMm;
    const maxVal = nextStop ? nextStop.thresholdZMm - 0.01 : maxDepthMm;

    return { minVal, maxVal };
  };

  const handleSliderChange = (filamentId: string, value: number) => {
    const { minVal, maxVal } = getSliderBounds(filamentId);
    const clampedValue = Math.max(minVal, Math.min(maxVal, value));
    updateColorStop(filamentId, clampedValue);
  };

  const depthToLayer = (depth: number) => Math.round(depth / layerHeightMm);

  // Move filament up/down in order
  const moveFilament = (filamentId: string, direction: 'up' | 'down') => {
    const currentIndex = sortedStops.findIndex(s => s.filamentId === filamentId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sortedStops.length) return;

    // Get the two filaments to swap
    const currentFilamentId = sortedStops[currentIndex].filamentId;
    const targetFilamentId = sortedStops[newIndex].filamentId;
    
    // Swap their threshold values
    const currentThreshold = sortedStops[currentIndex].thresholdZMm;
    const targetThreshold = sortedStops[newIndex].thresholdZMm;
    
    updateColorStop(currentFilamentId, targetThreshold);
    updateColorStop(targetFilamentId, currentThreshold);
  };

  return (
    <Stack gap="xs" h="100%">
      <Group justify="space-between">
        <Text size="xs" fw={600}>
          Color Sliders
        </Text>
        <Text size="xs" c="dimmed">
          Use arrows to reorder
        </Text>
      </Group>

      {enabledFilaments.length === 0 ? (
        <Text size="xs" c="dimmed">
          Enable filaments to adjust color ranges
        </Text>
      ) : (
        <Box 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            overflowX: 'hidden',
            minHeight: 0,
            paddingRight: 4,
          }}
        >
          <Stack gap="xs">
            {sortedStops.map((stop, index) => {
            const filament = enabledFilaments.find(f => f.id === stop.filamentId);
            if (!filament) return null;
            
            const value = stop.thresholdZMm;
            const layer = depthToLayer(value);
            const canMoveUp = index > 0;
            const canMoveDown = index < sortedStops.length - 1;

            return (
              <Group 
                key={filament.id} 
                gap="xs" 
                wrap="nowrap" 
                align="center"
                style={{
                  borderRadius: 4,
                  padding: '4px 8px',
                  margin: '-4px -8px',
                }}
              >
                {/* Up/Down buttons */}
                <Stack gap={0} style={{ flexShrink: 0 }}>
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    disabled={!canMoveUp}
                    onClick={() => moveFilament(filament.id, 'up')}
                    style={{ height: 12 }}
                  >
                    <Text size="xs" lh={1}>▲</Text>
                  </ActionIcon>
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    disabled={!canMoveDown}
                    onClick={() => moveFilament(filament.id, 'down')}
                    style={{ height: 12 }}
                  >
                    <Text size="xs" lh={1}>▼</Text>
                  </ActionIcon>
                </Stack>

                <Box
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: filament.hexColor,
                    border: '2px solid var(--mantine-color-dark-3)',
                    flexShrink: 0,
                  }}
                />
                <Text size="xs" style={{ width: 50, flexShrink: 0 }} truncate>
                  {filament.name}
                </Text>

                <Slider
                  value={value}
                  onChange={(v) => handleSliderChange(filament.id, v)}
                  min={minDepthMm}
                  max={maxDepthMm}
                  step={layerHeightMm}
                  size="sm"
                  style={{ flex: 1, minWidth: 80 }}
                  styles={{
                    track: { 
                      backgroundColor: filament.hexColor,
                      opacity: 0.25,
                    },
                    bar: { 
                      backgroundColor: filament.hexColor,
                    },
                    thumb: {
                      backgroundColor: '#fff',
                      borderColor: filament.hexColor,
                      borderWidth: 2,
                      boxShadow: `0 0 8px ${filament.hexColor}`,
                    },
                  }}
                  label={(v) => `${v.toFixed(2)} mm`}
                />

                <Badge 
                  size="xs" 
                  radius="xl"
                  style={{ 
                    flexShrink: 0, 
                    minWidth: 60,
                    backgroundColor: filament.hexColor,
                    color: isLightColor(filament.hexColor) ? '#0A0D0F' : '#fff',
                    border: 'none',
                    fontWeight: 600,
                  }}
                >
                  {Math.round(value * 100)} MO
                </Badge>
                <Text size="xs" c="dimmed" style={{ flexShrink: 0, width: 35 }}>
                  L{layer}
                </Text>
              </Group>
            );
          })}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
