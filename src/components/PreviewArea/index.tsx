import { useState, useEffect } from 'react';
import { Tabs, Box, Center, Text, Image, Stack, Progress, Paper, Group, Button } from '@mantine/core';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useProjectStore } from '../../stores/projectStore';
import { PreviewCanvas } from './PreviewCanvas';
import { MeshViewer } from './MeshViewer';
import { MeshWorkerProvider, useMeshWorkerContext } from '../../hooks/MeshWorkerContext';

const MARKETING_TIPS = [
  "Tip: You can find high-quality lithophane models in our Etsy shop.",
  "Did you know? Adventure Table creates custom 3D printed accessories.",
  "Support us by checking out our premium collection!",
  "Want to print something epic? Visit adventure-table.com",
];

function MeshProgressOverlay() {
  const { isProcessing, progress, progressMessage } = useMeshWorkerContext();
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % MARKETING_TIPS.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  if (!isProcessing) return null;

  return (
    <Box
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      <Paper
        p="sm"
        radius="md"
        style={{
          backgroundColor: 'rgba(10, 13, 15, 0.9)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {progressMessage || 'Processing...'}
            </Text>
            <Text size="xs" c="forge.4" fw={500} style={{ fontStyle: 'italic' }}>
               {MARKETING_TIPS[tipIndex]}
            </Text>
          </Group>
          <Progress
            value={progress}
            size="sm"
            radius="xl"
            color="forge"
            animated
          />
        </Stack>
      </Paper>
    </Box>
  );
}

export function PreviewArea() {
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
                  
                  {/* Marketing CTA for Empty State */}
                  <Paper 
                    p="md" 
                    mt="xl" 
                    radius="md" 
                    style={{ 
                      backgroundColor: 'rgba(10, 13, 15, 0.6)', 
                      border: '1px solid rgba(31, 174, 122, 0.2)',
                      maxWidth: 400
                    }}
                  >
                    <Stack align="center" gap="sm">
                      <Text size="sm" c="dimmed" ta="center">
                        Need something ready to print?
                      </Text>
                      <Text size="md" c="white" fw={500} ta="center">
                        Check out our premium models on Etsy
                      </Text>
                      <Button 
                        variant="light" 
                        color="orange" 
                        size="xs"
                        component="a"
                        href="https://adventure-table.com/"
                        target="_blank"
                        onClick={(e) => {
                          e.preventDefault();
                          if (typeof window !== 'undefined' && '__TAURI__' in window) {
                            import('@tauri-apps/plugin-shell').then(({ open }) => {
                              open('https://adventure-table.com/');
                            }).catch(() => {
                              window.open('https://adventure-table.com/', '_blank');
                            });
                          } else {
                            window.open('https://adventure-table.com/', '_blank');
                          }
                        }}
                      >
                        Visit Adventure Table Shop
                      </Button>
                    </Stack>
                  </Paper>
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

          <Tabs.Panel value="3d" style={{ height: '100%', position: 'relative' }}>
            <MeshWorkerProvider>
              <Canvas
                camera={{ position: [0, 100, 150], fov: 50 }}
                style={{ background: '#0A0D0F' }}
              >
                <ambientLight intensity={0.6} />
                <directionalLight position={[50, 100, 50]} intensity={1} />
                <directionalLight position={[-50, 50, -50]} intensity={0.5} />
                <OrbitControls enableDamping dampingFactor={0.05} />
                <Grid
                  infiniteGrid
                  fadeDistance={400}
                  fadeStrength={5}
                  cellSize={10}
                  sectionSize={50}
                />
                <MeshViewer />
              </Canvas>
              <MeshProgressOverlay />
            </MeshWorkerProvider>
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Box>
  );
}
