# 🔌 Pusher "Connecting..." Badge Fix

## Problem
Badge stuck on "Connecting..." instead of "Live"

## Root Cause
Placeholder credentials in .env not working:
```
PUSHER_KEY="d5f42fd1d2c5e9b1f5d0"  ← Fake key
PUSHER_CLUSTER="ap1"
```

## Solution Options

### Option 1: Get Real Pusher Credentials (Recommended)
1. Sign up: https://dashboard.pusher.com
2. Create app (Free tier, region: Asia Pacific - ap1)
3. Copy credentials to .env:
```env
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-real-key"
PUSHER_SECRET="your-real-secret"
PUSHER_CLUSTER="ap1"

NEXT_PUBLIC_PUSHER_KEY="your-real-key"
NEXT_PUBLIC_PUSHER_CLUSTER="ap1"
```
4. Restart: `npm run dev`

### Option 2: Disable Badge (Quick Fix)
Change badge to always show "Live" without checking connection:

```typescript
// In Header.tsx
<div style={{ color: 'var(--status-running)' }}>
  <span style={{ background: 'var(--status-running)' }}></span>
  Live
</div>
```

### Option 3: Mock Connection (Debug)
Fake connection state in page.tsx:
```typescript
const [connected, setConnected] = useState(true) // Force true
```

## Current Status
- HTTP API: ✅ Working (simulator triggers updates)
- WebSocket: ❌ Not working (placeholder keys)
- 3D Scene: ✅ Works (reads from props, not WS)

## Impact
**Low priority** - Dashboard works without real-time WS:
- API polling works
- Simulator works
- 3D scene updates via props
- Only badge shows "Connecting..."

---

**Decision:** Keep as-is (working dashboard) or spend 5min getting real Pusher keys?
