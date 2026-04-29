'use client'

import { BookOpen } from 'lucide-react'

export default function LibraryRoute() {
  return (
    <div className="p-8 flex flex-col items-center justify-center h-full text-center">
      <BookOpen className="w-16 h-16 text-purple-500/20 mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">Neural Knowledge Base</h2>
      <p className="text-slate-400 max-w-md">Structured insights and cross-video knowledge extraction are being synthesized. This feature will be available in the next neural update.</p>
    </div>
  )
}
