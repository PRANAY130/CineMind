'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UploadCloud, LayoutDashboard, BookOpen, FileText, Settings, ChevronLeft, Clapperboard } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const isWorkspace = pathname.startsWith('/workspace')

  const navItems = [
    { href: '/upload',    icon: UploadCloud,    label: 'Upload'     },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Library'    },
    { href: '/library',   icon: BookOpen,        label: 'Knowledge'  },
    { href: '#',          icon: FileText,        label: 'Transcripts'},
  ]

  return (
    <aside className="holo-sidebar w-[68px] flex flex-col items-center py-5 gap-4 shrink-0 z-20">
      {/* Logo / Back */}
      <div className="mb-3">
        {isWorkspace ? (
          <Link
            href="/dashboard"
            title="Back to Library"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-[0_0_16px_rgba(124,58,237,0.5)] hover:scale-105 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </Link>
        ) : (
          <Link
            href="/dashboard"
            title="CineMind"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/20 to-cyan-500/20 border border-violet-500/20 hover:border-violet-500/40 hover:from-violet-600/30 hover:to-cyan-500/30 transition-all duration-300"
          >
            <Clapperboard className="w-5 h-5 text-violet-400" />
          </Link>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-1 w-full px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <div key={label} className="relative group w-full">
              <Link
                href={href}
                className={cn(
                  'flex items-center justify-center w-full h-11 rounded-xl transition-all duration-200 relative',
                  active
                    ? 'bg-violet-500/10 text-violet-400'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                )}
              >
                {/* Active left-bar indicator */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-gradient-to-b from-violet-400 to-cyan-400" />
                )}
                <Icon className="w-[18px] h-[18px]" />
              </Link>

              {/* Hover Tooltip */}
              <div className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
                <div className="bg-[#18181F] border border-white/10 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                  {label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#18181F]" />
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="mt-auto px-2 w-full">
        <div className="relative group w-full">
          <Link
            href="/profile"
            className={cn(
              'flex items-center justify-center w-full h-11 rounded-xl transition-all duration-200 relative',
              pathname === '/profile'
                ? 'bg-violet-500/10 text-violet-400'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            )}
          >
            {pathname === '/profile' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-gradient-to-b from-violet-400 to-cyan-400" />
            )}
            <Settings className="w-[18px] h-[18px]" />
          </Link>
          <div className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
            <div className="bg-[#18181F] border border-white/10 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
              Settings
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#18181F]" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
