import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useProjectStore, useEnabledFilaments } from '../stores/projectStore';
import type { MeshWorkerInput, MeshWorkerOutput } from '../workers/meshWorker';

export interface MeshWorkerResult {
  positions: Float32Array;
  indices: Uint32Array;
  colors: Float32Array;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface UseMeshWorkerReturn {
  result: MeshWorkerResult | null;
  isProcessing: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
}

const DEBOUNCE_MS = 300;

// Decode base64 heightmap to Float32Array
function decodeHeightmap(base64: string): Float32Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer);
}

export function useMeshWorker(): UseMeshWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const heightmapCacheRef = useRef<{ data: Float32Array; key: string } | null>(null);
  
  const [result, setResult] = useState<MeshWorkerResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Get state from store
  const heightmapData = useProjectStore(state => state.heightmapData);
  const heightmapWidth = useProjectStore(state => state.heightmapWidth);
  const heightmapHeight = useProjectStore(state => state.heightmapHeight);
  const modelGeometry = useProjectStore(state => state.modelGeometry);
  const printSettings = useProjectStore(state => state.printSettings);
  const colorPlan = useProjectStore(state => state.colorPlan);
  const filaments = useProjectStore(state => state.filaments);
  const setMeshProcessing = useProjectStore(state => state.setProcessing);
  
  const enabledFilaments = useEnabledFilaments();
  
  // Create a stable key for filament changes (avoids dynamic dependency array)
  const filamentsKey = useMemo(() => {
    return enabledFilaments
      .map(f => `${f.id}:${f.hexColor}:${f.td}`)
      .join('|');
  }, [enabledFilaments]);
  
  // Create a stable key for color stops
  const stopsKey = useMemo(() => {
    return colorPlan.stops
      .map(s => `${s.filamentId}:${s.thresholdZMm}`)
      .join('|');
  }, [colorPlan.stops]);
  
  // Create worker instance
  const createWorker = useCallback(() => {
    // Terminate existing worker
    if (workerRef.current) {
      workerRef.current.terminate();
    }
    
    // Create new worker
    const worker = new Worker(
      new URL('../workers/meshWorker.ts', import.meta.url),
      { type: 'module' }
    );
    
    worker.onmessage = (event: MessageEvent<MeshWorkerOutput>) => {
      const { type, progress: prog, message, result: workerResult, error: workerError } = event.data;
      
      if (type === 'progress') {
        setProgress(prog || 0);
        setProgressMessage(message || '');
      } else if (type === 'complete' && workerResult) {
        setResult(workerResult);
        setIsProcessing(false);
        setMeshProcessing(false);
        setProgress(100);
        setProgressMessage('Complete');
      } else if (type === 'error') {
        setError(workerError || 'Unknown error');
        setIsProcessing(false);
        setMeshProcessing(false);
      }
    };
    
    worker.onerror = (event) => {
      setError(event.message);
      setIsProcessing(false);
      setMeshProcessing(false);
    };
    
    workerRef.current = worker;
    return worker;
  }, [setMeshProcessing]);
  
  // Start mesh generation
  const startGeneration = useCallback(async () => {
    // Need heightmap data from Python
    if (!heightmapData || heightmapWidth === 0 || heightmapHeight === 0) {
      setResult(null);
      return;
    }
    
    if (enabledFilaments.length === 0 || colorPlan.stops.length === 0) {
      // Can't generate without filaments and stops
      return;
    }
    
    setIsProcessing(true);
    setMeshProcessing(true);
    setError(null);
    setProgress(0);
    setProgressMessage('Decoding heightmap...');
    
    // Decode heightmap (cache if same data)
    let decodedHeightmap: Float32Array;
    const cacheKey = heightmapData.substring(0, 100); // Use first 100 chars as key
    
    if (heightmapCacheRef.current && heightmapCacheRef.current.key === cacheKey) {
      decodedHeightmap = heightmapCacheRef.current.data;
    } else {
      try {
        decodedHeightmap = decodeHeightmap(heightmapData);
        heightmapCacheRef.current = { data: decodedHeightmap, key: cacheKey };
      } catch (err) {
        setError('Failed to decode heightmap');
        setIsProcessing(false);
        setMeshProcessing(false);
        return;
      }
    }
    
    // Create worker and send data
    const worker = createWorker();
    
    const input: MeshWorkerInput = {
      heightmapData: {
        data: decodedHeightmap,
        width: heightmapWidth,
        height: heightmapHeight,
      },
      modelGeometry,
      printSettings,
      colorPlan,
      filaments,
      resolution: printSettings.meshResolution,
    };
    
    worker.postMessage(input);
  }, [heightmapData, heightmapWidth, heightmapHeight, modelGeometry, printSettings, colorPlan, filaments, enabledFilaments, createWorker, setMeshProcessing]);
  
  // Debounced trigger for regeneration
  const triggerRegeneration = useCallback(() => {
    // Clear existing debounce timer
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Terminate existing worker if running
    if (workerRef.current && isProcessing) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    
    // Set new debounce timer
    debounceTimerRef.current = window.setTimeout(() => {
      startGeneration();
      debounceTimerRef.current = null;
    }, DEBOUNCE_MS);
  }, [startGeneration, isProcessing]);
  
  // Watch for heightmap changes (this is the main trigger now)
  useEffect(() => {
    // Clear cache when heightmap changes
    heightmapCacheRef.current = null;
    triggerRegeneration();
  }, [heightmapData]);
  
  // Watch for other changes that affect the preview
  useEffect(() => {
    triggerRegeneration();
  }, [
    // Geometry settings that affect color mapping (not mesh generation anymore)
    modelGeometry.minDepthMm,
    modelGeometry.maxDepthMm,
    // Print settings
    printSettings.widthMm,
    printSettings.heightMm,
    printSettings.layerHeightMm,
    printSettings.baseLayerMm,
    printSettings.meshResolution,
    // Color plan (stable key)
    stopsKey,
    colorPlan.mode,
    // Filaments (stable key)
    filamentsKey,
  ]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  return {
    result,
    isProcessing,
    progress,
    progressMessage,
    error,
  };
}
