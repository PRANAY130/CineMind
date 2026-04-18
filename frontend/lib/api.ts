/**
 * Central API bridge between Next.js frontend and FastAPI backend.
 * Automatically attaches Bearer token from localStorage to every request.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cinemind_token')
}

export function setToken(token: string) {
  localStorage.setItem('cinemind_token', token)
}

export function clearToken() {
  localStorage.removeItem('cinemind_token')
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json'
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

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function verifySession() {
  return apiFetch<{ status: string; user_id: string }>('/auth/me')
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
  const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/ws/progress/${videoId}`
  const ws = new WebSocket(wsUrl)
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      onProgress(data)
    } catch {}
  }
  return ws
}
