'use client'

import { useRouter, usePathname } from 'next/navigation'

const tabs = [
  {
    id: 'office',
    label: 'Office',
    href: '/',
    icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  },
  {
    id: 'leads',
    label: 'Leads',
    href: '/?tab=leads',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    href: '/?tab=inbox',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    id: 'team',
    label: 'Team',
    href: '/?tab=team',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    emoji: '📊',
  },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (tab: (typeof tabs)[number]) => {
    if (tab.href === '/analytics') return pathname === '/analytics'
    return pathname === '/' && tab.id === 'office'
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around border-t"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab)
        return (
          <button
            key={tab.id}
            onClick={() => router.push(tab.href)}
            className="flex-1 flex flex-col items-center gap-1 py-2 transition-colors"
            style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {'emoji' in tab ? (
              <span className="text-xl leading-6">{tab.emoji}</span>
            ) : (
              <svg
                className="w-6 h-6"
                fill={active ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={tab.icon}
                />
              </svg>
            )}
            <span className="text-xs font-semibold">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
