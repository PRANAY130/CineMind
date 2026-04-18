'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const data = [
  { time: '00:00', engagement: 40, sentiment: 60, interest: 50 },
  { time: '02:00', engagement: 65, sentiment: 55, interest: 70 },
  { time: '04:00', engagement: 45, sentiment: 80, interest: 60 },
  { time: '06:00', engagement: 85, sentiment: 70, interest: 90 },
  { time: '08:00', engagement: 70, sentiment: 40, interest: 75 },
  { time: '10:00', engagement: 90, sentiment: 65, interest: 85 },
  { time: '12:00', engagement: 60, sentiment: 75, interest: 65 },
  { time: '14:00', engagement: 80, sentiment: 90, interest: 80 },
  { time: '16:00', engagement: 55, sentiment: 60, interest: 55 },
  { time: '18:00', engagement: 75, sentiment: 85, interest: 70 },
]

export default function EmotionTimeline() {
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(15, 23, 42, 0.9)', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              backdropFilter: 'blur(10px)'
            }}
            itemStyle={{ fontSize: '11px' }}
          />
          <Area 
            type="monotone" 
            dataKey="engagement" 
            stroke="#3B82F6" 
            fillOpacity={1} 
            fill="url(#colorEngagement)" 
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="sentiment" 
            name="Joy"
            stroke="#22C55E" 
            fillOpacity={1} 
            fill="url(#colorJoy)" 
            strokeWidth={2.5}
          />
          <Area 
            type="monotone" 
            dataKey="interest" 
            name="Anger"
            stroke="#EF4444" 
            fillOpacity={1} 
            fill="url(#colorAnger)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
