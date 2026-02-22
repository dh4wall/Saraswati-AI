'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'

// ── Types ──────────────────────────────────────────────────────────────────
interface Project {
  id: string
  title: string
  description: string
  createdAt: string
  paperCount: number
  status: 'active' | 'draft' | 'complete'
}

const STATUS_CONFIG = {
  active:   { label: 'Active',    cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  draft:    { label: 'Draft',     cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  complete: { label: 'Complete',  cls: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
}

// Use localStorage — read only after mount to avoid SSR/client hydration mismatch
function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('saraswati_projects')
      if (saved) setProjects(JSON.parse(saved))
    } catch { /* ignore */ }
    setMounted(true)
  }, [])

  const addProject = (p: Project) => {
    const updated = [p, ...projects]
    setProjects(updated)
    localStorage.setItem('saraswati_projects', JSON.stringify(updated))
  }

  return { projects, addProject, mounted }
}

// ── New Project Modal ──────────────────────────────────────────────────────
function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Project) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = () => {
    if (!title.trim()) return
    onCreate({
      id: `proj_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      paperCount: 0,
      status: 'active',
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-[color:var(--color-primary)]">travel_explore</span>
          </div>
          <h3 className="text-xl font-black text-[color:var(--color-deep-indigo)]">New Research Project</h3>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-widest">
              Project Title *
            </label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Survey of Graph Neural Networks"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="w-full border-2 border-slate-200 focus:border-[color:var(--color-primary)] rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-widest">
              Description (optional)
            </label>
            <textarea
              placeholder="What do you want to explore or learn?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full border-2 border-slate-200 focus:border-[color:var(--color-primary)] rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button
            disabled={!title.trim()}
            onClick={handleCreate}
            className="flex-1 bg-[color:var(--color-primary)] text-white py-3 rounded-2xl font-bold disabled:opacity-40 hover:bg-[color:var(--color-primary-dark)] transition-all"
          >
            Start Exploring →
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const router = useRouter()
  const { projects, addProject, mounted } = useProjects()
  const [showCreate, setShowCreate] = useState(false)

  const handleCreate = (p: Project) => {
    addProject(p)
    router.push(`/dashboard/explore/${p.id}?title=${encodeURIComponent(p.title)}`)
  }

  return (
    <AppShell currentPath="/dashboard/explore">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-[color:var(--color-deep-indigo)]">Explore</h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">Start a research session — the AI will guide you.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Project
        </button>
      </div>

      {/* Defer localStorage-dependent content until after hydration */}
      {!mounted ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 h-40 animate-pulse" />
          ))}
        </div>
      ) : (
      <>
      {/* Empty state */}
      {projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-4xl text-[color:var(--color-primary)]">travel_explore</span>
          </div>
          <h3 className="text-lg font-black text-[color:var(--color-deep-indigo)] mb-2">No research projects yet</h3>
          <p className="text-slate-500 text-sm max-w-xs mb-6">Create a project to start an interactive research session with your AI guide.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[color:var(--color-primary)] text-white px-6 py-3 rounded-2xl font-bold hover:bg-[color:var(--color-primary-dark)] transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Create your first project
          </button>
        </motion.div>
      )}

      {/* Project grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* New project card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(true)}
            className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-center hover:border-[color:var(--color-primary)] hover:bg-blue-50/30 transition-all group h-44"
          >
            <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-[color:var(--color-primary)] transition-colors mb-2">add_circle</span>
            <p className="text-sm font-bold text-slate-400 group-hover:text-[color:var(--color-primary)] transition-colors">New Project</p>
          </motion.button>

          {/* Project cards */}
          {projects.map((project, i) => {
            const sc = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => router.push(`/dashboard/explore/${project.id}?title=${encodeURIComponent(project.title)}`)}
                className="bg-white rounded-2xl border-2 border-slate-100 p-6 hover:border-[color:var(--color-primary)] hover:shadow-md transition-all cursor-pointer group h-44 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[color:var(--color-primary)] text-lg">travel_explore</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>
                  </div>
                  <h4 className="font-black text-[color:var(--color-deep-indigo)] text-sm leading-tight group-hover:text-[color:var(--color-primary)] transition-colors line-clamp-2">
                    {project.title}
                  </h4>
                  {project.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium mt-3">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>article</span>
                    {project.paperCount} papers
                  </span>
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
      </>
      )}

      <AnimatePresence>
        {showCreate && <NewProjectModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      </AnimatePresence>
    </AppShell>
  )
}
