import { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import { useProjectStore, useEnabledFilaments } from '../../stores/projectStore';

export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { imageData: sourceImageData, previewData, modelGeometry, colorPlan } = useProjectStore();
  const enabledFilaments = useEnabledFilaments();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImageData) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Load the original image
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw base image
      ctx.drawImage(img, 0, 0);

      // If we have preview data from Python, use it
      if (previewData) {
        const previewImg = new Image();
        previewImg.onload = () => {
          ctx.drawImage(previewImg, 0, 0);
        };
        previewImg.src = previewData;
        return;
      }

      // Otherwise, compute a simple JS-based preview
      if (enabledFilaments.length === 0 || colorPlan.stops.length === 0) return;

      const canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = canvasImageData.data;
      const { minDepthMm, maxDepthMm, gamma } = modelGeometry;
      const depthRange = maxDepthMm - minDepthMm;

      // Sort stops by threshold
      const sortedStops = [...colorPlan.stops].sort(
        (a, b) => a.thresholdZMm - b.thresholdZMm
      );

      // Create a map of filament id to filament data
      const filamentMap = new Map(
        enabledFilaments.map((f) => [f.id, f])
      );

      for (let i = 0; i < data.length; i += 4) {
        // Calculate luminance (perceived brightness)
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Apply gamma
        const adjustedLum = Math.pow(luminance, gamma);

        // Map to depth
        const depth = minDepthMm + adjustedLum * depthRange;

        // Find which filament applies at this depth
        let filament = enabledFilaments[0];
        for (const stop of sortedStops) {
          if (depth <= stop.thresholdZMm) {
            const f = filamentMap.get(stop.filamentId);
            if (f) filament = f;
            break;
          }
        }

        // Parse hex color
        const hex = filament.hexColor;
        const fr = parseInt(hex.slice(1, 3), 16);
        const fg = parseInt(hex.slice(3, 5), 16);
        const fb = parseInt(hex.slice(5, 7), 16);

        // Physically correct transmission model
        // td = ln(2)/d50, depth in mm - at depth = d50: 50% light passes
        const atten = Math.exp(-filament.td * depth);

        // Blend with white (backlit simulation)
        data[i] = Math.round(255 * atten + fr * (1 - atten));
        data[i + 1] = Math.round(255 * atten + fg * (1 - atten));
        data[i + 2] = Math.round(255 * atten + fb * (1 - atten));
      }

      ctx.putImageData(canvasImageData, 0, 0);
    };
    img.src = sourceImageData;
  }, [sourceImageData, previewData, modelGeometry, colorPlan, enabledFilaments]);

  return (
    <Box
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        padding: 16,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
    </Box>
  );
}
