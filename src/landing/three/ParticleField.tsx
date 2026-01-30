import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleFieldProps {
  count?: number;
  spread?: number;
  color?: string;
}

export function ParticleField({ 
  count = 200, 
  spread = 30,
  color = '#6CFF9A' 
}: ParticleFieldProps) {
  const points = useRef<THREE.Points>(null);
  
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Random positions
      positions[i3] = (Math.random() - 0.5) * spread;
      positions[i3 + 1] = (Math.random() - 0.5) * spread * 0.6;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;
      
      // Random velocities for brownian motion
      velocities[i3] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.005;
    }
    
    return { positions, velocities };
  }, [count, spread]);
  
  useFrame((state) => {
    if (!points.current) return;
    
    const positionArray = points.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Brownian motion with sine wave influence
      positionArray[i3] += velocities[i3] + Math.sin(time + i * 0.1) * 0.002;
      positionArray[i3 + 1] += velocities[i3 + 1] + Math.cos(time + i * 0.1) * 0.002;
      positionArray[i3 + 2] += velocities[i3 + 2];
      
      // Wrap around boundaries
      if (Math.abs(positionArray[i3]) > spread / 2) {
        positionArray[i3] = -Math.sign(positionArray[i3]) * spread / 2;
      }
      if (Math.abs(positionArray[i3 + 1]) > spread * 0.3) {
        positionArray[i3 + 1] = -Math.sign(positionArray[i3 + 1]) * spread * 0.3;
      }
    }
    
    points.current.geometry.attributes.position.needsUpdate = true;
    
    // Slow rotation
    points.current.rotation.y = time * 0.02;
  });
  
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={color}
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
