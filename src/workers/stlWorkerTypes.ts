import type { PrintSettings } from '../types';

export interface StlWorkerInput {
  heightmapBase64: string;
  heightmapWidth: number;
  heightmapHeight: number;
  printSettings: Pick<
    PrintSettings,
    | 'widthMm'
    | 'heightMm'
    | 'layerHeightMm'
    | 'baseLayerMm'
    | 'hasBorder'
    | 'borderWidthMm'
    | 'borderDepthMm'
    | 'meshResolution'
  >;
}

export type StlWorkerOutput =
  | { type: 'progress'; progress: number; message?: string }
  | { type: 'complete'; stlBytes: Uint8Array<ArrayBuffer> }
  | { type: 'error'; error: string };
