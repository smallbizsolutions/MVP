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
    const { messages, image } = await request.json()
    
    // 2. Initialize Gemini (Using 1.5 Flash as requested)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const lastUserMessage = messages[messages.length - 1].content

    // 3. Strict System Prompt
    const systemPrompt = `
      You are the "Protocol" Food Safety Assistant for Washtenaw County, MI.
      
      CORE RULES:
      1. You ONLY answer questions related to Food Safety, Health Codes, and Restaurant Compliance in Washtenaw County.
      2. If a user asks about anything else (sports, weather, coding, general life), politely REFUSE. Say: "I can only assist with Washtenaw County food safety regulations."
      3. If an image is provided, analyze it strictly for health code violations (e.g., cross-contamination, temperature issues, lack of labels, dirty surfaces).
      4. Reference specific codes (FDA Food Code 2022 / Michigan Modified) when possible.
      5. Keep answers professional, concise, and actionable.
    `

    // 4. Construct Parts for Gemini
    let promptParts = [systemPrompt, ...messages.map(m => `${m.role}: ${m.content}`), `user: ${lastUserMessage}`]
    
    // If image exists, add it to the prompt
    if (image) {
      // Image comes in as base64 data url: "data:image/jpeg;base64,..."
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

    // 5. Generate Response
    const result = await model.generateContent(promptParts)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ message: text })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate response', 
      details: error.message 
    }, { status: 500 })
  }
}
