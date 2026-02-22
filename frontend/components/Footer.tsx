'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const footerLinks = {
  Product: ['Platform Overview', 'Pricing Plans', 'API Access', 'Changelog'],
  Research: ['Whitepapers', 'Ethics in AI', 'Peer Reviews', 'Case Studies'],
  Company: ['About Us', 'Contact', 'Terms of Service', 'Privacy Policy'],
}

export default function Footer() {
  return (
    <footer className="bg-[color:var(--color-slate-soft)] border-t border-slate-200 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-[color:var(--color-primary)] p-1 rounded-lg">
                <span className="material-symbols-outlined text-white text-xl">auto_stories</span>
              </div>
              <span className="text-lg font-bold text-[color:var(--color-deep-indigo)]">Saraswati AI</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">
              The ultimate research co-pilot, blending human ingenuity with the power of artificial intelligence to advance global knowledge.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([col, links]) => (
            <div key={col}>
              <h4 className="font-bold text-[color:var(--color-deep-indigo)] mb-6 uppercase tracking-widest text-xs">{col}</h4>
              <ul className="space-y-4">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-slate-500 hover:text-[color:var(--color-primary)] transition-colors text-sm font-semibold">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-200 gap-4">
          <p className="text-slate-400 text-xs font-bold">
            © 2026 Saraswati AI. Built for the next generation of researchers.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-400 hover:text-[color:var(--color-primary)] transition-colors">
              <span className="material-symbols-outlined">alternate_email</span>
            </a>
            <a href="#" className="text-slate-400 hover:text-[color:var(--color-primary)] transition-colors">
              <span className="material-symbols-outlined">public</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
