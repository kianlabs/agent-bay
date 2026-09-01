'use client'

import { useEffect, useState, useRef } from 'react'
import { subscribeNotifications, markAllRead, type Notification } from './NotificationCenter'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    const unsub = subscribeNotifications(setNotifications)
    return () => { unsub() }
  }, [])

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleOpen() {
    setOpen((prev) => !prev)
    if (!open) {
      // Mark all read when opening
      setTimeout(markAllRead, 300)
    }
  }

  function formatTime(date: Date) {
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative w-11 h-11 rounded-full flex items-center justify-center hover:bg-[var(--bg-surface-hover)] transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          style={{ color: 'var(--text-primary)' }}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 min-w-[1.1rem] h-[1.1rem] rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none px-0.5"
            style={{ background: 'var(--status-error)' }}
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Notification history"
          className="absolute right-0 top-14 w-80 rounded-xl shadow-2xl border overflow-hidden z-[300]"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </span>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div
                className="px-4 py-8 text-center text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors"
                  style={{
                    borderColor: 'var(--border)',
                    background: n.read ? 'transparent' : 'rgba(88,166,255,0.04)',
                  }}
                >
                  {/* Type dot */}
                  <span
                    className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                    style={{
                      background:
                        n.type === 'success'
                          ? 'var(--status-running)'
                          : n.type === 'error'
                          ? 'var(--status-error)'
                          : '#58a6ff',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm leading-snug"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {n.message}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {formatTime(n.timestamp)}
                    </p>
                  </div>
                  {!n.read && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                      style={{ background: '#58a6ff' }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
