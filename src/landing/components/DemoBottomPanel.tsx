import { Box, Group, Divider, Stack, Text, Button } from '@mantine/core';
import { ColorSliders } from '../../components/ColorSliders';
import { DemoModelGeometry } from './DemoModelGeometry';

export function DemoBottomPanel() {
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
          <DemoModelGeometry />
        </Box>

        <Divider orientation="vertical" color="rgba(31, 174, 122, 0.15)" />

        {/* Demo Export Panel - disabled */}
        <Box style={{ width: 200 }}>
          <Stack gap="xs" h="100%">
            <Text size="xs" fw={600} c="forge.0">
              Export
            </Text>
            <Button
              variant="filled"
              color="forge"
              disabled
              fullWidth
              styles={{
                root: {
                  opacity: 0.5,
                }
              }}
            >
              Export STL
            </Button>
            <Button
              variant="outline"
              color="forge"
              disabled
              fullWidth
              styles={{
                root: {
                  opacity: 0.5,
                }
              }}
            >
              Export Plan (TXT)
            </Button>
            <Button
              variant="outline"
              color="forge"
              disabled
              fullWidth
              styles={{
                root: {
                  opacity: 0.5,
                }
              }}
            >
              Export Plan (JSON)
            </Button>
            <Text size="xs" c="dimmed" ta="center" mt="auto">
              Demo mode - export disabled
            </Text>
          </Stack>
        </Box>
      </Group>
    </Box>
  );
}
