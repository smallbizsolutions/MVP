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
    
    // 2. Initialize Gemini
    if (!process.env.GEMINI_API_KEY) {
       throw new Error("GEMINI_API_KEY is missing in server variables")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    // FIX: Using 'gemini-1.5-flash-latest' to resolve the v1beta 404 error
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" })

    const lastUserMessage = messages[messages.length - 1].content

    // 3. Strict System Prompt (Washtenaw County Only)
    const systemPrompt = `
      You are "Protocol", the Washtenaw County Food Safety Assistant.
      
      CONTEXT DOCUMENT: ${docContext || "General FDA/Michigan Food Code"}
      
      RULES:
      1. Answer ONLY regarding food safety, health codes, and restaurant compliance.
      2. If asked about anything else, refuse politely.
      3. Reference the document **${docContext}** in bold when applicable.
      4. Be concise and professional.
    `

    // 4. Build Prompt
    let promptParts = [systemPrompt]
    
    messages.forEach(m => promptParts.push(`${m.role}: ${m.content}`))
    promptParts.push(`user: ${lastUserMessage}`)
    
    // 5. Handle Image
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

    // 6. Generate Response
    const result = await model.generateContent(promptParts)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ message: text })

  } catch (error) {
    console.error('Gemini API Error:', error)
    return NextResponse.json({ 
      error: `AI Error: ${error.message || "Unknown error"}` 
    }, { status: 500 })
  }
}
