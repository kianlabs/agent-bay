# 🤖 Agent Bay

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Pusher](https://img.shields.io/badge/Pusher-WebSocket-300D4F?style=flat-square&logo=pusher)](https://pusher.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**A real-time multi-agent AI coding dashboard for orchestrating parallel AI workflows.**

[Features](#features) · [Getting Started](#getting-started) · [Architecture](#architecture) · [API Reference](#api-reference) · [Contributing](#contributing)

</div>

---

## 📸 Demo

<div align="center">

| Dashboard Overview | Task Detail | Analytics |
|---|---|---|
| [Dashboard Screenshot] | [Task Detail Screenshot] | [Analytics Screenshot] |

> 🎬 [Live Demo GIF — Agent execution in real-time]

</div>

---

## ✨ Features

### 📡 Real-time Monitoring
- **Live log streaming** via Server-Sent Events (SSE) — watch agents think and act as it happens
- **WebSocket updates** powered by Pusher for instant dashboard refresh
- **Agent status indicators** — idle, running, completed, or failed at a glance
- **Notification center** with real-time alerts for task events

### 📋 Task Management
- **Submit coding tasks** through a clean form interface
- **Cancel running tasks** mid-execution with graceful shutdown
- **Task recovery** — resume interrupted tasks without losing progress
- **Task detail page** with full execution history and agent logs
- **Execution locking** to prevent duplicate concurrent runs

### 🧠 Multi-Agent Orchestration
- **5 specialized Hermes AI agents**: Main (orchestrator), Researcher, Frontend, Backend, Review
- **DAG dependency graph** — visualize task dependencies and execution order
- **Parallel agent execution** — multiple agents work simultaneously on subtasks
- **Automatic task planning** — Main agent decomposes complex requests into subtasks

### 📊 Analytics & Observability
- **Analytics page** with interactive charts powered by Recharts
- **Task success/failure rates**, execution time trends, and agent utilization
- **Mobile-optimized** layout — monitor deployments from anywhere
- **Full execution history** with searchable log records

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14, React, Tailwind CSS | App shell, routing, UI components |
| **Backend** | Next.js API Routes, Node.js | REST API, SSE log streaming |
| **Database** | Prisma ORM + SQLite | Task, agent, and log persistence |
| **Real-time** | Pusher WebSocket | Live dashboard updates across clients |
| **AI Agents** | Hermes Agent CLI | Orchestration, code generation, review |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        User                              │
│                         │                               │
│                         ▼                               │
│              ┌─────────────────────┐                    │
│              │   Next.js Dashboard │                    │
│              │  (React + Tailwind) │                    │
│              └────────┬────────────┘                    │
│                       │  REST API / SSE                 │
│                       ▼                                 │
│              ┌─────────────────────┐                    │
│              │   API Routes        │◄──── Pusher WS ────┐│
│              │  (Next.js Backend)  │                    ││
│              └────────┬────────────┘                    ││
│                       │                                 ││
│                       ▼                                 ││
│              ┌─────────────────────┐                    ││
│              │   Hermes Main Agent │                    ││
│              │   (Orchestrator)    │────────────────────┘│
│              └────────┬────────────┘   Pusher Events     │
│                       │ Spawn & Coordinate               │
│          ┌────────────┼────────────┐                     │
│          ▼            ▼            ▼                     │
│   ┌────────────┐ ┌──────────┐ ┌──────────┐             │
│   │ Researcher │ │ Frontend │ │ Backend  │             │
│   │   Agent    │ │  Agent   │ │  Agent   │             │
│   └────────────┘ └──────────┘ └──────────┘             │
│                       │                                  │
│                       ▼                                  │
│              ┌─────────────────────┐                    │
│              │    Review Agent     │                    │
│              │  (QA & Validation)  │                    │
│              └────────┬────────────┘                    │
│                       │                                  │
│                       ▼                                  │
│              ┌─────────────────────┐                    │
│              │   Results + Logs    │                    │
│              │   (Prisma/SQLite)   │                    │
│              └─────────────────────┘                    │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** / **pnpm**
- **Hermes Agent CLI** installed and configured
- **Pusher account** (free tier works fine) — [sign up here](https://pusher.com/)

### Installation

```bash
# Clone the repository
git clone https://github.com/kianlabs/agent-bay.git
cd agent-bay

# Install dependencies
npm install
# or
pnpm install
```

### Environment Setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

See the [Environment Variables](#environment-variables) section for a full reference.

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates SQLite DB)
npx prisma migrate dev --name init

# (Optional) seed with sample data
npx prisma db seed
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

> **Tip:** Pusher keys must be set before real-time features activate. Without them, the app falls back to polling.

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Prisma DB connection string (e.g. `file:./dev.db`) |
| `PUSHER_APP_ID` | ✅ | Pusher application ID |
| `PUSHER_KEY` | ✅ | Pusher public key |
| `PUSHER_SECRET` | ✅ | Pusher secret key |
| `PUSHER_CLUSTER` | ✅ | Pusher cluster region (e.g. `ap1`) |
| `NEXT_PUBLIC_PUSHER_KEY` | ✅ | Pusher key exposed to the browser |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | ✅ | Pusher cluster exposed to the browser |
| `HERMES_MODEL` | ✅ | Model identifier for Hermes agents (e.g. `hermes-3-405b`) |
| `HERMES_API_KEY` | ✅ | API key for the Hermes provider |
| `HERMES_BASE_URL` | ⬜ | Custom base URL if using a self-hosted Hermes gateway |
| `MAX_CONCURRENT_AGENTS` | ⬜ | Max agents to run in parallel (default: `3`) |
| `TASK_TIMEOUT_MS` | ⬜ | Task execution timeout in milliseconds (default: `300000`) |
| `LOG_LEVEL` | ⬜ | Logging verbosity: `debug`, `info`, `warn`, `error` |

---

## 📡 API Reference

All endpoints are under `/api` and return JSON.

### Agents

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/agents` | List all agents and their current status |
| `GET` | `/api/agents/:id` | Get a single agent's details and stats |
| `POST` | `/api/agents/:id/restart` | Restart a specific agent process |

### Tasks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | List tasks (supports `?status=`, `?limit=`, `?offset=`) |
| `POST` | `/api/tasks` | Submit a new task for orchestration |
| `GET` | `/api/tasks/:id` | Get task details, subtasks, and DAG |
| `DELETE` | `/api/tasks/:id` | Cancel a running task |
| `GET` | `/api/tasks/:id/status` | Poll task execution status |

### Logs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/logs` | Query logs with filters (`?taskId=`, `?agentId=`, `?level=`) |
| `GET` | `/api/logs/stream` | SSE endpoint — stream live logs for a task |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics` | Aggregate stats: success rates, avg duration, agent utilization |
| `GET` | `/api/analytics/timeline` | Task throughput over time (supports `?range=7d\|30d`) |

### Notifications

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | Get recent notifications for the current session |
| `POST` | `/api/notifications/read` | Mark notifications as read |

---

## 📁 Project Structure

```
agent-bay/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Dashboard layout group
│   │   ├── page.tsx            # Main dashboard view
│   │   ├── tasks/
│   │   │   ├── page.tsx        # Task list
│   │   │   └── [id]/page.tsx   # Task detail + live logs
│   │   ├── agents/page.tsx     # Agent status grid
│   │   ├── analytics/page.tsx  # Charts and metrics
│   │   └── layout.tsx          # Sidebar + notification center
│   └── api/                    # API route handlers
│       ├── agents/
│       ├── tasks/
│       ├── logs/
│       ├── analytics/
│       └── notifications/
├── components/                 # Shared React components
│   ├── AgentCard.tsx
│   ├── TaskForm.tsx
│   ├── LogStream.tsx
│   ├── DAGGraph.tsx
│   └── NotificationBell.tsx
├── lib/                        # Core logic
│   ├── orchestrator.ts         # Hermes agent spawning & coordination
│   ├── pusher.ts               # Pusher server + client setup
│   ├── prisma.ts               # Prisma client singleton
│   └── execution-lock.ts       # Distributed execution locking
├── prisma/
│   ├── schema.prisma           # DB schema
│   └── migrations/
├── public/
├── .env.example
└── package.json
```

---

## ⚙️ How It Works

Agent Bay turns a natural-language coding request into coordinated, parallel agent work across three phases:

**1. Planning**
The Main (orchestrator) agent receives a task and decomposes it into a DAG of subtasks — identifying dependencies, parallelizable work, and the right specialist for each piece.

**2. Parallel Execution**
Worker agents (Researcher, Frontend, Backend) execute their subtasks concurrently. Each agent streams logs back to the dashboard via SSE, and status updates are broadcast to all connected clients through Pusher.

**3. Evaluation**
Once subtasks complete, the Review agent runs quality checks across the combined output, flags issues, and either approves the result or triggers targeted retries. Final output and execution metadata are persisted to the database.

> Execution locks prevent duplicate runs, and recovery logic resumes interrupted tasks at the last completed checkpoint — so a network blip doesn't waste your compute.

---

## 🤝 Contributing

Contributions are welcome. To get started:

1. Fork the repo and create a feature branch (`git checkout -b feat/your-feature`)
2. Make your changes and add tests where applicable
3. Open a pull request with a clear description of what changed and why

Please keep PRs focused — one feature or fix per PR makes review much faster.

---

## 📄 License

[MIT](LICENSE) © 2024 [kianlabs](https://github.com/kianlabs)
