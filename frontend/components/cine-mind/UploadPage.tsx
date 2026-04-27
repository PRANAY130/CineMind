'use client'

import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Loader2, Youtube, Link } from 'lucide-react'
import { uploadVideo, uploadYouTubeVideo, fetchVideo } from '@/lib/api'

interface UploadPageProps {
  onVideoQueued: (video: any) => void
}

export default function UploadPage({ onVideoQueued }: UploadPageProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true)
      setUploadProgress('Uploading to cloud storage...')
      const res = await uploadVideo(file)
      setUploadProgress('Processing started! Redirecting...')
      const videoData = await fetchVideo(res.video_id)
      onVideoQueued(videoData)
    } catch (err: any) {
      console.error('[Upload] Upload failed:', err)
      setUploadProgress(`Upload failed: ${err.message || 'Unknown error'}`)
      setIsUploading(false)
    }
  }

  const handleYoutubeUpload = async () => {
    if (!youtubeUrl) return
    try {
      setIsUploading(true)
      setUploadProgress('Fetching YouTube video...')
      const res = await uploadYouTubeVideo(youtubeUrl)
      setUploadProgress('Processing started! Redirecting...')
      const videoData = await fetchVideo(res.video_id)
      onVideoQueued(videoData)
    } catch (err: any) {
      console.error('[Upload] YouTube fetch failed:', err)
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

  const handleFileBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  return (
    <div className="p-6 relative max-w-4xl mx-auto h-full flex flex-col justify-center">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black tracking-tighter mb-2 accent-text">Upload Node</h1>
        <p className="text-slate-400">Initialize a new multimodal analysis pipeline</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Local Upload */}
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            relative h-64 rounded-2xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-3 overflow-hidden
            ${isDragging ? 'border-purple-500 bg-purple-500/10 scale-[1.02]' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}
          `}
        >
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileBrowse} />
          {isUploading && !youtubeUrl ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              <p className="text-xs font-bold text-purple-300 tracking-wider text-center px-4">{uploadProgress}</p>
            </div>
          ) : (
            <>
              <div className={`p-4 rounded-xl ${isDragging ? 'accent-gradient text-white' : 'bg-white/5 text-slate-500'} transition-all shadow-xl`}>
                <Upload className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold tracking-tight text-white">Local Storage</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">MP4, MOV, or WebM • Max 2GB</p>
              </div>
              <Button 
                className="mt-2 accent-gradient border-none text-xs font-bold px-6 shadow-lg shadow-purple-500/20"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Browse Files
              </Button>
            </>
          )}
        </motion.div>

        {/* YouTube Upload */}
        <div className="h-64 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Youtube className="w-48 h-48" />
          </div>
          
          {isUploading && youtubeUrl ? (
            <div className="flex flex-col items-center gap-2 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-red-400" />
              <p className="text-xs font-bold text-red-300 tracking-wider text-center px-4">{uploadProgress}</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center z-10">
              <div className="p-4 rounded-xl bg-red-500/10 text-red-400 mb-4 shadow-xl">
                <Youtube className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold tracking-tight text-white mb-1">YouTube Fetcher</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-6 text-center">Process public videos instantly</p>
              
              <div className="w-full relative group">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Paste YouTube URL..." 
                  className="pl-9 w-full h-10 bg-white/[0.03] border-white/10 focus:border-red-500/50 transition-all text-xs rounded-lg"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              <Button 
                className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white border-none text-xs font-bold shadow-lg shadow-red-500/20"
                onClick={handleYoutubeUpload}
                disabled={!youtubeUrl || isUploading}
              >
                Fetch & Analyze
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
