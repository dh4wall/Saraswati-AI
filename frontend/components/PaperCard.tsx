'use client'

import { motion } from 'framer-motion'
import type { Paper } from '@/lib/api'

interface PaperCardProps {
  paper: Paper
  index: number
}

const _colorCache: Record<string, string> = {}

function getCategoryStyle(cat: string): string {
  if (_colorCache[cat]) return _colorCache[cat]
  const styles = [
    'bg-amber-50 text-amber-600 border-amber-200',
    'bg-blue-50 text-[color:var(--color-primary)] border-blue-200',
    'bg-purple-50 text-purple-600 border-purple-200',
    'bg-emerald-50 text-emerald-600 border-emerald-200',
    'bg-sky-50 text-sky-600 border-sky-200',
  ]
  let h = 0
  for (let i = 0; i < cat.length; i++) h = cat.charCodeAt(i) + ((h << 5) - h)
  _colorCache[cat] = styles[Math.abs(h) % styles.length]
  return _colorCache[cat]
}

export default function PaperCard({ paper, index }: PaperCardProps) {
  const year = paper.published ? paper.published.slice(0, 4) : null
  const primaryCat = paper.categories?.[0] ?? ''
  const authorLine =
    paper.authors.length > 0
      ? paper.authors.slice(0, 2).join(', ') + (paper.authors.length > 2 ? ' et al.' : '')
      : 'Unknown authors'

  return (
    <motion.article
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="bg-white rounded-2xl border-2 border-slate-100 p-5 hover:border-slate-200 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Category + Year */}
      <div className="flex items-center justify-between mb-3">
        {primaryCat ? (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getCategoryStyle(primaryCat)}`}>
            {primaryCat.toUpperCase()}
          </span>
        ) : <span />}
        {year && (
          <span className="text-xs text-slate-400 font-medium">{year}</span>
        )}
      </div>

      {/* Title */}
      <h4 className="font-bold text-sm text-[color:var(--color-deep-indigo)] leading-tight mb-2 line-clamp-2 group-hover:text-[color:var(--color-primary)] transition-colors">
        {paper.title}
      </h4>

      {/* Authors */}
      <p className="text-xs text-slate-400 font-medium mb-3">{authorLine}</p>

      {/* Abstract */}
      {paper.abstract_snippet && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">
          {paper.abstract_snippet}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">arxiv.org</span>
        {paper.pdf_url && (
          <a
            href={paper.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[color:var(--color-primary)] font-bold text-xs hover:text-blue-700 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
            PDF
          </a>
        )}
      </div>
    </motion.article>
  )
}
