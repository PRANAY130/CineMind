'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LandingPage from '@/components/cine-mind/LandingPage'
import { authClient } from '@/lib/auth-client'

export default function RootPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    authClient.getSession().then((session) => {
      if (session?.data?.session) {
        router.push('/dashboard')
      } else {
        setIsLoading(false)
      }
    })
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#0F172A] items-center justify-center">
        <div className="w-12 h-12 rounded-xl accent-gradient animate-spin" />
      </div>
    )
  }

  return <LandingPage onGetStarted={() => router.push('/login')} />
}
