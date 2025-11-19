'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [session, setSession] = useState(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Check active session on load
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
    }
    getSession()
  }, [supabase])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Grab the variable from Railway, or fallback to localhost for development
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Magic link sent! Check your email.' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
        <h1 className="text-2xl font-bold text-center mb-2">Welcome to Protocol</h1>
        <p className="text-gray-400 text-center mb-6 text-sm">
          Access food safety intelligence and compliance resources for Washtenaw County restaurants.
        </p>

        {session ? (
          // IF USER IS LOGGED IN
          <div className="text-center space-y-4">
            <div className="p-3 bg-green-900/20 border border-green-800 rounded text-green-200 text-sm">
              Logged in as {session.user.email}
            </div>
            <Link 
              href="/documents" 
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition"
            >
              Go to Dashboard
            </Link>
            <Link 
              href="/pricing" 
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
            >
              View Plans
            </Link>
          </div>
        ) : (
          // IF USER IS NOT LOGGED IN
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:border-indigo-500 focus:outline-none text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded transition"
            >
              {loading ? 'Sending Link...' : 'Continue with Email'}
            </button>

            {message && (
              <div className={`p-3 rounded text-sm text-center ${message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                {message.text}
              </div>
            )}
            
            <div className="text-center text-xs text-gray-500 mt-2">
              Enter your email to Sign In or Sign Up.
            </div>
          </form>
        )}

        {!session && (
          <div className="mt-8 pt-6 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-400 mb-3">Start your 7-day free trial</p>
            <Link 
              href="/pricing"
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
            >
              View Plans & Pricing
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
