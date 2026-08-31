'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Suspense, useState, useEffect } from 'react'
import * as THREE from 'three'
import DeskSetup from './DeskSetup'
import AgentCharacter from './AgentCharacter'
import OfficeDecor from './OfficeDecor'

interface Agent {
  id: string
  name: string
  color: string
  status: string
  currentTask: string
  tasksCompleted: number
  tasksInQueue: number
}

interface SpeechBubble {
  agentId: string
  message: string
  timestamp: Date
}

interface AgentSceneProps {
  agents: Agent[]
  speechBubbles: SpeechBubble[]
}

// Desk positions in isometric grid (4 desks in 2x2 layout)
const DESK_POSITIONS = [
  [-3, 0, -3], // Top-left (Researcher)
  [3, 0, -3],  // Top-right (Frontend)
  [-3, 0, 3],  // Bottom-left (Backend)
  [3, 0, 3],   // Bottom-right (Review)
]

export default function AgentScene({ agents, speechBubbles }: AgentSceneProps) {
  const [webglSupported, setWebglSupported] = useState(true)

  useEffect(() => {
    // Check WebGL support
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        setWebglSupported(false)
      }
    } catch (e) {
      setWebglSupported(false)
    }
  }, [])

  if (!webglSupported) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
        ⚠️ WebGL not supported. Showing 2D view.
      </div>
    )
  }

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border" style={{ background: '#1a1a1a', borderColor: 'var(--border)' }}>
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{ position: [12, 12, 12], fov: 50 }}
      >
        <Suspense fallback={null}>
          {/* MAXIMUM LIGHTING - NO CEILING/ROOF */}
          <ambientLight intensity={1.0} />
          <directionalLight 
            position={[10, 15, 5]} 
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight 
            position={[-10, 10, -5]} 
            intensity={0.6}
          />
          <hemisphereLight args={['#ffffff', '#888888', 0.8]} />
          <pointLight position={[0, 8, 0]} intensity={0.5} />

          {/* Camera & Controls */}
          <PerspectiveCamera makeDefault position={[12, 12, 12]} />
          <OrbitControls
            enableRotate={true}
            enablePan={true}
            enableZoom={true}
            minDistance={8}
            maxDistance={25}
            maxPolarAngle={Math.PI / 2.2}
            target={[0, 0, 0]}
          />

          {/* Wooden Floor (no ceiling!) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[30, 30]} />
            <meshStandardMaterial color="#6b4423" roughness={0.9} />
          </mesh>

          {/* Grid helper for reference */}
          <gridHelper args={[30, 30, '#8b5e3c', '#6b4423']} position={[0, 0, 0]} />

          {/* Desk Setups with REAL GLB models */}
          {DESK_POSITIONS.map((pos, idx) => (
            <DeskSetup key={idx} position={pos as [number, number, number]} />
          ))}

          {/* Agent Characters with REAL GLB models */}
          {agents.map((agent, idx) => {
            const bubble = speechBubbles.find(b => b.agentId === agent.id)
            return (
              <AgentCharacter
                key={agent.id}
                agent={agent}
                position={DESK_POSITIONS[idx] as [number, number, number]}
                speechBubble={bubble?.message}
              />
            )
          })}

          {/* Office Decorations - lounge, sofas, rugs, filing cabinets */}
          <OfficeDecor deskPositions={DESK_POSITIONS as [number, number, number][]} agents={agents} />

          {/* Short walls (TRANSPARENT for debugging) */}
          <ShortWalls />
        </Suspense>
      </Canvas>
    </div>
  )
}

// Short walls for context (no ceiling!)
function ShortWalls() {
  return (
    <group>
      {/* Back wall - SHORT (1.5m height only) - TRANSPARENT FOR DEBUGGING */}
      <mesh position={[0, 0.75, -10]} receiveShadow>
        <planeGeometry args={[30, 1.5]} />
        <meshStandardMaterial color="#2a2a2a" side={THREE.DoubleSide} transparent opacity={0.3} />
      </mesh>
      
      {/* Left wall - SHORT - TRANSPARENT */}
      <mesh position={[-15, 0.75, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 1.5]} />
        <meshStandardMaterial color="#252525" side={THREE.DoubleSide} transparent opacity={0.3} />
      </mesh>
      
      {/* Right wall - SHORT - TRANSPARENT */}
      <mesh position={[15, 0.75, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 1.5]} />
        <meshStandardMaterial color="#252525" side={THREE.DoubleSide} transparent opacity={0.3} />
      </mesh>
      
      {/* NO CEILING! Open top for isometric view */}
    </group>
  )
}
