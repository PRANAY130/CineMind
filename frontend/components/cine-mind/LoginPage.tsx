'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Video, Lock, Mail, ArrowRight, Github, Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

interface LoginPageProps {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      setError('')
      // Use Better Auth Google social sign-in
      await authClient.signIn.social({ provider: 'google', callbackURL: '/' })
      // Token is managed via cookies by Better Auth; call onLogin to update app state
      onLogin()
    } catch (err: any) {
      setError(err?.message || 'Google login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center shadow-2xl mb-4">
            <Video className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase accent-text">CineMind Access</h1>
          <p className="high-density-text mt-2 uppercase tracking-[0.2em] font-bold">Neural Gateway Terminal</p>
        </div>

        <Card className="glass-panel p-8 border-white/5 bg-white/[0.02]">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Identity Vector</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <Input 
                  type="email"
                  placeholder="name@nexus.com" 
                  className="pl-10 h-11 bg-white/[0.03] border-white/5 focus:border-purple-500/50 transition-all text-sm rounded-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Protocal Key</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <Input 
                  type="password"
                  placeholder="••••••••" 
                  className="pl-10 h-11 bg-white/[0.03] border-white/5 focus:border-purple-500/50 transition-all text-sm rounded-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button 
              className="w-full h-11 accent-gradient border-none font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-purple-500/20"
              onClick={onLogin}
            >
              Initialize Session
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-[9px] uppercase font-bold tracking-widest text-slate-600">
                <span className="bg-[#0F172A] px-4">Alternate Verification</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-10 text-[10px] font-bold uppercase tracking-widest border-white/5 bg-white/[0.02]">
                <Github className="w-4 h-4 mr-2" /> GitHub
              </Button>
              <Button 
                variant="outline" 
                className="h-10 text-[10px] font-bold uppercase tracking-widest border-white/5 bg-white/[0.02] hover:border-purple-500/40 hover:text-purple-300 transition-all"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Google
              </Button>
            </div>

            {error && (
              <p className="text-[10px] text-red-400 font-bold text-center uppercase tracking-wider mt-2">{error}</p>
            )}
          </div>
        </Card>

        <p className="mt-8 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          New Node? <button className="text-purple-400 hover:text-purple-300 transition-colors">Register Identity</button>
        </p>
      </motion.div>
    </div>
  )
}
