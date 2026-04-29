'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, Video, Clock, CheckCircle2, Loader2, Plus, Search, Play, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { fetchVideos, uploadVideo, deleteVideo } from '@/lib/api'

interface VideoItem {
  id: string
  title: string
  thumbnail: string
  duration: string
  status: 'ready' | 'processing'
  date: string
  r2_url?: string
  stream_url?: string
}

interface DashboardProps {
  onSelectVideo: (video: VideoItem) => void
}

export default function Dashboard({ onSelectVideo }: DashboardProps) {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Use a ref so the cleanup function always captures the current interval id
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const mapVideos = (data: any[]): VideoItem[] =>
    (data || []).map((v: any) => ({
      id: String(v.id),
      title: v.title || 'Untitled',
      thumbnail: v.stream_url || v.r2_url,
      stream_url: v.stream_url,
      duration: v.duration_sec
        ? `${Math.floor(v.duration_sec / 60)}:${String(v.duration_sec % 60).padStart(2, '0')}`
        : '--:--',
      status: v.status === 'ready' ? 'ready' : 'processing',
      date: v.created_at ? new Date(v.created_at).toLocaleDateString() : 'Unknown',
      r2_url: v.r2_url,
    }))

  const loadVideos = useCallback(async () => {
    try {
      console.log('[Dashboard] Fetching videos...')
      const data = await fetchVideos()
      const mapped = mapVideos(data)
      console.log(`[Dashboard] Loaded ${mapped.length} videos`)
      setVideos(mapped)

      // Auto-poll while any video is still processing
      if (mapped.some(v => v.status === 'processing')) {
        if (!intervalRef.current) {
          console.log('[Dashboard] Starting 5s poll for processing videos')
          intervalRef.current = setInterval(loadVideos, 5000)
        }
      } else {
        if (intervalRef.current) {
          console.log('[Dashboard] All videos ready — stopping poll')
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch (err) {
      console.error('[Dashboard] Failed to load videos:', err)
      setVideos([])
    } finally {
      setIsLoadingVideos(false)
    }
  }, [])

  useEffect(() => {
    loadVideos()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadVideos])

  const handleDelete = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this video?')) return
    try {
      console.log(`[Dashboard] Deleting video ${videoId}`)
      await deleteVideo(Number(videoId))
      await loadVideos()
    } catch (err) {
      console.error('[Dashboard] Failed to delete video:', err)
    }
  }

  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  )


  return (
    <div className="p-6 relative">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tighter mb-1 accent-text">My Workspace</h1>
            <p className="high-density-text">Intelligent video library & analysis engine</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
              <Input 
                placeholder="Search repository..." 
                className="pl-9 w-60 h-9 bg-white/[0.03] border-white/10 focus:border-purple-500/50 transition-all text-xs rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>



        {/* Video Grid */}
        {isLoadingVideos ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">No videos found. Upload your first video!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <motion.div
                key={video.id}
                whileHover={{ y: -5 }}
                onClick={() => onSelectVideo(video)}
                className="group cursor-pointer"
              >
                <Card className="overflow-hidden glass-panel border-white/5 group-hover:border-purple-500/40 transition-all ring-1 ring-white/5 group-hover:ring-white/10 h-full flex flex-col">
                  <div className="relative w-full h-0 pb-[56.25%] overflow-hidden bg-black/20">
                    <video 
                      src={`${video.stream_url || video.thumbnail}#t=1.0`} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 blur-[0.5px] group-hover:blur-0 group-hover:scale-105"
                      preload="metadata"
                      muted
                      playsInline
                    />
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-red-500/80 hover:bg-red-600 backdrop-blur-md"
                        onClick={(e) => handleDelete(e, video.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute inset-0 bg-[#0F172A]/40 opacity-40 group-hover:opacity-0 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                      <div className="w-10 h-10 rounded-full accent-gradient flex items-center justify-center shadow-2xl">
                        <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-mono tracking-tighter text-white/90 border border-white/10">
                      {video.duration}
                    </div>
                  </div>
                  <div className="p-4 bg-white/[0.01]">
                    <div className="flex items-start justify-between gap-3 mb-3 h-[42px]">
                      <h3 className="font-bold text-sm tracking-tight leading-snug group-hover:text-purple-400 transition-colors line-clamp-2 overflow-hidden">
                        {video.title}
                      </h3>
                      {video.status === 'ready' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider shrink-0 mt-0.5">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider shrink-0 mt-0.5">
                          Processing
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-600" />
                        {video.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Video className="w-3 h-3 text-slate-600" />
                        1080p
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
