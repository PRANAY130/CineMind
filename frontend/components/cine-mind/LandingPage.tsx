'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Play, Sparkles, Video, BarChart3, MessageSquare } from 'lucide-react'

interface LandingPageProps {
  onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0F172A] text-white">
      {/* Neural Grid Overlay */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} 
      />

      {/* Dynamic Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[160px]" 
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(15,23,42,1)_70%)]" />
      </div>

      <main className="relative z-10 text-center px-4 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center gap-3 mb-12">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-25 group-hover:opacity-50 transition-opacity" />
              <div className="relative w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl">
                <Video className="text-purple-400 w-6 h-6" />
              </div>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-2xl font-black tracking-tighter uppercase accent-text">CineMind</span>
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-500 mt-1">Neural Intelligence</span>
            </div>
          </div>

          <motion.h1 
            className="text-5xl md:text-7xl font-black tracking-tightest mb-6 leading-[0.9] accent-text px-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            THE FUTURE OF <br className="hidden md:block" />
            <span className="text-white">VIDEO COGNITION.</span>
          </motion.h1>
          
          <motion.p 
            className="text-[11px] md:text-sm text-slate-400 mb-12 max-w-2xl mx-auto font-bold uppercase tracking-[0.15em] leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            Unified neural engine for deep analysis, emotional mapping, <br className="hidden md:block" />
            and recursive intelligence extraction from any motion capture.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            <Button 
              size="lg" 
              onClick={onGetStarted}
              className="h-14 px-10 text-xs font-black accent-gradient hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] border-none shadow-2xl shadow-purple-500/30 uppercase tracking-[0.2em] relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                Initialize System <Sparkles className="w-4 h-4" />
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="h-14 px-10 text-xs font-black border-white/10 bg-white/[0.02] backdrop-blur-xl hover:bg-white/5 transition-all uppercase tracking-[0.2em] group"
            >
              View Documentation
              <Play className="ml-2 w-3 h-3 fill-current transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Dynamic Metric Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 1 }}
          className="flex flex-wrap justify-center gap-8 mt-24 py-6 border-y border-white/5"
        >
          {[
            { label: "Active Nodes", val: "1.2k+" },
            { label: "Latency", val: "14ms" },
            { label: "Accuracy", val: "99.8%" },
            { label: "Uptime", val: "99.99%" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{stat.label}</span>
              <span className="text-base font-mono font-bold tracking-tight text-slate-200">{stat.val}</span>
            </div>
          ))}
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-5xl mx-auto"
        >
          {[
            { icon: BarChart3, title: "Emotion Decoder", desc: "Real-time biometric extraction and high-fidelity sentiment mapping across all frames." },
            { icon: MessageSquare, title: "Neural Chat", desc: "Proprietary natural language interface for multi-stage content interrogation and discovery." },
            { icon: Sparkles, title: "Insight Synthesis", desc: "Automated recursive identification of critical vectors, anomalies, and semantic patterns." }
          ].map((feature, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5 }}
              className="glass-panel p-8 text-left transition-all group relative overflow-hidden bg-white/[0.01] hover:bg-white/[0.04] border-white/5 hover:border-white/10 ring-1 ring-white/5"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center mb-6 group-hover:border-purple-500/50 transition-all duration-500">
                <feature.icon className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
              </div>
              <h3 className="text-sm font-black mb-3 uppercase tracking-wider text-slate-200">{feature.title}</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight opacity-70 group-hover:opacity-100">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      <footer className="relative z-10 mt-24 pb-12 w-full max-w-6xl mx-auto px-4 border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-800 border border-white/10 flex items-center justify-center">
            <Video className="w-3 h-3 text-purple-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">CineMind Neural Collective</span>
        </div>
        <div className="flex gap-8">
          {["Protocols", "Terminal", "Nexus", "Compliance"].map(link => (
            <a key={link} href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">{link}</a>
          ))}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          © 2026 Operational Status: Nominal
        </div>
      </footer>
    </div>
  )
}
