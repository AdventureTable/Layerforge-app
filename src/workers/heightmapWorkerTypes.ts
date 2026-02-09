import type { HeightmapGeometryInput } from '../core/heightmapPipeline';

export interface HeightmapWorkerInput {
  imageDataUrl: string;
  geometry: HeightmapGeometryInput;
  maxDim: number;
}

export type HeightmapWorkerOutput =
  | { type: 'progress'; progress: number; message?: string }
  | { type: 'complete'; heightmapBase64: string; width: number; height: number }
  | { type: 'error'; error: string };

