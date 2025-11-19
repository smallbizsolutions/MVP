'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// Files from your public/documents folder
const DOCUMENTS = [
  { title: 'FDA Food Code 2022', filename: 'FDA_FOOD_CODE_2022.pdf' },
  { title: 'Michigan Modified Food Code', filename: 'MI_MODIFIED_FOOD_CODE.pdf' },
  { title: 'Cooling Foods', filename: 'Cooling Foods.pdf' },
  { title: 'Cross Contamination', filename: 'Cross contamination.pdf' },
  { title: 'Enforcement Action', filename: 'Enforcement Action | Washtenaw County, MI.pdf' },
  { title: 'Food Allergy Info', filename: 'Food Allergy Information | Washtenaw County, MI.pdf' },
  { title: 'Food Inspection Program', filename: 'Food Service Inspection Program | Washtenaw County, MI.pdf' },
  { title: 'Foodborne Illness Guide', filename: 'Food borne illness guide.pdf' },
  { title: 'Norovirus Cleaning', filename: 'NorovirusEnvironCleaning.pdf' },
  { title: 'Admin Procedures', filename: 'PROCEDURES_FOR_THE_ADMINISTRATION_AND_ENFORCEMENT_OF_THE_WASHTENAW_COUNTY_FOOD_SERVICE_REGULATION.pdf' },
  { title: 'Cooking Temps Chart', filename: 'Summary Chart for Minimum Cooking Food Temperatures.pdf' },
  { title: 'USDA Safe Minimums', filename: 'USDA_Safe_Minimum_Internal_Temperature_Chart.pdf' },
  { title: 'Violation Types', filename: 'Violation Types | Washtenaw County, MI.pdf' },
  { title: 'MCL Act 92 (2000)', filename: 'mcl_act_92_of_2000.pdf' },
  { title: 'Emergency Action Plan', filename: 'retail_food_establishments_emergency_action_plan.pdf' }
]

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(DOCUMENTS[0])
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your Food Safety Assistant. Ask me anything about these documents.' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const messagesEndRef = useRef(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/')
      else setSession(session)
    }
    getSession()
  }, [supabase, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          docContext: selectedDoc.filename 
        }),
      })

      if (!response.ok) throw new Error('Network response was not ok')

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the AI right now." }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) return null

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      
      {/* SIDEBAR - DOCUMENT LIST */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-indigo-400">Protocol</h1>
          <p className="text-xs text-gray-500">Food Safety Intelligence</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {DOCUMENTS.map((doc, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDoc(doc)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                selectedDoc.filename === doc.filename 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div className="truncate">{doc.title}</div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button 
            onClick={handleSignOut}
            className="w-full py-2 text-sm text-gray-400 hover:text-white border border-gray-600 rounded hover:bg-gray-700 transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col md:flex-row h-full">
        
        {/* PDF VIEWER */}
        <div className="flex-1 bg-gray-100 h-full hidden md:block">
          <iframe 
            src={`/documents/${selectedDoc.filename}`} 
            className="w-full h-full" 
            title="Document Viewer"
          />
        </div>

        {/* CHAT INTERFACE */}
        <div className="w-full md:w-96 bg-gray-900 border-l border-gray-700 flex flex-col h-full">
          <div className="p-4 border-b border-gray-700 bg-gray-800">
            <h2 className="font-semibold">AI Assistant</h2>
            <p className="text-xs text-gray-400">Analyzing: {selectedDoc.title}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-gray-800 text-gray-200 rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 p-3 rounded-lg rounded-bl-none text-sm text-gray-400">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 bg-gray-800">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-gray-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-medium transition disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
