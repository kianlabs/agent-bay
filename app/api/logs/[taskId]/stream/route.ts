import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

// Same regex as existing logs route
const TASK_ID_RE = /^[a-zA-Z0-9_-]+$/

// How often to poll for new lines / task status (ms)
const POLL_INTERVAL_MS = 500

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { taskId } = params

  if (!TASK_ID_RE.test(taskId)) {
    return new Response('Invalid task ID', { status: 400 })
  }

  const runDir = path.join(process.cwd(), '.hermes-runs', `task_${taskId}`)

  const encoder = new TextEncoder()

  function sseMessage(event: string, data: string): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${data}\n\n`)
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Track read positions per log file
      const filePositions: Record<string, number> = {}
      // Track which files we've seen
      const knownFiles = new Set<string>()

      let closed = false

      function enqueue(chunk: Uint8Array) {
        if (!closed) {
          try {
            controller.enqueue(chunk)
          } catch {
            // controller already closed
          }
        }
      }

      function close() {
        if (!closed) {
          closed = true
          try {
            controller.close()
          } catch {
            // already closed
          }
        }
      }

      // Send a keepalive comment
      enqueue(encoder.encode(': keepalive\n\n'))

      async function tick() {
        if (closed) return

        // --- Check task status ---
        try {
          const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { status: true },
          })

          if (task && (task.status === 'completed' || task.status === 'error')) {
            // Drain any remaining log lines before closing
            await drainLogs()
            enqueue(
              sseMessage('status', JSON.stringify({ status: task.status }))
            )
            close()
            return
          }
        } catch {
          // DB error — keep streaming
        }

        await drainLogs()

        if (!closed) {
          setTimeout(tick, POLL_INTERVAL_MS)
        }
      }

      async function drainLogs() {
        // Check if run directory exists
        let entries: string[]
        try {
          entries = fs.readdirSync(runDir)
        } catch {
          return
        }

        const logFiles = entries.filter((f) => f.endsWith('.log'))

        for (const file of logFiles) {
          const filePath = path.join(runDir, file)
          const agentName = file.replace(/\.log$/, '')

          if (!knownFiles.has(file)) {
            knownFiles.add(file)
            filePositions[file] = 0
            // Announce new agent log file
            enqueue(
              sseMessage('agent', JSON.stringify({ agent: agentName }))
            )
          }

          // Read new bytes since last position
          let fd: number | null = null
          try {
            const stat = fs.statSync(filePath)
            const fileSize = stat.size
            const pos = filePositions[file] ?? 0

            if (fileSize <= pos) continue

            fd = fs.openSync(filePath, 'r')
            const bufSize = fileSize - pos
            const buf = Buffer.alloc(bufSize)
            const bytesRead = fs.readSync(fd, buf, 0, bufSize, pos)
            fs.closeSync(fd)
            fd = null

            if (bytesRead > 0) {
              filePositions[file] = pos + bytesRead
              const newText = buf.subarray(0, bytesRead).toString('utf-8')
              const lines = newText.split('\n')

              for (const line of lines) {
                // Skip empty lines that result from trailing newline splits
                if (line === '') continue
                enqueue(
                  sseMessage(
                    'log',
                    JSON.stringify({ agent: agentName, line })
                  )
                )
              }
            }
          } catch {
            if (fd !== null) {
              try { fs.closeSync(fd) } catch { /* ignore */ }
            }
          }
        }
      }

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        close()
      })

      // Kick off polling
      setTimeout(tick, 0)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
