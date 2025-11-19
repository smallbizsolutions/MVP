import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  // 1. Verify Session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { messages, image, docContext } = await request.json()
    
    // 2. Initialize Gemini (Using 1.5 Flash - Latest Stable Fast Vision Model)
    if (!process.env.GEMINI_API_KEY) {
       throw new Error("GEMINI_API_KEY is missing in server variables")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    // Note: 'gemini-1.5-flash' is the correct model name for fast multimodal.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const lastUserMessage = messages[messages.length - 1].content

    // 3. Strict System Prompt
    const systemPrompt = `
      You are "Protocol", a Food Safety Compliance Assistant for Washtenaw County, MI.
      
      CONTEXT DOCUMENT: ${docContext || "General FDA Code"}
      
      INSTRUCTIONS:
      1. Answer strictly based on Washtenaw County/FDA Food Code regulations.
      2. If asked about non-food topics, polite refuse.
      3. Cite the document name **${docContext}** in bold if relevant.
      4. Be concise, professional, and inspector-like.
    `

    // 4. Build Prompt
    let promptParts = [systemPrompt]
    
    // History
    messages.forEach(m => promptParts.push(`${m.role}: ${m.content}`))
    
    // Current Input
    promptParts.push(`user: ${lastUserMessage}`)
    
    // Image Handling
    if (image) {
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]
      
      promptParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      })
      promptParts.push("Analyze this image for food safety violations based on Washtenaw County codes.")
    }

    // 5. Generate Content
    const result = await model.generateContent(promptParts)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ message: text })

  } catch (error) {
    console.error('Gemini API Error:', error)
    
    // Return the ACTUAL error message to the frontend for easier debugging
    return NextResponse.json({ 
      error: `AI Error: ${error.message || "Unknown error"}` 
    }, { status: 500 })
  }
}
