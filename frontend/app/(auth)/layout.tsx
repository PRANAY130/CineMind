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

  useEffect(() => {
    if (pathname === '/profile') setTitle('Profile')
    else if (pathname === '/upload') setTitle('Upload')
    else if (pathname === '/library') setTitle('Knowledge Base')
    else if (pathname === '/dashboard') setTitle('Library')
  }, [pathname, setTitle])

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#0A0A0C] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 animate-pulse" />
          <span className="text-xs text-zinc-500 font-medium tracking-widest uppercase">Loading</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0A0A0C] text-white overflow-hidden relative">
      {/* Background Orb Decorations */}
      <div
        className="holo-orb holo-orb-purple animate-orb-drift-slow"
        style={{ width: 500, height: 500, top: -100, right: -50 }}
      />
      <div
        className="holo-orb holo-orb-cyan animate-orb-drift"
        style={{ width: 400, height: 400, bottom: -80, left: -80 }}
      />

      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Header title={title} />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
