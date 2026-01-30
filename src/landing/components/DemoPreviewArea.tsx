import { Tabs, Box, Center, Text, Image, Stack, Button, Title } from '@mantine/core';
import { useProjectStore } from '../../stores/projectStore';
import { PreviewCanvas } from '../../components/PreviewArea/PreviewCanvas';

export function DemoPreviewArea() {
  const { imageData, activeView, setActiveView } = useProjectStore();

  return (
    <Box
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Tabs
        value={activeView}
        onChange={(v) => setActiveView(v as 'image' | 'preview' | '3d')}
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        styles={{
          list: {
            borderBottom: '1px solid rgba(31, 174, 122, 0.2)',
            backgroundColor: 'rgba(10, 13, 15, 0.4)',
          },
          tab: {
            color: 'var(--mantine-color-dark-1)',
            borderColor: 'transparent',
            '&[dataActive]': {
              color: '#1FAE7A',
              borderColor: '#1FAE7A',
            },
            '&:hover': {
              backgroundColor: 'rgba(31, 174, 122, 0.1)',
            },
          },
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="image">Image</Tabs.Tab>
          <Tabs.Tab value="preview">Preview</Tabs.Tab>
          <Tabs.Tab value="3d">3D View</Tabs.Tab>
        </Tabs.List>

        <Box style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <Tabs.Panel value="image" style={{ height: '100%' }}>
            {imageData ? (
              <Center h="100%" p="md">
                <Image
                  src={imageData}
                  fit="contain"
                  style={{ maxHeight: '100%', maxWidth: '100%' }}
                />
              </Center>
            ) : (
              <Center h="100%">
                <Stack align="center" gap="xs">
                  <Text size="lg" c="forge.2" style={{ textShadow: '0 0 20px rgba(108, 255, 154, 0.3)' }}>
                    No image loaded
                  </Text>
                  <Text size="sm" c="dark.1">
                    Open an image to get started
                  </Text>
                </Stack>
              </Center>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="preview" style={{ height: '100%' }}>
            {imageData ? (
              <PreviewCanvas />
            ) : (
              <Center h="100%">
                <Text c="dimmed">Load an image first</Text>
              </Center>
            )}
          </Tabs.Panel>

          {/* 3D View - Locked behind purchase with sassy message */}
          <Tabs.Panel value="3d" style={{ height: '100%', position: 'relative' }}>
            <Center h="100%" style={{ background: 'radial-gradient(ellipse at center, rgba(31, 174, 122, 0.1) 0%, #0A0D0F 70%)' }}>
              <Stack align="center" gap="lg" maw={400} ta="center" p="xl">
                <Title 
                  order={3} 
                  className="glow-text"
                  style={{ 
                    fontSize: '1.5rem',
                    textShadow: '0 0 30px rgba(108, 255, 154, 0.5)',
                  }}
                >
                  Nice try.
                </Title>
                
                <Text c="gray.4" size="md" style={{ lineHeight: 1.6 }}>
                  El 3D View es donde ocurre la magia de verdad.
                  <br />
                  <br />
                  Pero esto es una demo, no un regalo.
                </Text>
                
                <Text 
                  c="forge.2" 
                  size="sm" 
                  fs="italic"
                  style={{ opacity: 0.8 }}
                >
                  "¿Querías verlo todo gratis? Nah."
                </Text>
                
                <Button
                  size="md"
                  variant="filled"
                  color="forge"
                  mt="md"
                  component="a"
                  href="#pricing"
                  style={{
                    boxShadow: '0 0 20px rgba(31, 174, 122, 0.4)',
                  }}
                >
                  Pillarlo por 5€
                </Button>
                
                <Text size="xs" c="dimmed" mt="xs">
                  Spoiler: funciona bastante bien.
                </Text>
              </Stack>
            </Center>
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Box>
  );
}
