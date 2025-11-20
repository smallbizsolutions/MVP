'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState('signup')
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  
  const router = useRouter()
  const supabase = createClientComponentClient()
  const canvasRef = useRef(null)

  // Track mouse for parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Animated grid background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    let animationFrame
    let offset = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw animated grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      
      const gridSize = 40
      
      // Vertical lines
      for (let x = offset % gridSize; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      
      // Horizontal lines
      for (let y = offset % gridSize; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
      
      offset += 0.5
      animationFrame = requestAnimationFrame(draw)
    }
    
    draw()
    return () => cancelAnimationFrame(animationFrame)
  }, [])

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
            data: {
              county: 'washtenaw'
            }
          }
        })

        if (error) throw error

        if (data.session) {
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
    <div className="h-screen bg-white flex overflow-hidden relative">
      {/* Left Side - Animated Value Prop */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 flex-col relative overflow-hidden">
        {/* Animated grid background */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.3 }}
        />

        {/* Floating orbs with parallax */}
        <div 
          className="absolute top-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float-slow"
          style={{
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`
          }}
        />
        <div 
          className="absolute bottom-20 right-20 w-[32rem] h-[32rem] bg-green-500/10 rounded-full blur-3xl animate-float-delayed"
          style={{
            transform: `translate(${-mousePosition.x}px, ${-mousePosition.y}px)`
          }}
        />
        
        {/* Header - Fixed at top */}
        <div className="relative z-10 mb-8">
          <div className="inline-block">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1 animate-fade-in">
              protocol<span className="font-normal">LM</span>
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full animate-slide-in" />
          </div>
          <div className="text-xs text-slate-300 font-medium mt-2 animate-fade-in-delayed">
            Michigan Restaurant Compliance
          </div>
        </div>
        
        {/* Content - Scrollable with animations */}
        <div className="relative z-10 flex-1 overflow-y-auto pr-2 scrollbar-thin">
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 animate-slide-up shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wide">The Reality</div>
                  <div className="text-white text-lg font-bold leading-tight">
                    Health inspections happen without warning
                  </div>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Every restaurant in Michigan gets inspected 1-3 times per year. Most violations are preventable—but only if your staff knows exactly what inspectors are looking for.
              </p>
            </div>

            <div className="space-y-3">
              {/* Pain Point 1 */}
              <div className="group flex items-start space-x-3 animate-slide-up bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]" style={{ animationDelay: '0.1s' }}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1.5 text-base">Critical violations cost you money</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">Temperature violations, cross-contamination, improper storage—these aren&apos;t just notes on a report. They mean re-inspections, potential closures, and lost revenue.</p>
                </div>
              </div>

              {/* Pain Point 2 */}
              <div className="group flex items-start space-x-3 animate-slide-up bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]" style={{ animationDelay: '0.2s' }}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1.5 text-base">Catch violations before inspectors do</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">Take a photo of your line, cooler, or storage area. Get instant feedback on potential violations with exact regulatory citations and how to fix them—before it ends up on your inspection report.</p>
                </div>
              </div>
              
              {/* Pain Point 3 */}
              <div className="group flex items-start space-x-3 animate-slide-up bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]" style={{ animationDelay: '0.3s' }}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1.5 text-base">Questions need immediate answers</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">&quot;Can I cool soup in the walk-in?&quot; &quot;What temp for chicken?&quot; &quot;How long can this be out?&quot; Your team needs answers in seconds, not after digging through binders.</p>
                </div>
              </div>

              {/* Pain Point 4 */}
              <div className="group flex items-start space-x-3 animate-slide-up bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]" style={{ animationDelay: '0.4s' }}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1.5 text-base">Food code books gather dust</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">You have the FDA Food Code somewhere. Your staff has never read it. When the inspector shows up, everyone scrambles. There&apos;s a better way.</p>
                </div>
              </div>

              {/* Solution Statement */}
              <div className="flex items-start space-x-3 animate-slide-up pt-3 border-t border-white/10 bg-gradient-to-br from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-4 hover:scale-[1.02] transition-all duration-300" style={{ animationDelay: '0.5s' }}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse-slow">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1.5 text-base">One tool. All your answers.</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">FDA Food Code, Michigan regulations, county enforcement guidelines, and automated image analysis—all accessible from your phone in seconds. No more guessing. No more violations you could have prevented.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-slate-400 text-xs relative z-10 font-medium mt-6 flex items-center justify-between">
          <span>© 2025 protocolLM. All rights reserved.</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs font-semibold">Live</span>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="mb-8 lg:hidden">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">
              protocol<span className="font-normal">LM</span>
            </h1>
            <div className="text-xs text-slate-600 font-medium">Michigan Restaurant Compliance</div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2" style={{ letterSpacing: '-0.03em' }}>
              {view === 'signup' ? 'Stop guessing. Start knowing.' : 'Welcome back'}
            </h2>
            <p className="text-slate-600 text-sm lg:text-base">
              {view === 'signup' 
                ? 'Join Michigan restaurants staying ahead of inspections' 
                : 'Sign in to access your dashboard'}
            </p>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 shadow-inner">
            <button
              onClick={() => { setView('signup'); setMessage(null); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                view === 'signup' 
                  ? 'bg-white text-slate-900 shadow-md scale-105' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign up
            </button>
            <button
              onClick={() => { setView('login'); setMessage(null); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                view === 'login' 
                  ? 'bg-white text-slate-900 shadow-md scale-105' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign in
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="group">
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 focus:outline-none text-slate-900 transition-all duration-300 text-sm group-hover:border-slate-300"
                placeholder="you@restaurant.com"
              />
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 focus:outline-none text-slate-900 transition-all duration-300 text-sm group-hover:border-slate-300"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                view === 'signup' ? 'Start 30-day free trial' : 'Sign in'
              )}
            </button>

            {message && (
              <div className={`p-3 rounded-xl text-xs font-medium animate-slide-down ${
                message.type === 'error' 
                  ? 'bg-red-50 border-2 border-red-200 text-red-800' 
                  : 'bg-green-50 border-2 border-green-200 text-green-800'
              }`}>
                {message.text}
              </div>
            )}
          </form>

          {view === 'signup' && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-center text-xs text-slate-600 mb-3 font-medium">
                30-day free trial • From $49/month
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2.5 rounded-xl transition-all duration-300 text-sm transform hover:scale-[1.02] active:scale-[0.98]"
              >
                View pricing plans
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-30px) translateX(20px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-40px) translateX(-20px); }
        }
        
        @keyframes slide-in {
          from {
            width: 0;
            opacity: 0;
          }
          to {
            width: 100%;
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fade-in-delayed {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 15s ease-in-out infinite;
        }

        .animate-slide-in {
          animation: slide-in 1s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-fade-in-delayed {
          animation: fade-in-delayed 1s ease-out 0.2s both;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  )
}
