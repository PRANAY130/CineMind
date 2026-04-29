'use client'

import { useRouter } from 'next/navigation'
import Dashboard from '@/components/cine-mind/Dashboard'

export default function DashboardPage() {
  const router = useRouter()

  const handleSelectVideo = (video: any) => {
    router.push(`/workspace/${video.id}`)
  }

  return <Dashboard onSelectVideo={handleSelectVideo} />
}
