'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useSpring, useTransform } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Link from 'next/link'
import Footer from '@/components/Footer'

gsap.registerPlugin(ScrollTrigger)

const stats = [
  { value: '1M+', label: 'Papers Analyzed' },
  { value: '50k+', label: 'Researchers' },
  { value: '10M+', label: 'Citations' },
  { value: '98%', label: 'Accuracy Rate' },
]

const features = [
  {
    icon: 'library_books',
    title: 'Literature Review',
    desc: 'Analyze thousands of papers in seconds. Our AI identifies gaps in current literature automatically.',
    cta: 'Explore tool',
  },
  {
    icon: 'fact_check',
    title: 'Peer Review AI',
    desc: "Get AI-powered feedback on your drafts before submitting to journals. Anticipate critiques early.",
    cta: 'Try simulator',
  },
  {
    icon: 'format_quote',
    title: 'Citation Magic',
    desc: 'Seamlessly organize references. Supports APA, MLA, Chicago, and custom journal styles.',
    cta: 'Learn more',
  },
]

// Animated counter hook using Framer Motion
function AnimatedStat({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  
  // Extract numeric part and suffix (e.g., "1", "M+")
  const matches = value.match(/^([\d.]+)(.*)$/)
  const numericValue = matches ? parseFloat(matches[1]) : 0
  const suffix = matches ? matches[2] : ''

  const springValue = useSpring(0, {
    stiffness: 70,
    damping: 25,
    duration: 2000
  })

  // Format number intelligently
  const displayValue = useTransform(springValue, (current: number) => {
    if (numericValue % 1 !== 0) {
      return current.toFixed(1) + suffix // e.g. 1.5M
    }
    return Math.floor(current) + suffix // e.g. 50k
  })

  useEffect(() => {
    if (isInView) {
      springValue.set(numericValue)
    }
  }, [isInView, numericValue, springValue])

  return (
    <div ref={ref} className="text-center">
      <motion.p className="text-4xl font-black text-[color:var(--color-deep-indigo)] mb-1">
        {displayValue}
      </motion.p>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
    </div>
  )
}

// Scroll-reveal card
function FeatureCard({ icon, title, desc, cta, index }: { icon: string; title: string; desc: string; cta: string; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="group bg-white p-10 rounded-3xl border border-slate-100 hover:border-[color:var(--color-primary)]/30 transition-all hover:shadow-2xl hover:shadow-blue-100/50 card-hover"
    >
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[color:var(--color-primary)] mb-8 group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <h3 className="text-2xl font-bold text-[color:var(--color-deep-indigo)] mb-4">{title}</h3>
      <p className="text-slate-600 leading-relaxed mb-6">{desc}</p>
      <a className="text-[color:var(--color-primary)] font-bold inline-flex items-center gap-2 hover:text-blue-700 transition-colors group/link" href="#">
        {cta}
        <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform">arrow_forward</span>
      </a>
    </motion.div>
  )
}

import HeroCards from '@/components/HeroCards'
import VantaFog from '@/components/VantaFog'

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const h1Ref = useRef<HTMLHeadingElement>(null)
  const pRef = useRef<HTMLParagraphElement>(null)
  const btnsRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  // GSAP hero stagger animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(badgeRef.current, { opacity: 0, y: -20, duration: 0.5 })
        .from(h1Ref.current, { opacity: 0, y: 40, duration: 0.7 }, '-=0.2')
        .from(pRef.current, { opacity: 0, y: 30, duration: 0.6 }, '-=0.4')
        .from(btnsRef.current, { opacity: 0, y: 20, duration: 0.5 }, '-=0.3')
        .from(cardsRef.current, { opacity: 0, scale: 0.95, y: 40, duration: 0.8 }, '-=0.3')
    }, heroRef)
    return () => ctx.revert()
  }, [])

  return (
    <div className="bg-white text-slate-700">
      <main>
        {/* ── Hero Text ──────────────────────────────────────────────── */}
        <section ref={heroRef} className="relative overflow-hidden pt-16 md:pt-24 pb-16 min-h-[80vh] flex flex-col justify-center">
          {/* Vanta animated fog fills the entire hero background */}
          <VantaFog />
          <div className="max-w-4xl mx-auto px-6 text-center w-full z-20 relative backdrop-blur-md bg-white/50 p-8 md:p-12 rounded-[3rem] shadow-2xl border border-white/70">
            <div ref={badgeRef} className="inline-flex items-center gap-2 bg-blue-50 text-[color:var(--color-primary)] border border-blue-100 px-4 py-1.5 rounded-full mb-6 shadow-sm mt-4">
              <span className="material-symbols-outlined text-sm">stars</span>
              <span className="text-xs font-bold uppercase tracking-wider">The Future of Scholarly Writing</span>
            </div>

            <h1 ref={h1Ref} className="text-5xl md:text-7xl font-black mb-4 tracking-tighter leading-[1.1] text-[color:var(--color-deep-indigo)] relative z-20">
              Unlock the Future of{' '}
              <br className="hidden md:block" />
              <span className="text-gradient">Academic Research</span>
            </h1>

            <p ref={pRef} className="max-w-2xl mx-auto text-lg text-slate-700 mb-8 leading-relaxed font-semibold relative z-20">
              Saraswati AI transforms complex data into publishable insights. The fusion of traditional knowledge and AI at your fingertips.
            </p>

            <div ref={btnsRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4 relative z-20">
              <Link
                href="/auth/login"
                className="w-full sm:w-auto bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-dark)] text-white px-8 py-3 rounded-xl text-base font-bold shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2"
              >
                Get Started for Free
                <span className="material-symbols-outlined text-xl">arrow_right_alt</span>
              </Link>
              <button className="w-full sm:w-auto bg-white border border-slate-200 text-[color:var(--color-deep-indigo)] px-8 py-3 rounded-xl text-base font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-xl backdrop-blur-md">
                <span className="material-symbols-outlined text-xl text-[color:var(--color-primary)]">play_circle</span>
                Watch Demo
              </button>
            </div>
          </div>
        </section>

        {/* ── Interactive Cards Section ───────────────────────────────────────── */}
        <section className="relative h-[800px] w-full bg-slate-50 border-t border-slate-200/50 overflow-hidden flex items-center justify-center">
          <div ref={cardsRef} className="absolute inset-0 z-10 w-full h-full">
            <HeroCards />
          </div>
        </section>



        {/* ── Stats ─────────────────────────────────────────────── */}
        <section className="border-y border-slate-100 bg-[color:var(--color-slate-soft)] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((s) => <AnimatedStat key={s.label} {...s} />)}
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────── */}
        <section className="py-24 md:py-32 section-gradient-soft">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-20 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-4xl md:text-5xl font-black text-[color:var(--color-deep-indigo)] mb-6 tracking-tight"
              >
                Research at <span className="text-[color:var(--color-primary)] italic">Warp Speed</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed"
              >
                Our platform provides the tools you need to accelerate your academic journey with precision and ease.
              </motion.p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((f, i) => <FeatureCard key={f.title} {...f} index={i} />)}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ────────────────────────────────────────── */}
        <section className="py-24 px-6 bg-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-6xl mx-auto rounded-[3rem] bg-[color:var(--color-deep-indigo)] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 opacity-40 pointer-events-none">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[color:var(--color-primary)] blur-[120px] rounded-full -mr-48 -mt-48" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[color:var(--color-accent-cyan)] blur-[100px] rounded-full -ml-32 -mb-32" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tight relative z-10 text-white">
              Ready to transform <br /> your research?
            </h2>
            <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto relative z-10 font-medium">
              Join thousands of scholars who are writing better papers in half the time. Start today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 relative z-10">
              <Link
                href="/auth/login"
                className="bg-white text-[color:var(--color-deep-indigo)] hover:bg-slate-100 px-10 py-5 rounded-2xl text-lg font-black transition-all shadow-xl hover:scale-105 active:scale-95"
              >
                Get Started Now
              </Link>
              <button className="bg-white/10 border-2 border-white/20 backdrop-blur-md text-white hover:bg-white/20 px-10 py-5 rounded-2xl text-lg font-black transition-all">
                Schedule a Demo
              </button>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
