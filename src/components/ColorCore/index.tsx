import { Box, Text, Stack } from '@mantine/core';
import { useProjectStore, useEnabledFilaments, useTotalLayers } from '../../stores/projectStore';

export function ColorCore() {
  const { modelGeometry, printSettings, colorPlan } = useProjectStore();
  const enabledFilaments = useEnabledFilaments();
  const totalLayers = useTotalLayers();

  const { minDepthMm, maxDepthMm } = modelGeometry;
  const { layerHeightMm } = printSettings;
  const depthRange = maxDepthMm - minDepthMm;

  // Create segments based on color stops
  const sortedStops = [...colorPlan.stops].sort(
    (a, b) => a.thresholdZMm - b.thresholdZMm
  );

  // Build segments
  const segments: Array<{
    filamentId: string;
    color: string;
    startMm: number;
    endMm: number;
    heightPercent: number;
  }> = [];

  let lastThreshold = minDepthMm;
  for (const stop of sortedStops) {
    const filament = enabledFilaments.find((f) => f.id === stop.filamentId);
    if (filament) {
      const startMm = lastThreshold;
      const endMm = Math.min(stop.thresholdZMm, maxDepthMm);
      const heightPercent = ((endMm - startMm) / depthRange) * 100;
      segments.push({
        filamentId: filament.id,
        color: filament.hexColor,
        startMm,
        endMm,
        heightPercent,
      });
      lastThreshold = endMm;
    }
  }

  // Generate layer marks
  const layerMarks: Array<{ layer: number; yPercent: number }> = [];
  const markStep = Math.max(1, Math.floor(totalLayers / 10)); // Show ~10 marks
  for (let i = 0; i <= totalLayers; i += markStep) {
    const zMm = i * layerHeightMm;
    if (zMm >= minDepthMm && zMm <= maxDepthMm) {
      const yPercent = ((zMm - minDepthMm) / depthRange) * 100;
      layerMarks.push({ layer: i, yPercent });
    }
  }

  return (
    <Stack h="100%" gap={0} p="xs">
      <Text size="xs" fw={600} mb="xs" ta="center" c="forge.0">
        Color Core
      </Text>

      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          gap: 4,
          minHeight: 0,
        }}
      >
        {/* Scale labels */}
        <Box
          style={{
            width: 30,
            position: 'relative',
            fontSize: 9,
            color: 'var(--mantine-color-dimmed)',
          }}
        >
          <Text size="xs" c="forge.2" style={{ position: 'absolute', top: 0, right: 4 }}>
            {maxDepthMm.toFixed(1)}
          </Text>
          <Text
            size="xs"
            c="forge.2"
            style={{ position: 'absolute', bottom: 0, right: 4 }}
          >
            {minDepthMm.toFixed(1)}
          </Text>
          {layerMarks.map(({ layer, yPercent }) => (
            <Text
              key={layer}
              size="xs"
              c="dark.1"
              style={{
                position: 'absolute',
                bottom: `${yPercent}%`,
                right: 4,
                transform: 'translateY(50%)',
              }}
            >
              L{layer}
            </Text>
          ))}
        </Box>

        {/* Color bar */}
        <Box
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column-reverse',
            borderRadius: 6,
            overflow: 'hidden',
            border: '1px solid rgba(31, 174, 122, 0.3)',
            boxShadow: '0 0 15px rgba(31, 174, 122, 0.15)',
          }}
        >
          {segments.length > 0 ? (
            segments.map((seg, i) => (
              <Box
                key={i}
                style={{
                  height: `${seg.heightPercent}%`,
                  backgroundColor: seg.color,
                  minHeight: 2,
                  boxShadow: `inset 0 0 8px rgba(0,0,0,0.3), 0 0 4px ${seg.color}40`,
                }}
                title={`${seg.startMm.toFixed(2)} - ${seg.endMm.toFixed(2)} mm`}
              />
            ))
          ) : (
            <Box
              style={{
                flex: 1,
                background:
                  'repeating-linear-gradient(45deg, #0A0D0F, #0A0D0F 10px, #0F2E26 10px, #0F2E26 20px)',
              }}
            />
          )}
        </Box>
      </Box>

      <Text size="xs" c="dark.1" ta="center" mt="xs">
        mm
      </Text>
    </Stack>
  );
}
