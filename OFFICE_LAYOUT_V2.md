# 🏢 Office Layout v2 - Realistic Modern Office

**Updated**: 2026-08-30 00:33 WIB  
**File**: `components/OfficeDecor.tsx` (443 lines, 16.2KB)  
**Reference**: Low-poly modern office design

---

## 🎨 New Layout Overview

Kantor modern dengan **lounge area + work zones** yang realistis, inspired by reference design.

### Key Zones
1. **Lounge Area** (Back-Left): Navy sofa + coffee table + bean bag
2. **Work Area** (Front): 4 agent desks dengan proper spacing
3. **Casual Seating** (Back-Right): Teal sofa dengan lime pillows
4. **Storage**: 2 filing cabinets side-by-side
5. **Entrance**: Blue door + venetian window

---

## 🛋️ Lounge Furniture

### Navy Blue Sofa (Back-Left)
- **Position**: `[-7, 0, 6]` rotated 45°
- **Components**:
  - Base cushion (2.5×1×0.6)
  - Back cushion (0.8 height)
  - 3 seat cushions (lighter navy)
  - 2 arms (0.2 width each)
- **Color**: #1e3a5f (navy), #2c5282 (cushions)

### Coffee Table (Center)
- **Position**: `[0, 0, 3]`
- **Style**: Glass top + black metal frame
- **Components**:
  - Glass top (1.5×0.9, transparent #b0d4f1)
  - 4 cylindrical legs (black, 0.03 radius)
  - Lower glass shelf
- **Height**: 0.4 units

### Red Bean Bag / Pouf
- **Position**: `[-2, 0, 8]` (near blue door)
- **Style**: Spherical segment (hemisphere)
- **Color**: #dc2626 (red)
- **Radius**: 0.5 units

### Teal Sofa with Lime Pillows (Back-Right)
- **Position**: `[8, 0, 7]` rotated -30°
- **Components**:
  - Teal base (2.2×1, #14b8a6)
  - 2 lime green pillows (#84cc16)
  - 2 arms
- **Style**: Modern curved sofa

---

## 🎨 Rugs

### Geometric Patterned Rug (Center)
- **Position**: `[0, 0.01, 3]`
- **Size**: 4×3 units
- **Pattern**: Blue base (#60a5fa) + white/gray diamonds
- **Grid**: 12 diamond shapes (4×3 array)
- **Colors**: #ffffff (white), #94a3b8 (gray), alternating

### Red Circular Rug (Right)
- **Position**: `[8, 0.01, 7]` (under teal sofa)
- **Size**: 1.5 radius
- **Color**: #ef4444 (red)
- **Shape**: Perfect circle (32 segments)

---

## 🚪 Architectural Elements

### Blue Door (Back-Center-Left)
- **Position**: `[-2, 1.2, -9.8]`
- **Size**: 1×2.4 units
- **Color**: #3b82f6 (bright blue)
- **Hardware**: White/gray cylindrical handle (#f3f4f6)
- **Position**: Right side, 0.35 from center

### Venetian Blinds Window (Back-Center)
- **Position**: `[1, 6, -9.7]`
- **Size**: 3×1.5 window frame
- **Color**: #d4a574 (wood tone)
- **Slats**: 12 horizontal slats, slightly tilted (π/12)
- **Style**: Classic venetian blinds

---

## 🖼️ Wall Decorations

### Pink Geometric Art (Left Wall)
- **Position**: `[-14.5, 6, 5]`
- **Frame**: Black 1.2×1.6 portrait
- **Base**: Pink (#ec4899)
- **Shapes**: 
  - Rotated square (#f43f5e)
  - Circle (#fda4af)
- **Style**: Abstract geometric

### Red Vertical Panel (Right Wall)
- **Position**: `[14.5, 3, 7]`
- **Size**: 2×5 tall vertical panel
- **Color**: #dc2626 (bright red)
- **Style**: Minimalist solid color

### Wall Clock (Back Wall - Right)
- **Position**: `[3, 6, -9.8]`
- **Style**: Round analog clock
- **Frame**: Dark gray (#1f2937), 0.4 radius
- **Face**: White (#f3f4f6)
- **Hands**: 2 black hands (hour + minute)

### White Wall Shelf (Back-Right)
- **Position**: `[5, 7, -9.7]`
- **Size**: 1.5×0.8×0.3
- **Color**: #f3f4f6 (white)
- **Style**: Floating shelf/cabinet

---

## 🗄️ Filing Cabinets (Professional Storage)

### Setup: 2 Cabinets Side-by-Side
- **Position**: `[5, 0, -1]`
- **Arrangement**: 0.6 units apart (-0.3 and +0.3)

### Each Cabinet:
- **Body**: 0.5×1.2×0.6 dark gray (#1f2937)
- **Finish**: Metallic (0.6 metalness)
- **Drawers**: 3 stacked (0.35 spacing)
  - Drawer face: #374151
  - Handle: #9ca3af (light gray bar, 0.12 width)

---

## 🌿 Plants (Strategic Placement)

### 1. Floor Plant - Center-Front
- **Position**: `[0.5, 0, 2]`
- **Pot**: 0.15 radius, brown (#92400e)
- **Leaves**: 5 green spheres (#22c55e) radiating

### 2. Floor Plant - Center
- **Position**: `[-1, 0, 3.5]`
- **Pot**: 0.12 radius, dark brown (#78350f)
- **Leaves**: 3 cone-shaped (#16a34a) stacked

### 3. Tall Floor Plant - Right Foreground
- **Position**: `[4.5, 0, -1.5]` (near filing cabinets)
- **Pot**: 0.2 radius, brown (#854d0e), tall (0.8 height)
- **Leaves**: 6 cone leaves (#15803d) radiating, tall stems

### 4-7. Desk Plants
- **Per Agent Desk**: Small pot (0.06 radius, #d97706)
- **Leaves**: 3 sphere leaves (#15803d)
- **Position**: Back corner of each desk

---

## 💼 Desk Items (Per Agent × 4)

### Smart Desk Lamp 💡
- **Dynamic lighting based on agent status**
- Working: Glows with agent color + pointLight
- Idle/Error: Gray (#6b7280), no light

### Coffee Mug ☕
- Dark blue ceramic (#1e293b)
- C-shaped handle (torus geometry)

### Small Plant 🌱
- Orange pot + 3 green sphere leaves

### Yellow Notepad 📝
- Color: #fbbf24
- Size: 0.2×0.25

### Pen Holder ✏️
- Black cylinder (#1f2937)
- 3 pens: Blue (#3b82f6), Red (#ef4444), Black (#1f2937)

### Mouse Pad 🖱️
- Dark gray (#374151)
- Size: 0.35×0.28

---

## 📊 Statistics

| Element | Count | Notes |
|---------|-------|-------|
| **Sofas** | 2 | Navy (left), Teal (right) |
| **Rugs** | 2 | Geometric center, Red circular |
| **Filing Cabinets** | 2 | Side-by-side, 3 drawers each |
| **Plants** | 7 | 3 floor + 4 desk |
| **Wall Art** | 4 | Pink geometric, Red panel, Clock, White shelf |
| **Door/Window** | 2 | Blue door, Venetian blinds |
| **Desk Items** | 24 | 6 items × 4 agents |

---

## 🎯 Key Improvements from v1

### ✅ Added
- Lounge area with sofas (navy + teal)
- Coffee table with glass shelves
- Red bean bag seating
- 2 decorative rugs (geometric + circular)
- Blue door entrance
- Venetian blinds window
- Professional filing cabinets (proper 3-drawer units)
- Improved plant placement (strategic corners)

### ♻️ Removed
- Old printer station (replaced with lounge)
- Bookshelf (cleaner wall space)
- Water cooler (simplified)
- Excess wall clutter

### 🎨 Color Palette
- **Primary**: Navy (#1e3a5f), Teal (#14b8a6), Blue (#3b82f6)
- **Accents**: Red (#dc2626, #ef4444), Lime (#84cc16), Pink (#ec4899)
- **Neutrals**: Grays (#1f2937, #374151, #6b7280), Wood (#d4a574)

---

## 🚀 Scene Comparison

| Feature | v1 (Old) | v2 (New) |
|---------|----------|----------|
| **Layout** | Office-only | Mixed lounge + work |
| **Furniture** | Basic | Sofas, coffee table, bean bag |
| **Rugs** | None | 2 decorative rugs |
| **Storage** | Single printer | 2 proper filing cabinets |
| **Door** | None | Blue entrance door |
| **Window** | Simple whiteboard | Venetian blinds |
| **Plants** | 8 random | 7 strategic |
| **Lines** | 562 | 443 (cleaner) |
| **Style** | Generic | Modern low-poly |

---

**Generated**: 2026-08-30 00:33 WIB  
**Author**: Hermes Agent (Kiro)  
**Project**: ~/agent-ops-dashboard  
**Reference**: Modern office 3D design
