'use client'

import * as THREE from 'three'
import { useMemo } from 'react'
import { Html } from '@react-three/drei'

interface OfficeDecorProps {
  deskPositions: [number, number, number][]
  agents: Array<{ status: string; color: string }>
}

export default function OfficeDecor({ deskPositions, agents }: OfficeDecorProps) {
  console.log('🏢 OfficeDecor rendering:', { deskPositions, agents })

  // Pre-compute random values so they don't change on every render
  const plant1Offsets = useMemo(
    () => [0, 1, 2, 3, 4].map(() => Math.random() * 0.15),
    []
  )

  const plant3Data = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5].map(() => ({
        yOffset: Math.random() * 0.4,
        rotX: Math.random() * 0.3,
        rotY: Math.random() * Math.PI * 2,
      })),
    []
  )

  return (
    <group>
      {/* ==================== LOUNGE AREA (Back-Left) ==================== */}
      
      {/* Navy Blue Sofa */}
      <group position={[-7, 0, 6]} rotation={[0, Math.PI / 4, 0]}>
        {/* Base */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[2.5, 0.6, 1]} />
          <meshStandardMaterial color="#1e3a5f" />
        </mesh>
        {/* Back cushion */}
        <mesh position={[0, 0.8, -0.4]}>
          <boxGeometry args={[2.5, 0.8, 0.2]} />
          <meshStandardMaterial color="#1e3a5f" />
        </mesh>
        {/* Seat cushions (3) */}
        {[-0.8, 0, 0.8].map((x, i) => (
          <mesh key={i} position={[x, 0.65, 0.1]}>
            <boxGeometry args={[0.7, 0.15, 0.7]} />
            <meshStandardMaterial color="#2c5282" />
          </mesh>
        ))}
        {/* Arms */}
        <mesh position={[-1.2, 0.5, 0]}>
          <boxGeometry args={[0.2, 0.6, 0.9]} />
          <meshStandardMaterial color="#1e3a5f" />
        </mesh>
        <mesh position={[1.2, 0.5, 0]}>
          <boxGeometry args={[0.2, 0.6, 0.9]} />
          <meshStandardMaterial color="#1e3a5f" />
        </mesh>
      </group>

      {/* Coffee Table (Center) */}
      <group position={[0, 0, 3]}>
        {/* Glass top */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[1.5, 0.05, 0.9]} />
          <meshStandardMaterial color="#b0d4f1" transparent opacity={0.6} />
        </mesh>
        {/* Black frame legs (4) */}
        {[
          [-0.65, 0.2, -0.4],
          [0.65, 0.2, -0.4],
          [-0.65, 0.2, 0.4],
          [0.65, 0.2, 0.4],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]}>
            <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.8} />
          </mesh>
        ))}
        {/* Lower shelf */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[1.4, 0.03, 0.8]} />
          <meshStandardMaterial color="#b0d4f1" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Red Bean Bag / Pouf */}
      <group position={[-2, 0, 8]}>
        <mesh position={[0, 0.25, 0]}>
          <sphereGeometry args={[0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <meshStandardMaterial color="#dc2626" roughness={0.9} />
        </mesh>
      </group>

      {/* Teal/Green Sofa (Back-Right) */}
      <group position={[8, 0, 7]} rotation={[0, -Math.PI / 6, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[2.2, 0.6, 1]} />
          <meshStandardMaterial color="#14b8a6" />
        </mesh>
        <mesh position={[0, 0.8, -0.4]}>
          <boxGeometry args={[2.2, 0.8, 0.2]} />
          <meshStandardMaterial color="#14b8a6" />
        </mesh>
        {/* Lime green pillows */}
        <mesh position={[-0.5, 0.7, 0.1]} rotation={[0, 0.2, 0]}>
          <boxGeometry args={[0.4, 0.4, 0.15]} />
          <meshStandardMaterial color="#84cc16" />
        </mesh>
        <mesh position={[0.5, 0.7, 0.1]} rotation={[0, -0.2, 0]}>
          <boxGeometry args={[0.4, 0.4, 0.15]} />
          <meshStandardMaterial color="#84cc16" />
        </mesh>
        {/* Arms */}
        <mesh position={[-1.05, 0.5, 0]}>
          <boxGeometry args={[0.2, 0.6, 0.9]} />
          <meshStandardMaterial color="#14b8a6" />
        </mesh>
        <mesh position={[1.05, 0.5, 0]}>
          <boxGeometry args={[0.2, 0.6, 0.9]} />
          <meshStandardMaterial color="#14b8a6" />
        </mesh>
      </group>

      {/* ==================== RUGS ==================== */}
      
      {/* Geometric Patterned Rug (Center) */}
      <mesh position={[0, 0.01, 3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 3]} />
        <meshStandardMaterial color="#60a5fa" roughness={0.9} />
      </mesh>
      {/* Diamond pattern overlay */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = (i % 4) - 1.5
        const z = Math.floor(i / 4) - 1
        return (
          <mesh key={i} position={[x * 0.8, 0.015, 3 + z * 0.8]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <planeGeometry args={[0.3, 0.3]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#ffffff' : '#94a3b8'} />
          </mesh>
        )
      })}

      {/* Red Circular Rug (Right) */}
      <mesh position={[8, 0.01, 7]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#ef4444" roughness={0.9} />
      </mesh>

      {/* ==================== DOOR & WINDOW ==================== */}
      
      {/* Blue Door (Back-Center-Left) */}
      <group position={[-2, 1.2, -9.8]}>
        {/* Door frame */}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[1, 2.4, 0.1]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        {/* Door handle */}
        <mesh position={[0.35, 0, 0.11]}>
          <cylinderGeometry args={[0.03, 0.03, 0.15, 8]} />
          <meshStandardMaterial color="#f3f4f6" metalness={0.9} />
        </mesh>
      </group>

      {/* Venetian Blinds / Window (Back-Center) */}
      <group position={[1, 6, -9.7]}>
        {/* Window frame */}
        <mesh>
          <boxGeometry args={[3, 1.5, 0.1]} />
          <meshStandardMaterial color="#d4a574" />
        </mesh>
        {/* Blinds slats (horizontal) */}
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} position={[0, 0.65 - i * 0.12, 0.06]} rotation={[Math.PI / 12, 0, 0]}>
            <boxGeometry args={[2.8, 0.08, 0.02]} />
            <meshStandardMaterial color="#d4a574" />
          </mesh>
        ))}
      </group>

      {/* ==================== WALL DECORATIONS ==================== */}
      
      {/* Pink/Red Geometric Art (Left Wall) */}
      <group position={[-14.5, 6, 5]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[1.2, 1.6, 0.05]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[1.1, 1.5]} />
          <meshStandardMaterial color="#ec4899" />
        </mesh>
        {/* Geometric pattern */}
        <mesh position={[-0.2, 0.3, 0.04]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.4, 0.4, 0.01]} />
          <meshStandardMaterial color="#f43f5e" />
        </mesh>
        <mesh position={[0.2, -0.2, 0.04]}>
          <circleGeometry args={[0.25, 6]} />
          <meshStandardMaterial color="#fda4af" />
        </mesh>
      </group>

      {/* Red Vertical Panel (Right Wall) */}
      <group position={[14.5, 3, 7]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[2, 5, 0.1]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      </group>

      {/* Clock (Back Wall - Right) */}
      <group position={[3, 6, -9.8]}>
        <mesh>
          <cylinderGeometry args={[0.4, 0.4, 0.08, 32]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <circleGeometry args={[0.35, 32]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>
        {/* Clock hands */}
        <mesh position={[0, 0.1, 0.06]} rotation={[0, 0, Math.PI / 3]}>
          <boxGeometry args={[0.02, 0.2, 0.01]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[0, 0.08, 0.06]} rotation={[0, 0, -Math.PI / 6]}>
          <boxGeometry args={[0.02, 0.15, 0.01]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>

      {/* White Wall-Mounted Shelf (Back-Right) */}
      <group position={[5, 7, -9.7]}>
        <mesh>
          <boxGeometry args={[1.5, 0.8, 0.3]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>
      </group>

      {/* ==================== FILING CABINETS (Side-by-Side) ==================== */}
      
      <group position={[5, 0, -1]}>
        {/* Cabinet 1 */}
        <group position={[-0.3, 0, 0]}>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.5, 1.2, 0.6]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} />
          </mesh>
          {/* 3 Drawers */}
          {[0, 1, 2].map((i) => (
            <group key={i} position={[0, 0.2 + i * 0.35, 0]}>
              <mesh position={[0, 0, 0.31]}>
                <boxGeometry args={[0.45, 0.3, 0.02]} />
                <meshStandardMaterial color="#374151" metalness={0.7} />
              </mesh>
              <mesh position={[0, 0, 0.33]}>
                <boxGeometry args={[0.12, 0.03, 0.02]} />
                <meshStandardMaterial color="#9ca3af" metalness={0.9} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Cabinet 2 */}
        <group position={[0.3, 0, 0]}>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.5, 1.2, 0.6]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <group key={i} position={[0, 0.2 + i * 0.35, 0]}>
              <mesh position={[0, 0, 0.31]}>
                <boxGeometry args={[0.45, 0.3, 0.02]} />
                <meshStandardMaterial color="#374151" metalness={0.7} />
              </mesh>
              <mesh position={[0, 0, 0.33]}>
                <boxGeometry args={[0.12, 0.03, 0.02]} />
                <meshStandardMaterial color="#9ca3af" metalness={0.9} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* ==================== PLANTS ==================== */}
      
      {/* Floor Plant #1 (Center-Front) */}
      <group position={[0.5, 0, 2]}>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.15, 0.18, 0.3, 8]} />
          <meshStandardMaterial color="#92400e" roughness={0.9} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i * Math.PI * 2) / 5) * 0.2,
              0.35 + plant1Offsets[i],
              Math.sin((i * Math.PI * 2) / 5) * 0.2,
            ]}
          >
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
        ))}
      </group>

      {/* Floor Plant #2 (Center) */}
      <group position={[-1, 0, 3.5]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.12, 0.15, 0.24, 8]} />
          <meshStandardMaterial color="#78350f" roughness={0.9} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i * Math.PI * 2) / 3) * 0.15,
              0.25 + i * 0.08,
              Math.sin((i * Math.PI * 2) / 3) * 0.15,
            ]}
          >
            <coneGeometry args={[0.1, 0.3, 4]} />
            <meshStandardMaterial color="#16a34a" />
          </mesh>
        ))}
      </group>

      {/* Tall Floor Plant (Right-Foreground) */}
      <group position={[4.5, 0, -1.5]}>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.2, 0.25, 0.8, 8]} />
          <meshStandardMaterial color="#854d0e" roughness={0.9} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i * Math.PI * 2) / 6) * 0.3,
              0.9 + plant3Data[i].yOffset,
              Math.sin((i * Math.PI * 2) / 6) * 0.3,
            ]}
            rotation={[plant3Data[i].rotX, plant3Data[i].rotY, 0]}
          >
            <coneGeometry args={[0.15, 0.5, 4]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
        ))}
      </group>

      {/* ==================== DESK DECORATIONS (4 Agent Desks) ==================== */}
      
      {deskPositions.map((pos, idx) => {
        const agent = agents[idx]
        return (
          <group key={idx} position={pos as [number, number, number]}>
            {/* Desk Lamp with STATUS-BASED LIGHTING */}
            <group position={[-0.5, 0.8, -0.3]}>
              <mesh>
                <cylinderGeometry args={[0.1, 0.12, 0.05, 16]} />
                <meshStandardMaterial color="#374151" metalness={0.8} />
              </mesh>
              <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 6]}>
                <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
                <meshStandardMaterial color="#4b5563" metalness={0.6} />
              </mesh>
              <mesh position={[0.2, 0.6, 0]} rotation={[0, 0, Math.PI / 3]}>
                <coneGeometry args={[0.15, 0.2, 16]} />
                <meshStandardMaterial
                  color={agent.status === 'working' ? agent.color : '#6b7280'}
                  emissive={agent.status === 'working' ? agent.color : '#000000'}
                  emissiveIntensity={agent.status === 'working' ? 0.5 : 0.1}
                />
              </mesh>
              {agent.status === 'working' && (
                <pointLight
                  position={[0.2, 0.7, 0]}
                  intensity={0.8}
                  distance={3}
                  color={agent.color}
                  castShadow
                />
              )}
            </group>

            {/* Coffee Mug */}
            <group position={[0.6, 0.8, -0.1]}>
              <mesh>
                <cylinderGeometry args={[0.08, 0.1, 0.15, 16]} />
                <meshStandardMaterial color="#1e293b" roughness={0.4} />
              </mesh>
              <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.06, 0.02, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#1e293b" />
              </mesh>
            </group>

            {/* Small Desk Plant */}
            <group position={[0.4, 0.8, -0.5]}>
              <mesh>
                <cylinderGeometry args={[0.06, 0.07, 0.12, 8]} />
                <meshStandardMaterial color="#d97706" roughness={0.8} />
              </mesh>
              {[0, 1, 2].map((i) => (
                <mesh
                  key={i}
                  position={[
                    Math.cos((i * Math.PI * 2) / 3) * 0.08,
                    0.15,
                    Math.sin((i * Math.PI * 2) / 3) * 0.08,
                  ]}
                >
                  <sphereGeometry args={[0.05, 8, 8]} />
                  <meshStandardMaterial color="#15803d" />
                </mesh>
              ))}
            </group>

            {/* Notepad */}
            <mesh position={[-0.3, 0.81, 0.1]}>
              <boxGeometry args={[0.2, 0.01, 0.25]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>

            {/* Pen Holder with Pens */}
            <group position={[0.5, 0.8, 0.15]}>
              <mesh>
                <cylinderGeometry args={[0.045, 0.05, 0.1, 12]} />
                <meshStandardMaterial color="#1f2937" />
              </mesh>
              {[0, 1, 2].map((i) => (
                <mesh
                  key={i}
                  position={[
                    Math.cos((i * Math.PI * 2) / 3) * 0.02,
                    0.12,
                    Math.sin((i * Math.PI * 2) / 3) * 0.02,
                  ]}
                >
                  <cylinderGeometry args={[0.008, 0.008, 0.15, 8]} />
                  <meshStandardMaterial color={i === 0 ? '#3b82f6' : i === 1 ? '#ef4444' : '#1f2937'} />
                </mesh>
              ))}
            </group>

            {/* Mouse Pad */}
            <mesh position={[0.2, 0.805, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.35, 0.28]} />
              <meshStandardMaterial color="#374151" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
