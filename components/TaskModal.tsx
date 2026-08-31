'use client'

import { useState } from 'react'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (prompt: string) => void
}

export default function TaskModal({ isOpen, onClose, onSubmit }: TaskModalProps) {
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(prompt)
      setPrompt('')
      onClose()
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <div 
        className="w-full rounded-t-3xl p-6 shadow-2xl animate-slide-up"
        style={{ background: 'white', maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-1 rounded-full" style={{ background: '#E0E0E0' }}></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
            New Task
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: '#F5F5F5' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="#666" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label 
              htmlFor="prompt" 
              className="block text-sm font-medium mb-2"
              style={{ color: '#666' }}
            >
              What do you want to build?
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create a responsive navbar with dropdown menu..."
              className="w-full px-4 py-3 rounded-2xl border-2 resize-none focus:outline-none transition-all"
              style={{ 
                background: '#F8F9FA', 
                borderColor: prompt ? '#667eea' : '#E0E0E0',
                color: '#1A1A1A',
              }}
              rows={5}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-2xl font-medium transition-colors"
              style={{ 
                background: '#F5F5F5',
                color: '#666'
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-2xl font-medium transition-all disabled:opacity-50"
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}
              disabled={!prompt.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
