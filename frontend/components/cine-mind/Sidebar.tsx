'use client'

import { Button } from '@/components/ui/button'
import { Play, BookOpen, FileText, Settings, ChevronLeft, LayoutDashboard } from 'lucide-react'

interface SidebarProps {
  onBack?: () => void
  showBack?: boolean
  onHomeClick: () => void
  activeState: string
}

export default function Sidebar({ onBack, showBack = false, onHomeClick, activeState }: SidebarProps) {
  return (
    <aside className="w-16 glass-sidebar flex flex-col items-center py-6 gap-6 z-20 transition-all shrink-0">
      {showBack ? (
        <div 
          className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform" 
          onClick={onBack}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </div>
      ) : (
        <div 
          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center cursor-pointer hover:border-purple-500/30 transition-all"
          onClick={onHomeClick}
        >
          <div className="w-4 h-4 rounded-sm accent-gradient rotate-45" />
        </div>
      )}
      
      <div className="flex flex-col gap-4 mt-8">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onHomeClick}
          className={`w-10 h-10 transition-colors ${activeState === 'dashboard' ? 'text-purple-400 bg-white/5' : 'text-slate-500 hover:text-purple-400 hover:bg-white/5'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
        </Button>
        {[Play, BookOpen, FileText, Settings].map((Icon, i) => (
          <Button key={i} variant="ghost" size="icon" className="w-10 h-10 text-slate-500 hover:text-purple-400 hover:bg-white/5">
            <Icon className="w-5 h-5" />
          </Button>
        ))}
      </div>
    </aside>
  )
}
