'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AppShell } from '@/components/AppShell'
import { getPaperRecommendations, type Paper } from '@/lib/api'

// ── localStorage cache ─────────────────────────────────────────────────────
const CACHE_KEY = 'saraswati_paper_cache'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function getCachedPapers(interests: string[]): Paper[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { papers, ts, key } = JSON.parse(raw)
    if (key !== interests.join(',')) return null       // different interests — stale
    if (Date.now() - ts > CACHE_TTL_MS) return null   // expired
    return papers as Paper[]
  } catch { return null }
}

function cachePapers(interests: string[], papers: Paper[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      papers,
      ts: Date.now(),
      key: interests.join(','),
    }))
  } catch { /* ignore quota errors */ }
}

// ── Static data ────────────────────────────────────────────────────────────
const recentProjects = [
  { id: '1', title: 'GraphRAG Survey',            papers: 12, updated: '2h ago',    status: 'active',  progress: 85, progressLabel: 'Analysis Progress',  color: 'bg-blue-500',   iconBg: 'bg-blue-50 text-blue-500',   icon: 'folder_open' },
  { id: '2', title: 'LLM Fine-Tuning Benchmarks', papers: 8,  updated: 'Yesterday', status: 'writing', progress: 42, progressLabel: 'Drafting Progress', color: 'bg-indigo-500', iconBg: 'bg-indigo-50 text-indigo-500', icon: 'edit_note' },
]

// ── Paper Card (horizontal scroll style) ──────────────────────────────────
const _cc: Record<string, string> = {}
function catStyle(cat: string): string {
  if (_cc[cat]) return _cc[cat]
  const p = ['bg-amber-100 text-amber-600','bg-blue-100 text-blue-600','bg-purple-100 text-purple-600','bg-emerald-100 text-emerald-600','bg-sky-100 text-sky-600']
  let h = 0; for (let i = 0; i < cat.length; i++) h = cat.charCodeAt(i) + ((h << 5) - h)
  _cc[cat] = p[Math.abs(h) % p.length]; return _cc[cat]
}

