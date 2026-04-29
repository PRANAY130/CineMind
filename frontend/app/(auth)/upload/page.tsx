'use client'

import { useRouter } from 'next/navigation'
import UploadPage from '@/components/cine-mind/UploadPage'

export default function UploadRoute() {
  const router = useRouter()

  const handleVideoQueued = (video: any) => {
    router.push(`/workspace/${video.id}`)
  }

  return <UploadPage onVideoQueued={handleVideoQueued} />
}
