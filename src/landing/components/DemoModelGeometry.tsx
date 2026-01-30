import {
  Stack,
  Text,
  NumberInput,
  Select,
  Switch,
  Group,
  Slider,
  Box,
  Divider,
} from '@mantine/core';
import { useProjectStore } from '../../stores/projectStore';

export function DemoModelGeometry() {
  const {
    modelGeometry,
    printSettings,
    setModelGeometry,
  } = useProjectStore();

  // Only Gamma affects the preview in the demo
  const handleGammaChange = (value: number) => {
    setModelGeometry({ gamma: value });
  };

  const disabledStyle = {
    opacity: 0.4,
    pointerEvents: 'none' as const,
  };

  return (
    <Stack gap="xs" h="100%" style={{ minHeight: 0 }}>
      <Group justify="space-between" style={{ flexShrink: 0 }}>
        <Text size="xs" fw={600}>
          Model Geometry
        </Text>
        <Text size="xs" c="dimmed" fs="italic">
          Demo
        </Text>
      </Group>

      <Box style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, paddingRight: 4 }}>
        <Stack gap="xs">
          {/* Min/Max Depth - DISABLED */}
          <Group gap="xs" grow style={disabledStyle}>
            <NumberInput
              label="Min Depth (mm)"
              size="xs"
              value={modelGeometry.minDepthMm}
              disabled
              decimalScale={2}
            />
            <NumberInput
              label="Max Depth (mm)"
              size="xs"
              value={modelGeometry.maxDepthMm}
              disabled
              decimalScale={2}
            />
          </Group>

          <Group gap="xs" grow>
            {/* Gamma - ENABLED (affects preview) */}
            <Box>
              <Text size="xs" mb={4} c="forge.2" fw={500}>
                Gamma: {modelGeometry.gamma.toFixed(2)} ✓
              </Text>
              <Slider
                size="xs"
                value={modelGeometry.gamma}
                onChange={handleGammaChange}
                min={0.1}
                max={3}
                step={0.05}
                color="forge"
              />
            </Box>
            
            {/* Contrast - DISABLED */}
            <Box style={disabledStyle}>
              <Text size="xs" mb={4}>
                Contrast: {modelGeometry.contrast.toFixed(2)}
              </Text>
              <Slider
                size="xs"
                value={modelGeometry.contrast}
                disabled
                min={0.5}
                max={2}
                step={0.05}
              />
            </Box>
          </Group>

          {/* Smoothing & Spike Removal - DISABLED */}
          <Group gap="xs" grow style={disabledStyle}>
            <Box>
              <Text size="xs" mb={4}>
                Smoothing: {modelGeometry.smoothing.toFixed(2)}
              </Text>
              <Slider
                size="xs"
                value={modelGeometry.smoothing}
                disabled
                min={0}
                max={5}
                step={0.1}
              />
            </Box>
            <Select
              label="Spike Removal"
              size="xs"
              value={modelGeometry.spikeRemoval}
              disabled
              data={[
                { value: 'none', label: 'None' },
                { value: 'light', label: 'Light' },
                { value: 'medium', label: 'Medium' },
                { value: 'strong', label: 'Strong' },
              ]}
            />
          </Group>

          {/* Invert & Border - DISABLED */}
          <Group gap="xs" style={disabledStyle}>
            <Switch
              size="xs"
              label="Invert"
              checked={modelGeometry.invert}
              disabled
            />
            <Switch
              size="xs"
              label="Border"
              checked={printSettings.hasBorder}
              disabled
            />
          </Group>

          <Divider />

          {/* Width/Height/Layer - DISABLED */}
          <Group gap="xs" align="flex-end" style={disabledStyle}>
            <NumberInput
              label="Width (mm)"
              size="xs"
              value={printSettings.widthMm}
              disabled
              style={{ flex: 1 }}
            />
            <NumberInput
              label="Height (mm)"
              size="xs"
              value={printSettings.heightMm}
              disabled
              style={{ flex: 1 }}
            />
            <NumberInput
              label="Layer (mm)"
              size="xs"
              value={printSettings.layerHeightMm}
              disabled
              decimalScale={2}
              style={{ flex: 1 }}
            />
          </Group>

          {/* Info message */}
          <Box 
            p="xs" 
            style={{ 
              backgroundColor: 'rgba(31, 174, 122, 0.1)',
              borderRadius: 6,
              border: '1px solid rgba(31, 174, 122, 0.2)',
            }}
          >
            <Text size="xs" c="forge.2" ta="center">
              Solo <strong>Gamma</strong> afecta al preview.
              <br />
              El resto se aplica al exportar.
            </Text>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
}
