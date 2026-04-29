'use client'

import { useRouter } from 'next/navigation'
import LoginPage from '@/components/cine-mind/LoginPage'

export default function LoginRoute() {
  const router = useRouter()

  const handleLogin = () => {
    router.push('/dashboard')
  }

  return <LoginPage onLogin={handleLogin} />
}
