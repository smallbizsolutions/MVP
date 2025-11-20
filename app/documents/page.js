'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// County-specific document configurations
const COUNTY_DOCUMENTS = {
  washtenaw: [
    { title: 'FDA Food Code 2022', filename: 'FDA_FOOD_CODE_2022.pdf' },
    { title: 'MI Modified Food Code', filename: 'MI_MODIFIED_FOOD_CODE.pdf' },
    { title: 'Cooling Foods', filename: 'Cooling Foods.pdf' },
    { title: 'Cross Contamination', filename: 'Cross contamination.pdf' },
    { title: 'Enforcement Action Guide', filename: 'Enforcement Action | Washtenaw County, MI.pdf' },
    { title: 'Food Allergy Info', filename: 'Food Allergy Information | Washtenaw County, MI.pdf' },
    { title: 'Inspection Program', filename: 'Food Service Inspection Program | Washtenaw County, MI.pdf' },
    { title: 'Foodborne Illness Guide', filename: 'Food borne illness guide.pdf' },
    { title: 'Norovirus Cleaning', filename: 'NorovirusEnvironCleaning.pdf' },
    { title: 'Admin Procedures', filename: 'PROCEDURES_FOR_THE_ADMINISTRATION_AND_ENFORCEMENT_OF_THE_WASHTENAW_COUNTY_FOOD_SERVICE_REGULATION.pdf' },
    { title: 'Cooking Temps Chart', filename: 'Summary Chart for Minimum Cooking Food Temperatures.pdf' },
    { title: 'USDA Safe Minimums', filename: 'USDA_Safe_Minimum_Internal_Temperature_Chart.pdf' },
    { title: 'Violation Types', filename: 'Violation Types | Washtenaw County, MI.pdf' },
    { title: 'MCL Act 92 (2000)', filename: 'mcl_act_92_of_2000.pdf' },
    { title: 'Emergency Action Plan', filename: 'retail_food_establishments_emergency_action_plan.pdf' }
  ],
  wayne: [
    { title: '3 Comp Sink', filename: '3comp_sink.pdf' },
    { title: '5 Keys to Safer Food', filename: '5keys_to_safer_food.pdf' },
    { title: 'FDA Food Code 2022', filename: 'FDA_FOOD_CODE_2022.pdf' },
    { title: 'MI Modified Food Code', filename: 'MI_MODIFIED_FOOD_CODE.pdf' },
    { title: 'USDA Safe Minimum Temps', filename: 'USDA_Safe_Minimum_Internal_Temperature_Chart.pdf' },
    { title: 'Calibrate Thermometer', filename: 'calibrate_thermometer.pdf' },
    { title: 'Clean & Sanitizing', filename: 'clean_sanitizing.pdf' },
    { title: 'Consumer Advisory 2012', filename: 'consumer_advisory-updated_2012.pdf' },
    { title: 'Contamination', filename: 'contamination.pdf' },
    { title: 'Cooking Temps', filename: 'cook_temps.pdf' },
    { title: 'Cooling', filename: 'cooling.pdf' },
    { title: 'Date Marking', filename: 'date_marking.pdf' },
    { title: 'Employee Health Poster', filename: 'employeehealthposter.pdf' },
    { title: 'Food Allergen Info', filename: 'foodallergeninformation.pdf' },
    { title: 'General Norovirus Fact Sheet', filename: 'general_noro_fact_sheet.pdf' },
    { title: 'Gloves USDA', filename: 'gloves_usda.pdf' },
    { title: 'Guide for Wiping Cloths', filename: 'guideforuseofwipingcloths.doc' },
    { title: 'Holding Temps', filename: 'hold_temps.pdf' },
    { title: 'Non-Food Equipment', filename: 'nfsem_equip.pdf' },
    { title: 'Non-Food Thawing', filename: 'nfsem_thaw.pdf' },
    { title: 'Non-Food Trash', filename: 'nfsem_trash.pdf' },
    { title: 'Norovirus for Food Handlers', filename: 'norovirus-foodhandlers.pdf' },
    { title: 'Norovirus Cleaning Guidelines', filename: 'noroviruscleani nguidelines.pdf' },
    { title: 'Raw Meat Storage', filename: 'raw_meat_storage.pdf' },
    { title: 'Time as Public Health Control', filename: 'time_as_a_public_health_control.pdf' }
  ],
  oakland: [
    { title: 'FDA Food Code 2022', filename: 'FDA_FOOD_CODE_2022.pdf' },
    { title: 'MI Modified Food Code', filename: 'MI_MODIFIED_FOOD_CODE.pdf' }
  ]
}

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState(null)
  const [userCounty, setUserCounty] = useState('washtenaw')
  const [showCountySelector, setShowCountySelector] = useState(false)
  
  const [messages, setMessages] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sidebarView, setSidebarView] = useState('documents') // 'documents' or 'history'
  const [viewingPdf, setViewingPdf] = useState(null)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  // Initialize welcome message with county context
  useEffect(() => {
    if (userCounty && messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          content: `Welcome to protocolLM for ${COUNTY_NAMES[userCounty]}. Upload a photo or ask a question about your local food safety regulations. I'll cite specific documents and pages in my responses.`,
          citations: []
        }
      ])
    }
  }, [userCounty])

  // Load chat history from localStorage
  useEffect(() => {
    if (session) {
      const stored = localStorage.getItem(`chat_history_${session.user.id}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setChatHistory(parsed)
        } catch (e) {
          console.error('Failed to parse chat history:', e)
        }
      }
    }
  }, [session])

  // Save current chat to history
  const saveCurrentChat = () => {
    if (!session || messages.length <= 1) return // Don't save if only welcome message

    const chatTitle = messages.find(m => m.role === 'user')?.content.substring(0, 50) || 'New Chat'
    const chatData = {
      id: currentChatId || Date.now().toString(),
      title: chatTitle,
      messages: messages,
      timestamp: Date.now(),
      county: userCounty
    }

    const existingIndex = chatHistory.findIndex(c => c.id === chatData.id)
    let newHistory

    if (existingIndex >= 0) {
      newHistory = [...chatHistory]
      newHistory[existingIndex] = chatData
    } else {
      newHistory = [chatData, ...chatHistory].slice(0, 50) // Keep last 50 chats
    }

    setChatHistory(newHistory)
    localStorage.setItem(`chat_history_${session.user.id}`, JSON.stringify(newHistory))
    setCurrentChatId(chatData.id)
  }

  // Load a chat from history
  const loadChat = (chat) => {
    setMessages(chat.messages)
    setUserCounty(chat.county)
    setCurrentChatId(chat.id)
    setIsSidebarOpen(false)
  }

  // Start a new chat
  const startNewChat = () => {
    saveCurrentChat() // Save current before starting new
    setMessages([
      { 
        role: 'assistant', 
        content: `Welcome to protocolLM for ${COUNTY_NAMES[userCounty]}. Upload a photo or ask a question about your local food safety regulations. I'll cite specific documents and pages in my responses.`,
        citations: []
      }
    ])
    setCurrentChatId(null)
    setIsSidebarOpen(false)
  }

  // Delete a chat
  const deleteChat = (chatId, e) => {
    e.stopPropagation()
    const newHistory = chatHistory.filter(c => c.id !== chatId)
    setChatHistory(newHistory)
    localStorage.setItem(`chat_history_${session.user.id}`, JSON.stringify(newHistory))
    
    if (currentChatId === chatId) {
      startNewChat()
    }
  }

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { 
        router.push('/')
        return 
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_subscribed, requests_used, images_used, county')
        .eq('id', session.user.id)
        .single()

      if (!profile?.is_subscribed) { 
        router.push('/pricing')
        return 
      }

      setUserCounty(profile.county || 'washtenaw')

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status, trial_end, current_period_end')
        .eq('user_id', session.user.id)
        .single()

      const limits = subscription?.plan === 'enterprise' 
        ? { requests: 5000, images: 500 }
        : { requests: 500, images: 50 }

      setSession(session)
      setSubscriptionInfo({
        plan: subscription?.plan || 'pro',
        status: subscription?.status || 'active',
        requestsUsed: profile?.requests_used || 0,
        imagesUsed: profile?.images_used || 0,
        requestLimit: limits.requests,
        imageLimit: limits.images,
        trialEnd: subscription?.trial_end ? new Date(subscription.trial_end) : null,
        currentPeriodEnd: subscription?.current_period_end ? new Date(subscription.current_period_end) : null
      })
    }
    checkAccess()
  }, [supabase, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleCountyChange = async (newCounty) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ county: newCounty })
        .eq('id', session.user.id)

      if (error) throw error

      setUserCounty(newCounty)
      setShowCountySelector(false)
      
      setMessages([
        { 
          role: 'assistant', 
          content: `County updated to ${COUNTY_NAMES[newCounty]}. I now have access to ${COUNTY_DOCUMENTS[newCounty].length} ${COUNTY_NAMES[newCounty]}-specific documents. Ask me anything about your local food safety regulations, and I'll cite specific sources and page numbers.`,
          citations: []
        }
      ])
    } catch (error) {
      console.error('Error updating county:', error)
      alert('Failed to update county. Please try again.')
    }
  }

  const handleCitationClick = (citation) => {
    const doc = COUNTY_DOCUMENTS[userCounty].find(d => 
      d.title.toLowerCase().includes(citation.document.toLowerCase()) ||
      citation.document.toLowerCase().includes(d.title.toLowerCase())
    )
    
    if (doc) {
      const pageMatch = citation.pages.match(/\d+/)
      const pageNum = pageMatch ? parseInt(pageMatch[0]) : 1
      setViewingPdf({ ...doc, targetPage: pageNum })
    } else {
      alert(`Document "${citation.document}" not found in ${COUNTY_NAMES[userCounty]}`)
    }
  }

  const renderMessageContent = (msg) => {
    if (!msg.citations || msg.citations.length === 0) {
      return msg.content
    }

    const parts = []
    let lastIndex = 0
    const citationRegex = /\*\*\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]\*\*/g
    let match

    while ((match = citationRegex.exec(msg.content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: msg.content.slice(lastIndex, match.index)
        })
      }

      parts.push({
        type: 'citation',
        document: match[1],
        pages: match[2],
        fullMatch: match[0]
      })

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < msg.content.length) {
      parts.push({
        type: 'text',
        content: msg.content.slice(lastIndex)
      })
    }

    return (
      <>
        {parts.map((part, idx) => {
          if (part.type === 'text') {
            return <span key={idx}>{part.content}</span>
          } else {
            return (
              <button
                key={idx}
                onClick={() => handleCitationClick({ document: part.document, pages: part.pages })}
                className="inline-flex items-center bg-slate-200 hover:bg-slate-300 text-slate-900 px-2 py-1 rounded text-xs font-bold transition-colors mx-1 cursor-pointer"
                title={`Click to view ${part.document}, Page ${part.pages}`}
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {part.document}, Page {part.pages}
              </button>
            )
          }
        })}
      </>
    )
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() && !image) return

    const userMessage = { role: 'user', content: input, image: image, citations: [] }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setImage(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, { role: 'user', content: input }], 
          image: userMessage.image,
          county: userCounty
        }),
      })

      const data = await response.json()
      
      if (response.status === 403) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '⚠️ ' + data.error + '\n\nPlease visit the pricing page to subscribe.',
          citations: []
        }])
        setTimeout(() => router.push('/pricing'), 3000)
        return
      }

      if (response.status === 429) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '⚠️ ' + data.error,
          citations: []
        }])
        return
      }

      if (data.error) throw new Error(data.error)

      setMessages(prev => {
        const newMessages = [...prev, { 
          role: 'assistant', 
          content: data.message,
          citations: data.citations || []
        }]
        
        // Auto-save after successful response
        setTimeout(() => saveCurrentChat(), 500)
        
        return newMessages
      })
      
      if (subscriptionInfo) {
        setSubscriptionInfo(prev => ({
          ...prev,
          requestsUsed: prev.requestsUsed + 1,
          imagesUsed: userMessage.image ? prev.imagesUsed + 1 : prev.imagesUsed
        }))
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}`,
        citations: []
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setImage(reader.result)
      reader.readAsDataURL(file)
    }
  }

  if (!session) return null

  const currentDocuments = COUNTY_DOCUMENTS[userCounty] || COUNTY_DOCUMENTS.washtenaw

  return (
    <div className="fixed inset-0 flex bg-white text-slate-900 overflow-hidden">
      
      {/* County Selector Modal */}
      {showCountySelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Select Your County</h3>
              <button onClick={() => setShowCountySelector(false)} className="text-slate-400 hover:text-slate-900 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-8 leading-relaxed">Choose the county where your restaurant operates to access local regulations and compliance documents.</p>
            
            <div className="space-y-3">
              {Object.entries(COUNTY_NAMES).map(([key, name]) => (
                <button
                  key={key}
                  onClick={() => handleCountyChange(key)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                    userCounty === key 
                      ? 'border-slate-900 bg-slate-50 shadow-md' 
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">{name}</span>
                      <span className="text-xs text-slate-500 mt-1 block">
                        {COUNTY_DOCUMENTS[key].length} documents available
                      </span>
                    </div>
                    {userCounty === key && (
                      <svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PDF Modal */}
      {viewingPdf && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="flex justify-between items-center p-5 bg-white border-b border-slate-200 shadow-sm">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{viewingPdf.title}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {COUNTY_NAMES[userCounty]}
                {viewingPdf.targetPage && ` • Opening at Page ${viewingPdf.targetPage}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.open(`/documents/${userCounty}/${viewingPdf.filename}#page=${viewingPdf.targetPage || 1}`, '_blank')}
                className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm transition font-semibold"
              >
                Open Full PDF
              </button>
              <button onClick={() => setViewingPdf(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-5 py-2.5 rounded-lg text-sm transition font-semibold">Close</button>
            </div>
          </div>
          
          <div className="flex-1 w-full relative bg-slate-50 overflow-hidden">
            <iframe 
              src={`/documents/${userCounty}/${viewingPdf.filename}#page=${viewingPdf.targetPage || 1}&view=FitH`}
              className="absolute inset-0 w-full h-full border-none" 
              title="Document Viewer"
            />
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              <strong>Tip:</strong> If you can't scroll through all pages, click "Open Full PDF" above to view the complete document in a new tab.
            </p>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-800 p-4 flex justify-between items-center z-50 shadow-lg">
        <div>
          <span className="font-bold text-white tracking-tight text-lg" style={{ letterSpacing: '-0.03em' }}>
            protocol<span className="font-black">LM</span>
          </span>
          <div className="text-xs text-slate-300 mt-0.5">{COUNTY_NAMES[userCounty]}</div>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out w-80 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col z-40 shadow-2xl`}>
        
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 text-white/80 hover:text-white p-2 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <div className="p-6 hidden md:block border-b border-white/10">
          <h1 className="text-xl font-bold text-white tracking-tight mb-1" style={{ letterSpacing: '-0.03em' }}>
            protocol<span className="font-black">LM</span>
          </h1>
          <div className="text-xs text-slate-300 font-medium">Michigan Restaurant Compliance</div>
          
          <button 
            onClick={() => setShowCountySelector(true)}
            className="mt-4 w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl p-4 transition text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-300 mb-1 font-medium">Current County</div>
                <div className="text-sm font-semibold text-white">{COUNTY_NAMES[userCounty]}</div>
                <div className="text-xs text-slate-300 mt-1">{currentDocuments.length} documents</div>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </div>
          </button>
          
          {subscriptionInfo && (
            <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wide">{subscriptionInfo.plan}</span>
                {subscriptionInfo.trialEnd && new Date() < subscriptionInfo.trialEnd && (
                  <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-md font-semibold">TRIAL</span>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                    <span>Queries</span>
                    <span className="font-semibold">{subscriptionInfo.requestsUsed}/{subscriptionInfo.requestLimit}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((subscriptionInfo.requestsUsed / subscriptionInfo.requestLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                    <span>Image analyses</span>
                    <span className="font-semibold">{subscriptionInfo.imagesUsed}/{subscriptionInfo.imageLimit}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((subscriptionInfo.imagesUsed / subscriptionInfo.imageLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* New Chat Button */}
          <button
            onClick={startNewChat}
            className="mt-4 w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl p-3 transition text-sm font-semibold text-white flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 mt-16 md:mt-0">
          <button
            onClick={() => setSidebarView('history')}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              sidebarView === 'history'
                ? 'text-white border-b-2 border-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Chat History
          </button>
          <button
            onClick={() => setSidebarView('documents')}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              sidebarView === 'documents'
                ? 'text-white border-b-2 border-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Documents
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {sidebarView === 'history' ? (
            // Chat History View
            <div className="space-y-2">
              {chatHistory.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-sm text-slate-400">No chat history yet</p>
                  <p className="text-xs text-slate-500 mt-1">Your conversations will appear here</p>
                </div>
              ) : (
                chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => loadChat(chat)}
                    className={`group p-3 rounded-xl cursor-pointer transition-all ${
                      currentChatId === chat.id
                        ? 'bg-white/20 border border-white/30'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm font-medium text-white truncate mb-1">
                          {chat.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{COUNTY_NAMES[chat.county]}</span>
                          <span>•</span>
                          <span>{new Date(chat.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition p-1"
                        title="Delete chat"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Documents View
            <>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 px-2">
                {COUNTY_NAMES[userCounty]} Documents ({currentDocuments.length})
              </div>
              <div className="space-y-1">
                {currentDocuments.map((doc, idx) => (
                  <button 
                    key={idx} 
                    className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm hover:bg-white/10 transition-all duration-200 text-left group" 
                    onClick={() => { setViewingPdf(doc); setIsSidebarOpen(false); }}
                  >
                     <div className="flex items-center overflow-hidden flex-1 min-w-0">
                        <svg className="w-4 h-4 mr-3 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="truncate text-white group-hover:text-slate-50 font-medium">{doc.title}</span>
                     </div>
                     <span className="text-xs text-slate-300 ml-2 opacity-100 flex-shrink-0">View</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} 
            className="w-full py-3 text-sm text-white hover:text-slate-50 border border-white/30 rounded-xl hover:bg-white/10 transition font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>

      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-white">
        
        <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm mt-16 md:mt-0 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 text-base" style={{ letterSpacing: '-0.01em' }}>Compliance Assistant</h2>
            <p className="text-xs text-slate-500 font-medium">Citing {COUNTY_NAMES[userCounty]} documents with page numbers</p>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowCountySelector(true)}
              className="md:hidden bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            >
              Switch County
            </button>
            <span className="text-xs text-slate-400 font-semibold hidden md:block">GEMINI 2.0</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" style={{ minHeight: 0 }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                {msg.image && <img src={msg.image} alt="Analysis Target" className="max-w-[250px] rounded-xl border border-slate-200 shadow-md" />}
                <div className={`p-4 rounded-xl text-sm md:text-base leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-50 text-slate-900 border border-slate-200'}`}>
                  {msg.role === 'assistant' ? renderMessageContent(msg) : msg.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="loading-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 bg-white border-t border-slate-200 pb-safe flex-shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end gap-2 bg-white p-2 rounded-xl border-2 border-slate-200 focus-within:border-slate-900 transition shadow-sm">
            <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }}} 
              placeholder={image ? "Image attached. Add context..." : `Ask about ${COUNTY_NAMES[userCounty]} regulations...`} 
              className="flex-1 bg-transparent text-slate-900 text-sm md:text-base max-h-32 py-3 focus:outline-none resize-none" 
              rows="1"
            />
            <button type="submit" disabled={isLoading || (!input.trim() && !image)} className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 shadow-md hover:shadow-lg">
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
            {image && (
              <div className="absolute -top-14 left-0 bg-white border-2 border-slate-300 px-4 py-2 rounded-xl flex items-center shadow-lg">
                <span className="text-xs text-slate-700 font-bold mr-2">IMAGE READY</span>
                <button onClick={() => setImage(null)} className="text-slate-400 hover:text-slate-900 ml-2 font-bold">✕</button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
