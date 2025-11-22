// Add these imports at the top
import { monitoring } from '@/lib/monitoring'
import { ErrorHandler, ErrorTypes, throwError } from '@/lib/errorHandler'
import { rateLimiter } from '@/lib/rateLimit'

// In your POST function, wrap everything:
export async function POST(request) {
  const startTime = Date.now()
  let userId = null
  
  try {
    // ... your existing validation code ...
    
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throwError(ErrorTypes.AUTH_UNAUTHORIZED)
    }
    
    userId = session.user.id
    
    // Check rate limit with new system
    const rateCheck = await rateLimiter.checkLimit(userId, image ? 'image' : 'chat')
    
    if (!rateCheck.allowed) {
      throwError(ErrorTypes.RATE_LIMIT_EXCEEDED, {
        retryAfter: rateCheck.retryAfter,
        resetTime: rateCheck.resetTime
      })
    }
    
    // ... rest of your existing code ...
    
    // Track successful request
    const duration = Date.now() - startTime
    await monitoring.trackRequest('/api/chat', userId, duration, true, {
      hasImage: !!image,
      messageLength: lastUserMessage.length
    })
    
    return NextResponse.json({ 
      message: validatedText,
      county: userCounty,
      citations: citations,
      documentsSearched: usedDocs.length,
      contextQuality: usedDocs.length > 0 ? 'good' : 'insufficient',
      rateLimit: {
        remaining: rateCheck.remainingRequests,
        resetTime: rateCheck.resetTime
      }
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    await monitoring.trackRequest('/api/chat', userId, duration, false, {
      error: error.message
    })
    
    const { status, body } = await ErrorHandler.handle(error, {
      endpoint: '/api/chat',
      userId
    })
    
    return NextResponse.json(body, { status })
  }
}
