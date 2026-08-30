# 🏢 Office Layout Documentation

**Project**: Agent Ops Dashboard - 3D Developer Bay
**File**: `components/OfficeDecor.tsx` (562 lines, 19.9KB)
**Last Updated**: 2026-08-30

---

## 📐 Layout Overview

Kantor virtual dengan **layout realistis** yang mencakup 4 developer desks, meeting area, dan berbagai furniture & dekorasi kantor modern.

### Room Dimensions
- **Floor**: 30x30 units (wooden floor)
- **Walls**: 3 short walls (1.5m height, no ceiling/roof untuk isometric view)
- **Lighting**: 5-source (ambient + directional + hemisphere + per-desk pointLights)

---

## 🎨 Wall Decorations

### Whiteboard (Back Wall Center)
- **Position**: `[0, 2, -9.5]`
- **Size**: 4x2.5 units
- **Content**: HTML overlay dengan sprint goals & blockers
  - ✓ Sprint Goals
  - ✓ API Design Review
  - ✓ DB Schema Migration
  - ⚠ Blockers: CI/CD

### Wall Art (5 pieces total)
1. **Left Wall - Abstract Purple** `[-14.5, 2, -5]`
   - 2x2 frame dengan purple/pink geometric shapes
   
2. **Left Wall - Orange Minimalist** `[-14.5, 2, 2]`
   - 1.5x1.5 frame dengan solid orange

3. **Right Wall - Green** `[14.5, 2, 0]`
   - 2.5x1.5 horizontal frame

4. **Right Wall - Blue** `[14.5, 2.5, -6]`
   - 1.8x1.2 frame

### Wall Clock (Back Wall)
- **Position**: `[5, 2.8, -9.8]`
- **Style**: Circular analog clock dengan 2 hands
- **Colors**: Dark gray frame, white face

---

## 🌿 Plants (8 Locations)

### Large Floor Plants (2 corner plants)
1. **Front-Left Corner** `[-7, 0, 7]`
   - Pot: 0.35 radius, brown
   - 5 cone-shaped green leaves radiating outward
   
2. **Front-Right Corner** `[7, 0, 7]`
   - Pot: 0.35 radius, dark brown
   - 4 sphere-shaped succulent leaves stacked vertically

### Medium Wall Plants (4 locations along walls)
3. **Left Wall Front** `[-13, 0, 4]`
   - 0.25 radius pot, amber
   - 4 sphere leaves

4. **Left Wall Back** `[-13, 0, -3]`
   - 0.25 radius pot, brown
   - 3 cone leaves

5. **Right Wall Front** `[13, 0, 3]`
   - 0.25 radius pot, dark brown
   - 4 sphere leaves stacked

6. **Right Wall Back** `[13, 0, -5]`
   - 0.28 radius pot, brown
   - 3 cone leaves

### Small Desk Plants (4 on desks + 1 on meeting table)
- **Per Desk**: Mini pot (0.06 radius) dengan 3 sphere leaves di back corner
- **Meeting Table**: Small pot (0.08 radius) dengan 4 sphere leaves

---

## 🖨️ Office Furniture

### Printer Station (Back-Left Corner)
- **Position**: `[-10, 0, -8]`
- **Components**:
  - Printer table (gray metal, 1.2x0.7 units)
  - Printer body (dark gray, scanner lid yang bisa buka)
  - Paper tray (white)
  - Stack of paper on table
  - **Status LED**: Green emissive sphere (active)

### Filing Cabinet (Back-Right Corner)
- **Position**: `[10, 0, -8]`
- **Style**: Metal gray, 3 drawers dengan handles
- **Size**: 0.5x1.2x0.6 units (W x H x D)

### Bookshelf (Left Wall)
- **Position**: `[-13.5, 0, -7]`
- **Shelves**: 4 levels
- **Books**: 12 colorful books (random placement)
  - Colors: Red, Blue, Green, Orange, Purple, Pink

### Water Cooler (Back-Right)
- **Position**: `[8.5, 0, -8.5]`
- **Components**:
  - White base cabinet
  - Transparent blue water bottle (0.7 opacity)
  - Blue cap
  - Paper cup on side

### Trash Bins (2 locations)
1. **Near Printer**: `[-8.5, 0, -8]` - dark gray cylinder
2. **Near Front**: `[5, 0, 6.5]` - dark gray cylinder

---

## 💼 Desk Decorations (per desk, 4 desks total)

### Smart Desk Lamp 💡
- **Position**: Left side of desk `[-0.5, 0.8, -0.3]`
- **Components**: Base + articulated arm + cone lampshade
- **DYNAMIC LIGHTING**:
  - `status === 'working'` → Lamp glows with agent color (blue/orange/green/purple) + pointLight
  - `status !== 'working'` → Lamp gray/off, no light

