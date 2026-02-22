'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Research', href: '#research' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Integrations', href: '#integrations' },
]

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-50 w-full glass-nav"
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="bg-white p-1.5 rounded-lg shadow-sm">
            <span className="material-symbols-outlined text-[color:var(--color-primary)] text-2xl">auto_stories</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Saraswati AI</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-semibold text-white/90 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="hidden sm:block text-sm font-bold text-white/90 hover:text-white px-4 py-2 transition-all"
          >
            Login
          </Link>
          <Link
            href="/auth/login"
            className="bg-white text-[color:var(--color-primary)] hover:bg-slate-50 px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all border border-white/20"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
