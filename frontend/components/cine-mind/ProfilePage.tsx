'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { User, Shield, Zap, Bell, Globe, Camera, Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import Image from 'next/image'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res?.data?.user) setUser(res.data.user)
      setLoading(false)
    })
  }, [])

  const displayName = user?.name || 'Unknown User'
  const email       = user?.email || ''
  const avatar      = user?.image || null
  const firstName   = displayName.split(' ')[0] || ''
  const lastName    = displayName.split(' ').slice(1).join(' ') || ''

  const settingsCards = [
    { icon: Zap,    label: 'Performance',  value: 'Optimized',     color: '#A78BFA' },
    { icon: Bell,   label: 'Notifications',value: 'Real-time',     color: '#22D3EE' },
    { icon: Globe,  label: 'Region',       value: 'Asia-Pacific',  color: '#4ADE80' },
    { icon: Shield, label: 'Security',     value: 'Google OAuth',  color: '#E879F9' },
  ]

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Profile</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Manage your account settings</p>
          </div>
          <span className="badge-purple">Pro Plan</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">

            {/* Left: Identity Card */}
            <div className="flex flex-col gap-4">
              <div className="holo-card p-6 flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#18181F] border-2 border-violet-500/20 shadow-[0_0_20px_rgba(167,139,250,0.15)] relative">
                    {avatar ? (
                      <Image src={avatar} alt={displayName} fill className="object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-violet-500/10">
                        <User className="w-8 h-8 text-violet-400" />
                      </div>
                    )}
                  </div>
                  <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>

                <h2 className="text-base font-bold text-white">{displayName}</h2>
                <p className="text-xs text-zinc-500 mt-0.5 mb-5">{email}</p>

                <div className="w-full h-px bg-white/[0.06] mb-5" />

                <div className="w-full space-y-3">
                  {[
                    { k: 'Status',   v: 'Active',     vc: 'text-emerald-400' },
                    { k: 'Provider', v: 'Google',     vc: 'text-zinc-300'    },
                    { k: 'Plan',     v: 'Pro',        vc: 'text-violet-400'  },
                  ].map(({ k, v, vc }) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="section-label">{k}</span>
                      <span className={`text-[11px] font-bold ${vc}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="holo-card p-4">
                <p className="section-label mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Billing', 'Integrations'].map(label => (
                    <button key={label} className="btn-ghost h-9 rounded-lg text-xs">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Settings */}
            <div className="flex flex-col gap-4">
              {/* Account Settings */}
              <div className="holo-card p-6">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Account Settings</h3>
                </div>

                <div className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="section-label">Email address</label>
                    <input
                      defaultValue={email}
                      readOnly
                      className="holo-input opacity-60 cursor-not-allowed"
                    />
                  </div>

                  {/* Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="section-label">First name</label>
                      <input defaultValue={firstName} className="holo-input" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="section-label">Last name</label>
                      <input defaultValue={lastName} className="holo-input" />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5">
                    <label className="section-label">Bio</label>
                    <textarea
                      className="holo-input min-h-[80px] resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-white/[0.06] flex justify-end">
                  <button className="btn-primary h-10 px-6 rounded-xl text-sm">
                    Save changes
                  </button>
                </div>
              </div>

              {/* System Settings Grid */}
              <div className="grid grid-cols-2 gap-3">
                {settingsCards.map(({ icon: Icon, label, value, color }) => (
                  <div
                    key={label}
                    className="holo-card p-4 flex items-center gap-3 hover:border-white/15 transition-colors cursor-pointer group"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
                      style={{ background: `${color}12`, borderColor: `${color}28` }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div>
                      <p className="section-label">{label}</p>
                      <p className="text-[12px] font-semibold text-white mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
