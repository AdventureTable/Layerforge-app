import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface CharacterPlaneProps {
  mousePosition: { x: number; y: number };
}

function CharacterPlane({ mousePosition }: CharacterPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, '/landing/assets/personaje_layerforgeado.PNG');
  
  // Target rotation based on mouse
  const targetRotation = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    // Configure texture
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }, [texture]);
  
  useFrame(() => {
    if (meshRef.current) {
      // Calculate target rotation based on mouse position
      targetRotation.current.y = mousePosition.x * 0.15;
      targetRotation.current.x = -mousePosition.y * 0.1;
      
      // Smooth interpolation
      meshRef.current.rotation.y += (targetRotation.current.y - meshRef.current.rotation.y) * 0.05;
      meshRef.current.rotation.x += (targetRotation.current.x - meshRef.current.rotation.x) * 0.05;
      
      // Subtle floating animation
      meshRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.1;
    }
  });
  
  // Calculate aspect ratio (approximate, will be updated when texture loads)
  const aspectRatio = texture.image ? texture.image.width / texture.image.height : 0.7;
  const height = 4;
  const width = height * aspectRatio;
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Glow effect behind character
function GlowEffect() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.scale.set(scale, scale, 1);
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0, -0.5]}>
      <circleGeometry args={[2.5, 32]} />
      <meshBasicMaterial
        color="#1FAE7A"
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}

export function Character3D() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        setMousePosition({ x, y });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return (
    <div ref={containerRef} className="character-container">
      <div className="character-glow" />
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} color="#6CFF9A" />
        <GlowEffect />
        <CharacterPlane mousePosition={mousePosition} />
      </Canvas>
    </div>
  );
}
