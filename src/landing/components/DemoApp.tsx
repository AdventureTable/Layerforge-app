import { useEffect, useState } from 'react';
import { Box, LoadingOverlay } from '@mantine/core';
import { FilamentPanel } from '../../components/FilamentPanel';
import { DemoPreviewArea } from './DemoPreviewArea';
import { ColorCore } from '../../components/ColorCore';
import { DemoHeader } from './DemoHeader';
import { DemoBottomPanel } from './DemoBottomPanel';
import { useProjectStore } from '../../stores/projectStore';

// Helper to load image as base64
async function loadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper to get image dimensions
async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = dataUrl;
  });
}

export function DemoApp() {
  const [isLoading, setIsLoading] = useState(true);
  const { 
    setImage, 
    setHeightmapData, 
    setMeshReady, 
    initializeColorStops,
    setImageAspectRatio,
    setPrintSettings,
  } = useProjectStore();

  // Pre-load demo data on mount
  useEffect(() => {
    const loadDemoData = async () => {
      try {
        // Load the original image
        const imageData = await loadImageAsBase64('/landing/assets/imageimage.jpg');
        const imageDimensions = await getImageDimensions(imageData);
        
        // Load the processed preview/heightmap
        const heightmapData = await loadImageAsBase64('/landing/assets/personaje_layerforgeado.PNG');
        const heightmapDimensions = await getImageDimensions(heightmapData);
        
        // Set image in store
        setImage('imageimage.jpg', imageData);
        
        // Set aspect ratio and dimensions
        const aspectRatio = imageDimensions.width / imageDimensions.height;
        setImageAspectRatio(aspectRatio);
        
        // Set reasonable print dimensions
        const maxDimension = 100; // 100mm
        if (aspectRatio >= 1) {
          setPrintSettings({
            widthMm: maxDimension,
            heightMm: Math.round(maxDimension / aspectRatio),
          });
        } else {
          setPrintSettings({
            widthMm: Math.round(maxDimension * aspectRatio),
            heightMm: maxDimension,
          });
        }
        
        // Set heightmap data (extract base64 from data URL)
        const base64Match = heightmapData.match(/base64,(.+)/);
        if (base64Match) {
          setHeightmapData(
            base64Match[1],
            heightmapDimensions.width,
            heightmapDimensions.height
          );
        }
        
        // Mark mesh as ready and initialize color stops
        setMeshReady(true);
        initializeColorStops();
        
      } catch (error) {
        console.error('Failed to load demo data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDemoData();
  }, []);

  return (
    <Box 
      className="demo-app-container"
      style={{ 
        position: 'relative',
        height: 600,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(31, 174, 122, 0.3)',
        boxShadow: '0 0 60px rgba(31, 174, 122, 0.15)',
        background: '#0A0D0F',
      }}
    >
      <LoadingOverlay 
        visible={isLoading} 
        overlayProps={{ blur: 2 }}
        loaderProps={{ color: 'forge', type: 'bars' }}
      />
      
      {/* Custom layout instead of AppShell to avoid viewport issues */}
      <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box style={{ height: 40, flexShrink: 0 }}>
          <DemoHeader />
        </Box>
        
        {/* Middle section: Navbar + Main + Aside */}
        <Box style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Navbar */}
          <Box 
            style={{ 
              width: 220, 
              flexShrink: 0,
              backgroundColor: 'rgba(15, 46, 38, 0.3)',
              borderRight: '1px solid rgba(31, 174, 122, 0.15)',
              overflow: 'auto',
            }}
          >
            <FilamentPanel />
          </Box>
          
          {/* Main content */}
          <Box 
            style={{ 
              flex: 1, 
              display: 'flex',
              overflow: 'hidden',
              backgroundColor: 'transparent',
            }}
          >
            <DemoPreviewArea />
          </Box>
          
          {/* Aside */}
          <Box 
            style={{ 
              width: 70, 
              flexShrink: 0,
              backgroundColor: 'rgba(15, 46, 38, 0.3)',
              borderLeft: '1px solid rgba(31, 174, 122, 0.15)',
            }}
          >
            <ColorCore />
          </Box>
        </Box>
        
        {/* Footer */}
        <Box 
          style={{ 
            height: 260, 
            flexShrink: 0,
            backgroundColor: 'rgba(10, 13, 15, 0.7)',
            borderTop: '1px solid rgba(31, 174, 122, 0.2)',
          }}
        >
          <DemoBottomPanel />
        </Box>
      </Box>
    </Box>
  );
}
