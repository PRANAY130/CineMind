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
  const [isDragging, setIsDragging] = useState(false)
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true)
      setUploadProgress('Uploading to cloud storage...')
      console.log(`[Dashboard] Uploading file: ${file.name} (${file.size} bytes)`)
      await uploadVideo(file)
      setUploadProgress('Processing started! Refreshing...')
      console.log('[Dashboard] Upload complete — refreshing video list')
      await loadVideos()
    } catch (err: any) {
      console.error('[Dashboard] Upload failed:', err)
      setUploadProgress(`Upload failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(''), 3000)
    }
  }

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const handleFileBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
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
            <Button 
              className="accent-gradient border-none h-9 text-xs font-bold px-4 shadow-lg shadow-purple-500/20"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Upload Node
            </Button>
          </div>
        </div>

        {/* Upload Zone */}
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            relative h-48 rounded-2xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-3 mb-10 overflow-hidden
            ${isDragging ? 'border-purple-500 bg-purple-500/10 scale-[1.005]' : 'border-white/5 bg-white/[0.02]'}
          `}
        >
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileBrowse} />
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              <p className="text-xs font-bold text-purple-300 tracking-wider">{uploadProgress}</p>
            </>
          ) : (
            <>
              <div className={`p-3 rounded-xl ${isDragging ? 'accent-gradient text-white' : 'bg-white/5 text-slate-500'} transition-all shadow-xl`}>
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold tracking-tight">Drop video packet for analysis</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">MP4, MOV, or WebM • Max 2GB</p>
              </div>
              <Button variant="link" className="text-purple-400 text-xs font-bold hover:text-purple-300 transition-colors" onClick={() => fileInputRef.current?.click()}>
                Browse local storage
              </Button>
            </>
          )}
        </motion.div>

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
                <Card className="overflow-hidden glass-panel border-white/5 group-hover:border-purple-500/40 transition-all ring-1 ring-white/5 group-hover:ring-white/10">
                  <div className="relative aspect-video">
                    <video 
                      src={`${video.stream_url || video.thumbnail}#t=1.0`} 
                      className="w-full h-full object-cover transition-transform duration-700 blur-[0.5px] group-hover:blur-0 group-hover:scale-105"
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
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-bold text-sm tracking-tight leading-snug group-hover:text-purple-400 transition-colors">
                        {video.title}
                      </h3>
                      {video.status === 'ready' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider">
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
