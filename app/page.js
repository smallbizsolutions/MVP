'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState('signup')
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        })

        if (error) throw error

        if (data.session) {
          const { error: profileError } = await supabase.rpc('create_user_profile', {
            user_id: data.session.user.id,
            user_email: data.session.user.email
          })

          if (profileError) {
            console.error('Profile creation error:', profileError)
            throw new Error('Failed to create user profile')
          }

          router.push('/pricing')
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Account created! Please check your email to confirm before logging in.' 
          })
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_subscribed')
          .eq('id', data.session.user.id)
          .single()

        if (profile?.is_subscribed) {
          router.push('/documents')
        } else {
          router.push('/pricing')
        }
      }
    } catch (error) {
      console.error("Auth Error:", error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 p-12 flex-col justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">protocol LM</h1>
          <p className="text-slate-400 text-sm">Washtenaw County Food Safety Compliance</p>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Instant Compliance Answers</h3>
              <p className="text-slate-400 text-sm">Search through FDA Food Code, Michigan regulations, and local guidelines</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Photo Analysis</h3>
              <p className="text-slate-400 text-sm">Upload images to identify potential violations and get remediation guidance</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Complete Reference Library</h3>
              <p className="text-slate-400 text-sm">Access 15+ essential documents and enforcement guidelines</p>
            </div>
          </div>
        </div>
        
        <div className="text-slate-500 text-xs">
          © 2024 protocol LM. All rights reserved.
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">protocol LM</h1>
            <p className="text-slate-600 text-sm">Washtenaw County Food Safety</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              {view === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-slate-600">
              {view === 'signup' 
                ? 'Start your 7-day free trial today' 
                : 'Sign in to access your dashboard'}
            </p>
          </div>

          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            <button
              onClick={() => { setView('signup'); setMessage(null); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                view === 'signup' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign up
            </button>
            <button
              onClick={() => { setView('login'); setMessage(null); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                view === 'login' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign in
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none text-slate-900 transition"
                placeholder="you@restaurant.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none text-slate-900 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (view === 'signup' ? 'Create account' : 'Sign in')}
            </button>

            {message && (
              <div className={`p-4 rounded-lg text-sm ${
                message.type === 'error' 
                  ? 'bg-red-50 border border-red-200 text-red-800' 
                  : 'bg-green-50 border border-green-200 text-green-800'
              }`}>
                {message.text}
              </div>
            )}
          </form>

          {view === 'signup' && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-center text-sm text-slate-600 mb-4">
                7-day free trial • No credit card required
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium py-2.5 rounded-lg transition"
              >
                View pricing plans
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
