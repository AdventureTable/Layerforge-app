import { Box, Group, Divider } from '@mantine/core';
import { ColorSliders } from '../ColorSliders';
import { ModelGeometry } from '../ModelGeometry';
import { ExportPanel } from './ExportPanel';

export function BottomPanel() {
  return (
    <Box
      h="100%"
      p="xs"
      style={{ borderTop: '1px solid rgba(31, 174, 122, 0.2)' }}
    >
      <Group gap="md" h="100%" wrap="nowrap" align="stretch">
        {/* Color Sliders - takes most space */}
        <Box style={{ flex: 2, minWidth: 0 }}>
          <ColorSliders />
        </Box>

        <Divider orientation="vertical" color="rgba(31, 174, 122, 0.15)" />

        {/* Model Geometry */}
        <Box style={{ flex: 3, minWidth: 0 }}>
          <ModelGeometry />
        </Box>

        <Divider orientation="vertical" color="rgba(31, 174, 122, 0.15)" />

        {/* Export Panel */}
        <Box style={{ width: 200 }}>
          <ExportPanel />
        </Box>
      </Group>
    </Box>
  );
}
