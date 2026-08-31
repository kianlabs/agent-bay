/**
 * Task Recovery Configuration
 * 
 * Defines thresholds and policies for recovering stale/orphaned tasks
 */

// How long before a task is considered stale (10 minutes)
export const TASK_STALE_AFTER_MS = 10 * 60 * 1000

// Task statuses that can be recovered
export const RECOVERABLE_STATUSES = ['pending', 'planning', 'running'] as const

// Core worker agent names (exclude Hermes Main)
export const CORE_WORKERS = ['Researcher', 'Backend', 'Frontend', 'Review'] as const

export type RecoverableStatus = typeof RECOVERABLE_STATUSES[number]
