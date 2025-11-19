'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function Pricing() {
  const [loadingId, setLoadingId] = useState(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleCheckout = async (priceId) => {
    setLoadingId(priceId)

    // 1. Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      // If not logged in, send to login page with an alert
      alert("Please Log In or Sign Up on the home page to start your trial.")
      router.push('/')
      return
    }

    // 2. Create Checkout Session
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
        alert('Something went wrong initiating checkout.')
        setLoadingId(null)
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      setLoadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-20 px-4 flex flex-col items-center">
      
      {/* HEADER SECTION */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-gray-400 text-lg">
          Get full access to food safety intelligence. Cancel anytime.
        </p>
      </div>
      
      {/* PRICING CARDS GRID */}
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">
        
        {/* --- PRO PLAN (Highlighted) --- */}
        <div className="relative bg-gray-800 rounded-2xl border border-indigo-500/30 shadow-2xl shadow-indigo-900/20 flex flex-col overflow-hidden hover:border-indigo-500 transition-all duration-300 group">
          
          {/* POPULAR BADGE */}
          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
            MOST POPULAR
          </div>

          <div className="p-8 flex flex-col h-full">
            <h2 className="text-xl font-bold text-indigo-400 mb-2">Pro Plan</h2>
            
            <div className="flex items-baseline mb-1">
              <span className="text-5xl font-extrabold tracking-tight text-white">$29</span>
              <span className="ml-2 text-xl text-gray-400">/month</span>
            </div>
            
            {/* TRIAL BADGE */}
            <div className="mt-4 mb-6">
              <span className="inline-block bg-indigo-900/50 text-indigo-200 text-sm font-semibold px-3 py-1 rounded-full border border-indigo-700/50">
                Includes 7-Day Free Trial
              </span>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {[
                'Unlimited Document Access',
                'AI Compliance Assistant',
                'Washtenaw County Database',
                'Mobile Optimized',
                'Priority Email Support'
              ].map((feature, i) => (
                <li key={i} className="flex items-start">
                  <svg className="w-5 h-5 text-indigo-500 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleCheckout('price_1SVG96DlSrKA3nbArP6hvWXr')} 
              disabled={loadingId !== null}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingId === 'price_1SVG96DlSrKA3nbArP6hvWXr' ? 'Processing...' : 'Start 7-Day Free Trial'}
            </button>
            <p className="text-center text-xs text-gray-500 mt-3">Then $29/mo. Cancel anytime.</p>
          </div>
        </div>

        {/* --- ENTERPRISE PLAN --- */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 flex flex-col overflow-hidden hover:border-gray-500 transition-all duration-300">
          <div className="p-8 flex flex-col h-full">
            <h2 className="text-xl font-bold text-purple-400 mb-2">Enterprise</h2>
            
            <div className="flex items-baseline mb-1">
              <span className="text-5xl font-extrabold tracking-tight text-white">$99</span>
              <span className="ml-2 text-xl text-gray-400">/month</span>
            </div>
            
            <div className="mt-4 mb-6">
              <span className="inline-block bg-purple-900/30 text-purple-200 text-sm font-semibold px-3 py-1 rounded-full border border-purple-700/30">
                Multi-Location Support
              </span>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {[
                'Everything in Pro',
                'Multi-Location Dashboard',
                'Team Management (5 Seats)',
                'API Access',
                'Dedicated Account Manager'
              ].map((feature, i) => (
                <li key={i} className="flex items-start">
                  <svg className="w-5 h-5 text-purple-500 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleCheckout('price_1SVG8KDlSrKA3nbAfEQje8j8')} 
              disabled={loadingId !== null}
              className="w-full bg-gray-700 hover:bg-purple-600 text-white font-bold py-4 rounded-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingId === 'price_1SVG8KDlSrKA3nbAfEQje8j8' ? 'Processing...' : 'Select Enterprise'}
            </button>
             <p className="text-center text-xs text-gray-500 mt-3">Includes 7-day trial.</p>
          </div>
        </div>

      </div>
      
      <button 
        onClick={() => router.push('/')} 
        className="mt-12 text-gray-500 hover:text-white text-sm transition-colors flex items-center"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Back to Home
      </button>
    </div>
  )
}
