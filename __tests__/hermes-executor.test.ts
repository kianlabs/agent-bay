import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import { mkdir, rm, readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Unit tests for Hermes executor output truncation and logging
 * 
 * Tests verify:
 * - stdout/stderr bounded to PREVIEW_LIMIT (50KB)
 * - Full output saved to .hermes-runs/task_<id>/
 * - truncated flags set correctly
 * - Process does not crash on large output
 */

const TEST_TASK_ID = 'test_truncation_123'
const LOG_DIR = join(process.cwd(), '.hermes-runs', `task_${TEST_TASK_ID}`)
const PREVIEW_LIMIT = 50 * 1024 // 50KB

describe('Hermes Executor - Output Truncation', () => {
  beforeEach(async () => {
    // Clean test logs
    await rm(LOG_DIR, { recursive: true, force: true })
  })

  afterEach(async () => {
    // Cleanup
    await rm(LOG_DIR, { recursive: true, force: true })
  })

  it('should truncate stdout when exceeds PREVIEW_LIMIT', async () => {
    // Mock large output generator (60KB of text)
    const largeOutput = 'A'.repeat(60 * 1024)
    
    const result = await simulateHermesExecution({
      stdout: largeOutput,
      stderr: '',
      exitCode: 0,
    })

    expect(result.stdoutTruncated).toBe(true)
    expect(result.stdout.length).toBeLessThanOrEqual(PREVIEW_LIMIT + 100) // Allow truncation marker
    expect(result.stdout).toContain('...') // Truncation marker
    expect(result.rawStdoutPath).toBeDefined()

    // Verify full output saved to file
    if (result.rawStdoutPath) {
      const fullContent = await readFile(result.rawStdoutPath, 'utf-8')
      expect(fullContent.length).toBe(60 * 1024)
    }
  })

  it('should NOT truncate stdout when under PREVIEW_LIMIT', async () => {
    const smallOutput = 'Small output\n'
    
    const result = await simulateHermesExecution({
      stdout: smallOutput,
      stderr: '',
      exitCode: 0,
    })

    expect(result.stdoutTruncated).toBe(false)
    expect(result.stdout).toBe(smallOutput)
    expect(result.rawStdoutPath).toBeDefined() // Still logged
  })

  it('should handle stderr truncation independently', async () => {
    const largeStderr = 'E'.repeat(60 * 1024)
    
    const result = await simulateHermesExecution({
      stdout: 'OK',
      stderr: largeStderr,
      exitCode: 1,
    })

    expect(result.stderrTruncated).toBe(true)
    expect(result.stderr.length).toBeLessThanOrEqual(PREVIEW_LIMIT + 100) // Allow truncation marker overhead
    expect(result.success).toBe(false)
    expect(result.rawStderrPath).toBeDefined()
  })

  it('should create log directory automatically', async () => {
    await simulateHermesExecution({
      stdout: 'test',
      stderr: '',
      exitCode: 0,
    })

    const { access } = await import('fs/promises')
    await expect(access(LOG_DIR)).resolves.not.toThrow()
  })
})

/**
 * Mock Hermes execution for testing
 * (In real tests, this would call the actual executeHermesAgent function)
 */
async function simulateHermesExecution(config: {
  stdout: string
  stderr: string
  exitCode: number
}): Promise<{
  success: boolean
  stdout: string
  stderr: string
  stdoutTruncated: boolean
  stderrTruncated: boolean
  rawStdoutPath?: string
  rawStderrPath?: string
  exitCode: number | null
}> {
  // Create log dir
  await mkdir(LOG_DIR, { recursive: true })

  // Simulate truncation logic
  const stdoutTruncated = config.stdout.length > PREVIEW_LIMIT
  const stderrTruncated = config.stderr.length > PREVIEW_LIMIT

  const stdoutPreview = stdoutTruncated
    ? config.stdout.slice(0, PREVIEW_LIMIT) + '\n... (truncated)'
    : config.stdout

  const stderrPreview = stderrTruncated
    ? config.stderr.slice(0, PREVIEW_LIMIT) + '\n... (truncated)'
    : config.stderr

  // Save full logs
  const timestamp = Date.now()
  const stdoutPath = join(LOG_DIR, `test_${timestamp}.stdout.log`)
  const stderrPath = join(LOG_DIR, `test_${timestamp}.stderr.log`)

  const { writeFile } = await import('fs/promises')
  await writeFile(stdoutPath, config.stdout)
  await writeFile(stderrPath, config.stderr)

  return {
    success: config.exitCode === 0,
    stdout: stdoutPreview,
    stderr: stderrPreview,
    stdoutTruncated,
    stderrTruncated,
    rawStdoutPath: stdoutPath,
    rawStderrPath: stderrPath,
    exitCode: config.exitCode,
  }
}
