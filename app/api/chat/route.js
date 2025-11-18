import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkUsageLimits, incrementApiCall, logApiUsage } from '../../../lib/usageLimits';

export const maxDuration = 60;

if (!process.env.GEMINI_API_KEY) {
  console.error('CRITICAL: Missing GEMINI_API_KEY environment variable');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('CRITICAL: Missing Supabase environment variables');
}

export async function POST(request) {
  const startTime = Date.now();
  let userId, businessId;

  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500 }
      );
    }

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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = user.id;

    // Check usage limits
    const limits = await checkUsageLimits(userId);
    
    if (!limits.can_use_api) {
      return NextResponse.json({
        error: 'API call limit reached',
        details: {
          used: limits.api_calls_used,
          limit: limits.api_calls_limit,
          message: `You've reached your monthly limit of ${limits.api_calls_limit} API calls. Upgrade to Pro for 1,000 calls/month or Enterprise for unlimited.`
        }
      }, { status: 429 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.business_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    businessId = profile.business_id;

    const body = await request.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 });
    }

    const userQuery = lastMessage.content;

    if (!userQuery || userQuery.trim().length === 0) {
      return NextResponse.json({ error: 'Empty message content' }, { status: 400 });
    }

    if (userQuery.length > 10000) {
      return NextResponse.json({ error: 'Message too long (max 10000 characters)' }, { status: 400 });
    }

    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('name, content')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
    }

    let context = '';
    if (documents && documents.length > 0) {
      context = 'Here are relevant documents from your knowledge base:\n\n';
      documents.forEach((doc, idx) => {
        const truncatedContent = doc.content.substring(0, 2000);
        context += `[Document ${idx + 1}: ${doc.name}]\n${truncatedContent}\n\n`;
      });
      context += 'Based on the above documents, please answer the following question:\n\n';
    }

    // Convert messages to Gemini format
    const geminiContents = [];
    
    for (const msg of messages) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      geminiContents.push({
        role: role,
        parts: [{ text: msg.content }]
      });
    }

    // Add context to the last user message
    if (context && geminiContents.length > 0) {
      const lastIndex = geminiContents.length - 1;
      if (geminiContents[lastIndex].role === 'user') {
        geminiContents[lastIndex].parts[0].text = context + geminiContents[lastIndex].parts[0].text;
      }
    }

    let response;
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
              }
            }),
          }
        );

        if (response.ok) {
          break;
        }

        const errorData = await response.json();
        lastError = new Error(errorData.error?.message || `API error: ${response.status}`);
        
        if (response.status >= 400 && response.status < 500) {
          throw lastError;
        }

        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
        }
      } catch (error) {
        lastError = error;
        retries--;
        if (retries === 0) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('Failed to get response from Gemini API');
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const assistantResponse = data.candidates[0].content.parts[0].text;

    // Increment API call counter
    await incrementApiCall(userId);

    // Log usage
    const responseTime = Date.now() - startTime;
    const tokensUsed = (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.candidatesTokenCount || 0);
    await logApiUsage(userId, businessId, '/api/chat', tokensUsed, responseTime, 200);

    return NextResponse.json({
      choices: [{
        message: {
          role: 'assistant',
          content: assistantResponse,
        },
      }],
      documentsUsed: documents?.length || 0,
      usage: {
        remaining: limits.api_calls_limit - (limits.api_calls_used + 1),
        limit: limits.api_calls_limit
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    // Log failed request
    if (userId && businessId) {
      const responseTime = Date.now() - startTime;
      await logApiUsage(userId, businessId, '/api/chat', 0, responseTime, 500);
    }
    
    let errorMessage = 'Failed to process request';
    let statusCode = 500;

    if (error.message.includes('Unauthorized')) {
      errorMessage = 'Authentication failed';
      statusCode = 401;
    } else if (error.message.includes('API error')) {
      errorMessage = 'AI service temporarily unavailable';
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out';
      statusCode = 504;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
