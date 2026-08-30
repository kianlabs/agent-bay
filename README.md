# 🚀 Agent Ops Dashboard - Developer Team Monitor

Real-time dashboard untuk memantau tim developer AI agents (Researcher, Frontend, Backend, Review).

## 🎯 Features

- ✅ **Real-time Updates** via Pusher WebSocket
- ✅ **4 Developer Agents** dengan role berbeda
- ✅ **Metrics Dashboard**: Tasks, Build Status, Tests, PRs
- ✅ **Speech Bubbles** untuk activity updates
- ✅ **Connection Indicator** (Live badge)
- ✅ **Auto Simulator** untuk demo

## 📦 Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + SQLite
- Pusher (WebSocket)
- React Three Fiber (optional 3D scene)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Pusher
1. Buat akun di [pusher.com](https://pusher.com)
2. Create app (pilih region: Asia Pacific - ap1)
3. Copy credentials ke `.env`:
```env
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
PUSHER_CLUSTER="ap1"

NEXT_PUBLIC_PUSHER_KEY="your-key"
NEXT_PUBLIC_PUSHER_CLUSTER="ap1"
```

### 3. Database Setup
```bash
npx prisma db push
npm run db:seed
```

### 4. Run Dev Server
```bash
npm run dev
```

### 5. Run Simulator (Terminal baru)
```bash
npm run simulate
```

### 6. Open Dashboard
```
http://localhost:3000
```

## 📊 Data Model

### Agent (Developer)
- **Researcher**: Membaca docs, riset arsitektur
- **Frontend**: Menulis komponen UI, styling
- **Backend**: Endpoint API, database migrations
- **Review**: Code review, testing manual

### Metrics
- Tasks completed today
- Build status (passing/failing)
- Tests passed/failed
- PRs reviewed

### Events
- Speech bubbles (mis. "PR approved ✓", "build gagal")

## 🎮 Simulator

Script `simulator.sh` trigger `/api/simulate` setiap 5 detik:
- Random agent berubah status (idle/working/error)
- Task baru sesuai role
- Speech bubbles muncul (25% chance)
- Metrics update (20% chance)

## 📁 Project Structure

```
├── app/
│   ├── page.tsx                    # Main dashboard (Pusher client)
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── agents/route.ts         # GET all agents
│       ├── agents/[id]/route.ts    # PATCH update agent
│       ├── metrics/route.ts        # GET metrics
│       ├── events/route.ts         # POST create event
│       └── simulate/route.ts       # GET trigger random updates
├── components/
│   ├── Header.tsx                  # Connection indicator
│   ├── MetricsGrid.tsx             # 4 metric cards
│   ├── AgentBay.tsx                # Agent cards + speech bubbles
│   ├── AgentDetailList.tsx         # Agent stats
│   ├── FAB.tsx                     # Floating action button
│   └── BottomNav.tsx               # Bottom navigation
├── lib/
│   ├── prisma.ts
│   ├── pusher-server.ts            # Server instance
│   └── pusher-client.ts            # Client instance
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── dev.db
└── simulator.sh                     # Auto-trigger script
```

## 🎨 UI Components

### Header
- Logo + workspace name
- **Live badge** (hijau = connected, abu-abu = disconnected)
- Notification bell
- User avatar

### Metrics Grid (2x2)
1. **Tasks Completed** - angka + "x in progress"
2. **Build Status** - Passing/Failing + waktu terakhir
3. **Tests** - x/y passed + percentage
4. **PRs Reviewed** - angka hari ini

### Developer Bay
- 2x2 grid agent cards
- Avatar + name + current task
- Speech bubbles (auto-hide 4s)
- Status badge (Working/Error)

### Agent Detail List
- Color dot per agent
- Current task description
- Stats: "x in queue · y done"

## 🔄 Pusher Events

**Channel:** `agent-ops`

**Events:**
- `agent-updated` - Status/task berubah
- `metrics-updated` - Metrics berubah
- `new-message` - Speech bubble baru

## 🧪 Testing

### Test API
```bash
# Get agents
curl http://localhost:3000/api/agents | jq

# Get metrics
curl http://localhost:3000/api/metrics | jq

# Trigger simulation
curl http://localhost:3000/api/simulate | jq
```

### Test Pusher
1. Open browser console
2. Watch for: `Pusher state: connected`
3. Watch for events: `Agent updated:`, `Metrics updated:`

## 🐛 Troubleshooting

### "Connecting..." stuck
- Check Pusher credentials di `.env`
- Verify NEXT_PUBLIC_* variables
- Restart dev server

### No real-time updates
- Check browser console for errors
- Verify simulator running: `ps aux | grep simulator`
- Check Pusher dashboard: [dashboard.pusher.com](https://dashboard.pusher.com)

### Database issues
```bash
# Reset database
npx prisma db push --force-reset
npm run db:seed
```

## 📝 Environment Variables

Required in `.env`:
```env
DATABASE_URL="file:./dev.db"
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
PUSHER_CLUSTER="ap1"
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="ap1"
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Use PostgreSQL (replace SQLite):
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. Run migrations: `npx prisma migrate deploy`

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Pusher Docs](https://pusher.com/docs)
- [Prisma Docs](https://prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com)

## 🎯 Next Steps (Optional)

- [ ] Add 3D isometric office (react-three-fiber)
- [ ] Add authentication
- [ ] Add manual task assignment UI
- [ ] Add agent performance charts
- [ ] Add dark mode toggle
- [ ] Deploy to production

---

Built with ❤️ using Next.js + Pusher
