import { NextResponse } from "next/server";
import { searchDocuments } from '../../../lib/searchDocs.js';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Request limits per plan
const REQUEST_LIMITS = {
  trial: 50,
  pro: 500,
  enterprise: -1 // unlimited
};

// Simple in-memory rate limiter (per IP, prevents abuse)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP

function checkRateLimit(identifier) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(identifier) || [];
  
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(identifier, recentRequests);
  
  if (Math.random() < 0.01) {
    const cutoff = now - RATE_LIMIT_WINDOW;
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const active = timestamps.filter(t => t > cutoff);
      if (active.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, active);
      }
    }
  }
  
  return true;
}

async function getUserPlanAndUsage(userId) {
  // Check for active subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, plan')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  
  // Get user profile for trial and usage tracking
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('trial_ends_at, requests_used')
    .eq('id', userId)
    .single();
  
  let plan = 'trial';
  let requestsUsed = profile?.requests_used || 0;
  
  if (sub && sub.status === 'active') {
    plan = sub.plan; // 'pro' or 'enterprise'
  } else if (profile?.trial_ends_at) {
    const trialEnd = new Date(profile.trial_ends_at);
    const now = new Date();
    if (now > trialEnd) {
      plan = 'expired';
    }
  }
  
  return { plan, requestsUsed };
}

async function incrementRequestCount(userId) {
  const { error } = await supabase.rpc('increment_requests', { user_id: userId });
  if (error) {
    console.error('Failed to increment request count:', error);
  }
}

export async function POST(req) {
  try {
    // Rate limiting by IP
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ 
        error: "Too many requests. Please wait a moment." 
      }, { status: 429 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    // Get user session from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user with Supabase
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user's plan and usage
    const { plan, requestsUsed } = await getUserPlanAndUsage(user.id);
    
    // Enforce request limits
    if (plan === 'expired') {
      return NextResponse.json({ 
        error: "Trial expired. Please upgrade to continue." 
      }, { status: 429 });
    }
    
    const limit = REQUEST_LIMITS[plan];
    if (limit !== -1 && requestsUsed >= limit) {
      return NextResponse.json({ 
        error: "Request limit reached. Please upgrade your plan." 
      }, { status: 429 });
    }

    const { message, image } = await req.json();

    // 1. SEARCH FOR RELEVANT DOCUMENT CHUNKS
    const query = message || "food safety inspection compliance";
    const relevantChunks = await searchDocuments(query, 5);
    
    let confidence = null;
    if (relevantChunks && relevantChunks.length > 0) {
      const topScore = relevantChunks[0].score;
      const avgTopThree = relevantChunks.slice(0, Math.min(3, relevantChunks.length))
        .reduce((sum, chunk) => sum + chunk.score, 0) / Math.min(3, relevantChunks.length);
      
      const scoreQuality = topScore;
      const scoreConsistency = avgTopThree / topScore;
      
      confidence = Math.round(scoreQuality * scoreConsistency * 100);
      
      if (confidence < 50) {
        confidence = null;
      }
    }
    
    let contextData = "";
    if (relevantChunks && relevantChunks.length > 0) {
      contextData = relevantChunks
        .map((chunk, idx) => 
          `--- RELEVANT EXCERPT ${idx + 1} (from ${chunk.source}, relevance: ${(chunk.score * 100).toFixed(1)}%) ---\n${chunk.text}`
        )
        .join('\n\n');
      
      console.log(`✅ Found ${relevantChunks.length} relevant chunks for user ${user.id}`);
    } else {
      contextData = "No specific document matches found. Provide general food safety guidance based on standard FDA and local health department regulations.";
    }

    // 2. BUILD PROMPT
    const systemInstruction = `You are Protocol, a food safety intelligence assistant for Washtenaw County, Michigan restaurants.

CORE INSTRUCTIONS:
${image ? `
IMAGE ANALYSIS MODE:
- Analyze the provided image for food safety violations based on the Context Documents
- Look for: Cross-contamination, improper storage, dirty surfaces, unsafe temperatures, or improper food handling
- If NO violations are found, say "This looks compliant based on visual inspection," but note you cannot measure temperature or verify all factors
` : `
TEXT CHAT MODE:
- Answer food safety questions based on the Context Documents
- Be conversational and helpful
- If the user is just greeting you or making small talk, respond naturally and offer to help with food safety questions
`}
- Cite your sources using document names (e.g., "According to FDA_FOOD_CODE_2022.pdf..." or "Based on Washtenaw County guidelines...")
- Use **Bold formatting** for key violations or critical information
- Be specific and reference relevant regulations from the context when available

RELEVANT CONTEXT DOCUMENTS:
${contextData}

USER ${image ? 'QUESTION' : 'MESSAGE'}: ${message || (image ? "Analyze this image for food safety compliance." : "Hello")}`;

    // 3. CONSTRUCT PAYLOAD
    const parts = [{ text: systemInstruction }];
    
    if (image) {
      const base64Data = image.includes(',') ? image.split(",")[1] : image;
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data
        }
      });
    }

    // 4. API REQUEST WITH RETRY
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    let response;
    let data;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          })
        });

        data = await response.json();

        if (response.ok) {
          break;
        }
        
        const errorMessage = data.error?.message || '';
        const isRetryable = response.status === 503 || 
                           response.status === 429 || 
                           errorMessage.includes('overloaded') ||
                           errorMessage.includes('quota');
        
        if (!isRetryable || attempt === maxRetries - 1) {
          throw new Error(errorMessage || "Google API Error");
        }
        
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
      } catch (err) {
        if (attempt === maxRetries - 1) {
          throw err;
        }
      }
    }

    if (!response.ok) {
      console.error("Google API Error:", data);
      throw new Error(data.error?.message || "Google API Error");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error("No response text from API");
    }

    // 5. INCREMENT REQUEST COUNT (only after successful response)
    await incrementRequestCount(user.id);

    return NextResponse.json({ 
      response: text,
      confidence: confidence
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    
    let userMessage = error.message;
    if (error.message.includes('overloaded') || error.message.includes('quota')) {
      userMessage = "The AI service is currently experiencing high demand. Please try again in a moment.";
    } else if (error.message.includes('API Key')) {
      userMessage = "Configuration error. Please contact support.";
    }
    
    return NextResponse.json({ 
      error: userMessage
    }, { status: 500 });
  }
}
