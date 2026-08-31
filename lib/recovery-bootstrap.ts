/**
 * Task Recovery Bootstrap
 * 
 * Safely initializes recovery on app startup.
 * Uses singleton pattern to prevent duplicate initialization on hot reload.
 */

import { recoverStaleTasks } from './task-recovery'

// Singleton flag to prevent duplicate initialization
let recoveryInitialized = false

/**
 * Initialize task recovery system
 * 
 * Safe to call multiple times - will only run once per process.
 * Call this during app bootstrap (e.g., in API route initialization).
 */
export async function initializeRecovery(): Promise<void> {
  if (recoveryInitialized) {
    console.log('[RecoveryBootstrap] Already initialized, skipping')
    return
  }

  recoveryInitialized = true
  console.log('[RecoveryBootstrap] Initializing task recovery...')

  try {
    // Run initial recovery scan
    await recoverStaleTasks()
    console.log('[RecoveryBootstrap] Initial recovery complete')
  } catch (error) {
    console.error('[RecoveryBootstrap] Initial recovery failed:', error)
    // Don't throw - app should still start even if recovery fails
  }
}

/**
 * Reset initialization flag (for testing only)
 */
export function resetRecoveryBootstrap(): void {
  recoveryInitialized = false
  console.log('[RecoveryBootstrap] Reset initialization flag')
}
