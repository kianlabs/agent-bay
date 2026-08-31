'use client'

import { useState } from 'react'
import TaskModal from './TaskModal'

export default function FAB() {
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
    <>
      <button
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform"
        style={{ background: 'var(--accent)' }}
        onClick={() => setIsModalOpen(true)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTask}
      />
    </>
  )
}
