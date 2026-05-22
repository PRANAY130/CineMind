'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Play, Pause, Volume2, VolumeX, Maximize2, Loader2,
  MessageSquare, FileText, BookOpen, BarChart3, Globe,
  Send, ChevronLeft, ArrowUpRight
} from 'lucide-react'
import EmotionTimeline from './EmotionTimeline'
import GlobalSummaryTab from './GlobalSummaryTab'
import { chatWithVideo, connectProgressSocket } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
}

interface VideoWorkspaceProps {
  video: {
    id: string
    title: string
    thumbnail: string
    duration: string
    r2_url?: string
    status?: string
    stream_url?: string
  }
  onBack: () => void
}

const TABS = [
  { id: 'chat',       label: 'AI Chat',    icon: MessageSquare },
  { id: 'summary',    label: 'Summary',    icon: Globe         },
  { id: 'emotions',   label: 'Emotions',   icon: BarChart3     },
  { id: 'transcript', label: 'Transcript', icon: FileText      },
  { id: 'chapters',   label: 'Chapters',   icon: BookOpen      },
] as const

type TabId = typeof TABS[number]['id']

export default function VideoWorkspace({ video, onBack }: VideoWorkspaceProps) {
  const [isPlaying, setIsPlaying]   = useState(false)
  const [isMuted, setIsMuted]       = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeTab, setActiveTab]   = useState<TabId>('chat')

  const [messages, setMessages]     = useState<Message[]>([
    { id: '1', role: 'ai', content: "I've analyzed this video. Ask me anything about the content, themes, or specific moments." }
  ])
  const [input, setInput]       = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const videoRef      = useRef<HTMLVideoElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef      = useRef<HTMLInputElement>(null)

  const [chapters, setChapters]     = useState<any[]>([])
  const [transcript, setTranscript] = useState<any[]>([])
  const [streamUrl, setStreamUrl]   = useState('')
  const [emotionData, setEmotionData]     = useState<any[]>([])
  const [isEmotionsLoading, setIsEmotionsLoading] = useState(true)

  const [processingStep, setProcessingStep]         = useState('Initializing analysis...')
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingSeconds, setProcessingSeconds]   = useState(0)
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(video.status === 'ready')

  // ----- Data loading -----
  const loadDetails = useCallback(async () => {
    try {
      const { fetchVideo, fetchTranscript, fetchEmotions } = await import('@/lib/api')
      const data = await fetchVideo(Number(video.id))
      if (data.stream_url) setStreamUrl(data.stream_url)
      if (data.chapters) setChapters(data.chapters)
      const transData = await fetchTranscript(Number(video.id))
      setTranscript(transData || [])
      try {
        const emotions = await fetchEmotions(Number(video.id))
        if (emotions?.length > 0) setEmotionData(emotions)
      } catch { /* no emotions yet */ } finally {
        setIsEmotionsLoading(false)
      }
    } catch { /* ignore */ }
  }, [video.id])

  useEffect(() => { loadDetails() }, [loadDetails])

  // Processing timer
  useEffect(() => {
    if (isAnalysisComplete) return
    const t = setInterval(() => setProcessingSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [isAnalysisComplete])

  // WebSocket for processing status
  useEffect(() => {
    if (video.status === 'ready') return
    const ws = connectProgressSocket(Number(video.id), (data) => {
      if (data.step) setProcessingStep(data.step)
      if (typeof data.progress_pct === 'number') setProcessingProgress(data.progress_pct)
      if (data.progress_pct >= 100) { setIsAnalysisComplete(true); loadDetails() }
    })
    return () => ws.close()
  }, [video.id, video.status, loadDetails])

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ----- Handlers -----
  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) { videoRef.current.pause() } else { videoRef.current.play() }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const jumpToTimestamp = (timeStr: string) => {
    const [mins, secs] = timeStr.split(':').map(Number)
    if (videoRef.current) {
      videoRef.current.currentTime = mins * 60 + secs
      setIsPlaying(true)
      videoRef.current.play()
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)
    try {
      const response = await chatWithVideo(Number(video.id), input)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.answer || "Couldn't process that request."
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Unable to connect to AI engine. Please ensure the backend is running."
      }])
    } finally { setIsTyping(false) }
  }

  const duration = videoRef.current?.duration
  const progressPct = duration ? (currentTime / duration) * 100 : 0
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-3.5rem)] bg-[#0A0A0C] overflow-hidden">

      {/* ── LEFT COLUMN: Navigation, Player, Emotions ── */}
      <div className="w-full lg:w-[40%] flex flex-col border-r border-white/[0.06] bg-[#0A0A0C] p-4 gap-4 overflow-y-auto shrink-0 min-w-0">
        
        {/* Navigation & Status Row */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-xs font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            Library
          </button>
          {isAnalysisComplete ? (
            <span className="badge-green shrink-0">Ready</span>
          ) : (
            <span className="badge-amber shrink-0 flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Analyzing
            </span>
          )}
        </div>

        {/* Video Player Card */}
        <div className="holo-card overflow-hidden bg-black relative w-full aspect-video max-h-[260px] shadow-xl shrink-0">
          {/* Processing overlay */}
          {!isAnalysisComplete && video.status === 'processing' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400 mb-3" />
              <p className="text-xs font-semibold text-white mb-2">{processingStep}</p>
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">
                {formatTime(processingSeconds)}
              </p>
            </div>
          )}

          <video
            ref={videoRef}
            src={streamUrl || video.stream_url || video.r2_url || ''}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Video controls overlay */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pb-2 pt-6">
            {/* Seek bar */}
            <div
              className="w-full h-1 bg-white/20 rounded-full mb-2 relative cursor-pointer group/seek"
              onClick={(e) => {
                if (!videoRef.current?.duration) return
                const rect = e.currentTarget.getBoundingClientRect()
                videoRef.current.currentTime =
                  ((e.clientX - rect.left) / rect.width) * videoRef.current.duration
              }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity"
                style={{ left: `calc(${progressPct}% - 5px)` }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="w-6.5 h-6.5 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shrink-0">
                {isPlaying
                  ? <Pause className="w-2.5 h-2.5 text-black fill-current" />
                  : <Play className="w-2.5 h-2.5 text-black fill-current ml-0.5" />}
              </button>

              <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors shrink-0">
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <span className="text-[10px] font-mono text-white/60 tabular-nums shrink-0">
                {formatTime(currentTime)} / {duration && !isNaN(duration) ? formatTime(duration) : video.duration}
              </span>

              <div className="flex-1" />

              <button
                onClick={() => videoRef.current?.requestFullscreen()}
                className="text-white/60 hover:text-white transition-colors shrink-0"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Emotion Timeline Card */}
        <div className="holo-card p-4 flex flex-col flex-1 min-h-[260px] lg:min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-xs font-bold text-white">Emotion Timeline</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Sentiment dynamics synced to video</p>
            </div>
            <div className="flex items-center gap-2">
              {[
                { label: 'Joy', color: '#4ADE80' },
                { label: 'Anger', color: '#F87171' },
                { label: 'Engagement', color: '#60A5FA' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span className="text-[9px] font-semibold text-zinc-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 min-h-[140px] relative">
            <EmotionTimeline
              emotionData={emotionData}
              segments={transcript}
              currentTime={currentTime}
              isLoading={isEmotionsLoading}
            />
          </div>

          {/* Mini Stats row */}
          {emotionData.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/[0.04] shrink-0">
              <div className="holo-inset p-2 flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500">Dominant Sentiment</span>
                <span className="text-xs font-bold text-emerald-400 mt-0.5">Joyful / Positive</span>
              </div>
              <div className="holo-inset p-2 flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500">Engagement</span>
                <span className="text-xs font-bold text-cyan-400 mt-0.5">High Peak</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── RIGHT COLUMN: Interactive Tabs & Content ── */}
      <div className="w-full lg:w-[60%] flex flex-col bg-[#111116] overflow-hidden relative">
        
        {/* Tab Navigation (sticky/header in right pane) */}
        <div className="shrink-0 bg-[#111116] border-b border-white/[0.06] z-10">
          <div className="flex items-center gap-0.5 px-4 overflow-x-auto scrollbar-none">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2',
                  activeTab === id
                    ? 'text-violet-400 border-violet-400'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Contents (Independent scrolling container) */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          
          {/* AI Chat */}
          {activeTab === 'chat' && (
            <div className="max-w-3xl mx-auto flex flex-col gap-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={cn(
                    'max-w-[85%] px-4 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'
                  )}>
                    {msg.content.split(/(\[\d{2}:\d{2}\])/).map((part, i) =>
                      part.match(/\[\d{2}:\d{2}\]/) ? (
                        <button
                          key={i}
                          onClick={() => jumpToTimestamp(part.slice(1, -1))}
                          className="timestamp-chip"
                        >
                          {part}
                        </button>
                      ) : part
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="chat-bubble-ai px-4 py-2.5 flex gap-1.5 items-center">
                    {[0, 0.15, 0.3].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="max-w-3xl mx-auto">
              <GlobalSummaryTab videoId={video.id} isAnalysisComplete={isAnalysisComplete} />
            </div>
          )}

          {/* Emotions Tab */}
          {activeTab === 'emotions' && (
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              <div className="holo-card p-5">
                <h4 className="text-sm font-bold text-white mb-2">Emotion Metrics & Stats</h4>
                <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                  CineMind analyzes audio transcript tone and visual markers to calculate real-time emotions. Look at the chart in the left side console to see how emotions align with video playback.
                </p>

                {emotionData.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Dominant Emotion', value: 'Joy', badge: 'badge-green' },
                      { label: 'Avg Sentiment', value: 'Positive', badge: 'badge-purple' },
                      { label: 'Peak Engagement', value: 'High', badge: 'badge-cyan' },
                      { label: 'Emotion Shifts', value: `${emotionData.length}`, badge: 'badge-amber' },
                    ].map(({ label, value, badge }) => (
                      <div key={label} className="holo-inset p-4">
                        <p className="section-label mb-2">{label}</p>
                        <span className={badge}>{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="holo-inset p-8 text-center text-zinc-500 text-xs">
                    Emotion detailed stats will display here once the analysis process finishes.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transcript Tab */}
          {activeTab === 'transcript' && (
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col gap-1 pr-1">
                {transcript.length > 0 ? transcript.map((item, i) => {
                  const timeStr = `${Math.floor(item.start / 60).toString().padStart(2, '0')}:${Math.floor(item.start % 60).toString().padStart(2, '0')}`
                  const isActive = currentTime >= item.start && currentTime <= item.end
                  return (
                    <div
                      key={i}
                      onClick={() => jumpToTimestamp(timeStr)}
                      className={cn(
                        'group flex gap-3 cursor-pointer p-2 rounded-lg transition-all',
                        isActive
                          ? 'bg-violet-500/10 border-l-2 border-violet-400 pl-3'
                          : 'hover:bg-white/[0.03]'
                      )}
                    >
                      <button className="timestamp-chip shrink-0 mt-0.5">{timeStr}</button>
                      <p className={cn(
                        'text-xs leading-relaxed transition-colors',
                        isActive ? 'text-white font-medium' : 'text-zinc-400 group-hover:text-zinc-200'
                      )}>
                        {item.text}
                      </p>
                    </div>
                  )
                }) : (
                  <div className="holo-card flex items-center justify-center py-16 text-center">
                    <div>
                      <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                      <p className="text-sm text-zinc-500">Transcript will appear here once analysis is complete.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chapters Tab */}
          {activeTab === 'chapters' && (
            <div className="max-w-3xl mx-auto flex flex-col gap-3">
              {chapters.length > 0 ? chapters.map((chapter, i) => {
                const timeStr = `${Math.floor(chapter.start_time / 60).toString().padStart(2, '0')}:${Math.floor(chapter.start_time % 60).toString().padStart(2, '0')}`
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => jumpToTimestamp(timeStr)}
                    className="holo-card p-4 cursor-pointer hover:border-violet-500/30 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 group-hover:bg-violet-500/20 transition-colors">
                        <span className="text-[10px] font-bold text-violet-400">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors truncate">
                            {chapter.title}
                          </h4>
                          <button className="timestamp-chip shrink-0">{timeStr}</button>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">{chapter.summary}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              }) : (
                <div className="holo-card flex items-center justify-center py-16 text-center">
                  <div>
                    <BookOpen className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">Chapters will appear here once analysis is complete.</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Input Bar docked at the absolute bottom of the right panel, but only when we are in the chat tab */}
        {activeTab === 'chat' && (
          <div className="p-4 border-t border-white/[0.06] bg-[#111116] shrink-0 z-10">
            <div className="max-w-3xl mx-auto">
              <div className="holo-card flex items-center gap-3 p-3">
                <input
                  ref={inputRef}
                  placeholder="Ask anything about this video…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  )
}

