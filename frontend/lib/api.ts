/**
 * Central API bridge between Next.js frontend and FastAPI backend.
 * Gets the Better Auth session token and attaches it as Bearer to every request.
 */
import { authClient } from './auth-client'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

async function getSessionToken(): Promise<string | null> {
  try {
    const res = await authClient.getSession()
    return res?.data?.session?.token ?? null
  } catch {
    return null
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getSessionToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `API error ${res.status}`)
  }

  return res.json()
}

// ─── Videos ──────────────────────────────────────────────────────────────────

export async function fetchVideos() {
  return apiFetch<any[]>('/videos/')
}

export async function uploadVideo(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetch<{ message: string; video_id: number }>('/videos/upload', {
    method: 'POST',
    body: formData,
  })
}

export async function fetchVideo(videoId: number) {
  return apiFetch<any>(`/videos/${videoId}`)
}

export async function fetchTranscript(videoId: number) {
  return apiFetch<any[]>(`/videos/${videoId}/transcript`)
}

export async function deleteVideo(videoId: number) {
  return apiFetch<{ status: string; message: string }>(`/videos/${videoId}`, {
    method: 'DELETE',
  })
}

// ─── Chat (RAG via Groq Llama 3) ─────────────────────────────────────────────

export async function chatWithVideo(videoId: number, query: string) {
  return apiFetch<{ answer: string; timestamps: string[] }>('/chat/', {
    method: 'POST',
    body: JSON.stringify({ video_id: videoId, query }),
  })
}

// ─── WebSocket (Live Pipeline Progress) ──────────────────────────────────────

export function connectProgressSocket(
  videoId: number,
  onProgress: (data: { step: string; progress_pct: number }) => void
): WebSocket {
  const protocol = BACKEND_URL.startsWith('https') ? 'wss' : 'ws'
  const wsUrl = `${protocol}://${BACKEND_URL.replace(/^https?:\/\//, '')}/ws/progress/${videoId}`
  const ws = new WebSocket(wsUrl)
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onProgress(data)
    } catch {}
  }
  return ws
}
