'use client'

import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import Link from 'next/link'
import VantaFog from '@/components/VantaFog'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-stretch">
      {/* Left panel — branding */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex flex-col justify-between w-1/2 p-14 relative overflow-hidden"
      >
        {/* Vanta animated fog fills the entire left panel */}
        <VantaFog />

        {/* Dark overlay so text stays readable over the fog */}
        <div className="absolute inset-0 bg-[color:var(--color-deep-indigo)]/60 z-10 pointer-events-none" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 relative z-20">
          <div className="bg-white p-1.5 rounded-lg">
            <span className="material-symbols-outlined text-[color:var(--color-primary)] text-2xl">auto_stories</span>
          </div>
          <span className="text-xl font-bold text-white">Saraswati AI</span>
        </Link>

        {/* Tagline */}
        <div className="relative z-20">
          <motion.h2
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-4xl font-black text-white mb-6 leading-tight"
          >
            Your AI-powered<br />academic partner.
          </motion.h2>
          <p className="text-blue-200 text-lg font-medium leading-relaxed max-w-sm">
            Scout papers, build knowledge graphs, and write world-class research — all in one place.
          </p>

          {/* Social proof */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[['1M+', 'Papers'], ['50k+', 'Researchers'], ['98%', 'Accuracy']].map(([n, l]) => (
              <div key={l}>
                <p className="text-3xl font-black text-white">{n}</p>
                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Right panel — login form */}
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex-1 flex flex-col items-center justify-center p-8 bg-white"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="bg-[color:var(--color-primary)] p-1.5 rounded-lg">
              <span className="material-symbols-outlined text-white text-2xl">auto_stories</span>
            </div>
            <span className="text-xl font-bold text-[color:var(--color-deep-indigo)]">Saraswati AI</span>
          </Link>

          <h1 className="text-3xl font-black text-[color:var(--color-deep-indigo)] mb-2">Welcome back</h1>
          <p className="text-slate-500 mb-10">Sign in to continue your research journey.</p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Google OAuth button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 bg-white hover:bg-slate-50 text-[color:var(--color-deep-indigo)] px-6 py-4 rounded-2xl font-bold text-base shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-[color:var(--color-primary)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Continue with Google'}
          </motion.button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-400 font-semibold">
              <span className="bg-white px-4">More options coming soon</span>
            </div>
          </div>

          {/* Disabled email (coming soon) */}
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 text-slate-400 px-6 py-4 rounded-2xl font-bold text-sm cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-lg">mail</span>
            Continue with Email (Coming Soon)
          </button>

          <p className="mt-10 text-center text-xs text-slate-400">
            By continuing, you agree to our{' '}
            <a href="#" className="text-[color:var(--color-primary)] font-semibold hover:underline">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-[color:var(--color-primary)] font-semibold hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
