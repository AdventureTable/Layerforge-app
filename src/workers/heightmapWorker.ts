import type { HeightmapWorkerInput, HeightmapWorkerOutput } from './heightmapWorkerTypes';
import {
  decodeImageDataUrl,
  rgbaToToneMappedLuminance,
  medianFilter,
  gaussianBlur,
  applyInvertAndDynamicDepth,
  mapToDepthMm,
  float32ToBase64,
} from '../core/heightmapPipeline';

const post = (msg: HeightmapWorkerOutput) => {
  self.postMessage(msg);
};

self.onmessage = async (event: MessageEvent<HeightmapWorkerInput>) => {
  try {
    const { imageDataUrl, geometry, maxDim } = event.data;

    post({ type: 'progress', progress: 0, message: 'Decoding image…' });
    const decoded = await decodeImageDataUrl(imageDataUrl, maxDim);

    post({ type: 'progress', progress: 15, message: 'Computing luminance…' });
    let values01 = rgbaToToneMappedLuminance(decoded.rgba, decoded.width, decoded.height, geometry);

    if (geometry.spikeRemoval !== 'none') {
      post({ type: 'progress', progress: 30, message: 'Removing spikes…' });
      values01 = medianFilter(values01, decoded.width, decoded.height, geometry.spikeRemoval);
    }

    if (geometry.smoothing > 0) {
      post({ type: 'progress', progress: 45, message: 'Smoothing…' });
      values01 = gaussianBlur(values01, decoded.width, decoded.height, geometry.smoothing);
    }

    post({ type: 'progress', progress: 60, message: 'Depth mapping…' });
    values01 = applyInvertAndDynamicDepth(values01, geometry.invert, geometry.dynamicDepth);

    post({ type: 'progress', progress: 75, message: 'Converting to heightmap…' });
    const heightmapMm = mapToDepthMm(values01, geometry.minDepthMm, geometry.maxDepthMm);

    post({ type: 'progress', progress: 90, message: 'Encoding…' });
    const heightmapBase64 = float32ToBase64(heightmapMm);

    post({
      type: 'complete',
      heightmapBase64,
      width: decoded.width,
      height: decoded.height,
    });
  } catch (err) {
    post({
      type: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

