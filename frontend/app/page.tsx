'use client'

import { useState, useEffect } from 'react'
import LandingPage from '@/components/cine-mind/LandingPage'
import LoginPage from '@/components/cine-mind/LoginPage'
import Dashboard from '@/components/cine-mind/Dashboard'
import VideoWorkspace from '@/components/cine-mind/VideoWorkspace'
import ProfilePage from '@/components/cine-mind/ProfilePage'
import Sidebar from '@/components/cine-mind/Sidebar'
import Header from '@/components/cine-mind/Header'
import { authClient } from '@/lib/auth-client'

type AppState = 'landing' | 'login' | 'dashboard' | 'workspace' | 'profile'

export default function Page() {
  const [state, setState] = useState<AppState>('landing')

  // On every page load (including after Google OAuth redirect),
  // check if the user has an active Better Auth session.
  // If yes → go straight to dashboard, skipping the landing page.
  useEffect(() => {
    authClient.getSession().then((session) => {
      if (session?.data?.session) {
        setState('dashboard')
      }
    })
  }, [])
  const [selectedVideo, setSelectedVideo] = useState<any>(null)

  const handleGetStarted = () => {
    setState('login')
  }

  const handleLogin = () => {
    setState('dashboard')
  }

  const handleLogout = async () => {
    await authClient.signOut()
    setState('landing')
    setSelectedVideo(null)
  }

  const handleProfileClick = () => {
    setState('profile')
  }

  const handleSelectVideo = (video: any) => {
    setSelectedVideo(video)
    setState('workspace')
  }

  const handleBackToDashboard = () => {
    setState('dashboard')
  }

  if (state === 'landing') {
    return <LandingPage onGetStarted={handleGetStarted} />
  }

  if (state === 'login') {
    return <LoginPage onLogin={handleLogin} />
  }

  const getHeaderTitle = () => {
    if (state === 'workspace') return selectedVideo?.title
    if (state === 'profile') return "Neural Identity Configuration"
    return "Control Center"
  }

  return (
    <div className="flex h-screen bg-[#0F172A] text-white overflow-hidden relative">
      {/* Background Blur Effects */}
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] animate-pulse-slow pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] animate-pulse-slow pointer-events-none z-0" style={{ animationDelay: '2s' }} />
      
      <Sidebar 
        showBack={state === 'workspace'} 
        onBack={handleBackToDashboard} 
        onHomeClick={handleBackToDashboard}
        activeState={state}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={getHeaderTitle()} 
          onProfileClick={handleProfileClick}
          onLogout={handleLogout}
        />
        
        <div className="flex-1 overflow-auto">
          {state === 'dashboard' && (
            <Dashboard onSelectVideo={handleSelectVideo} />
          )}
          
          {state === 'workspace' && selectedVideo && (
            <VideoWorkspace 
              video={selectedVideo} 
              onBack={handleBackToDashboard} 
            />
          )}

          {state === 'profile' && (
            <ProfilePage />
          )}
        </div>
      </main>
    </div>
  )
}
