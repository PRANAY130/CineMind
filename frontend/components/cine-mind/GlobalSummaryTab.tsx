'use client'

import { useState, useEffect } from 'react'
import { fetchSummary } from '@/lib/api'
import { Loader2, Globe, Brain, Target, Search, Lightbulb, Sparkles } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface GlobalSummaryTabProps {
  videoId: string
  isAnalysisComplete?: boolean
}

const LANGUAGES = [
  { id: 'English', label: 'EN', flag: '🇺🇸' },
  { id: 'Spanish', label: 'ES', flag: '🇪🇸' },
  { id: 'French',  label: 'FR', flag: '🇫🇷' },
  { id: 'Hindi',   label: 'HI', flag: '🇮🇳' },
  { id: 'German',  label: 'DE', flag: '🇩🇪' },
]

interface SummarySection {
  title: string
  icon: any
  color: string
  badgeClass: string
  content: string
}

const SECTION_CONFIG: Record<string, { icon: any; color: string; badgeClass: string }> = {
  'Executive Overview': { icon: Brain,    color: '#E879F9', badgeClass: 'badge-pink'   },
  'Key Takeaways':      { icon: Target,   color: '#F87171', badgeClass: 'badge-pink'   },
  'Detailed Analysis':  { icon: Search,   color: '#60A5FA', badgeClass: 'badge-cyan'   },
  'Additional Context': { icon: Lightbulb,color: '#FCD34D', badgeClass: 'badge-amber'  },
}

function parseSummarySections(markdown: string): SummarySection[] {
  if (!markdown) return []
  const sections: SummarySection[] = []
  const parts = markdown.split(/###\s*(?:[^\w\s]*)\s*\*\*(.*?)\*\*/g)
  if (parts[0].trim()) {
    sections.push({ title: 'Overview', icon: Sparkles, color: '#A78BFA', badgeClass: 'badge-purple', content: parts[0].trim() })
  }
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim()
    const content = parts[i + 1]?.trim() || ''
    const config = SECTION_CONFIG[title] || { icon: Sparkles, color: '#A78BFA', badgeClass: 'badge-purple' }
    sections.push({ title, icon: config.icon, color: config.color, badgeClass: config.badgeClass, content })
  }
  return sections
}

export default function GlobalSummaryTab({ videoId, isAnalysisComplete = true }: GlobalSummaryTabProps) {
  const [summaryData, setSummaryData] = useState<Record<string, string> | null>(null)
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [activeLang, setActiveLang]   = useState('English')

  useEffect(() => {
    if (!isAnalysisComplete) return
    let isMounted = true
    const loadSummary = async () => {
      try {
        setIsLoading(true)
        const data = await fetchSummary(Number(videoId))
        if (isMounted) { setSummaryData(data); setError(null) }
      } catch (err) {
        if (isMounted) setError('Failed to generate summary. Please try again.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadSummary()
    return () => { isMounted = false }
  }, [videoId, isAnalysisComplete])

  // Waiting for analysis to complete
  if (!isAnalysisComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
          <Globe className="w-6 h-6 text-violet-400 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <h3 className="text-sm font-bold text-white mb-2">Awaiting Analysis</h3>
        <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
          The multilingual summary will be generated automatically once video analysis is complete.
        </p>
      </div>
    )
  }

  // Loading summary
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
        <h3 className="text-sm font-bold text-white mb-2">Generating Summary</h3>
        <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
          Gemini 1.5 Pro is analyzing the transcript and building structured insights in multiple languages…
        </p>
      </div>
    )
  }

  // Error state
  if (error || !summaryData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
        <p className="text-xs text-red-400 bg-red-400/10 px-5 py-3 rounded-xl border border-red-400/20">
          {error || 'No summary available'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with language switcher */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-white">Multilingual Summary</span>
        </div>

        {/* Language pills */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-full border border-white/[0.06]">
          {LANGUAGES.map((lang) => {
            const active = activeLang === lang.id
            return (
              <button
                key={lang.id}
                onClick={() => setActiveLang(lang.id)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-200',
                  active
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary content */}
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-4xl mx-auto space-y-4">
          {LANGUAGES.map((lang) => {
            const sections = parseSummarySections(summaryData[lang.id] || '')
            return (
              <div
                key={lang.id}
                className={cn(
                  'transition-all duration-500 space-y-4',
                  activeLang === lang.id ? 'block' : 'hidden'
                )}
              >
                {sections.length > 0 ? sections.map((section, idx) => {
                  const Icon = section.icon
                  return (
                    <div
                      key={idx}
                      className="holo-card-elevated p-5"
                      style={{ borderLeft: `2px solid ${section.color}30` }}
                    >
                      {/* Section header */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0"
                          style={{ background: `${section.color}12`, borderColor: `${section.color}28` }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: section.color }} />
                        </div>
                        <span className={section.badgeClass}>{section.title}</span>
                      </div>

                      {/* Section content */}
                      <div className="prose prose-invert prose-sm max-w-none prose-p:text-zinc-400 prose-p:leading-relaxed prose-p:text-[13px] prose-li:text-zinc-400 prose-li:text-[13px] prose-strong:text-white prose-headings:text-white">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="holo-card-elevated p-5">
                    <div className="prose prose-invert prose-sm max-w-none prose-p:text-zinc-400 prose-p:text-[13px]">
                      <ReactMarkdown>{summaryData[lang.id] || '_Translation unavailable._'}</ReactMarkdown>
                    </div>
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
