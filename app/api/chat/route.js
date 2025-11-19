import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // ✅ CHECK SUBSCRIPTION STATUS
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_subscribed, requests_used')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Failed to verify subscription' }, { status: 500 })
    }

    if (!profile?.is_subscribed) {
      return NextResponse.json({ 
        error: 'Active subscription required. Please visit the pricing page to subscribe.' 
      }, { status: 403 })
    }

    // ✅ CHECK REQUEST LIMITS
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', session.user.id)
      .single()

    // Define monthly limits per plan
    const limits = {
      pro: 1000,
      enterprise: 10000
    }

    const userLimit = limits[subscription?.plan] || 1000

    if (profile.requests_used >= userLimit) {
      return NextResponse.json({ 
        error: `Monthly limit of ${userLimit} requests reached. Resets on your next billing date.` 
      }, { status: 429 })
    }

    // ✅ PROCEED WITH CHAT REQUEST
    const { messages, image } = await request.json()
    
    if (!process.env.GEMINI_API_KEY) {
       throw new Error("GEMINI_API_KEY is missing")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    const chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" })

    const lastUserMessage = messages[messages.length - 1].content

    let contextText = ""
    let usedDocs = []

    // RAG LOGIC (Only run text search if there is text input)
    if (lastUserMessage && lastUserMessage.trim().length > 0) {
      
      // Generate Embedding for the user's question
      const embeddingResult = await embeddingModel.embedContent(lastUserMessage)
      const embedding = embeddingResult.embedding.values

      // Search Supabase (The "Brain")
      const { data: documents, error: searchError } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5
      })

      if (searchError) {
        console.error('Vector Search Error:', searchError)
      }

      // Build Context from matches
      if (documents && documents.length > 0) {
        contextText = documents.map(doc => {
          if (doc.metadata?.source && !usedDocs.includes(doc.metadata.source)) {
            usedDocs.push(doc.metadata.source)
          }
          return `SOURCE: ${doc.metadata?.source || 'Unknown Doc'}\nCONTENT: ${doc.content}`
        }).join("\n\n---\n\n")
      }
    }

    // Construct System Prompt
    const systemPrompt = `
      You are "Protocol", the Washtenaw County Food Safety Assistant.
      
      INSTRUCTIONS:
      1. You have access to the following retrieved context from the official regulations.
      2. Answer the user's question strictly based on this context and general FDA/Michigan Food Code knowledge.
      3. If the context contains the answer, CITE the source document name in **bold**.
      4. If the user uploads an image, analyze it for violations.
      
      RETRIEVED CONTEXT:
      ${contextText || "No specific document matches found. Rely on general Washtenaw County/FDA code knowledge."}
    `

    // Build Conversation for Gemini
    let promptParts = [systemPrompt]
    
    messages.slice(0, -1).forEach(m => promptParts.push(`${m.role}: ${m.content}`))
    promptParts.push(`user: ${lastUserMessage}`)
    
    // Handle Image (Vision)
    if (image) {
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]
      
      promptParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      })
      promptParts.push("Analyze this image for food safety violations.")
    }

    // Generate Response
    const result = await chatModel.generateContent(promptParts)
    const response = await result.response
    const text = response.text()

    // ✅ INCREMENT REQUEST COUNTER
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        requests_used: profile.requests_used + 1 
      })
      .eq('id', session.user.id)

    if (updateError) {
      console.error('Failed to update request counter:', updateError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ message: text })

  } catch (error) {
    console.error('Gemini API Error:', error)
    return NextResponse.json({ 
      error: `AI Error: ${error.message}` 
    }, { status: 500 })
  }
}
