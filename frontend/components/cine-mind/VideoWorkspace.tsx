'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, Maximize, 
  MessageSquare, BookOpen, FileText, Send, ChevronLeft,
  MoreHorizontal, Share2, Download, Settings, Loader2
} from 'lucide-react'
import EmotionTimeline from './EmotionTimeline'
import { chatWithVideo, connectProgressSocket } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp?: string
}

interface VideoWorkspaceProps {
  video: {
    id: string
    title: string
    thumbnail: string
    duration: string
    r2_url?: string
  }
  onBack: () => void
}

export default function VideoWorkspace({ video, onBack }: VideoWorkspaceProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: "Hello! I've analyzed this video. You can ask me anything about the content, or jump to specific moments using the transcript.",
    }
  ])
  const [input, setInput] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [transcript, setTranscript] = useState<any[]>([])
  const [streamUrl, setStreamUrl] = useState<string>('')
  
  // Processing States
  const [processingStep, setProcessingStep] = useState<string>('Connecting to pipeline...')
  const [processingProgress, setProcessingProgress] = useState<number>(0)
  const [processingSeconds, setProcessingSeconds] = useState<number>(0)

  // Fetch real chapters and transcript
  const loadDetails = useCallback(async () => {
    try {
      console.log(`[VideoWorkspace] Loading details for video ${video.id}`)
      const { fetchVideo, fetchTranscript } = await import('@/lib/api')
      const data = await fetchVideo(Number(video.id))
      if (data.stream_url) {
        setStreamUrl(data.stream_url)
      }
      if (data.chapters) {
        console.log(`[VideoWorkspace] Loaded ${data.chapters.length} chapters`)
        setChapters(data.chapters)
      }
      const transData = await fetchTranscript(Number(video.id))
      console.log(`[VideoWorkspace] Loaded ${(transData || []).length} transcript segments`)
      setTranscript(transData || [])
    } catch (err) {
      console.error('[VideoWorkspace] Failed to load video details:', err)
    }
  }, [video.id])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  // Processing Timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (video.status === 'processing' || processingProgress > 0 && processingProgress < 100) {
      interval = setInterval(() => setProcessingSeconds(s => s + 1), 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [video.status, processingProgress])

  // Connect WebSocket only if the video is still being processed
  useEffect(() => {
    if (video.status === 'ready') {
      console.log(`[WS] video ${video.id} is already ready — skipping WebSocket`)
      return
    }
    console.log(`[WS] Connecting progress socket for video ${video.id}`)
    const ws = connectProgressSocket(Number(video.id), (data) => {
      console.log('[WS] Pipeline progress:', data)
      if (data.step) setProcessingStep(data.step)
      if (typeof data.progress_pct === 'number') setProcessingProgress(data.progress_pct)
      
      // When pipeline completes, reload chapters/transcript
      if (data.progress_pct >= 100) {
        console.log('[WS] Pipeline complete — reloading details')
        loadDetails()
      }
    })
    ws.onerror = (err) => console.error('[WS] WebSocket error:', err)
    ws.onclose = () => console.log(`[WS] Socket closed for video ${video.id}`)
    return () => {
      console.log(`[WS] Closing socket for video ${video.id}`)
      ws.close()
    }
  }, [video.id, video.status])

  const handleSendMessage = async () => {
    if (!input.trim()) return
    
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    }
    
    setMessages(prev => [...prev, newUserMessage])
    setInput('')
    setIsTyping(true)

    try {
      // Real FastAPI RAG call via Groq Llama 3
      const response = await chatWithVideo(Number(video.id), input)

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.answer || "I'm sorry, I couldn't process that request.",
        timestamp: response.timestamps?.[0]
      }
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error("Chat Error:", error)
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I'm having trouble connecting to the AI engine right now. Please make sure the backend is running.",
      }
      setMessages(prev => [...prev, aiResponse])
    } finally {
      setIsTyping(false)
    }
  }

  const jumpToTimestamp = (timeStr: string) => {
    const [mins, secs] = timeStr.split(':').map(Number)
    const totalSeconds = mins * 60 + secs
    if (videoRef.current) {
      videoRef.current.currentTime = totalSeconds
      setIsPlaying(true)
      videoRef.current.play()
    }
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Handle spacebar play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying])

  return (
    <div className="flex flex-col h-full">
      {/* Workspace Grid */}
      <div className="flex-1 grid grid-cols-[1fr_300px] overflow-hidden p-3 gap-3">
        {/* Left Column: Player & Timeline */}
        <div className="flex flex-col gap-3 overflow-hidden">
          {/* Video Player */}
          <Card className="relative flex-1 glass-panel overflow-hidden border-white/5 group bg-black/40">
              {(video.status === 'processing' || (processingProgress > 0 && processingProgress < 100)) && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-4" />
                  <div className="text-sm font-bold tracking-widest text-white uppercase mb-2">
                    {processingStep}
                  </div>
                  <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full accent-gradient transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                  <div className="text-xs font-mono text-purple-300">
                    Analysis Time: {Math.floor(processingSeconds / 60)}:{(processingSeconds % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              )}
              
              <video 
                ref={videoRef}
                src={streamUrl || video.stream_url || video.r2_url || "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
                className="w-full h-full object-contain bg-black/40 cursor-pointer"
                onClick={togglePlay}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              />
              
              {/* Custom Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent flex items-center px-4 gap-3">
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" onClick={togglePlay}>
                  {/* CSS Triangle for Play Icon */}
                  {!isPlaying && (
                    <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-black ml-0.5" />
                  )}
                  {isPlaying && <Pause className="w-3.5 h-3.5 text-black fill-current" />}
                </div>
                
                <div className="flex-1 h-0.5 bg-white/10 rounded-full relative">
                  <div 
                    className="absolute top-0 left-0 h-full accent-gradient rounded-full" 
                    style={{ width: `${videoRef.current?.duration ? (currentTime / videoRef.current.duration) * 100 : 0}%` }}
                  />
                </div>
                
                <span className="text-[10px] font-mono font-medium text-white/80">
                  {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {
                    videoRef.current?.duration && !isNaN(videoRef.current.duration) 
                      ? `${Math.floor(videoRef.current.duration / 60)}:${Math.floor(videoRef.current.duration % 60).toString().padStart(2, '0')}`
                      : video.duration
                  }
                </span>
              </div>
            </Card>

            {/* Emotion Timeline */}
            <Card className="h-[180px] glass-panel border-white/5 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Multimodal Emotion Timeline</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Joy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Anger</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Engagement</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 opacity-80">
                <EmotionTimeline />
              </div>
            </Card>
          </div>

          {/* Right Column: AI Engine */}
          <Card className="glass-panel border-white/5 flex flex-col overflow-hidden">
            <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-white/5">
                <TabsList className="w-full bg-transparent h-auto p-0 gap-0.5">
                  {[
                    { val: 'transcript', label: 'Transcript' },
                    { val: 'chapters', label: 'Chapters' },
                    { val: 'chat', label: 'AI Chat' }
                  ].map((tab) => (
                    <TabsTrigger 
                      key={tab.val} 
                      value={tab.val} 
                      className="flex-1 py-1.5 text-[10px] font-bold rounded-md data-[state=active]:bg-white/5 data-[state=active]:text-white text-slate-500 uppercase tracking-wider transition-all"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="flex flex-col gap-3">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                          max-w-[90%] p-2.5 px-3.5 rounded-xl text-[12px] leading-snug
                          ${msg.role === 'user' 
                            ? 'accent-gradient text-white rounded-br-none shadow-lg' 
                            : 'bg-white/[0.04] text-slate-200 border border-white/5 rounded-bl-none'}
                        `}>
                          {msg.content.split(/(\[\d{2}:\d{2}\])/).map((part, i) => {
                            if (part.match(/\[\d{2}:\d{2}\]/)) {
                              return (
                                <button 
                                  key={i}
                                  onClick={() => jumpToTimestamp(part.slice(1, -1))}
                                  className="timestamp-badge"
                                >
                                  {part}
                                </button>
                              )
                            }
                            return part
                          })}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white/5 p-2 px-3 rounded-xl rounded-bl-none flex gap-1">
                          {[0, 0.2, 0.4].map((delay) => (
                            <div key={delay} className="w-0.5 h-0.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                <div className="p-3 border-t border-white/5 bg-black/10">
                  <div className="relative">
                    <Input 
                      placeholder="Ask CineMind AI..." 
                      className="h-9 bg-white/5 border-white/5 rounded-lg text-[11px] px-3 pr-9 focus:border-purple-500 focus:bg-white/10 transition-all placeholder:text-slate-600"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button 
                      size="icon" 
                      variant="ghost"
                      className="absolute right-0.5 top-0.5 h-8 w-8 text-slate-500 hover:text-white"
                      onClick={handleSendMessage}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="transcript" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3">
                    {transcript.length > 0 ? transcript.map((item, i) => {
                      const timeStr = `${Math.floor(item.start / 60).toString().padStart(2, '0')}:${Math.floor(item.start % 60).toString().padStart(2, '0')}`
                      return (
                        <div 
                          key={i} 
                          className={`group flex gap-2.5 cursor-pointer p-1.5 rounded-lg transition-all ${currentTime >= item.start && currentTime <= item.end ? 'bg-purple-500/10 border-l-2 border-purple-500' : 'hover:bg-white/5'}`}
                          onClick={() => jumpToTimestamp(timeStr)}
                        >
                          <span className="text-[10px] font-mono text-[#60A5FA] mt-0.5 opacity-80">{timeStr}</span>
                          <p className="high-density-text group-hover:text-white transition-colors">
                            {item.text}
                          </p>
                        </div>
                      )
                    }) : (
                      <p className="text-sm text-slate-500 p-4">Loading transcript...</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="chapters" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-2.5">
                    {chapters.length > 0 ? chapters.map((chapter, i) => {
                      const timeStr = `${Math.floor(chapter.start_time / 60).toString().padStart(2, '0')}:${Math.floor(chapter.start_time % 60).toString().padStart(2, '0')}`
                      return (
                        <div 
                          key={i} 
                          className="p-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:border-purple-500/30 cursor-pointer transition-all group"
                          onClick={() => jumpToTimestamp(timeStr)}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="font-bold text-[10px] text-slate-200 group-hover:text-purple-400">0{i+1}. {chapter.title}</h4>
                            <span className="text-[9px] font-mono text-[#60A5FA] opacity-70">{timeStr}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">{chapter.summary}</p>
                        </div>
                      )
                    }) : (
                      <p className="text-sm text-slate-500 p-4">Loading chapters...</p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
    </div>
  )
}
