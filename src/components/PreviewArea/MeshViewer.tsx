import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '../../stores/projectStore';
import { useMeshWorkerContext } from '../../hooks/MeshWorkerContext';

interface MeshDimensions {
  width: number;
  height: number;
}

export function MeshViewer() {
  const { printSettings, modelGeometry } = useProjectStore();
  const { result, isProcessing } = useMeshWorkerContext();
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  const { minDepthMm, maxDepthMm } = modelGeometry;

  // Create geometry from worker result
  const heightmapGeometry = useMemo(() => {
    if (!result) return null;

    // Dispose previous geometry
    if (geometryRef.current) {
      geometryRef.current.dispose();
    }

    const geometry = new THREE.BufferGeometry();
    
    // Set attributes from worker result
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(result.positions, 3)
    );
    geometry.setIndex(new THREE.BufferAttribute(result.indices, 1));
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(result.colors, 3)
    );
    
    geometry.computeVertexNormals();
    
    geometryRef.current = geometry;
    return geometry;
  }, [result]);

  // Get mesh dimensions from worker result or defaults
  const meshDimensions: MeshDimensions = useMemo(() => {
    if (result?.dimensions) {
      return {
        width: result.dimensions.width,
        height: result.dimensions.height,
      };
    }
    return {
      width: printSettings.widthMm,
      height: printSettings.heightMm,
    };
  }, [result, printSettings.widthMm, printSettings.heightMm]);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
    };
  }, []);

  const { width, height } = meshDimensions;

  return (
    <group>
      {/* Solid heightmap mesh with vertex colors */}
      {heightmapGeometry && (
        <mesh
          geometry={heightmapGeometry}
          position={[0, 0, 0]}
        >
          <meshStandardMaterial
            vertexColors
            side={THREE.DoubleSide}
            flatShading={false}
          />
        </mesh>
      )}

      {/* Show placeholder while loading or if no result */}
      {!heightmapGeometry && (
        <mesh
          position={[0, (maxDepthMm + minDepthMm) / 2, 0]}
        >
          <boxGeometry args={[printSettings.widthMm, maxDepthMm - minDepthMm, printSettings.heightMm]} />
          <meshStandardMaterial
            color="#0F2E26"
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
      )}

      {/* Processing indicator - subtle wireframe overlay */}
      {isProcessing && heightmapGeometry && (
        <mesh
          geometry={heightmapGeometry}
          position={[0, 0.01, 0]}
        >
          <meshBasicMaterial
            color="#1FAE7A"
            wireframe
            transparent
            opacity={0.2}
          />
        </mesh>
      )}

      {/* Border if enabled */}
      {printSettings.hasBorder && heightmapGeometry && (
        <>
          {(() => {
            const borderHeight = printSettings.borderDepthMm + printSettings.baseLayerMm;
            return (
              <>
          <mesh
            position={[0, borderHeight / 2, height / 2 + printSettings.borderWidthMm / 2]}
          >
            <boxGeometry args={[width + printSettings.borderWidthMm * 2, borderHeight, printSettings.borderWidthMm]} />
            <meshStandardMaterial color="#0F2E26" />
          </mesh>
          <mesh
            position={[0, borderHeight / 2, -height / 2 - printSettings.borderWidthMm / 2]}
          >
            <boxGeometry args={[width + printSettings.borderWidthMm * 2, borderHeight, printSettings.borderWidthMm]} />
            <meshStandardMaterial color="#0F2E26" />
          </mesh>
          <mesh
            position={[-width / 2 - printSettings.borderWidthMm / 2, borderHeight / 2, 0]}
          >
            <boxGeometry args={[printSettings.borderWidthMm, borderHeight, height]} />
            <meshStandardMaterial color="#0F2E26" />
          </mesh>
          <mesh
            position={[width / 2 + printSettings.borderWidthMm / 2, borderHeight / 2, 0]}
          >
            <boxGeometry args={[printSettings.borderWidthMm, borderHeight, height]} />
            <meshStandardMaterial color="#0F2E26" />
          </mesh>
              </>
            );
          })()}
        </>
      )}
    </group>
  );
}
