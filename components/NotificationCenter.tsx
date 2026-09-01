'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPusherClient } from '@/lib/pusher-client'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  timestamp: Date
  read: boolean
}

interface Toast extends Notification {
  exiting: boolean
}

// Shared notification store (module-level so Bell and Center share state)
type Listener = (notifications: Notification[]) => void
const listeners: Set<Listener> = new Set()
let notificationStore: Notification[] = []

export function subscribeNotifications(listener: Listener) {
  listeners.add(listener)
  listener(notificationStore)
  return () => listeners.delete(listener)
}

export function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  const n: Notification = {
    ...notification,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date(),
    read: false,
  }
  notificationStore = [n, ...notificationStore].slice(0, 20)
  listeners.forEach((l) => l(notificationStore))
  return n
}

export function markAllRead() {
  notificationStore = notificationStore.map((n) => ({ ...n, read: true }))
  listeners.forEach((l) => l(notificationStore))
}

export default function NotificationCenter() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: string) => {
    // Trigger exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  const pushToast = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const n = addNotification(notification)
      const toast: Toast = { ...n, exiting: false }

      setToasts((prev) => {
        // Max 3 visible at once — drop oldest if needed
        const next = [toast, ...prev].slice(0, 3)
        return next
      })

      setTimeout(() => dismissToast(n.id), 4000)
    },
    [dismissToast]
  )

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe('agent-ops')

    // task-updated
    channel.bind('task-updated', (data: any) => {
      if (data.status === 'completed') {
        pushToast({ type: 'success', message: 'Task selesai' })
      } else if (data.status === 'error' || data.status === 'failed') {
        const name = data.agentName || data.agentId || 'Agent'
        pushToast({ type: 'error', message: `Task gagal: ${name}` })
      }
    })

    // agent-updated
    channel.bind('agent-updated', (data: any) => {
      if (data.status === 'error') {
        const name = data.agentName || data.agentId || 'Agent'
        pushToast({ type: 'error', message: `${name} mengalami error` })
      } else if (data.status === 'working' || data.status === 'running') {
        const name = data.agentName || data.agentId || 'Agent'
        pushToast({ type: 'info', message: `${name} mulai bekerja` })
      }
    })

    // metrics-updated — record silently (no toast, just history)
    channel.bind('metrics-updated', (data: any) => {
      addNotification({ type: 'info', message: 'Metrics diperbarui' })
    })

    return () => {
      channel.unbind('task-updated')
      channel.unbind('agent-updated')
      channel.unbind('metrics-updated')
    }
  }, [pushToast])

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-24 right-4 z-[200] flex flex-col gap-2 items-end pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs w-full',
            'transition-all duration-300',
            toast.exiting
              ? 'opacity-0 translate-x-4'
              : 'opacity-100 translate-x-0',
            toast.type === 'success'
              ? 'bg-[#1a2f1a] border border-[#3fb950] text-[#3fb950]'
              : toast.type === 'error'
              ? 'bg-[#2f1a1a] border border-[#f85149] text-[#f85149]'
              : 'bg-[#1a1f2f] border border-[#58a6ff] text-[#58a6ff]',
          ].join(' ')}
          role="status"
        >
          {/* Icon */}
          <span className="mt-0.5 shrink-0">
            {toast.type === 'success' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </span>
          <span className="flex-1">{toast.message}</span>
          {/* Dismiss */}
          <button
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss notification"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
