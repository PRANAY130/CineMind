'use client'

import { motion } from 'motion/react'
import { Clapperboard, Play, Sparkles, BarChart3, MessageSquare, Zap } from 'lucide-react'

interface LandingPageProps {
  onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const stats = [
    { label: 'Accuracy',    value: '99.8%', color: 'stat-pink'   },
    { label: 'Latency',     value: '14ms',  color: 'stat-cyan'   },
    { label: 'Uptime',      value: '99.99%',color: 'stat-green'  },
    { label: 'Models Live', value: '4',     color: 'stat-amber'  },
  ]

  const features = [
    {
      icon: BarChart3,
      color: '#E879F9',
      badge: 'badge-pink',
      tag: 'Emotion AI',
      title: 'Emotion Decoder',
      desc: 'Real-time biometric extraction and sentiment mapping across every frame of your video.'
    },
    {
      icon: MessageSquare,
      color: '#22D3EE',
      badge: 'badge-cyan',
      tag: 'Neural Chat',
      title: 'Talk to Your Video',
      desc: 'Ask any question about your video in plain language. Get instant, cited answers.'
    },
    {
      icon: Sparkles,
      color: '#A78BFA',
      badge: 'badge-purple',
      tag: 'AI Summary',
      title: 'Insight Synthesis',
      desc: 'Automatic multi-language summaries with key takeaways, moments, and deeper analysis.'
    },
  ]

  return (
    <div className="relative min-h-screen flex flex-col items-center overflow-hidden bg-[#0A0A0C] text-white">
      {/* Background orbs */}
      <div
        className="holo-orb holo-orb-purple animate-orb-drift-slow"
        style={{ width: 700, height: 700, top: -200, right: -200 }}
      />
      <div
        className="holo-orb holo-orb-cyan animate-orb-drift"
        style={{ width: 600, height: 600, bottom: -100, left: -200 }}
      />
      {/* Spectrum orb top-right corner decoration */}
      <div
        className="holo-orb holo-orb-spectrum animate-pulse-glow"
        style={{ width: 300, height: 300, top: 60, right: 60 }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      {/* ---- HERO ---- */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 pt-28 pb-16 max-w-5xl w-full mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2.5 mb-12"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            <Clapperboard className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">CineMind</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6"
        >
          Talk to your
          <br />
          <span className="gradient-text">videos.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="text-base md:text-lg text-zinc-400 max-w-xl mb-10 leading-relaxed font-normal"
        >
          AI-powered analysis, emotion mapping, multilingual summaries, and conversational intelligence — all for your video content.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-20"
        >
          <button
            onClick={onGetStarted}
            className="btn-primary h-12 px-8 text-sm rounded-xl gap-2 shadow-[0_0_24px_rgba(124,58,237,0.35)]"
          >
            <Zap className="w-4 h-4" />
            Get Started Free
          </button>
          <button className="btn-ghost h-12 px-8 text-sm rounded-xl gap-2">
            <Play className="w-3.5 h-3.5 fill-current" />
            Watch Demo
          </button>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="w-full holo-card p-5 mb-14"
        >
          <div className="flex flex-wrap justify-around gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={`text-2xl font-black font-mono tracking-tight ${stat.color}`}>
                  {stat.value}
                </span>
                <span className="section-label">{stat.label}</span>
              </div>
            ))}
          </div>
          {/* Pills row */}
          <div className="flex flex-wrap justify-center gap-2 mt-5 pt-5 border-t border-white/[0.05]">
            <span className="badge-pink">Vision AI</span>
            <span className="badge-cyan">RAG Enabled</span>
            <span className="badge-green">Fine-tuned</span>
            <span className="badge-amber">Multi-modal</span>
            <span className="badge-purple">Multilingual</span>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full"
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="holo-card p-6 text-left group cursor-default"
            >
              {/* Corner orb accent */}
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${f.color}, transparent)` }}
              />
              <div className="flex items-start justify-between mb-5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{
                    background: `${f.color}14`,
                    borderColor: `${f.color}30`,
                  }}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <span className={f.badge}>{f.tag}</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-zinc-600 font-medium">© 2026 CineMind · All rights reserved</span>
        <div className="flex items-center gap-6">
          {['Privacy', 'Terms', 'Docs', 'Status'].map(l => (
            <a key={l} href="#" className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors font-medium">{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
