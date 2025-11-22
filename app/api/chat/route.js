import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { VertexAI } from '@google-cloud/vertexai'
import { searchDocuments } from '@/lib/searchDocs'

export const dynamic = 'force-dynamic'

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const VALID_COUNTIES = ['washtenaw', 'wayne', 'oakland']

function getVertexCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const cleanJson = process.env.GOOGLE_CREDENTIALS_JSON
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
      return JSON.parse(cleanJson)
    } catch (e) {
      console.error('Failed to parse GOOGLE_CREDENTIALS_JSON', e)
    }
  }
  return null
}

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_subscribed, requests_used, images_used, county')
      .eq('id', session.user.id)
      .single()

    if (!profile?.is_subscribed) {
      return NextResponse.json({ error: 'Active subscription required.' }, { status: 403 })
    }

    const { messages, image, county } = await request.json()
    const userCounty = VALID_COUNTIES.includes(county || profile.county) ? (county || profile.county) : 'washtenaw'

    const credentials = getVertexCredentials()
    const project = process.env.GOOGLE_CLOUD_PROJECT_ID || credentials?.project_id
    
    if (!credentials || !project) {
      throw new Error('System configuration error: Google Cloud Credentials missing.')
    }

    const vertex_ai = new VertexAI({
      project: project,
      location: 'us-central1',
      googleAuthOptions: { credentials }
    })

    const model = 'gemini-2.5-flash'
    const lastUserMessage = messages[messages.length - 1].content || ""
    let contextText = ""
    let usedDocs = []

    // ENHANCED SEARCH STRATEGY
    if (lastUserMessage.trim().length > 0 || image) {
      try {
        let searchQueries = []
        
        if (image) {
          // For images, cast a WIDE net with multiple targeted searches
          searchQueries = [
            'equipment maintenance repair good working order',
            'physical facilities walls floors ceilings surfaces',
            'plumbing water supply sewage drainage',
            'sanitation cleaning procedures requirements',
            'food contact surfaces utensils equipment',
            lastUserMessage
          ]
        } else {
          // For text queries, use the question plus key safety terms
          searchQueries = [
            lastUserMessage,
            `${lastUserMessage} requirements regulations`,
            `${lastUserMessage} violations standards`
          ]
        }

        // Perform multiple searches and combine results
        const allResults = []
        for (const query of searchQueries) {
          if (query.trim()) {
            const results = await searchDocuments(query.trim(), 10, userCounty)
            allResults.push(...results)
          }
        }

        // Deduplicate by content similarity and take top 30 most relevant
        const uniqueResults = []
        const seenContent = new Set()
        
        for (const doc of allResults) {
          const contentKey = doc.text.substring(0, 100)
          if (!seenContent.has(contentKey) && doc.score > 0.3) {
            seenContent.add(contentKey)
            uniqueResults.push(doc)
          }
        }

        // Sort by relevance and take top 30
        const topResults = uniqueResults
          .sort((a, b) => b.score - a.score)
          .slice(0, 30)
        
        if (topResults.length > 0) {
          contextText = topResults.map((doc, idx) => `[DOCUMENT ${idx + 1}]
SOURCE: ${doc.source || 'Unknown'}
PAGE: ${doc.page || 'N/A'}
COUNTY: ${COUNTY_NAMES[userCounty]}
RELEVANCE: ${(doc.score * 100).toFixed(1)}%
CONTENT: ${doc.text}`).join("\n---\n\n")
          
          usedDocs = topResults.map(r => ({ 
            document: r.source, 
            pages: r.page,
            relevance: r.score 
          }))
        }
      } catch (searchErr) {
        console.error("Search failed:", searchErr)
      }
    }

    const countyName = COUNTY_NAMES[userCounty] || userCounty
    
    // CONVERSATIONAL + ACCURATE INSPECTOR-STYLE SYSTEM PROMPT
    const systemInstructionText = `You are ProtocolLM, a Food Safety Compliance Assistant for ${countyName}.

Think like an FDA-trained inspector, not a lawyer. Your job is to help restaurant operators understand and apply food safety regulations in real-world situations.

═══════════════════════════════════════════════════════════════════
HOW INSPECTORS ACTUALLY REASON (YOUR CORE METHODOLOGY):
═══════════════════════════════════════════════════════════════════

Real inspectors don't just quote codes - they apply PRINCIPLES to SITUATIONS using JUDGMENT.

**The Inspector's 3-Step Framework:**

1. **IDENTIFY THE HAZARD**
   What food safety risk does this create?
   - Cross-contamination risk?
   - Temperature abuse?
   - Pathogen growth?
   - Physical/chemical hazard?
   - Sanitation breakdown?

2. **FIND THE PRINCIPLE**
   What general regulatory principle applies?
   Example: "Missing floor tiles in a dry area may not be a violation; but missing tiles 
   where you use pressure hoses could introduce bacterial hazards."
   
   The PRINCIPLE: "Surfaces must prevent contamination"
   APPLIED TO: Specific location and use case

3. **COMMUNICATE CONVERSATIONALLY**
   Don't sound robotic. Explain your reasoning like a helpful inspector would:
   ✓ "Here's what I see..."
   ✓ "The concern is..."
   ✓ "The regulation says [citation]..."
   ✓ "So in your situation..."
   ✓ "I'd recommend..."

═══════════════════════════════════════════════════════════════════
RESPONSE STYLE REQUIREMENTS:
═══════════════════════════════════════════════════════════════════

**BE CONVERSATIONAL:**
- Use natural language: "Let me explain", "Here's the thing", "Good question"
- Break down complex regulations into plain English
- Use examples: "Think of it like this..."
- Be helpful, not preachy

**BE PRACTICAL:**
- Focus on WHY rules exist (food safety), not just WHAT they say
- Offer actionable solutions: "To fix this, you could..."
- Acknowledge real-world constraints: "I know that's not always easy, but..."

**BE ACCURATE:**
- Every claim needs a citation: **[Document Name, Page X]**
- When applying general principles, explain your reasoning explicitly
- If documents don't address something, say so clearly

═══════════════════════════════════════════════════════════════════
THE REASONING FRAMEWORK (USE THIS FOR EVERY RESPONSE):
═══════════════════════════════════════════════════════════════════

**For Specific Questions (temp, time, procedures):**
→ Find the exact regulation
→ Quote it with citation
→ Explain how to apply it
→ Add practical tips

Example:
"Good question about reheating soup. According to **[FDA_FOOD_CODE_2022, Page 56]**, 
all TCS foods must be reheated to 165°F for 15 seconds. This kills any bacteria that 
might have grown during storage. Use a calibrated thermometer to check the internal 
temp. Pro tip: Heat it rapidly - getting through the 'danger zone' (41°F-135°F) quickly 
is important."

**For Image Analysis (equipment, facilities):**
→ Describe what you observe
→ Identify potential food safety hazards
→ Apply general maintenance/sanitation principles
→ Cite the relevant standard
→ Make specific recommendations

Example:
"I can see what looks like a crack in the wall tile near your prep sink. Let me explain 
why this matters. According to **[FDA_FOOD_CODE_2022, Page 123]**, 'Physical facilities 
shall be maintained in good repair.' Here's the concern: cracks can harbor bacteria, 
moisture, and pests - especially in areas that get wet. In your case, being near the 
prep sink makes this a higher risk for contamination. I'd recommend repairing this 
during your next maintenance window and keeping the area extra clean until then."

**For Vague/General Questions:**
→ Ask clarifying questions OR
→ Address the most common scenarios
→ Provide multiple possibilities if needed

Example:
"Equipment maintenance is a broad topic! Are you asking about cleaning procedures, 
repair requirements, or something specific? Let me cover the basics. According to 
**[MI_MODIFIED_FOOD_CODE, Page 78]**, all equipment must be 'kept in good repair and 
proper working condition.' This means if something breaks - a door gasket, a thermometer, 
a drain - it needs to be fixed promptly because broken equipment can lead to temperature 
problems, contamination, or sanitation issues."

**For Scenarios Not Directly Addressed:**
→ Be honest about what's in the documents
→ Apply related principles with clear reasoning
→ Recommend verification

Example:
"I don't see specific guidance about [X] in the ${countyName} documents I have access to. 
However, based on the general principle in **[Document, Page]** that [principle], this 
would likely apply to your situation because [reasoning]. That said, I'd strongly 
recommend checking with your local health inspector to confirm, since this is an area 
where specific interpretation matters."

═══════════════════════════════════════════════════════════════════
CRITICAL ACCURACY RULES:
═══════════════════════════════════════════════════════════════════

**ALWAYS cite when you:**
- Give specific numbers (temperatures, times, concentrations)
- Quote regulations directly
- State what's required, prohibited, or allowed
- Reference inspection criteria

**CLEARLY flag when you're:**
- Applying a general principle to a specific case
- Making reasonable inferences
- Giving recommendations vs. requirements
- Unsure or lacking specific guidance

**NEVER:**
- Invent section numbers, temperatures, or time limits
- Claim certainty when documents don't provide clear guidance
- Use phrases like "the code requires" without a citation
- Make up procedures not found in the documents

═══════════════════════════════════════════════════════════════════
UNCERTAINTY ACKNOWLEDGMENT:
═══════════════════════════════════════════════════════════════════

When you're not certain, use these phrases:
- "I don't see specific guidance on this in the documents"
- "Based on related principles..."
- "This would likely apply because..."
- "I'd recommend verifying this with your inspector"
- "The documents don't specifically mention [X], but..."
- "This is an area where interpretation matters"

Being honest about limits builds trust. Restaurants need accuracy, not false confidence.

═══════════════════════════════════════════════════════════════════
RETRIEVED CONTEXT (Your Knowledge Base):
═══════════════════════════════════════════════════════════════════

${contextText || 'WARNING: No relevant documents retrieved. You MUST inform the user that you need more specific information or cannot find regulations on their topic.'}

═══════════════════════════════════════════════════════════════════
REMEMBER:
═══════════════════════════════════════════════════════════════════

You're not just a search engine - you're a knowledgeable assistant who understands 
HOW regulations work and WHY they exist. Help users understand the principles behind 
the rules so they can make good decisions even in situations you haven't explicitly 
discussed.

But never sacrifice accuracy for helpfulness. "I don't know" is a valid and important 
answer when documents don't provide clear guidance.`

    const generativeModel = vertex_ai.getGenerativeModel({
      model: model,
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      generationConfig: {
        temperature: 0.1,  // Low creativity - reduces hallucination
        topP: 0.8,         // More focused sampling
        topK: 20           // Reduced token diversity
      }
    })

    let userMessageParts = []
    
    if (messages.length > 1) {
      const historyText = messages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n')
      userMessageParts.push({ text: `CONVERSATION HISTORY:\n${historyText}\n\n` })
    }

    userMessageParts.push({ text: `USER QUESTION: ${lastUserMessage}` })

    if (image && image.includes('base64,')) {
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]
      
      userMessageParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      })
      
      userMessageParts.push({ 
        text: `INSTRUCTIONS FOR IMAGE ANALYSIS:
1. First, describe what you see in the image objectively
2. Identify potential food safety hazards based ONLY on regulations in RETRIEVED CONTEXT
3. For each issue, cite the specific regulation
4. If you cannot find relevant regulations for what you see, explicitly state that
5. Always recommend verification with health inspector for serious concerns

Analyze this image against the sanitation, equipment maintenance, and physical facility standards in the RETRIEVED CONTEXT.` 
      })
    }

    const requestPayload = {
      contents: [{ role: 'user', parts: userMessageParts }]
    }

    const result = await generativeModel.generateContent(requestPayload)
    const response = await result.response
    const text = response.candidates[0].content.parts[0].text

    // VALIDATION CHECK: Ensure response contains citations for factual claims
    const hasCitations = /\*\*\[.*?,\s*Page/.test(text)
    const makesFactualClaims = /violat|requir|must|shall|prohibit|standard/i.test(text)
    
    if (makesFactualClaims && !hasCitations && !text.includes('cannot find') && !text.includes('do not directly address')) {
      console.warn('⚠️ Response lacks required citations:', text.substring(0, 200))
    }

    const updates = { requests_used: (profile.requests_used || 0) + 1 }
    if (image) updates.images_used = (profile.images_used || 0) + 1
    await supabase.from('user_profiles').update(updates).eq('id', session.user.id)

    const citations = []
    const citationRegex = /\*\*\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]\*\*/g
    let match
    while ((match = citationRegex.exec(text)) !== null) {
      citations.push({ document: match[1], pages: match[2], county: userCounty })
    }

    return NextResponse.json({ 
      message: text,
      county: userCounty,
      citations: citations,
      documentsSearched: usedDocs.length,
      contextQuality: usedDocs.length > 0 ? 'good' : 'insufficient'
    })

  } catch (error) {
    console.error('Vertex AI Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Service error occurred.' 
    }, { status: 500 })
  }
}
