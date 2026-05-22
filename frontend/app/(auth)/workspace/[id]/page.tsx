'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import VideoWorkspace from '@/components/cine-mind/VideoWorkspace'
import { fetchVideo } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { useTitle } from '@/context/TitleContext'

export default function WorkspaceRoute() {
  const params = useParams()
  const router = useRouter()
  const [video, setVideo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const { setTitle } = useTitle()

  useEffect(() => {
    if (params.id) {
      fetchVideo(Number(params.id))
        .then((data) => {
          setVideo(data)
          setTitle(data.title)
        })
        .catch((err) => {
          console.error('Failed to fetch video:', err)
          setError('Video not found or access denied.')
        })
    }
  }, [params.id, setTitle])


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
        <p className="text-sm text-red-400 bg-red-400/10 px-5 py-3 rounded-xl border border-red-400/20">
          {error}
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="btn-primary h-10 px-6 rounded-xl text-sm"
        >
          Back to Library
        </button>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <VideoWorkspace 
      video={video} 
      onBack={() => router.push('/dashboard')} 
    />
  )
}
