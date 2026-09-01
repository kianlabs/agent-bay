import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

interface LogEntry {
  agent: string
  content: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params
    if (!/^[a-zA-Z0-9_-]+$/.test(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }
    const runDir = path.join(process.cwd(), '.hermes-runs', `task_${taskId}`)

    // Check directory exists
    try {
      await fs.access(runDir)
    } catch {
      return NextResponse.json({ logs: [] })
    }

    const entries = await fs.readdir(runDir)
    const logFiles = entries.filter((f) => f.endsWith('.log'))

    const logs: LogEntry[] = await Promise.all(
      logFiles.map(async (file) => {
        const content = await fs.readFile(path.join(runDir, file), 'utf-8')
        const agent = file.replace(/\.log$/, '')
        return { agent, content }
      })
    )

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('[API logs] Error reading logs:', error)
    return NextResponse.json(
      { error: 'Failed to read logs' },
      { status: 500 }
    )
  }
}
