'use client'

import Link from 'next/link'

export default function MorePage() {
  const menuItems = [
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      href: '#'
    },
    { 
      id: 'logs', 
      label: 'Execution Logs', 
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      href: '#'
    },
    { 
      id: 'docs', 
      label: 'Documentation', 
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      href: '#'
    },
    { 
      id: 'github', 
      label: 'GitHub Repository', 
      icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
      href: 'https://github.com/kianlabs/agent-bay',
      external: true
    },
    { 
      id: 'about', 
      label: 'About Agent Bay', 
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      href: '#'
    }
  ]

  return (
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          More
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Settings and information
        </p>
      </header>

      {/* Menu Items */}
      <section className="px-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            target={item.external ? '_blank' : undefined}
            className="flex items-center gap-3 p-4 rounded-2xl transition-colors"
            style={{ 
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)'
            }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent-bg)' }}
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="var(--accent)" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {item.label}
              </h3>
            </div>
            <svg 
              className="w-5 h-5 flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: 'var(--text-muted)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </section>

      {/* Version Info */}
      <section className="px-4 mt-8">
        <div 
          className="p-4 rounded-2xl text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Agent Bay Dashboard
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Version 2.0.0
          </p>
        </div>
      </section>
    </main>
  )
}
