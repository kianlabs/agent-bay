'use client'

import { useGLTF, Billboard, Text, Html } from '@react-three/drei'
import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { CHARACTER_MODELS } from '@/lib/model-preload'
import * as THREE from 'three'

interface Agent {
  id: string
  name: string
  color: string
  status: string
  currentTask: string
}

interface AgentCharacterProps {
  agent: Agent
  position: [number, number, number]
  speechBubble?: string
}

export default function AgentCharacter({ agent, position, speechBubble }: AgentCharacterProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [showBubble, setShowBubble] = useState(false)
  
  // Get character model based on agent name
  const modelPath = CHARACTER_MODELS[agent.name as keyof typeof CHARACTER_MODELS]
  const { scene } = useGLTF(modelPath)
  
  // Clone the scene to allow multiple instances
  const clonedScene = scene.clone()

  // FIX DARK MATERIALS - Boost brightness
  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const material = mesh.material as THREE.MeshStandardMaterial
          
          // Boost material brightness
          if (material.color) {
            material.color.multiplyScalar(1.5) // 50% brighter
          }
          
          // Add emissive glow
          material.emissive = new THREE.Color(0x333333)
          material.emissiveIntensity = 0.2
          
          // Adjust roughness for better lighting response
          material.roughness = 0.7
          material.metalness = 0.1
          
          // Ensure material updates
          material.needsUpdate = true
        }
      }
    })

    // Error tint (only if status is error)
    if (agent.status === 'error') {
      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          const material = mesh.material as THREE.MeshStandardMaterial
          if (material.color) {
            material.color.lerp(new THREE.Color('#ff0000'), 0.3)
          }
        }
      })
    }
  }, [clonedScene, agent.status])

  // Working animation (subtle head bob)
  useFrame((state) => {
    if (groupRef.current && agent.status === 'working') {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.02
    }
  })

  // Speech bubble timer
  useEffect(() => {
    if (speechBubble) {
      setShowBubble(true)
      const timer = setTimeout(() => {
        setShowBubble(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [speechBubble])

  return (
    <group position={[position[0], position[1], position[2] + 0.8]} ref={groupRef}>
      {/* Character Model - BIGGER + BRIGHTER */}
      <primitive object={clonedScene} scale={1.2} castShadow />
      
      {/* Name Billboard */}
      <Billboard position={[0, 2.5, 0]}>
        <Text
          fontSize={0.4}
          color={agent.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.08}
          outlineColor="#000000"
        >
          {agent.name}
        </Text>
      </Billboard>

      {/* Status Badge */}
      {agent.status === 'working' && (
        <Billboard position={[0, 3.2, 0]}>
          <mesh>
            <planeGeometry args={[1.2, 0.4]} />
            <meshBasicMaterial color={agent.color} opacity={0.9} transparent />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.25}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            ⚡ Working
          </Text>
        </Billboard>
      )}

      {/* Error Indicator */}
      {agent.status === 'error' && (
        <Billboard position={[0, 3, 0]}>
          <Text
            fontSize={0.6}
            color="#ff0000"
            anchorX="center"
            anchorY="middle"
          >
            ⚠️
          </Text>
        </Billboard>
      )}

      {/* Speech Bubble */}
      {showBubble && speechBubble && (
        <Html position={[0, 3.5, 0]} center>
          <div
            className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-xl"
            style={{
              background: agent.color,
              color: 'white',
              animation: 'bounce 0.5s ease-in-out',
              border: '2px solid rgba(255,255,255,0.3)'
            }}
          >
            {speechBubble}
          </div>
        </Html>
      )}
    </group>
  )
}