function PaperCard({ paper, index }: { paper: Paper; index: number }) {
  const year = paper.published?.slice(0, 4)
  const cat  = paper.categories?.[0] ?? ''
  const authors = paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? '...' : '')

  return (
    <motion.article
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="min-w-[320px] max-w-[320px] flex-shrink-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        {cat && (
          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wide ${catStyle(cat)}`}>
            {cat.replace(/^cs\./i, 'CS.')}
          </span>
        )}
        {year && <span className="text-slate-400 text-xs font-medium">{year}</span>}
      </div>

      <h4 className="font-bold text-sm text-[color:var(--color-deep-indigo)] leading-snug mb-2 line-clamp-2 group-hover:text-[color:var(--color-primary)] transition-colors">
        {paper.title}
      </h4>

      {paper.authors.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '13px' }}>person</span>
          <p className="text-xs text-slate-500 truncate">{authors}</p>
        </div>
      )}

      {paper.abstract_snippet && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-4 mb-5">
          {paper.abstract_snippet}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ARXIV.ORG</span>
        {paper.pdf_url && (
          <a
            href={paper.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-[color:var(--color-primary)] font-bold text-xs hover:text-blue-700 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>picture_as_pdf</span>
            PDF
          </a>
        )}
      </div>
    </motion.article>
  )
}

function PaperSkeleton() {
  return (
    <div className="min-w-[320px] max-w-[320px] flex-shrink-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-5 w-16 rounded-full bg-slate-100" />
        <div className="h-4 w-8 rounded bg-slate-100" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3.5 bg-slate-100 rounded w-full" />
        <div className="h-3.5 bg-slate-100 rounded w-4/5" />
      </div>
      <div className="h-3 bg-slate-100 rounded w-3/5 mb-3" />
      <div className="space-y-1.5 mb-5">
        {[1,2,3,4].map(i => <div key={i} className="h-2.5 bg-slate-100 rounded" />)}
      </div>
      <div className="flex justify-between pt-3 border-t border-slate-100">
        <div className="h-3 w-16 bg-slate-100 rounded" />
        <div className="h-3 w-8 bg-slate-100 rounded" />
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [papers, setPapers]       = useState<Paper[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [interests, setInterests] = useState<string[]>([])
  const [displayName, setDisplayName] = useState('')

  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  }

  const fetchAndCache = useCallback(async (userInterests: string[]) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getPaperRecommendations(userInterests, 6)
      cachePapers(userInterests, result)
      setPapers(result)
    } catch {
      setError('Could not load recommendations. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const userInterests: string[] = user?.user_metadata?.interests ?? ['Machine Learning', 'NLP']
      const name: string = user?.user_metadata?.display_name ?? ''
      setInterests(userInterests)
      setDisplayName(name)

      // Try cache first — avoids API call on revisit
      const cached = getCachedPapers(userInterests)
      if (cached && cached.length > 0) {
        setPapers(cached)
        setLoading(false)
      } else {
        await fetchAndCache(userInterests)
      }
    }
    init()
  }, [fetchAndCache])

  return (
    <AppShell currentPath="/dashboard">
      {/* ── Header ── */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-black text-[color:var(--color-deep-indigo)]">Home</h1>
          <p className="text-slate-500 font-medium mt-0.5 text-sm">Ready to explore the frontier of knowledge?</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-bold hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>upgrade</span>
            Upgrade
          </button>
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-xl shadow-blue-500/20 mb-10"
      >
        {/* blobs */}
        <div className="absolute -top-16 -right-16 w-52 h-52 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black mb-2">
              {greeting()}{displayName ? `, ${displayName}` : ''}! 👋
            </h2>
            <p className="text-blue-100 max-w-sm text-sm leading-relaxed">
              Your Scout Agent is monitoring the latest papers in your fields. Explore what&apos;s new today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/dashboard/projects"
              className="glass px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-white hover:text-blue-600 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_circle</span>
              Start New Project
            </Link>
            <Link
              href="/dashboard/explore"
              className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-white/20 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>auto_awesome</span>
              Generate Topic
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Recommended Papers ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-[color:var(--color-deep-indigo)]">Recommended For You</h3>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!loading && interests.length > 0 && (
              <p className="text-xs text-slate-400 hidden md:block mr-1">
                {interests.slice(0, 2).join(' · ')}
              </p>
            )}
            <button
              onClick={() => fetchAndCache(interests)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 transition-colors"
              title="Refresh"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-medium flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>error_outline</span>
            {error}
          </div>
        )}

        {/* Horizontal scroll */}
        <div className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <PaperSkeleton key={i} />)
            : papers.map((p, i) => <PaperCard key={p.arxiv_id} paper={p} index={i} />)
          }
          {!loading && !error && papers.length === 0 && (
            <div className="flex-1 text-center text-slate-400 text-sm py-12 bg-white rounded-2xl border border-slate-200">
              <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
              No papers found.
            </div>
          )}
        </div>
      </section>

      {/* ── Continue Your Research ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-[color:var(--color-deep-indigo)]">Continue Your Research</h3>
          <Link href="/dashboard/projects" className="text-sm font-bold text-[color:var(--color-primary)] flex items-center gap-1 hover:underline">
            View all <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
          </Link>
        </div>

        <div className="space-y-3">
          {recentProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 + i * 0.08 }}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-[color:var(--color-primary)]/40 hover:shadow-md transition-all flex items-center gap-5 cursor-pointer group"
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${project.iconBg}`}>
                <span className="material-symbols-outlined text-xl">{project.icon}</span>
              </div>

              {/* Info */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <h4 className="font-bold text-[color:var(--color-deep-indigo)] text-sm group-hover:text-[color:var(--color-primary)] transition-colors truncate">
                    {project.title}
                  </h4>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                    project.status === 'active'  ? 'bg-emerald-500/10 text-emerald-600' :
                                                   'bg-blue-500/10 text-[color:var(--color-primary)]'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>description</span>
                    {project.papers} papers
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span>
                    {project.updated}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="hidden md:block w-44 shrink-0 mr-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-tight">
                  <span>{project.progressLabel}</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className={`${project.color} h-full rounded-full`} style={{ width: `${project.progress}%` }} />
                </div>
              </div>

              {/* More */}
              <button className="w-9 h-9 shrink-0 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '20px' }}>more_horiz</span>
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Floating chat ── */}
      <button className="fixed bottom-8 right-8 w-13 h-13 w-[52px] h-[52px] bg-[color:var(--color-primary)] text-white rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50">
        <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
      </button>
    </AppShell>
  )
}
