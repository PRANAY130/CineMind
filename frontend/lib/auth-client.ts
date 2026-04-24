import { createAuthClient } from 'better-auth/react'

// NEXT_PUBLIC_BACKEND_URL is the FastAPI backend.
// The Better Auth client points to the NEXT.JS server (same origin).
export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||  // set if deploying
    'http://localhost:3000',
})
