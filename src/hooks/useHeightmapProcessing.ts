import { useEffect, useMemo, useRef } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { MAX_HEIGHTMAP_DIM } from '../core/heightmapPipeline';
import type { HeightmapWorkerInput, HeightmapWorkerOutput } from '../workers/heightmapWorkerTypes';

const DEBOUNCE_MS = 250;

export function useHeightmapProcessing() {
  const imageData = useProjectStore((s) => s.imageData);
  const liveUpdate = useProjectStore((s) => s.liveUpdate);
  const recomputeNonce = useProjectStore((s) => s.heightmapRecomputeNonce);

  const modelGeometry = useProjectStore((s) => s.modelGeometry);

  const setProcessing = useProjectStore((s) => s.setProcessing);
  const setHeightmapData = useProjectStore((s) => s.setHeightmapData);
  const setMeshReady = useProjectStore((s) => s.setMeshReady);
  const initializeColorStops = useProjectStore((s) => s.initializeColorStops);

  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<number | null>(null);

  const geometryInput = useMemo<HeightmapWorkerInput['geometry']>(() => {
    return {
      minDepthMm: modelGeometry.minDepthMm,
      maxDepthMm: modelGeometry.maxDepthMm,
      gamma: modelGeometry.gamma,
      contrast: modelGeometry.contrast,
      offset: modelGeometry.offset,
      smoothing: modelGeometry.smoothing,
      spikeRemoval: modelGeometry.spikeRemoval,
      luminanceMethod: modelGeometry.luminanceMethod,
      toneMappingMode: modelGeometry.toneMappingMode,
      transferCurve: modelGeometry.transferCurve,
      dynamicDepth: modelGeometry.dynamicDepth,
      invert: modelGeometry.invert,
    };
  }, [
    modelGeometry.minDepthMm,
    modelGeometry.maxDepthMm,
    modelGeometry.gamma,
    modelGeometry.contrast,
    modelGeometry.offset,
    modelGeometry.smoothing,
    modelGeometry.spikeRemoval,
    modelGeometry.luminanceMethod,
    modelGeometry.toneMappingMode,
    modelGeometry.transferCurve,
    modelGeometry.dynamicDepth,
    modelGeometry.invert,
  ]);

  const key = useMemo(() => {
    if (!imageData) return null;
    const imageKey = `${imageData.length}|${imageData.slice(0, 64)}|${imageData.slice(-64)}`;
    if (liveUpdate) {
      return `auto|${recomputeNonce}|${imageKey}|${JSON.stringify(geometryInput)}`;
    }
    return `manual|${recomputeNonce}|${imageKey}`;
  }, [imageData, liveUpdate, recomputeNonce, geometryInput]);

  useEffect(() => {
    if (!key || !imageData) return;

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;

      setMeshReady(false);
      setProcessing(true);

      const worker = new Worker(new URL('../workers/heightmapWorker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      worker.onmessage = (event: MessageEvent<HeightmapWorkerOutput>) => {
        const msg = event.data;
        if (msg.type === 'complete') {
          setHeightmapData(msg.heightmapBase64, msg.width, msg.height);
          setMeshReady(true);

          const currentStops = useProjectStore.getState().colorPlan.stops;
          if (currentStops.length === 0) {
            initializeColorStops();
          }

          setProcessing(false);
        } else if (msg.type === 'error') {
          console.error('Heightmap worker error:', msg.error);
          setProcessing(false);
          setMeshReady(false);
        }
      };

      worker.onerror = (event) => {
        console.error('Heightmap worker failed:', event.message);
        setProcessing(false);
        setMeshReady(false);
      };

      const input: HeightmapWorkerInput = {
        imageDataUrl: imageData,
        geometry: geometryInput,
        maxDim: MAX_HEIGHTMAP_DIM,
      };

      worker.postMessage(input);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [key, imageData, geometryInput, setProcessing, setHeightmapData, setMeshReady, initializeColorStops]);
}
