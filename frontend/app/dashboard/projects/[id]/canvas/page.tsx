'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'

// Mock project data — will be replaced with real fetch when backend is wired up
const projectsMap: Record<string, { title: string; desc: string }> = {
  '1': { title: 'GraphRAG Survey', desc: 'A comprehensive review of graph-based retrieval-augmented generation methods.' },
  '2': { title: 'LLM Fine-Tuning Benchmarks', desc: 'Comparative analysis of PEFT methods: LoRA, QLoRA, Adapter layers.' },
  '3': { title: 'Federated Learning & Privacy', desc: 'Survey of privacy-preserving techniques in federated ML systems.' },
  '4': { title: 'Transformer Architecture Evolution', desc: 'From attention is all you need to modern sparse and linear attention.' },
  '5': { title: 'Quantum ML Applications', desc: 'Exploring intersection of quantum computing and machine learning.' },
}

const initialMessages = [
  {
    id: '1',
    role: 'assistant',
    content: "Hello! I'm your AI writing assistant. I can help you write, structure, and refine your research paper. Ask me to summarize a paper, suggest a paragraph, find citations, or critique your draft.",
    agent: 'Translator',
  },
]

export default function CanvasPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const project = projectsMap[params.id] ?? { title: 'Research Project', desc: '' }

  const [doc, setDoc] = useState(
    `# ${project.title}\n\n## Introduction\n\nBegin writing your research paper here...\n\n`
  )
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState(initialMessages)
  const [sending, setSending] = useState(false)
  const [critiquing, setCritiquing] = useState(false)

  const sendMessage = () => {
    if (!chatInput.trim()) return
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: chatInput, agent: '' }])
    setChatInput('')
    setSending(true)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a stub response. The Translator Agent will respond here once the backend pipeline is connected.',
        agent: 'Translator',
      }])
      setSending(false)
    }, 1200)
  }

  const runCritique = () => {
    setCritiquing(true)
    setTimeout(() => setCritiquing(false), 2000)
  }

  return (
    <AppShell currentPath="/dashboard/projects">
      {/* Canvas toolbar */}
      <div className="flex items-center justify-between mb-4 -mt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[color:var(--color-primary)] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Projects
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-black text-[color:var(--color-deep-indigo)]">{project.title}</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[color:var(--color-primary)] border border-blue-200">Canvas</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runCritique}
            disabled={critiquing}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${
              critiquing ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {critiquing ? (
              <><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Critiquing…</>
            ) : (
              <><span className="material-symbols-outlined text-sm">rate_review</span> Critique</>
            )}
          </button>
          <button className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            <span className="material-symbols-outlined text-sm">publish</span> Export
          </button>
        </div>
      </div>

      {/* Split canvas: chat left, editor right */}
      <div className="flex gap-6" style={{ height: 'calc(100vh - 13rem)' }}>
        {/* Left — AI Chat panel */}
        <div className="w-80 shrink-0 flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Agent header */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[color:var(--color-primary)] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
            </div>
            <div>
              <p className="text-xs font-black text-[color:var(--color-deep-indigo)]">AI Writing Assistant</p>
              <p className="text-xs text-green-500 font-semibold">● Online</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[color:var(--color-primary)] text-white rounded-br-sm'
                    : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-bl-sm'
                }`}>
                  {m.agent && m.role === 'assistant' && (
                    <p className="text-[10px] font-bold text-[color:var(--color-primary)] mb-1">{m.agent} Agent</p>
                  )}
                  <p className="whitespace-pre-wrap font-medium">{m.content}</p>
                </div>
              </motion.div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-50 rounded-2xl rounded-bl-sm px-3.5 py-3 flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask the AI…"
                className="flex-1 text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[color:var(--color-primary)] transition-colors"
              />
              <button
                onClick={sendMessage}
                className="w-9 h-9 rounded-xl bg-[color:var(--color-primary)] text-white flex items-center justify-center hover:bg-[color:var(--color-primary-dark)] transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right — Document Editor */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Editor title */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <input
              defaultValue={project.title}
              className="text-sm font-black text-[color:var(--color-deep-indigo)] bg-transparent outline-none border-b-2 border-transparent focus:border-[color:var(--color-primary)] transition-colors"
            />
          </div>

          {/* Editor area */}
          <textarea
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            spellCheck={false}
            className="flex-1 p-8 text-sm leading-relaxed text-slate-700 resize-none outline-none"
            style={{ fontFamily: "'Georgia', serif", lineHeight: '1.8', fontSize: '14px' }}
          />

          {/* Status bar */}
          <div className="px-8 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400 font-semibold">{doc.split(' ').filter(Boolean).length} words</p>
            <p className="text-xs text-green-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Auto-saved
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
