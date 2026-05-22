'use client'

import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { Upload, Loader2, Youtube, Link2 } from 'lucide-react'
import { uploadVideo, uploadYouTubeVideo, fetchVideo } from '@/lib/api'

interface UploadPageProps {
  onVideoQueued: (video: any) => void
}

export default function UploadPage({ onVideoQueued }: UploadPageProps) {
  const [isDragging, setIsDragging]         = useState(false)
  const [isUploading, setIsUploading]       = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [youtubeUrl, setYoutubeUrl]         = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true)
      setUploadProgress('Uploading to cloud storage…')
      const res = await uploadVideo(file)
      setUploadProgress('Processing started! Redirecting…')
      const videoData = await fetchVideo(res.video_id)
      onVideoQueued(videoData)
    } catch (err: any) {
      setUploadProgress(`Upload failed: ${err.message || 'Unknown error'}`)
      setIsUploading(false)
    }
  }

  const handleYoutubeUpload = async () => {
    if (!youtubeUrl) return
    try {
      setIsUploading(true)
      setUploadProgress('Fetching YouTube video…')
      const res = await uploadYouTubeVideo(youtubeUrl)
      setUploadProgress('Processing started! Redirecting…')
      const videoData = await fetchVideo(res.video_id)
      onVideoQueued(videoData)
    } catch (err: any) {
      setUploadProgress(`Upload failed: ${err.message || 'Unknown error'}`)
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Add a video to your library for AI analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ---- Local File Upload ---- */}
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            relative holo-card flex flex-col items-center justify-center gap-4 p-8 h-64
            border-dashed transition-all duration-300 cursor-pointer
            ${isDragging ? 'border-violet-500/60 bg-violet-500/[0.07] scale-[1.01]' : 'hover:border-white/15'}
          `}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
          />

          {isUploading && !youtubeUrl ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              <p className="text-xs font-semibold text-violet-300 text-center">{uploadProgress}</p>
            </div>
          ) : (
            <>
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center border"
                style={{
                  background: isDragging ? 'rgba(124,58,237,0.2)' : 'rgba(167,139,250,0.08)',
                  borderColor: isDragging ? 'rgba(124,58,237,0.5)' : 'rgba(167,139,250,0.2)',
                }}
              >
                <Upload className="w-6 h-6" style={{ color: isDragging ? '#A78BFA' : '#7C7C8A' }} />
              </div>

              <div className="text-center">
                <p className="text-sm font-semibold text-white mb-1">
                  {isDragging ? 'Drop to upload' : 'Drag & drop or browse'}
                </p>
                <p className="text-[11px] text-zinc-600">MP4, MOV, WebM · Max 2 GB</p>
              </div>

              <button
                className="btn-primary h-9 px-5 text-xs rounded-xl"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              >
                Browse files
              </button>
            </>
          )}
        </motion.div>

        {/* ---- YouTube Upload ---- */}
        <div className="holo-card flex flex-col items-center justify-center gap-4 p-8 h-64">
          {isUploading && youtubeUrl ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-red-400" />
              <p className="text-xs font-semibold text-red-300 text-center">{uploadProgress}</p>
            </div>
          ) : (
            <>
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
                <Youtube className="w-6 h-6 text-red-400" />
              </div>

              <div className="text-center">
                <p className="text-sm font-semibold text-white mb-1">YouTube</p>
                <p className="text-[11px] text-zinc-600">Analyze any public YouTube video</p>
              </div>

              {/* URL input */}
              <div className="w-full space-y-2">
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                  <input
                    placeholder="Paste YouTube URL…"
                    className="holo-input pl-9 text-xs"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    disabled={isUploading}
                    onKeyDown={(e) => e.key === 'Enter' && handleYoutubeUpload()}
                  />
                </div>
                <button
                  className="btn-primary w-full h-9 text-xs rounded-xl"
                  style={{ background: !youtubeUrl || isUploading ? undefined : 'linear-gradient(135deg,#EF4444,#DC2626)' }}
                  onClick={handleYoutubeUpload}
                  disabled={!youtubeUrl || isUploading}
                >
                  Fetch & Analyze
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 holo-card p-5">
        <p className="section-label mb-3">Supported formats & tips</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'File formats',  value: 'MP4, MOV, AVI, WebM, MKV'   },
            { label: 'Max file size', value: '2 GB per upload'             },
            { label: 'Best results', value: 'Clear audio, spoken content'  },
            { label: 'Processing',   value: 'Usually 2–5 min per video'   },
          ].map(({ label, value }) => (
            <div key={label} className="holo-inset p-3">
              <p className="section-label mb-1">{label}</p>
              <p className="text-xs font-medium text-zinc-300">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
