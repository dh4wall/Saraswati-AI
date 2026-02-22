'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const educationLevels = [
  { value: 'high_school', label: 'High School', icon: '🎒' },
  { value: 'undergraduate', label: 'Undergraduate', icon: '📚' },
  { value: 'graduate', label: 'Graduate (Masters)', icon: '🎓' },
  { value: 'phd', label: 'PhD / Doctorate', icon: '🔬' },
  { value: 'professional', label: 'Professional / Researcher', icon: '🧠' },
]

const interestOptions = [
  'Machine Learning', 'NLP', 'Computer Vision', 'GraphRAG', 'Bioinformatics',
  'Quantum Computing', 'Neuroscience', 'Climate Science', 'Economics',
  'Next.js / Web', 'Robotics', 'Cybersecurity', 'Data Engineering', 'Physics',
]

const steps = ['Welcome', 'Your Level', 'Interests', 'Done']

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [eduLevel, setEduLevel] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const nav = (next: number) => {
    setDir(next > step ? 1 : -1)
    setStep(next)
  }

  const toggleInterest = (i: string) => {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : prev.length < 5 ? [...prev, i] : prev
    )
  }

  const handleComplete = async () => {
    setLoading(true)
    const supabase = createClient()

    // Save to user_metadata and mark as onboarded
    await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        education_level: eduLevel,
        interests,
        onboarded: true,
      },
    })

    // TODO: also upsert into public.profiles table when DB schema is set up
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-12">
        <div className="bg-[color:var(--color-primary)] p-1.5 rounded-lg">
          <span className="material-symbols-outlined text-white text-2xl">auto_stories</span>
        </div>
        <span className="text-xl font-bold text-[color:var(--color-deep-indigo)]">Saraswati AI</span>
      </Link>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i <= step ? 'bg-[color:var(--color-primary)] text-white' : 'bg-slate-200 text-slate-400'
              }`}>{i + 1}</div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-16 sm:w-28 transition-colors ${i < step ? 'bg-[color:var(--color-primary)]' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 font-semibold text-center">Step {step + 1} of {steps.length} — {steps[step]}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <motion.div
              key="step0"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="p-10"
            >
              <div className="text-5xl mb-6">🪷</div>
              <h1 className="text-3xl font-black text-[color:var(--color-deep-indigo)] mb-3">Welcome to Saraswati AI</h1>
              <p className="text-slate-500 leading-relaxed mb-8">
                Let&apos;s personalise your experience. This takes less than a minute and helps our AI tailor explanations and paper recommendations just for you.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">What should we call you?</label>
                <input
                  type="text"
                  placeholder="Your name or nickname"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border-2 border-slate-200 focus:border-[color:var(--color-primary)] rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors"
                />
              </div>
              <button
                onClick={() => nav(1)}
                disabled={!displayName.trim()}
                className="w-full bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-white py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40"
              >
                Let&apos;s Go →
              </button>
            </motion.div>
          )}

          {/* Step 1 — Education level */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="p-10"
            >
              <h2 className="text-2xl font-black text-[color:var(--color-deep-indigo)] mb-2">Your Academic Level</h2>
              <p className="text-slate-500 text-sm mb-6">This helps our Translator Agent calibrate explanations perfectly for you.</p>
              <div className="space-y-3 mb-8">
                {educationLevels.map((lvl) => (
                  <button
                    key={lvl.value}
                    onClick={() => setEduLevel(lvl.value)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left font-semibold text-sm transition-all ${
                      eduLevel === lvl.value
                        ? 'border-[color:var(--color-primary)] bg-blue-50 text-[color:var(--color-deep-indigo)]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{lvl.icon}</span>
                    {lvl.label}
                    {eduLevel === lvl.value && <span className="ml-auto material-symbols-outlined text-[color:var(--color-primary)]">check_circle</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => nav(0)} className="flex-1 border-2 border-slate-200 text-slate-600 py-3.5 rounded-2xl font-bold hover:bg-slate-50 transition-all">← Back</button>
                <button onClick={() => nav(2)} disabled={!eduLevel} className="flex-1 bg-[color:var(--color-primary)] text-white py-3.5 rounded-2xl font-bold disabled:opacity-40 hover:bg-[color:var(--color-primary-dark)] transition-all">Next →</button>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Interests */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="p-10"
            >
              <h2 className="text-2xl font-black text-[color:var(--color-deep-indigo)] mb-2">Your Research Interests</h2>
              <p className="text-slate-500 text-sm mb-6">Pick up to 5 topics. The Scout Agent will fetch foundational papers in the background.</p>
              <div className="flex flex-wrap gap-2.5 mb-8">
                {interestOptions.map((i) => (
                  <button
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
                      interests.includes(i)
                        ? 'bg-[color:var(--color-primary)] border-[color:var(--color-primary)] text-white'
                        : 'border-slate-200 text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mb-6 font-semibold">{interests.length}/5 selected</p>
              <div className="flex gap-3">
                <button onClick={() => nav(1)} className="flex-1 border-2 border-slate-200 text-slate-600 py-3.5 rounded-2xl font-bold hover:bg-slate-50 transition-all">← Back</button>
                <button onClick={() => nav(3)} disabled={interests.length === 0} className="flex-1 bg-[color:var(--color-primary)] text-white py-3.5 rounded-2xl font-bold disabled:opacity-40 hover:bg-[color:var(--color-primary-dark)] transition-all">Next →</button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Done */}
          {step === 3 && (
            <motion.div
              key="step3"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="p-10 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="text-6xl mb-6"
              >
                🎉
              </motion.div>
              <h2 className="text-3xl font-black text-[color:var(--color-deep-indigo)] mb-3">You&apos;re all set, {displayName}!</h2>
              <p className="text-slate-500 leading-relaxed mb-8">
                The Scout Agent is already fetching foundational papers in your areas of interest.
                Your research journey begins now.
              </p>
              <div className="bg-blue-50 rounded-2xl p-5 mb-8 text-left">
                <p className="text-xs font-bold text-[color:var(--color-primary)] uppercase tracking-widest mb-3">Your Profile</p>
                <p className="text-sm text-slate-700 font-semibold mb-1">📚 {educationLevels.find(e => e.value === eduLevel)?.label}</p>
                <p className="text-sm text-slate-700">🏷️ {interests.join(' · ')}</p>
              </div>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="w-full bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-white py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>Enter Saraswati AI <span className="material-symbols-outlined">arrow_right_alt</span></>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
