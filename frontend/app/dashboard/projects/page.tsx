'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'

const allProjects = [
  { id: '1', title: 'GraphRAG Survey', desc: 'A comprehensive review of graph-based retrieval-augmented generation methods.', papers: 12, words: 8400, updated: '2h ago', status: 'active' },
  { id: '2', title: 'LLM Fine-Tuning Benchmarks', desc: 'Comparative analysis of PEFT methods: LoRA, QLoRA, Adapter layers.', papers: 8, words: 5200, updated: 'Yesterday', status: 'writing' },
  { id: '3', title: 'Federated Learning & Privacy', desc: 'Survey of privacy-preserving techniques in federated ML systems.', papers: 5, words: 3100, updated: '3d ago', status: 'draft' },
  { id: '4', title: 'Transformer Architecture Evolution', desc: 'From attention is all you need to modern sparse and linear attention.', papers: 18, words: 11200, updated: '1w ago', status: 'complete' },
  { id: '5', title: 'Quantum ML Applications', desc: 'Exploring intersection of quantum computing and machine learning.', papers: 3, words: 950, updated: '2w ago', status: 'draft' },
]

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: 'Active',    color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  writing:  { label: 'Writing',   color: 'text-[color:var(--color-primary)]', bg: 'bg-blue-50 border-blue-200' },
  draft:    { label: 'Draft',     color: 'text-slate-500',  bg: 'bg-slate-100 border-slate-200' },
  complete: { label: 'Complete',  color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
}

export default function ProjectsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [selectedProject, setSelectedProject] = useState<typeof allProjects[0] | null>(null)

  const filtered = filter === 'all' ? allProjects : allProjects.filter(p => p.status === filter)

  return (
    <AppShell currentPath="/dashboard/projects">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-slate-500 font-medium text-sm">{allProjects.length} total projects</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Project
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {['all', 'active', 'writing', 'draft', 'complete'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              filter === f ? 'bg-[color:var(--color-primary)] text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Split layout: cards left, detail panel right */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Project cards */}
        <div className="lg:col-span-3 space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </p>
          <AnimatePresence>
            {filtered.map((project, i) => {
              const sc = statusConfig[project.status]
              return (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  onClick={() => setSelectedProject(project)}
                  className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-md ${
                    selectedProject?.id === project.id
                      ? 'border-[color:var(--color-primary)] shadow-md'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {/* Status & updated */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sc.bg} ${sc.color}`}>{sc.label}</span>
                    <span className="text-xs text-slate-400 font-medium">{project.updated}</span>
                  </div>

                  {/* Title & desc */}
                  <h3 className="font-black text-[color:var(--color-deep-indigo)] mb-1.5 text-sm">{project.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-4">{project.desc}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 border-t border-slate-100 pt-4">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">article</span>
                      {project.papers} papers
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">sort</span>
                      {project.words.toLocaleString()} words
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <motion.div
                key={selectedProject.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl border border-slate-100 p-6 sticky top-0"
              >
                {/* Status badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusConfig[selectedProject.status].bg} ${statusConfig[selectedProject.status].color}`}>
                    {statusConfig[selectedProject.status].label}
                  </span>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <h3 className="font-black text-[color:var(--color-deep-indigo)] text-base leading-tight mb-2">
                  {selectedProject.title}
                </h3>
                <p className="text-xs text-slate-400 font-medium mb-4">
                  Last updated {selectedProject.updated}
                </p>

                {/* Description */}
                <div className="bg-blue-50 rounded-xl p-4 mb-5">
                  <p className="text-xs font-bold text-[color:var(--color-primary)] uppercase tracking-widest mb-2">Description</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{selectedProject.desc}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-[color:var(--color-deep-indigo)]">{selectedProject.papers}</p>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Papers</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-[color:var(--color-deep-indigo)]">{selectedProject.words.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Words</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => router.push(`/dashboard/projects/${selectedProject.id}/canvas`)}
                    className="w-full flex items-center justify-center gap-2 bg-[color:var(--color-primary)] text-white py-3 rounded-xl font-bold text-sm hover:bg-[color:var(--color-primary-dark)] transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    Open in Canvas
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                    <span className="material-symbols-outlined text-sm">article</span>
                    View Papers
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center"
              >
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">folder_open</span>
                <p className="text-slate-400 font-semibold text-sm">Select a project to view details</p>
                <p className="text-slate-300 text-xs mt-1 font-medium">or create a new one above</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create project modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-black text-[color:var(--color-deep-indigo)] mb-6">New Research Project</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Project Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Survey of LLM Reasoning"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full border-2 border-slate-200 focus:border-[color:var(--color-primary)] rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Description (Optional)</label>
                  <textarea
                    placeholder="Brief description of your research goal…"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={3}
                    className="w-full border-2 border-slate-200 focus:border-[color:var(--color-primary)] rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={!newTitle.trim()}
                  onClick={() => setShowCreate(false)}
                  className="flex-1 bg-[color:var(--color-primary)] text-white py-3 rounded-2xl font-bold disabled:opacity-40 hover:bg-[color:var(--color-primary-dark)] transition-all"
                >
                  Create Project
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
