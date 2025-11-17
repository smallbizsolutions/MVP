import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Rate limiting cache (in production, use Redis)
const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

function checkRateLimit(userId) {
  const now = Date.now();
  const userKey = `rate_${userId}`;
  const userRequests = rateLimitCache.get(userKey) || [];
  
  // Clean old requests
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitCache.set(userKey, recentRequests);
  
  // Clean up old entries periodically
  if (rateLimitCache.size > 1000) {
    const cutoff = now - RATE_LIMIT_WINDOW;
    for (const [key, times] of rateLimitCache.entries()) {
      if (times.every(t => t < cutoff)) {
        rateLimitCache.delete(key);
      }
    }
  }
  
  return true;
}

export async function POST(request) {
  try {
    // Initialize Supabase client with cookies
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: { message: 'Rate limit exceeded. Please try again later.' } },
        { status: 429 }
      );
    }

    // Validate Anthropic API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not configured');
      return NextResponse.json(
        { error: { message: 'Service configuration error' } },
        { status: 500 }
      );
    }

    // Parse request body
    const { messages, documents } = await request.json();

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: { message: 'Invalid request: messages must be an array' } },
        { status: 400 }
      );
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { error: { message: 'Invalid request: messages cannot be empty' } },
        { status: 400 }
      );
    }

    // Validate message content length
    const totalLength = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    if (totalLength > 50000) {
      return NextResponse.json(
        { error: { message: 'Message content too long' } },
        { status: 400 }
      );
    }

    // Get user's business to verify access to documents
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: { message: 'Profile not found' } },
        { status: 404 }
      );
    }

    // Verify all documents belong to user's business
    if (documents && documents.length > 0) {
      const documentIds = documents.map(doc => doc.id).filter(Boolean);
      if (documentIds.length > 0) {
        const { data: verifiedDocs } = await supabase
          .from('documents')
          .select('id')
          .eq('business_id', profile.business_id)
          .in('id', documentIds);

        if (!verifiedDocs || verifiedDocs.length !== documentIds.length) {
          return NextResponse.json(
            { error: { message: 'Unauthorized access to documents' } },
            { status: 403 }
          );
        }
      }
    }

    // Build context from documents
    const context = documents && documents.length > 0
      ? documents.map(doc => `Document: ${doc.name}\n${doc.content}`).join('\n\n---\n\n')
      : 'No documents uploaded yet.';

    const systemPrompt = `You are an employee assistant for a retail/food service business. Your ONLY job is to answer questions based on the company documents provided below.

CRITICAL RULES:
1. ONLY answer based on the documents provided
2. If the answer is not in the documents, respond with: "I don't have that information in the company docs. Please ask your manager."
3. Be direct and concise - employees need quick answers
4. Reference which document your answer comes from
5. Never make up policies or procedures
6. If you're unsure, say you don't know

Company Documents:
${context}`;

    // Format messages for Anthropic API
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        system: systemPrompt,
        messages: anthropicMessages
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', errorData);
      
      return NextResponse.json(
        { error: { message: 'AI service error. Please try again.' } },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic API returned error:', data.error);
      throw new Error(data.error.message || 'AI service error');
    }

    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      throw new Error('Invalid response from AI service');
    }

    return NextResponse.json({
      choices: [{
        message: {
          content: data.content[0].text
        }
      }]
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}
