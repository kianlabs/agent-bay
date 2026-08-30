// Preload all models - Office Pack
import { useGLTF } from '@react-three/drei'

// Character models
useGLTF.preload('/models/characters/character-female-a.glb')
useGLTF.preload('/models/characters/character-male-b.glb')
useGLTF.preload('/models/characters/character-male-d.glb')
useGLTF.preload('/models/characters/character-female-c.glb')

// Main furniture (desk setups)
useGLTF.preload('/models/office/desk_big.glb')
useGLTF.preload('/models/office/Chair.glb')
useGLTF.preload('/models/office/Computer.glb')
useGLTF.preload('/models/office/Monitor.glb')
useGLTF.preload('/models/office/Keyboard.glb')

// Decorations (whiteboard, plants, wall art, mugs, lamps) use THREE.js geometry primitives in OfficeDecor.tsx

export const CHARACTER_MODELS = {
  Researcher: '/models/characters/character-female-a.glb',
  Frontend: '/models/characters/character-male-b.glb',
  Backend: '/models/characters/character-male-d.glb',
  Review: '/models/characters/character-female-c.glb',
} as const
