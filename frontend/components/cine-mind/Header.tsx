'use client'

import { Button } from '@/components/ui/button'
import { Share2, Download, LogOut, User } from 'lucide-react'
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
  onProfileClick: () => void
  onLogout: () => void
}

export default function Header({ title = "CineMind.studio", onProfileClick, onLogout }: HeaderProps) {
  return (
    <header className="h-14 glass-header flex items-center justify-between px-6 transition-all z-20 shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="font-black text-lg accent-text tracking-tighter">{title}</h2>
        <div className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[9px] font-bold text-amber-500 border border-amber-500/20 uppercase tracking-widest">
          Node Status: Operational
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5"><Share2 className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5"><Download className="w-3.5 h-3.5" /></Button>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="w-8 h-8 rounded-full bg-slate-700/50 border border-white/10 flex items-center justify-center cursor-pointer hover:border-purple-500/50 transition-colors overflow-hidden outline-none">
             <User className="w-4 h-4 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 glass-panel border-white/10 bg-[#0F172A]/90 backdrop-blur-xl text-white">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-slate-500">Node Administrator</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem onClick={onProfileClick} className="text-xs font-bold hover:bg-white/5 cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Neural Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout} className="text-xs font-bold text-red-400 hover:bg-red-400/10 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Terminate Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
