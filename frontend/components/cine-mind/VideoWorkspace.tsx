'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, Maximize, 
  MessageSquare, BookOpen, FileText, Send, ChevronLeft,
  MoreHorizontal, Share2, Download, Settings
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

  // Connect WebSocket for live pipeline progress updates
  useEffect(() => {
    const ws = connectProgressSocket(Number(video.id), (data) => {
      console.log('Pipeline progress:', data)
    })
    return () => ws.close()
  }, [video.id])

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

  return (
    <div className="flex flex-col h-full">
      {/* Workspace Grid */}
      <div className="flex-1 grid grid-cols-[1fr_300px] overflow-hidden p-3 gap-3">
          {/* Left Column: Player & Timeline */}
          <div className="flex flex-col gap-3 overflow-hidden">
            {/* Video Player */}
            <Card className="relative flex-1 glass-panel overflow-hidden border-white/5 group bg-black/40">
              <video 
                ref={videoRef}
                src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                className="w-full h-full object-contain"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              />
              
              {/* Custom Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent flex items-center px-4 gap-3">
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" onClick={() => setIsPlaying(!isPlaying)}>
                  <div className={`w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-left-[8px] border-left-black ml-0.5 ${isPlaying ? 'hidden' : ''}`} />
                  {isPlaying && <Pause className="w-3.5 h-3.5 text-black fill-current" />}
                </div>
                
                <div className="flex-1 h-0.5 bg-white/10 rounded-full relative">
                  <div 
                    className="absolute top-0 left-0 h-full accent-gradient rounded-full" 
                    style={{ width: `${(currentTime / 600) * 100}%` }}
                  />
                </div>
                
                <span className="text-[10px] font-mono font-medium text-white/80">
                  {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {video.duration}
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
                    {[
                      { time: '00:00', text: "Welcome everyone to today's session on the future of Generative AI." },
                      { time: '00:15', text: "We're going to explore how these models are transforming the way we build software." },
                      { time: '01:12', text: "First, let's look at the historical context of large language models." },
                      { time: '02:45', text: "The breakthrough came with the transformer architecture in 2017." },
                      { time: '04:12', text: "Since then, we've seen an exponential growth in parameter counts and capabilities." },
                      { time: '05:30', text: "But it's not just about size; it's about how we interact with these systems." },
                    ].map((item, i) => (
                      <div 
                        key={i} 
                        className={`group flex gap-2.5 cursor-pointer p-1.5 rounded-lg transition-all ${currentTime >= (parseInt(item.time.split(':')[0])*60 + parseInt(item.time.split(':')[1])) ? 'bg-purple-500/10 border-l-2 border-purple-500' : 'hover:bg-white/5'}`}
                        onClick={() => jumpToTimestamp(item.time)}
                      >
                        <span className="text-[10px] font-mono text-[#60A5FA] mt-0.5 opacity-80">{item.time}</span>
                        <p className="high-density-text group-hover:text-white transition-colors">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="chapters" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-2.5">
                    {[
                      { time: '00:00', title: 'Introduction', desc: 'Session goals overview' },
                      { time: '01:12', title: 'Historical Context', desc: 'Evolution of LLMs' },
                      { time: '04:12', title: 'Efficiency Gains', desc: 'Productivity improvements' },
                      { time: '08:45', title: 'Future Outlook', desc: 'The next 5 years' },
                    ].map((chapter, i) => (
                      <div 
                        key={i} 
                        className="p-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:border-purple-500/30 cursor-pointer transition-all group"
                        onClick={() => jumpToTimestamp(chapter.time)}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <h4 className="font-bold text-[10px] text-slate-200 group-hover:text-purple-400">0{i+1}. {chapter.title}</h4>
                          <span className="text-[9px] font-mono text-[#60A5FA] opacity-70">{chapter.time}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">{chapter.desc}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
    </div>
  )
}
