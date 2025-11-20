'use client'

import { useState } from 'react'

export default function TermsModal({ isOpen, onAccept, onDecline }) {
  const [hasScrolled, setHasScrolled] = useState(false)

  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight
    if (bottom) {
      setHasScrolled(true)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Terms & Conditions</h2>
          <p className="text-sm text-slate-600 mt-2">Please read and accept to continue</p>
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 overflow-y-auto p-6 text-sm text-slate-700 leading-relaxed"
          onScroll={handleScroll}
        >
          <h3 className="font-bold text-slate-900 mb-3">1. Service Description</h3>
          <p className="mb-4">
            protocolLM provides AI-powered food safety compliance tools and resources for restaurants in Michigan. Our service includes access to regulatory documents, AI-assisted compliance guidance, and image analysis features.
          </p>

          <h3 className="font-bold text-slate-900 mb-3">2. Use of Service</h3>
          <p className="mb-4">
            This service is intended as a reference tool only. While we strive for accuracy, protocolLM does not replace professional legal advice, official health department guidance, or licensed food safety consultants. Users are responsible for verifying all information with their local health department.
          </p>

          <h3 className="font-bold text-slate-900 mb-3">3. Accuracy Disclaimer</h3>
          <p className="mb-4">
            AI-generated responses may contain errors or outdated information. Always verify critical compliance decisions with official sources. protocolLM is not liable for any consequences arising from reliance on AI-generated content.
          </p>

          <h3 className="font-bold text-slate-900 mb-3">4. Subscription & Billing</h3>
          <p className="mb-4">
            By subscribing, you agree to a recurring monthly charge. Your 30-day free trial begins immediately and requires a valid payment method. You will be charged automatically after the trial ends unless you cancel. You may cancel at any time through your account settings.
          </p>

          <h3 className="font-bold text-slate-900 mb-3">5. Usage Limits</h3>
          <p className="mb-4">
            Your plan includes monthly limits on queries and image analyses. Excessive use beyond reasonable limits may result in temporary service restrictions. Limits reset at the start of each billing cycle.
          </p>

          <h3 className="font-bold text-slate-900 mb-3">6. Data & Privacy</h3>
          <p className="mb-4">
            We collect and store your queries and images to provide the service. We do not share your data with third parties except as required by law. Images uploaded for analysis are processed by our AI provider (Google Gemini) and are not stored permanently.
          </p>

          <h3 className="font-bold text-slate-900 mb-3">7. Limitation of Liability</h3>
          <p className="mb-4">
            protocolLM is provided "as is" without warranties of any kind. We are not responsible for any damages, fines, or legal issues arising from use of this service. Maximum liability is limited to the amount paid for the service in the past 12 months.
          </p>

          <h3 className="font-bold text-slate-900 mb-3">8. Changes to Terms</h3>
          <p className="mb-4">
            We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of new terms.
          </p>

          <h3 className="font-bold text-slate-900 mb-3">9. Contact</h3>
          <p className="mb-4">
            For questions about these terms, contact us at support@protocollm.com
          </p>

          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-600">
              Last updated: November 20, 2025
            </p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-xl transition"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            disabled={!hasScrolled}
            className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hasScrolled ? 'Accept & Continue' : 'Scroll to Accept'}
          </button>
        </div>
      </div>
    </div>
  )
}
