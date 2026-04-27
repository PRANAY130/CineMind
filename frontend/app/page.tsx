'use client'

import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import LandingPage from '@/components/cine-mind/LandingPage'
import LoginPage from '@/components/cine-mind/LoginPage'
import Dashboard from '@/components/cine-mind/Dashboard'
import UploadPage from '@/components/cine-mind/UploadPage'
import VideoWorkspace from '@/components/cine-mind/VideoWorkspace'
import ProfilePage from '@/components/cine-mind/ProfilePage'
import Sidebar from '@/components/cine-mind/Sidebar'
import Header from '@/components/cine-mind/Header'
import { authClient } from '@/lib/auth-client'

type AppState = 'landing' | 'login' | 'dashboard' | 'workspace' | 'profile' | 'library' | 'upload'

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
        onWorkspaceClick={() => selectedVideo && setState('workspace')}
        onUploadClick={() => setState('upload')}
        onLibraryClick={() => setState('library')}
        onSettingsClick={handleProfileClick}
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
          
          {state === 'upload' && (
            <UploadPage onVideoQueued={handleSelectVideo} />
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

          {state === 'library' && (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center">
              <BookOpen className="w-16 h-16 text-purple-500/20 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Neural Knowledge Base</h2>
              <p className="text-slate-400 max-w-md">Structured insights and cross-video knowledge extraction are being synthesized. This feature will be available in the next neural update.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
