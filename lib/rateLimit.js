// lib/rateLimit.js
// Improved rate limiting with multiple tiers and better UX

const RATE_LIMITS = new Map()

// Different limits for different actions
const LIMITS = {
  chat: {
    maxRequests: 20,      // 20 messages per minute (more reasonable)
    windowMs: 60 * 1000,  // 1 minute
  },
  image: {
    maxRequests: 5,       // 5 images per minute (resource intensive)
    windowMs: 60 * 1000,
  },
  auth: {
    maxRequests: 5,       // 5 login attempts per 5 minutes
    windowMs: 5 * 60 * 1000,
  },
  checkout: {
    maxRequests: 3,       // 3 checkout attempts per 10 minutes
    windowMs: 10 * 60 * 1000,
  }
}

export const rateLimiter = {
  async checkLimit(userId, action = 'chat') {
    const key = `${userId}:${action}`
    const now = Date.now()
    const limits = LIMITS[action] || LIMITS.chat
    const { maxRequests, windowMs } = limits

    let userLimits = RATE_LIMITS.get(key)

    // Initialize or reset if window expired
    if (!userLimits || now > userLimits.resetTime) {
      userLimits = {
        count: 0,
        resetTime: now + windowMs,
        firstRequest: now
      }
      RATE_LIMITS.set(key, userLimits)
    }

    // Check if limit exceeded
    if (userLimits.count >= maxRequests) {
      const retryAfter = Math.ceil((userLimits.resetTime - now) / 1000)
      
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: userLimits.resetTime,
        retryAfter,
        message: `Rate limit exceeded. Please wait ${retryAfter} seconds.`
      }
    }

    // Increment counter
    userLimits.count++
    RATE_LIMITS.set(key, userLimits)

    // Clean up expired entries occasionally
    if (Math.random() < 0.01) {
      this.cleanup()
    }

    return {
      allowed: true,
      remainingRequests: maxRequests - userLimits.count,
      resetTime: userLimits.resetTime,
      retryAfter: 0
    }
  },

  // Clean up expired entries
  cleanup() {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, value] of RATE_LIMITS.entries()) {
      if (now > value.resetTime) {
        RATE_LIMITS.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`)
    }
  },

  // Get current usage for a user
  getUsage(userId, action = 'chat') {
    const key = `${userId}:${action}`
    const userLimits = RATE_LIMITS.get(key)
    const limits = LIMITS[action] || LIMITS.chat
    
    if (!userLimits || Date.now() > userLimits.resetTime) {
      return {
        used: 0,
        remaining: limits.maxRequests,
        resetTime: null
      }
    }
    
    return {
      used: userLimits.count,
      remaining: limits.maxRequests - userLimits.count,
      resetTime: userLimits.resetTime
    }
  },

  // Reset limit for a specific user (useful for testing or admin override)
  resetLimit(userId, action = 'chat') {
    const key = `${userId}:${action}`
    RATE_LIMITS.delete(key)
    console.log(`[RateLimit] Reset limit for ${key}`)
  },

  // Get all active rate limits (for monitoring)
  getStats() {
    const stats = {
      totalKeys: RATE_LIMITS.size,
      byAction: {},
      heaviestUsers: []
    }
    
    const userCounts = new Map()
    
    for (const [key, value] of RATE_LIMITS.entries()) {
      const [userId, action] = key.split(':')
      
      // Count by action
      stats.byAction[action] = (stats.byAction[action] || 0) + 1
      
      // Track user usage
      userCounts.set(userId, (userCounts.get(userId) || 0) + value.count)
    }
    
    // Get top 10 heaviest users
    stats.heaviestUsers = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, requests: count }))
    
    return stats
  }
}

// Legacy export for backwards compatibility
export const chatRateLimiter = {
  checkLimit: (userId, action) => rateLimiter.checkLimit(userId, action || 'chat'),
  cleanup: () => rateLimiter.cleanup(),
  resetLimit: (userId, action) => rateLimiter.resetLimit(userId, action || 'chat')
}