### Coffee Mug ☕
- **Position**: Right side `[0.6, 0.8, -0.1]`
- **Style**: Dark blue/gray ceramic dengan C-handle

### Desk Plant 🌱
- **Position**: Back corner `[0.4, 0.8, -0.5]`
- **Style**: Small orange pot dengan 3 green sphere leaves

### Notepad 📝
- **Position**: Front-left `[-0.3, 0.81, 0.1]`
- **Color**: Yellow (legal pad style)

### Pen Holder ✏️
- **Position**: Front-right `[0.5, 0.8, 0.15]`
- **Contents**: 3 pens (blue, red, black)

### Mouse Pad 🖱️
- **Position**: Center-front `[0.2, 0.805, 0.3]`
- **Color**: Dark gray, 0.35x0.28 units

---

## 🤝 Meeting Table (Center)

### Table
- **Position**: `[0, 0, 0]` (room center)
- **Size**: 3x1.5 units (seats 6-8 people)
- **Material**: Dark brown wood (0.3 roughness, 0.2 metalness)
- **Legs**: 4 cylindrical legs

### On Table
1. **Laptop** (open, 45° angle)
   - Base: Dark metallic
   - Screen: Blue glowing display (emissive)
   
2. **Coffee Cups** (2 locations)
   - White cup at `[-0.8, 0.75, 0.3]`
   - Dark cup at `[0.9, 0.75, -0.2]`

3. **Documents/Papers**
   - Stack of white papers at `[-0.3, 0.76, -0.3]`

4. **Small Table Plant**
   - Position: `[1.2, 0.75, 0.5]`
   - 4 green sphere leaves

---

## 🎯 Agent Status-Based Lighting System

### Researcher (Blue - #3b82f6)
- Desk position: `[-3, 0, -3]` (top-left)
- `working` → Blue desk lamp + pointLight

### Frontend (Orange - #f59e0b)
- Desk position: `[3, 0, -3]` (top-right)
- `working` → Orange desk lamp + pointLight

### Backend (Green - #10b981)
- Desk position: `[-3, 0, 3]` (bottom-left)
- `working` → Green desk lamp + pointLight

### Review (Purple - #8b5cf6)
- Desk position: `[3, 0, 3]` (bottom-right)
- `working` → Purple desk lamp + pointLight

### PointLight Specs (when working)
```tsx
<pointLight
  position={[0.2, 0.7, 0]}
  intensity={0.8}
  distance={3}
  color={agent.color}
  castShadow
/>
```

---

## 📊 Statistics

- **Total Objects**: ~150+ meshes
- **Total Plants**: 17 (8 floor/wall plants + 4 desk plants + 5 small decorative)
- **Wall Art**: 5 pieces
- **Office Furniture**: 5 major pieces (printer, filing cabinet, bookshelf, water cooler, meeting table)
- **Desk Items per Agent**: 6 items (lamp, mug, plant, notepad, pen holder, mouse pad)
- **Dynamic Lights**: 4 conditional pointLights (per agent status)

---

## 🔧 Technical Implementation

### Material Properties
- **Wood**: `#6b4423` floor, `#3f2711` table (roughness 0.9/0.3)
- **Metal**: Filing cabinet, printer (metalness 0.6-0.8)
- **Plants**: Various greens (#16a34a, #22c55e, #15803d)
- **Pots**: Browns (#8b4513, #92400e, #78350f, #d97706)

### Performance
- All geometry primitives (no external GLB for decorations)
- Efficient instancing via `.map()` for repeated elements
- Conditional rendering for dynamic lights (only when `status === 'working'`)

---

## 🎨 Color Palette

### Primary Colors
- **Floor**: #6b4423 (dark brown wood)
- **Walls**: #2a2a2a, #252525 (dark gray)
- **Accent**: Agent colors (blue/orange/green/purple)

### Materials
- **Plants**: #16a34a, #22c55e, #15803d (greens)
- **Pots**: #8b4513, #92400e, #78350f (browns)
- **Office**: #1f2937, #374151, #6b7280 (grays)
- **Wall Art**: #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981 (vibrant)

---

## 🚀 Future Enhancements (Optional)

- [ ] Ceiling fan with rotating blades
- [ ] Window dengan animated blinds
- [ ] Animated coffee steam dari mugs
- [ ] Keyboard dengan glowing RGB lights
- [ ] Monitor screens dengan dynamic content
- [ ] Air purifier/humidifier
- [ ] Motivational posters dengan quotes
- [ ] Coat rack dengan jackets
- [ ] Mini fridge

---

**Generated**: 2026-08-30 00:18 WIB
**Author**: Hermes Agent (Kiro)
**Project**: ~/agent-ops-dashboard
