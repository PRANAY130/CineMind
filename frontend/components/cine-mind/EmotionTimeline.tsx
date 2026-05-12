'use client'

import { useMemo, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface Segment {
  start: number
  end: number
  text: string
}

interface EmotionTimelineProps {
  segments?: Segment[]
  emotionData?: any[]  // Real LLaMA-3 scored data from backend
  currentTime?: number
  isLoading?: boolean
}

// Simple keyword-based emotion scoring per transcript segment
const JOY_WORDS = ['great', 'good', 'excellent', 'amazing', 'happy', 'love', 'beautiful', 'wonderful', 'best', 'positive', 'success', 'yes', 'right', 'correct', 'perfect', 'nice']
const ANGER_WORDS = ['bad', 'wrong', 'error', 'fail', 'never', 'no', 'not', 'problem', 'issue', 'difficult', 'hard', 'conflict', 'against', 'constraint', 'violation', 'restrict']
const ENGAGE_WORDS = ['important', 'must', 'need', 'key', 'note', 'understand', 'remember', 'so', 'because', 'therefore', 'means', 'ensures', 'allows', 'defines', 'example', 'that is']

function scoreText(text: string, keywords: string[]): number {
  const lower = text.toLowerCase()
  const words = lower.split(/\s+/)
  let hits = 0
  for (const word of words) {
    if (keywords.some(k => word.includes(k))) hits++
  }
  // Normalize: 0–100, soft cap to keep the chart readable
  return Math.min(100, 30 + hits * 18)
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const FALLBACK_DATA = [
  { time: '00:00', timeSec: 0, joy: 45, anger: 30, engagement: 55 },
  { time: '02:00', timeSec: 120, joy: 60, anger: 25, engagement: 70 },
  { time: '04:00', timeSec: 240, joy: 50, anger: 45, engagement: 65 },
  { time: '06:00', timeSec: 360, joy: 75, anger: 20, engagement: 80 },
  { time: '08:00', timeSec: 480, joy: 55, anger: 35, engagement: 60 },
]

export default function EmotionTimeline({ segments = [], emotionData = [], currentTime = 0, isLoading = false }: EmotionTimelineProps) {
  const data = useMemo(() => {
    // Prefer real LLaMA-3 data from the backend
    if (emotionData && emotionData.length > 0) {
      return emotionData.map((d: any) => ({
        time: d.time || '00:00',
        timeSec: typeof d.timeSec === 'number' ? d.timeSec : 0,
        joy: Math.round(d.joy ?? 40),
        anger: Math.round(d.anger ?? 20),
        engagement: Math.round(d.engagement ?? 50),
      }))
    }

    // Fallback: keyword-based scoring from transcript segments
    if (!segments || segments.length === 0) return FALLBACK_DATA

    // Bucket segments into ~20 evenly-spaced points for a smooth chart
    const totalDuration = segments[segments.length - 1]?.end || 1
    const bucketCount = Math.min(segments.length, 20)
    const bucketSize = totalDuration / bucketCount

    return Array.from({ length: bucketCount }, (_, i) => {
      const bucketStart = i * bucketSize
      const bucketEnd = bucketStart + bucketSize
      const inBucket = segments.filter(s => s.start >= bucketStart && s.start < bucketEnd)
      const combinedText = inBucket.map(s => s.text).join(' ')

      return {
        time: formatTime(bucketStart),
        timeSec: bucketStart,
        joy: combinedText ? scoreText(combinedText, JOY_WORDS) : 40,
        anger: combinedText ? scoreText(combinedText, ANGER_WORDS) : 30,
        engagement: combinedText ? scoreText(combinedText, ENGAGE_WORDS) : 50,
      }
    })
  }, [segments, emotionData])

  // Find the closest data point to currentTime for the reference line
  const currentTimeSec = currentTime
  const closestPoint = data.reduce((prev, curr) =>
    Math.abs(curr.timeSec - currentTimeSec) < Math.abs(prev.timeSec - currentTimeSec) ? curr : prev,
    data[0]
  )

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-2">
        <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Analyzing emotions...</span>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={120} minWidth={100}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorJoy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorAnger" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            stroke="#64748b"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis domain={[0, 100]} width={25} fontSize={9} tickLine={false} axisLine={false} stroke="#64748b" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              backdropFilter: 'blur(10px)',
              fontSize: '11px'
            }}
            itemStyle={{ fontSize: '11px' }}
            formatter={(val: any, name: any) => [`${val}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
          />
          {/* Playhead indicator */}
          {closestPoint && (
            <ReferenceLine
              x={closestPoint.time}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}
          <Area type="monotone" dataKey="engagement" name="engagement" stroke="#3B82F6" fillOpacity={1} fill="url(#colorEngagement)" strokeWidth={2} />
          <Area type="monotone" dataKey="joy" name="joy" stroke="#22C55E" fillOpacity={1} fill="url(#colorJoy)" strokeWidth={2.5} />
          <Area type="monotone" dataKey="anger" name="anger" stroke="#EF4444" fillOpacity={1} fill="url(#colorAnger)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
