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
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">{error}</h2>
        <button 
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2 rounded-xl accent-gradient text-white font-bold"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
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
