import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const WarpStars = () => {
  const pointsRef = useRef();

  const particleCount = 1000;
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [positions, velocities] = useMemo(() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        // distribute stars randomly in a cylinder/box
        pos[i * 3] = (Math.random() - 0.5) * 600; // x
        pos[i * 3 + 1] = (Math.random() - 0.5) * 600; // y
        pos[i * 3 + 2] = -Math.random() * 1000; // z
        
        vel[i] = 1 + Math.random() * 3; // base velocity
    }
    
    return [pos, vel];
    // We intentionally only want this to run once to generate the initial random state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array;
    
    // We cap delta to prevent massive jumps if tab was inactive
    const safeDelta = Math.min(delta, 0.1);

    for (let i = 0; i < particleCount; i++) {
      // increase Z position -> move towards camera
      pos[i * 3 + 2] += velocities[i] * safeDelta * 50;
      
      // if it passes the camera, reset it far back
      if (pos[i * 3 + 2] > 100) {
        pos[i * 3 + 2] = -1000;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={particleCount} 
          array={positions} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial 
        size={1.5} 
        color="#a5b4fc" 
        transparent 
        opacity={0.9} 
        sizeAttenuation 
      />
    </points>
  );
};

export const WarpBackground = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-50 flex items-center justify-center">
      <Canvas camera={{ position: [0, 0, 1], fov: 75 }}>
        <WarpStars />
      </Canvas>
    </div>
  );
};
