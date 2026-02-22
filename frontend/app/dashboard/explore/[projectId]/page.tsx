'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { 
  Paper, Note, Project,
  getProjectNotes, createProjectNote, deleteProjectNote,
  listProjects // used in canvas for simple fetching or could use getProject
} from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Monotonic counter — guarantees unique React keys even when events fire within same ms
let _uid = 0
const uid = () => `${Date.now()}_${++_uid}`

type MessageType = 'user' | 'assistant' | 'status' | 'chips' | 'paper_artifact' | 'error'

interface Message {
  id: string
  type: MessageType
  content?: string
  chips?: string[]
  paper?: Paper
}

// ── Simple markdown renderer ───────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^#### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    // Bullet lists (*, -, •)
    .replace(/^\*{1}\s{3}(.+)$/gm, '<li>$1</li>')
    .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((<li>.*<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="md-hr">')
    // Blank lines → paragraph break
    .replace(/\n\n+/g, '</p><p class="md-p">')
    .replace(/\n/g, '<br/>')
}

// ── Credibility badge ──────────────────────────────────────────────────────
function CredibilityBadge({ level }: { level?: string }) {
  const config = {
    HIGH:      { icon: 'verified_user', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'High credibility' },
    MEDIUM:    { icon: 'shield',        cls: 'text-amber-600 bg-amber-50 border-amber-200',       label: 'Medium credibility' },
    UNCERTAIN: { icon: 'gpp_maybe',     cls: 'text-red-500 bg-red-50 border-red-200',             label: 'Verify independently' },
  }[level ?? 'UNCERTAIN'] ?? { icon: 'gpp_maybe', cls: 'text-slate-400 bg-slate-50 border-slate-200', label: 'Unknown' }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.cls}`}>
      <span className="material-symbols-outlined" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
      {config.label}
    </span>
  )
}

// ── Paper artifact card ────────────────────────────────────────────────────
function PaperArtifactCard({ paper, onOpen, onAddNote }: {
  paper: Paper
  onOpen: (p: Paper) => void
  onAddNote: (c: string, id?: string, title?: string) => void
}) {
  const year = paper.published?.slice(0, 4)
  return (
    <div className="mt-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[color:var(--color-primary)] text-base">article</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ArXiv Paper</span>
        </div>
        <CredibilityBadge level={paper.credibility} />
      </div>
      <div className="p-4">
        <h4 className="font-bold text-sm text-[color:var(--color-deep-indigo)] leading-tight mb-1.5 line-clamp-2">{paper.title}</h4>
        {paper.authors?.length > 0 && (
          <p className="text-xs text-slate-400 mb-2 font-medium">
            {paper.authors.slice(0, 2).join(', ')}{paper.authors.length > 2 ? ' et al.' : ''}
            {year ? ` · ${year}` : ''}
          </p>
        )}
        {paper.abstract_snippet && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{paper.abstract_snippet}</p>
        )}
      </div>
      <div className="flex border-t border-slate-100">
        <button onClick={() => onOpen(paper)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-[color:var(--color-primary)] hover:bg-blue-50 transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>Open PDF
        </button>
        <div className="w-px bg-slate-100" />
        <button onClick={() => onAddNote(`Read: "${paper.title}"`, paper.arxiv_id, paper.title)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>bookmark_add</span>Note
        </button>
      </div>
    </div>
  )
}

// ── Message renderer ───────────────────────────────────────────────────────
function ChatMessage({ msg, onChipClick, onOpenPaper, onAddNote }: {
  msg: Message
  onChipClick: (c: string) => void
  onOpenPaper: (p: Paper) => void
  onAddNote: (c: string, id?: string, title?: string) => void
}) {
  if (msg.type === 'status') return (
    <div className="flex items-center gap-2 py-1 text-xs text-slate-400 font-medium px-1">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block shrink-0" />
      {msg.content}
    </div>
  )

  if (msg.type === 'chips') return (
    <div className="flex flex-wrap gap-2 my-2">
      {msg.chips?.map(chip => (
        <button key={chip} onClick={() => onChipClick(chip)}
          className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-[color:var(--color-primary)] hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm">
          {chip}
        </button>
      ))}
    </div>
  )

  if (msg.type === 'paper_artifact' && msg.paper) return (
    <PaperArtifactCard paper={msg.paper} onOpen={onOpenPaper} onAddNote={onAddNote} />
  )

  if (msg.type === 'user') return (
    <div className="flex justify-end my-3">
      <div className="max-w-[80%] bg-[color:var(--color-primary)] text-white px-4 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed">
        {msg.content}
      </div>
    </div>
  )

  // assistant / error — rendered markdown
  const html = msg.content ? `<p class="md-p">${renderMarkdown(msg.content)}</p>` : ''
  return (
    <div className="flex gap-3 my-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <span className="material-symbols-outlined text-white" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
      </div>
      <div className={`flex-1 min-w-0 markdown-body text-sm leading-relaxed ${msg.type === 'error' ? 'text-red-500' : 'text-slate-700'}`}>
        {msg.content
          ? <div dangerouslySetInnerHTML={{ __html: html }} />
          : <span className="text-slate-300 italic">thinking…</span>
        }
      </div>
    </div>
  )
}

// ── Tools floating panel (paper info + notes) ──────────────────────────────
function ToolsPanel({ paper, notes, onAddNote, onDeleteNote, onClose }: {
  paper: Paper | null
  notes: Note[]
  onAddNote: (c: string, id?: string, title?: string) => void
  onDeleteNote: (id: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'info' | 'notes'>('info')
  const [noteText, setNoteText] = useState('')

  const handleSave = () => {
    if (!noteText.trim()) return
    onAddNote(noteText.trim(), paper?.arxiv_id, paper?.title)
    setNoteText('')
    setTab('notes')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 32, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="absolute bottom-20 right-6 w-[400px] max-h-[70vh] bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-200 flex flex-col overflow-hidden z-30"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[color:var(--color-primary)]" style={{ fontSize: '18px' }}>experiment</span>
          <span className="text-sm font-black text-[color:var(--color-deep-indigo)]">Research Tools</span>
        </div>
        <div className="flex items-center gap-1">
          {(['info', 'notes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${tab === t ? 'bg-blue-50 text-[color:var(--color-primary)]' : 'text-slate-400 hover:text-slate-600'}`}>
              {t === 'notes' && notes.length > 0 ? `Notes (${notes.length})` : t === 'info' ? 'Paper Info' : 'Notes'}
            </button>
          ))}
          <button onClick={onClose} className="ml-1 w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '16px' }}>close</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'info' && (
          <div className="p-5">
            {!paper ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-3xl text-slate-200 block mb-2">article</span>
                <p className="text-xs text-slate-400">Open a paper to see its details here</p>
              </div>
            ) : (
              <>
                {paper.categories && paper.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {paper.categories.slice(0, 3).map(c => (
                      <span key={c} className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-[color:var(--color-primary)] rounded-full uppercase">{c}</span>
                    ))}
                  </div>
                )}
                <h3 className="font-black text-sm text-[color:var(--color-deep-indigo)] leading-tight mb-2">{paper.title}</h3>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <CredibilityBadge level={paper.credibility} />
                  {paper.published?.slice(0, 4) && <span className="text-xs text-slate-400">{paper.published.slice(0, 4)}</span>}
                </div>
                {paper.authors?.length > 0 && (
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">{paper.authors.join(', ')}</p>
                )}
                {paper.abstract_snippet && (
                  <div className="bg-slate-50 rounded-xl p-3.5 mb-4">
                    <p className="text-[10px] font-bold text-[color:var(--color-primary)] uppercase tracking-widest mb-2">Abstract</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{paper.abstract_snippet}</p>
                  </div>
                )}
                <div className={`rounded-xl p-3 text-xs leading-relaxed mb-4 ${
                  paper.credibility === 'HIGH' ? 'bg-emerald-50 text-emerald-700' :
                  paper.credibility === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                }`}>
                  <p className="font-bold mb-1">Credibility</p>
                  {paper.credibility === 'HIGH' && "Well-established paper — been available long enough to be cited and peer-reviewed."}
                  {paper.credibility === 'MEDIUM' && "Relatively recent or preprint. Methodology looks sound but community consensus forming."}
                  {paper.credibility === 'UNCERTAIN' && "Very recent preprint. Interesting but verify findings before citing."}
                </div>
                {/* Quick note */}
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Add Finding</p>
                <textarea rows={3} value={noteText} onChange={e => setNoteText(e.target.value)}
                  placeholder="Key insight from this paper…"
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[color:var(--color-primary)] resize-none font-medium text-slate-600 placeholder:text-slate-300 mb-2" />
                <button onClick={handleSave} disabled={!noteText.trim()}
                  className="w-full bg-[color:var(--color-primary)] text-white py-2.5 rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-[color:var(--color-primary-dark)] transition-all">
                  Save Finding
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="p-4">
            {notes.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-3xl text-slate-200 block mb-2">sticky_note_2</span>
                <p className="text-xs text-slate-400">No notes yet — save findings from papers</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <div key={note.id} className="bg-slate-50 rounded-xl p-3.5 group border border-slate-100">
                    <p className="text-xs text-slate-700 leading-relaxed mb-1.5 font-medium">{note.content}</p>
                    {note.source_paper_title && (
                      <p className="text-[10px] text-[color:var(--color-primary)] font-semibold truncate mb-2">📄 {note.source_paper_title}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">{new Date(note.created_at).toLocaleString()}</span>
                      <button onClick={() => onDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main Canvas Page ───────────────────────────────────────────────────────
export default function CanvasPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params?.projectId as string
  const projectTitle = searchParams?.get('title') ?? 'Research Project'

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [activePaper, setActivePaper] = useState<Paper | null>(null)
  const [showTools, setShowTools] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Persist a single message to Supabase ─────────────────────────────────
  const persistMessage = async (type: string, content?: string, metadata?: Record<string, unknown>) => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      await fetch(`${API_URL}/api/v1/projects/${encodeURIComponent(projectId)}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ msg_type: type, content, metadata }),
      })
    } catch (e) {
      console.warn('Failed to persist message:', e)
    }
  }

  // ── Notes persistence via API ────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    try {
      const data = await getProjectNotes(projectId)
      setNotes(data)
    } catch (err) {
      console.error('Failed to load notes:', err)
    }
  }, [projectId])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const addNote = async (content: string, paperId?: string, paperTitle?: string) => {
    try {
      const newNote = await createProjectNote(projectId, content, paperId, paperTitle)
      setNotes(prev => [newNote, ...prev])
    } catch (err) {
      console.error('Failed to save note:', err)
    }
  }

  const deleteNote = async (id: string) => {
    try {
      await deleteProjectNote(projectId, id)
      setNotes(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Load chat history from Supabase on mount ─────────────────────────────
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        const resp = await fetch(`${API_URL}/api/v1/projects/${encodeURIComponent(projectId)}/messages`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        })
        if (!resp.ok) throw new Error('failed')
        const rows: Array<{ id: number; msg_type: string; content?: string; metadata?: Record<string, unknown>; created_at: string }> = await resp.json()

        if (rows.length > 0) {
          // Restore messages from DB
          const restored: Message[] = rows.map(row => ({
            id: `db_${row.id}`,
            type: row.msg_type as MessageType,
            content: row.content ?? undefined,
            chips: row.msg_type === 'chips' ? (row.metadata?.chips as string[]) : undefined,
            paper: row.msg_type === 'paper_artifact' ? (row.metadata?.paper as Paper) : undefined,
          }))
          setMessages(restored)
          setHistoryLoaded(true)
          return
        }
      } catch { /* no history or network error — show greeting */ }

      // No history — show greeting
      setHistoryLoaded(true)
      setStreaming(true)
      const assistantId = `msg_${Date.now()}`
      setMessages([{ id: assistantId, type: 'assistant', content: '' }])
      try {
        const resp = await fetch(`${API_URL}/api/v1/chat/research/greeting?project_id=${encodeURIComponent(projectId)}&project_title=${encodeURIComponent(projectTitle)}`)
        await processStream(resp, assistantId)
      } catch {
        setMessages([
          { id: assistantId, type: 'assistant', content: "Hi! I'm **Saraswati**, your research guide. What would you like to explore today?" },
          { id: 'chips_0', type: 'chips', chips: ["I'm a beginner", "Show top papers", "I know the basics", "Go deep"] },
        ])
      } finally { setStreaming(false) }
    }
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const processStream = async (resp: Response, assistantMsgId: string) => {
    await processStreamWith(resp, assistantMsgId, handleSSEEvent)
  }

  const processStreamWith = async (
    resp: Response,
    assistantMsgId: string,
    handler: (event: Record<string, unknown>, id: string) => void
  ) => {
    const reader = resp.body?.getReader()
    if (!reader) return
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try { handler(JSON.parse(line.slice(6)), assistantMsgId) } catch { /* malformed */ }
      }
    }
  }

  const handleSSEEvent = useCallback((event: Record<string, unknown>, assistantMsgId: string) => {
    const type = event.type as string
    if (type === 'text') {
      const content = (event.content as string) ?? ''
      setMessages(m => m.map(msg => msg.id === assistantMsgId ? { ...msg, content: (msg.content ?? '') + content } : msg))
    } else if (type === 'status') {
      setMessages(m => [...m, { id: `status_${uid()}`, type: 'status', content: event.content as string }])
    } else if (type === 'paper_artifact') {
      setMessages(m => [...m, { id: `paper_${uid()}`, type: 'paper_artifact', paper: event.paper as Paper }])
    } else if (type === 'suggestion_chips') {
      setMessages(m => [...m, { id: `chips_${uid()}`, type: 'chips', chips: event.chips as string[] }])
    } else if (type === 'error') {
      setMessages(m => [...m, { id: `err_${uid()}`, type: 'error', content: event.content as string }])
    }
  }, [])

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return
    setInput('')
    setStreaming(true)
    const userMsg: Message = { id: `user_${Date.now()}`, type: 'user', content: text }
    const assistantId = `ai_${Date.now()}`
    const assistantMsg: Message = { id: assistantId, type: 'assistant', content: '' }
    setMessages(m => [...m, userMsg, assistantMsg])

    // Persist user message immediately
    void persistMessage('user', text)

    const history = messages
      .filter(m => m.type === 'user' || m.type === 'assistant')
      .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content ?? '' }))

    // Collect new messages to persist after stream ends
    const newMsgs: Array<{ type: string; content?: string; metadata?: Record<string, unknown> }> = []
    const origHandleSSEEvent = handleSSEEvent

    const trackingHandler = (event: Record<string, unknown>, mid: string) => {
      origHandleSSEEvent(event, mid)
      const t = event.type as string
      if (t === 'paper_artifact') newMsgs.push({ type: 'paper_artifact', metadata: { paper: event.paper } })
      if (t === 'suggestion_chips') newMsgs.push({ type: 'chips', metadata: { chips: event.chips } })
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const resp = await fetch(`${API_URL}/api/v1/chat/research`, {
        method: 'POST', headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          message: text,
          history,
          // Pass the currently open paper so backend injects it as context
          active_paper: activePaper ?? null,
        }),
      })
      await processStreamWith(resp, assistantId, trackingHandler)
    } catch {
      setMessages(m => m.map(msg => msg.id === assistantId ? { ...msg, type: 'error', content: 'Failed to reach the backend.' } : msg))
    } finally {
      setStreaming(false)
      // Persist assistant response and other artifacts after stream ends
      setMessages(current => {
        const aiMsg = current.find(m => m.id === assistantId)
        if (aiMsg?.content) void persistMessage('assistant', aiMsg.content)
        return current
      })
      for (const m of newMsgs) void persistMessage(m.type, m.content, m.metadata)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const openPaper = (p: Paper) => {
    setActivePaper(p)
    setShowTools(true)
  }

  return (
    <>
      {/* Markdown styles */}
      <style>{`
        .markdown-body .md-h1 { font-size: 1.1rem; font-weight: 900; color: var(--color-deep-indigo); margin: 1.25rem 0 0.5rem; }
        .markdown-body .md-h2 { font-size: 1rem; font-weight: 800; color: var(--color-deep-indigo); margin: 1rem 0 0.4rem; }
        .markdown-body .md-h3 { font-size: 0.875rem; font-weight: 700; color: var(--color-deep-indigo); margin: 0.75rem 0 0.3rem; }
        .markdown-body .md-h4 { font-size: 0.8rem; font-weight: 600; margin: 0.5rem 0 0.2rem; }
        .markdown-body .md-p  { margin: 0.4rem 0; }
        .markdown-body .md-ul { list-style: disc; padding-left: 1.25rem; margin: 0.5rem 0; }
        .markdown-body .md-ul li { margin: 0.25rem 0; }
        .markdown-body .md-code { background: #f1f5f9; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.75rem; font-family: monospace; color: #3b5bdb; }
        .markdown-body .md-hr  { border: none; border-top: 1px solid #e2e8f0; margin: 0.75rem 0; }
        .markdown-body strong { font-weight: 700; color: #1e293b; }
        .markdown-body em { font-style: italic; }
      `}</style>

      <div className="h-screen flex overflow-hidden bg-slate-100">

        {/* ── Left chat panel (wider) ── */}
        <div className="w-[560px] shrink-0 flex flex-col bg-white border-r border-slate-200 h-full shadow-sm">

          {/* Top bar */}
          <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
            <Link href="/dashboard/explore" className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-slate-500" style={{ fontSize: '20px' }}>arrow_back</span>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-[color:var(--color-deep-indigo)] truncate">{projectTitle}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span className="text-[10px] text-slate-400 font-semibold">Saraswati · Research Guide</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-0.5">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <ChatMessage msg={msg} onChipClick={sendMessage} onOpenPaper={openPaper} onAddNote={addNote} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing dots */}
            {streaming && (
              <div className="flex gap-3 py-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div className="flex items-center gap-1 pt-1.5">
                  {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="shrink-0 px-5 pb-5 pt-3 border-t border-slate-100">
            <p className="text-[9px] text-slate-400 text-center mb-2 font-medium">Saraswati AI can make mistakes. Verify important information with citations.</p>
            <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-[color:var(--color-primary)] focus-within:bg-white focus-within:shadow-sm transition-all">
              <textarea ref={inputRef} rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask about papers, request comparisons, or explore a topic…"
                disabled={streaming}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-700 placeholder:text-slate-400 font-medium disabled:opacity-50 max-h-32" />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || streaming}
                className="w-8 h-8 shrink-0 bg-[color:var(--color-primary)] text-white rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-[color:var(--color-primary-dark)] transition-all">
                <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Right panel: PDF viewer ── */}
        <div className="flex-1 relative flex flex-col overflow-hidden">

          {/* PDF header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '18px' }}>picture_as_pdf</span>
              <span className="text-sm font-bold text-slate-600 truncate max-w-sm">
                {activePaper ? activePaper.title : 'No paper selected'}
              </span>
            </div>
            {activePaper?.pdf_url && (
              <a href={activePaper.pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-[color:var(--color-primary)] bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                Open in new tab
              </a>
            )}
          </div>

          {/* PDF / placeholder */}
          <div className="flex-1 overflow-hidden bg-slate-200">
            {activePaper?.pdf_url ? (
              <iframe
                key={activePaper.arxiv_id}
                src={activePaper.pdf_url}
                className="w-full h-full border-0"
                title={activePaper.title}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center mb-5 shadow-sm">
                  <span className="material-symbols-outlined text-4xl text-slate-300">picture_as_pdf</span>
                </div>
                <p className="text-slate-500 font-semibold mb-1">No paper open</p>
                <p className="text-slate-400 text-sm max-w-xs">Click <strong>Open PDF</strong> on any paper card in the chat to view it here</p>
              </div>
            )}
          </div>

          {/* ── Floating tools button ── */}
          <div className="absolute bottom-6 right-6 z-20">
            <AnimatePresence>
              {showTools && (
                <ToolsPanel
                  paper={activePaper}
                  notes={notes}
                  onAddNote={addNote}
                  onDeleteNote={deleteNote}
                  onClose={() => setShowTools(false)}
                />
              )}
            </AnimatePresence>
            <button
              onClick={() => setShowTools(t => !t)}
              className={`w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${showTools ? 'bg-[color:var(--color-primary)] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              title="Toggle research tools"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>
                {showTools ? 'close' : 'labs'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
