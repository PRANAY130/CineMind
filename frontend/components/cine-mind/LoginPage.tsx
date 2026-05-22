'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Clapperboard, Mail, Lock, ArrowRight, Loader2, Chrome } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

interface LoginPageProps {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]       = useState('')

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      setError('')
      await authClient.signIn.social({ provider: 'google', callbackURL: '/' })
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div
        className="holo-orb holo-orb-purple animate-orb-drift-slow"
        style={{ width: 600, height: 600, top: -150, right: -150 }}
      />
      <div
        className="holo-orb holo-orb-cyan animate-orb-drift"
        style={{ width: 500, height: 500, bottom: -100, left: -150 }}
      />
      <div
        className="holo-orb holo-orb-spectrum animate-pulse-glow"
        style={{ width: 300, height: 300, top: 100, right: 80 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-sm z-10 flex flex-col items-center"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            <Clapperboard className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-black text-white tracking-tight">CineMind</span>
            <span className="text-[10px] text-zinc-500 font-medium mt-0.5 tracking-widest uppercase">Video Intelligence</span>
          </div>
        </div>

        {/* Card with animated border */}
        <div className="holo-border-wrap w-full">
          <div className="holo-border-inner p-8">
            <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-sm text-zinc-500 mb-8">Sign in to your account to continue.</p>

            <div className="space-y-4">
              {/* Google CTA */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 h-11 bg-white text-[#18181F] font-semibold text-sm rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-70 relative overflow-hidden"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {/* Google icon */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[11px] text-zinc-600 font-medium uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="section-label ml-0.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="holo-input pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="section-label ml-0.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="holo-input pl-10"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={onLogin}
                className="btn-primary w-full h-11 rounded-xl text-sm"
              >
                Sign In
                <ArrowRight className="w-4 h-4" />
              </button>

              {error && (
                <p className="text-xs text-red-400 text-center font-medium">{error}</p>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-zinc-600 text-center">
          Don't have an account?{' '}
          <button className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
            Create account
          </button>
        </p>
      </motion.div>
    </div>
  )
}
