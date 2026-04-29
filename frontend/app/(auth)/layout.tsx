'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/cine-mind/Sidebar'
import Header from '@/components/cine-mind/Header'
import { authClient } from '@/lib/auth-client'
import { TitleProvider, useTitle } from '@/context/TitleContext'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <TitleProvider>
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </TitleProvider>
  )
}

function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const { title, setTitle } = useTitle()

  useEffect(() => {
    authClient.getSession().then((session) => {
      if (!session?.data?.session) {
        router.push('/login')
      } else {
        setIsLoading(false)
      }
    })
  }, [router])

  // Set default titles based on path, but pages can override
  useEffect(() => {
    if (pathname === '/profile') setTitle("Neural Identity Configuration")
    else if (pathname === '/upload') setTitle("Video Ingestion Node")
    else if (pathname === '/library') setTitle("Neural Knowledge Base")
    else if (pathname === '/dashboard') setTitle("Control Center")
    // Workspace sets its own title
  }, [pathname, setTitle])

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#0F172A] items-center justify-center">
        <div className="w-12 h-12 rounded-xl accent-gradient animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0F172A] text-white overflow-hidden relative">
      {/* Background Blur Effects */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] animate-pulse-slow pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] animate-pulse-slow pointer-events-none z-0" style={{ animationDelay: '2s' }} />
      
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        
        <div className="flex-1 overflow-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}

