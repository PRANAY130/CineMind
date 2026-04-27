'use client'

import { Button } from '@/components/ui/button'
import { Play, BookOpen, FileText, Settings, ChevronLeft, LayoutDashboard, UploadCloud } from 'lucide-react'

interface SidebarProps {
  onBack?: () => void
  showBack?: boolean
  onHomeClick: () => void
  onWorkspaceClick: () => void
  onUploadClick: () => void
  onLibraryClick: () => void
  onSettingsClick: () => void
  activeState: string
}

export default function Sidebar({ 
  onBack, 
  showBack = false, 
  onHomeClick, 
  onWorkspaceClick, 
  onUploadClick,
  onLibraryClick, 
  onSettingsClick, 
  activeState 
}: SidebarProps) {
  return (
    <aside className="w-16 glass-sidebar flex flex-col items-center py-6 gap-6 z-20 transition-all shrink-0 border-r border-white/5 bg-slate-900/50 backdrop-blur-xl">
      {/* Top Logo / Back Action */}
      {showBack ? (
        <div 
          className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all duration-200" 
          onClick={onBack}
          title="Back to Dashboard"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </div>
      ) : (
        <div 
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300"
          onClick={onHomeClick}
          title="CineMind Home"
        >
          <div className="w-5 h-5 rounded-md accent-gradient rotate-45 shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
        </div>
      )}
      
      {/* Navigation Icons */}
      <div className="flex flex-col gap-5 mt-10">
        <SidebarItem 
          icon={UploadCloud} 
          label="Upload" 
          active={activeState === 'upload'} 
          onClick={onUploadClick} 
        />
        <SidebarItem 
          icon={LayoutDashboard} 
          label="Library" 
          active={activeState === 'dashboard'} 
          onClick={onHomeClick} 
        />
        <SidebarItem 
          icon={Play} 
          label="Workspace" 
          active={activeState === 'workspace'} 
          onClick={onWorkspaceClick} 
        />
        <SidebarItem 
          icon={BookOpen} 
          label="Library" 
          active={activeState === 'library'} 
          onClick={onLibraryClick} 
        />
        <SidebarItem 
          icon={FileText} 
          label="Transcripts" 
          active={false} 
          onClick={() => {}} 
        />
      </div>

      {/* Bottom Settings Icon */}
      <div className="mt-auto pb-4">
        <SidebarItem 
          icon={Settings} 
          label="Settings" 
          active={activeState === 'profile'} 
          onClick={onSettingsClick} 
        />
      </div>
    </aside>
  )
}

function SidebarItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <div className="relative group">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onClick}
        className={`w-12 h-12 rounded-xl transition-all duration-300 ${
          active 
            ? 'text-purple-400 bg-purple-500/10 border border-purple-500/20' 
            : 'text-slate-500 hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className={`w-5 h-5 ${active ? 'animate-pulse-slow' : ''}`} />
      </Button>
      
      {/* Tooltip */}
      <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#1e293b] border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap shadow-2xl z-50">
        {label}
        <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-[#1e293b] border-l border-b border-white/10 rotate-45" />
      </div>
    </div>
  )
}
