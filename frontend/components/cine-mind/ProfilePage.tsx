'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { User, Shield, Zap, Bell, Globe, Camera, Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import Image from 'next/image'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res?.data?.user) {
        setUser(res.data.user)
      }
      setLoading(false)
    })
  }, [])

  const displayName = user?.name || 'Unknown User'
  const email = user?.email || ''
  const avatar = user?.image || null
  const firstName = displayName.split(' ')[0] || ''
  const lastName = displayName.split(' ').slice(1).join(' ') || ''

  return (
    <div className="p-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tighter mb-1 accent-text">Neural Identity</h1>
            <p className="high-density-text uppercase tracking-widest">Subscriber Node Configuration</p>
          </div>
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] font-bold uppercase py-1 px-3">
            Elite Access Active
          </Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
            {/* Left: Identity Card */}
            <div className="space-y-6">
              <Card className="glass-panel p-6 border-white/5 bg-white/[0.02] flex flex-col items-center text-center">
                <div className="relative group mb-4">
                  <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-white/5 overflow-hidden ring-4 ring-purple-500/10">
                    {avatar ? (
                      <Image src={avatar} alt={displayName} fill className="object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-purple-500/20">
                        <User className="w-10 h-10 text-purple-400" />
                      </div>
                    )}
                  </div>
                  <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg accent-gradient flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
                <h2 className="text-xl font-bold tracking-tight">{displayName}</h2>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">{email}</p>

                <div className="w-full h-px bg-white/5 my-6" />

                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Status</span>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase">Synchronized</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Provider</span>
                    <span className="text-[10px] font-bold text-slate-200 uppercase">Google</span>
                  </div>
                </div>
              </Card>

              <Card className="glass-panel p-6 border-white/5 bg-white/[0.02]">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 ml-1">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-9 text-[9px] font-bold uppercase tracking-widest border-white/5 bg-white/[0.02] hover:bg-white/10">
                    Billing
                  </Button>
                  <Button variant="outline" className="h-9 text-[9px] font-bold uppercase tracking-widest border-white/5 bg-white/[0.02] hover:bg-white/10">
                    Integrations
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right: Detailed Settings */}
            <div className="space-y-6">
              <Card className="glass-panel p-8 border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3 mb-8">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Protocol Configurations</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Identity Vector (Email)</label>
                    <Input
                      defaultValue={email}
                      readOnly
                      className="h-10 bg-white/[0.03] border-white/5 text-xs font-medium focus:border-purple-500/50 opacity-70"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">First Name</label>
                      <Input defaultValue={firstName} className="h-10 bg-white/[0.03] border-white/5 text-xs font-medium" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Last Name</label>
                      <Input defaultValue={lastName} className="h-10 bg-white/[0.03] border-white/5 text-xs font-medium" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Neural Bio</label>
                    <textarea
                      className="w-full min-h-[100px] bg-white/[0.03] border border-white/5 rounded-lg p-3 text-xs font-medium focus:outline-none focus:border-purple-500/50 resize-none"
                      placeholder="Describe your research focus..."
                    />
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 flex justify-end">
                  <Button className="accent-gradient border-none h-10 px-6 text-[10px] font-black uppercase tracking-widest">
                    Commit Changes
                  </Button>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: Zap, label: "Performance", value: "Neural Optimized" },
                  { icon: Bell, label: "Signals", value: "Real-time Enabled" },
                  { icon: Globe, label: "Nexus Region", value: "Asia-Pacific (East)" },
                  { icon: Shield, label: "Security", value: "Google OAuth" }
                ].map((setting, i) => (
                  <Card key={i} className="glass-panel p-4 border-white/5 bg-white/[0.02] flex items-center justify-between group hover:bg-white/[0.04] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-purple-500/10 transition-colors">
                        <setting.icon className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{setting.label}</p>
                        <p className="text-[10px] font-bold text-slate-200 mt-0.5">{setting.value}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
