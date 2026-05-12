'use client'

import { useState, useEffect } from 'react'
import { fetchSummary } from '@/lib/api'
import { Loader2, Globe, Brain, Target, Search, Lightbulb, Sparkles } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

import ReactMarkdown from 'react-markdown'

interface GlobalSummaryTabProps {
  videoId: string
}

const LANGUAGES = [
  { id: 'English', label: 'English', flag: '🇺🇸' },
  { id: 'Spanish', label: 'Español', flag: '🇪🇸' },
  { id: 'French', label: 'Français', flag: '🇫🇷' },
  { id: 'Hindi', label: 'हिंदी', flag: '🇮🇳' },
  { id: 'German', label: 'Deutsch', flag: '🇩🇪' },
]

interface SummarySection {
  title: string
  icon: any
  color: string
  content: string
}

const SECTION_CONFIG: Record<string, { icon: any, color: string, bg: string, border: string, text: string }> = {
  'Executive Overview': { 
    icon: Brain, 
    color: '#EC4899', 
    bg: 'bg-pink-500/10', 
    border: 'border-pink-500/20',
    text: 'text-pink-400'
  },
  'Key Takeaways': { 
    icon: Target, 
    color: '#F43F5E', 
    bg: 'bg-rose-500/10', 
    border: 'border-rose-500/20',
    text: 'text-rose-400'
  },
  'Detailed Analysis': { 
    icon: Search, 
    color: '#3B82F6', 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/20',
    text: 'text-blue-400'
  },
  'Additional Context': { 
    icon: Lightbulb, 
    color: '#F59E0B', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/20',
    text: 'text-amber-400'
  }
}

function parseSummarySections(markdown: string): SummarySection[] {
  if (!markdown) return []
  
  const sections: SummarySection[] = []
  // Split by ### followed by emoji and title
  const parts = markdown.split(/###\s*(?:[^\w\s]*)\s*\*\*(.*?)\*\*/g)
  
  // The first part is usually empty or intro text before first header
  if (parts[0].trim()) {
    sections.push({
      title: 'Introduction',
      icon: Sparkles,
      color: '#A855F7',
      content: parts[0].trim()
    })
  }

  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim()
    const content = parts[i+1]?.trim() || ''
    const config = SECTION_CONFIG[title] || { icon: Sparkles, color: '#A855F7' }
    
    sections.push({
      title,
      icon: config.icon,
      color: config.color,
      content
    })
  }
  
  return sections
}

export default function GlobalSummaryTab({ videoId }: GlobalSummaryTabProps) {
  const [summaryData, setSummaryData] = useState<Record<string, string> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeLang, setActiveLang] = useState<string>('English')

  useEffect(() => {
    let isMounted = true
    const loadSummary = async () => {
      try {
        setIsLoading(true)
        const data = await fetchSummary(Number(videoId))
        if (isMounted) {
          setSummaryData(data)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to generate global summary. Please try again.')
          console.error(err)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSummary()
    return () => { isMounted = false }
  }, [videoId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-12 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full blur-2xl bg-purple-500/10 animate-pulse" />
          <Globe className="w-12 h-12 text-purple-400 animate-spin-slow relative z-10" />
        </div>
        <h3 className="text-base font-black text-white uppercase tracking-[0.2em] mb-3">Synthesizing Neural Summary</h3>
        <p className="text-xs text-slate-400 max-w-[350px] leading-relaxed">
          Gemini 1.5 Pro is currently performing deep-transcript analysis to extract structured insights in multiple languages...
        </p>
      </div>
    )
  }

  if (error || !summaryData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
        <p className="text-sm text-red-400 bg-red-400/10 px-6 py-3 rounded-xl border border-red-400/20 shadow-lg">{error || 'No summary available'}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Language Selector Navbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
             <Globe className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Multilingual Synthesis</span>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] rounded-full border border-white/5">
          {LANGUAGES.map((lang) => {
            const isActive = activeLang === lang.id
            return (
              <button
                key={lang.id}
                onClick={() => setActiveLang(lang.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-500",
                  isActive 
                    ? "text-white bg-purple-500/30 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                )}
              >
                <span className="text-[11px]">{lang.flag}</span>
                <span className={cn(!isActive && "hidden md:inline")}>{lang.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary Content */}
      <ScrollArea className="flex-1 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/[0.03] blur-[120px] pointer-events-none rounded-full" />
        
        <div className="p-8 max-w-4xl mx-auto space-y-8">
          {LANGUAGES.map((lang) => {
            const sections = parseSummarySections(summaryData[lang.id] || '')
            return (
              <div 
                key={lang.id}
                className={cn(
                  "transition-all duration-700 ease-out space-y-6",
                  activeLang === lang.id 
                    ? "opacity-100 translate-y-0 relative pointer-events-auto" 
                    : "opacity-0 translate-y-4 absolute inset-x-8 pointer-events-none"
                )}
              >
                {sections.length > 0 ? sections.map((section, idx) => {
                  const config = SECTION_CONFIG[section.title] || { 
                    icon: Sparkles, 
                    bg: 'bg-purple-500/10', 
                    border: 'border-purple-500/20',
                    text: 'text-purple-400' 
                  }
                  const Icon = config.icon

                  return (
                    <div 
                      key={idx}
                      className={cn(
                        "rounded-2xl border p-6 transition-all hover:shadow-lg group",
                        config.bg,
                        config.border
                      )}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className={cn("p-2 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform", config.text)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className={cn("text-sm font-black uppercase tracking-widest", config.text)}>
                          {section.title}
                        </h3>
                      </div>
                      
                      <div className="prose prose-invert prose-sm max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-li:text-slate-400 prose-strong:text-white">
                        <ReactMarkdown>
                          {section.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>
                      {summaryData[lang.id] || '_Translation unavailable._'}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

