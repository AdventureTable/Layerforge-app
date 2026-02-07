import { useEffect, useRef } from 'react';
import { AppShell } from '@mantine/core';
import { FilamentPanel } from './components/FilamentPanel';
import { PreviewArea } from './components/PreviewArea';
import { ColorCore } from './components/ColorCore';
import { BottomPanel } from './components/BottomPanel';
import { Header } from './components/Header';
import { ResolutionChangeModal } from './components/ResolutionChangeModal';
import { EasyModeWizard } from './components/EasyModeWizard';
import { useProjectStore } from './stores/projectStore';

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

function App() {
  const { 
    imagePath, 
    imageData,
    modelGeometry,
    liveUpdate,
    setProcessing,
    setHeightmapData,
    setMeshReady,
    initializeColorStops,
  } = useProjectStore();
  
  const lastProcessedRef = useRef<string | null>(null);

  // Auto-process image with sidecar when imagePath changes
  useEffect(() => {
    const processWithSidecar = async () => {
      if (!imagePath || !isTauri() || !liveUpdate) return;
      if (lastProcessedRef.current === imagePath) return;
      
      lastProcessedRef.current = imagePath;
      setProcessing(true);
      
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        
        const response = await invoke<{
          heightmap_base64: string;
          width: number;
          height: number;
        }>('process_image', {
          request: {
            image_path: imagePath,
            geometry: {
              min_depth_mm: modelGeometry.minDepthMm,
              max_depth_mm: modelGeometry.maxDepthMm,
              gamma: modelGeometry.gamma,
              contrast: modelGeometry.contrast,
              offset: modelGeometry.offset,
              smoothing: modelGeometry.smoothing,
              spike_removal: modelGeometry.spikeRemoval,
              luminance_method: modelGeometry.luminanceMethod,
              tone_mapping_mode: modelGeometry.toneMappingMode,
              transfer_curve: modelGeometry.transferCurve,
              dynamic_depth: modelGeometry.dynamicDepth,
              invert: modelGeometry.invert,
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
        console.debug('Sidecar processing failed, using JS preview:', error);
      } finally {
        setProcessing(false);
      }
    };

    // Small delay to let other state settle
    const timer = setTimeout(processWithSidecar, 100);
    return () => clearTimeout(timer);
  }, [imagePath, liveUpdate]);

  return (
    <AppShell
      header={{ height: 50 }}
      navbar={{ width: 260, breakpoint: 'sm' }}
      aside={{ width: 80, breakpoint: 'sm' }}
      footer={{ height: 320 }}
      padding={0}
      styles={{
        main: {
          backgroundColor: 'transparent',
        },
        header: {
          backgroundColor: 'rgba(10, 13, 15, 0.8)',
          borderColor: 'rgba(31, 174, 122, 0.2)',
        },
        navbar: {
          backgroundColor: 'rgba(15, 46, 38, 0.3)',
          borderColor: 'rgba(31, 174, 122, 0.15)',
        },
        aside: {
          backgroundColor: 'rgba(15, 46, 38, 0.3)',
          borderColor: 'rgba(31, 174, 122, 0.15)',
        },
        footer: {
          backgroundColor: 'rgba(10, 13, 15, 0.7)',
          borderColor: 'rgba(31, 174, 122, 0.2)',
        },
      }}
    >
      <AppShell.Header>
        <Header />
      </AppShell.Header>

      <AppShell.Navbar>
        <FilamentPanel />
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          display: 'flex',
          height: 'calc(100vh - 50px - 320px)',
          overflow: 'hidden',
        }}
      >
        <PreviewArea />
      </AppShell.Main>

      <AppShell.Aside>
        <ColorCore />
      </AppShell.Aside>

      <AppShell.Footer>
        <BottomPanel />
      </AppShell.Footer>

      {/* Modals */}
      <ResolutionChangeModal />
      <EasyModeWizard />
    </AppShell>
  );
}

export default App;
