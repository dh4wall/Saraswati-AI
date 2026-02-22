'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { icon: 'home', label: 'Home', href: '/dashboard' },
  { icon: 'folder_open', label: 'Projects', href: '/dashboard/projects' },
  { icon: 'travel_explore', label: 'Explore', href: '/dashboard/explore' },
]

function AppShellInner({ children, currentPath }: { children: React.ReactNode; currentPath: string }) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [initials, setInitials] = useState('U')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const name: string = user?.user_metadata?.display_name ?? user?.email ?? ''
      setDisplayName(name)
      const parts = name.split(' ').filter(Boolean)
      setInitials(
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase() || 'U'
      )
    }
    load()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex h-screen bg-[color:var(--color-slate-soft)] overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex flex-col bg-white border-r border-slate-200 shrink-0 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 p-5 border-b border-slate-100 h-20">
          <div className="bg-[color:var(--color-primary)] p-1.5 rounded-lg shrink-0">
            <span className="material-symbols-outlined text-white text-xl">auto_stories</span>
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-[color:var(--color-deep-indigo)] text-sm leading-tight"
            >
              Saraswati AI
            </motion.span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const active = item.href === '/dashboard'
              ? currentPath === '/dashboard'
              : currentPath.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-blue-50 text-[color:var(--color-primary)]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[color:var(--color-deep-indigo)]'
                }`}
              >
                <span className="material-symbols-outlined text-xl shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom controls */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all"
          >
            <span className="material-symbols-outlined text-xl shrink-0">
              {collapsed ? 'keyboard_arrow_right' : 'keyboard_arrow_left'}
            </span>
            {!collapsed && <span>Collapse</span>}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <span className="material-symbols-outlined text-xl shrink-0">logout</span>
            {!collapsed && <span>Sign out</span>}
          </button>

          {/* User profile */}
          {!collapsed ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer mt-1">
              <div className="w-8 h-8 rounded-full bg-[color:var(--color-primary)] flex items-center justify-center text-white font-bold text-xs shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[color:var(--color-deep-indigo)] truncate">
                  {displayName || 'User'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Free Plan</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div className="w-8 h-8 rounded-full bg-[color:var(--color-primary)] flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main content — no top header bar */}
      <div className="flex-1 overflow-y-auto">
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}

export { AppShellInner as AppShell }
