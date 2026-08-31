'use client'

import { useEffect, useState } from 'react'
import TaskList from '@/components/TaskList'
import TaskModal from '@/components/TaskModal'

export default function TasksPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCreateTask = async (prompt: string) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    })
    
    if (!res.ok) {
      throw new Error('Failed to create task')
    }
  }

  return (
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-4 border-b" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Tasks
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Manage and monitor all tasks
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            + New Task
          </button>
        </div>
      </header>

      {/* Task List */}
      <section className="p-4">
        <TaskList />
      </section>

      {/* Bottom Navigation Spacer */}
      <div className="h-20"></div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTask}
      />
    </main>
  )
}
