'use client'

import { useGLTF, Clone } from '@react-three/drei'
import { useEffect } from 'react'
import * as THREE from 'three'

interface DeskSetupProps {
  position: [number, number, number]
}

export default function DeskSetup({ position }: DeskSetupProps) {
  // Load all GLB models
  const deskGltf = useGLTF('/models/office/desk_big.glb')
  const chairGltf = useGLTF('/models/office/Chair.glb')
  const computerGltf = useGLTF('/models/office/Computer.glb')
  const monitorGltf = useGLTF('/models/office/Monitor.glb')
  const keyboardGltf = useGLTF('/models/office/Keyboard.glb')

  // Boost furniture materials (same fix as characters)
  useEffect(() => {
    [deskGltf, chairGltf, computerGltf, monitorGltf, keyboardGltf].forEach((gltf) => {
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          if (mesh.material) {
            const material = mesh.material as THREE.MeshStandardMaterial
            if (material.color) {
              material.color.multiplyScalar(1.3)
            }
            material.emissive = new THREE.Color(0x222222)
            material.emissiveIntensity = 0.15
            material.roughness = 0.8
            material.needsUpdate = true
          }
        }
      })
    })
  }, [deskGltf, chairGltf, computerGltf, monitorGltf, keyboardGltf])

  return (
    <group position={position}>
      {/* Desk - REAL MODEL */}
      <Clone 
        object={deskGltf.scene} 
        position={[0, 0, 0]}
        scale={0.8}
        castShadow
        receiveShadow
      />
      
      {/* Chair - REAL MODEL */}
      <Clone 
        object={chairGltf.scene} 
        position={[0, 0, 1.2]}
        scale={0.7}
        rotation={[0, Math.PI, 0]}
        castShadow
      />
      
      {/* Computer/Desktop - REAL MODEL */}
      <Clone 
        object={computerGltf.scene} 
        position={[-0.4, 0.8, -0.3]}
        scale={0.6}
        castShadow
      />
      
      {/* Monitor - REAL MODEL */}
      <Clone 
        object={monitorGltf.scene} 
        position={[0, 0.8, -0.4]}
        scale={0.6}
        castShadow
      />
      
      {/* Keyboard - REAL MODEL */}
      <Clone 
        object={keyboardGltf.scene} 
        position={[0, 0.8, 0.2]}
        scale={0.4}
        castShadow
      />
    </group>
  )
}

// Preload all models
useGLTF.preload('/models/office/desk_big.glb')
useGLTF.preload('/models/office/Chair.glb')
useGLTF.preload('/models/office/Computer.glb')
useGLTF.preload('/models/office/Monitor.glb')
useGLTF.preload('/models/office/Keyboard.glb')
