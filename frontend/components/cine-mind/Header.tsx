'use client'

import { useRouter } from 'next/navigation'
import { Share2, Download, LogOut, User, Clapperboard } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  title?: string
}

export default function Header({ title = "CineMind" }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/')
  }

  return (
    <header className="holo-header h-14 flex items-center justify-between px-5 shrink-0 z-20">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-white">{title}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-emerald-400">Operational</span>
        </div>
      </div>

      {/* Right: Actions + Avatar */}
      <div className="flex items-center gap-2">
        <button className="btn-icon">
          <Share2 className="w-4 h-4" />
        </button>
        <button className="btn-icon">
          <Download className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <DropdownMenu>
          {/* Style the trigger directly — Base UI's Trigger renders as a button; no asChild needed */}
          <DropdownMenuTrigger
            className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/30 to-cyan-500/30 border border-violet-500/30 flex items-center justify-center hover:border-violet-500/60 transition-colors outline-none cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-violet-300" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-52 bg-[#18181F] border border-white/10 text-white rounded-xl shadow-2xl overflow-hidden p-1"
          >
            {/* DropdownMenuLabel must be inside DropdownMenuGroup (Base UI requirement) */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 px-2 py-2">
                Account
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-white/[0.06] mx-1" />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => router.push('/profile')}
                className="text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] cursor-pointer rounded-lg px-2 py-2 flex items-center gap-2"
              >
                <User className="w-4 h-4 text-violet-400" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] cursor-pointer rounded-lg px-2 py-2 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
