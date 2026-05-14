import { createAuthClient } from 'better-auth/react'

// The Better Auth client must point to the Next.js server (same origin as the app).
// NEXT_PUBLIC_APP_URL must be set in Vercel to https://cine-mind-inky.vercel.app
export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
})
