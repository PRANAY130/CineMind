'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { Upload, Clock, CheckCircle2, Loader2, Search, Play, Trash2, Video, Film } from 'lucide-react'
import { fetchVideos, deleteVideo } from '@/lib/api'
import ConfirmModal from './ConfirmModal'

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
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
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
      date: v.created_at ? new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
      r2_url: v.r2_url,
    }))

  const loadVideos = useCallback(async () => {
    try {
      const data = await fetchVideos()
      const mapped = mapVideos(data)
      setVideos(mapped)
      if (mapped.some(v => v.status === 'processing')) {
        if (!intervalRef.current) {
          intervalRef.current = setInterval(loadVideos, 5000)
        }
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch {
      setVideos([])
    } finally {
      setIsLoadingVideos(false)
    }
  }, [])

  useEffect(() => {
    loadVideos()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [loadVideos])

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      setIsDeleting(true)
      await deleteVideo(Number(deleteId))
      await loadVideos()
      setDeleteId(null)
    } catch {
      /* ignore */
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const readyCount      = videos.filter(v => v.status === 'ready').length
  const processingCount = videos.filter(v => v.status === 'processing').length

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Video Library</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Your AI-analyzed video collection</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
              <input
                placeholder="Search videos..."
                className="holo-input pl-9 pr-4 h-9 w-52 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total Videos',  value: videos.length,  color: 'stat-purple', badge: 'badge-purple' },
            { label: 'Ready',         value: readyCount,     color: 'stat-green',  badge: 'badge-green'  },
            { label: 'Processing',    value: processingCount,color: 'stat-amber',  badge: 'badge-amber'  },
          ].map((s, i) => (
            <div key={i} className="holo-card p-4 flex items-center justify-between">
              <div>
                <span className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</span>
                <p className="section-label mt-0.5">{s.label}</p>
              </div>
              <span className={s.badge}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Video Grid */}
        {isLoadingVideos ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="holo-card flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Film className="w-7 h-7 text-violet-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No videos yet</h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-xs">
              Upload your first video to start analyzing it with AI.
            </p>
            <button
              onClick={() => window.location.href = '/upload'}
              className="btn-primary rounded-xl text-sm h-10 px-5"
            >
              <Upload className="w-4 h-4" />
              Upload Video
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVideos.map((video, idx) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ y: -3 }}
                onClick={() => onSelectVideo(video)}
                className="holo-card group cursor-pointer overflow-hidden hover:border-violet-500/30 transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative w-full aspect-video bg-[#0D0D10] overflow-hidden">
                  <video
                    src={`${video.stream_url || video.thumbnail}#t=1.0`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    preload="metadata"
                    muted
                    playsInline
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.5)]">
                      <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Delete btn */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(video.id) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/80 hover:border-red-500/50 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>

                  {/* Duration */}
                  <span className="absolute bottom-2 right-2 text-[10px] font-mono font-bold text-white/90 bg-black/70 px-1.5 py-0.5 rounded-md">
                    {video.duration}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-white line-clamp-1 mb-2 group-hover:text-violet-300 transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-zinc-600">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-medium">{video.date}</span>
                    </div>
                    {video.status === 'ready' ? (
                      <span className="badge-green">Ready</span>
                    ) : (
                      <span className="badge-amber flex items-center gap-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Processing
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete this video?"
        description="This will permanently remove the video, transcript, and all AI analysis. This cannot be undone."
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
