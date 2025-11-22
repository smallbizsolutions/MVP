// lib/monitoring.js
// Simple monitoring system that works without external services
// Can be easily upgraded to Sentry/Datadog later

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// In-memory metrics (reset on restart)
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    byEndpoint: {}
  },
  performance: {
    avgResponseTime: 0,
    slowestEndpoints: []
  },
  errors: [],
  users: {
    active: new Set(),
    signups: 0,
    logins: 0
  }
}

export const monitoring = {
  // Track API request
  async trackRequest(endpoint, userId, duration, success, metadata = {}) {
    metrics.requests.total++
    
    if (success) {
      metrics.requests.successful++
    } else {
      metrics.requests.failed++
    }
    
    // Track by endpoint
    if (!metrics.requests.byEndpoint[endpoint]) {
      metrics.requests.byEndpoint[endpoint] = {
        count: 0,
        avgDuration: 0,
        errors: 0
      }
    }
    
    const endpointStats = metrics.requests.byEndpoint[endpoint]
    endpointStats.count++
    
    // Update average duration
    endpointStats.avgDuration = 
      (endpointStats.avgDuration * (endpointStats.count - 1) + duration) / endpointStats.count
    
    if (!success) {
      endpointStats.errors++
    }
    
    // Track active users
    if (userId) {
      metrics.users.active.add(userId)
    }
    
    // Store in database for persistence (async, don't block response)
    this.storeMetric({
      type: 'request',
      endpoint,
      user_id: userId,
      duration,
      success,
      metadata,
      timestamp: new Date().toISOString()
    }).catch(err => console.error('[Monitoring] Failed to store metric:', err))
  },

  // Track error
  async trackError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      timestamp: new Date().toISOString(),
      userId: context.userId || null,
      endpoint: context.endpoint || null
    }
    
    // Keep last 100 errors in memory
    metrics.errors.unshift(errorData)
    if (metrics.errors.length > 100) {
      metrics.errors.pop()
    }
    
    // Store in database
    await this.storeMetric({
      type: 'error',
      error_message: error.message,
      error_stack: error.stack,
      user_id: context.userId,
      endpoint: context.endpoint,
      metadata: context,
      timestamp: errorData.timestamp
    }).catch(err => console.error('[Monitoring] Failed to store error:', err))
    
    // Log to console
    console.error('[Error Tracked]', {
      message: error.message,
      endpoint: context.endpoint,
      userId: context.userId
    })
  },

  // Track user action
  async trackUserAction(userId, action, metadata = {}) {
    if (action === 'signup') {
      metrics.users.signups++
    } else if (action === 'login') {
      metrics.users.logins++
    }
    
    metrics.users.active.add(userId)
    
    await this.storeMetric({
      type: 'user_action',
      user_id: userId,
      action,
      metadata,
      timestamp: new Date().toISOString()
    }).catch(err => console.error('[Monitoring] Failed to store user action:', err))
  },

  // Store metric in database
  async storeMetric(metric) {
    try {
      const { error } = await supabase
        .from('metrics')
        .insert(metric)
      
      if (error) {
        // Don't throw - monitoring shouldn't break the app
        console.error('[Monitoring] DB store error:', error.message)
      }
    } catch (err) {
      console.error('[Monitoring] Unexpected error:', err)
    }
  },

  // Get current metrics snapshot
  getMetrics() {
    return {
      ...metrics,
      users: {
        ...metrics.users,
        active: metrics.users.active.size // Convert Set to count
      },
      timestamp: new Date().toISOString()
    }
  },

  // Get recent errors
  getRecentErrors(limit = 20) {
    return metrics.errors.slice(0, limit)
  },

  // Get endpoint stats
  getEndpointStats() {
    return Object.entries(metrics.requests.byEndpoint)
      .map(([endpoint, stats]) => ({
        endpoint,
        ...stats,
        errorRate: stats.count > 0 ? (stats.errors / stats.count * 100).toFixed(2) + '%' : '0%'
      }))
      .sort((a, b) => b.count - a.count)
  },

  // Get system health
  getHealth() {
    const total = metrics.requests.total
    const failed = metrics.requests.failed
    const errorRate = total > 0 ? (failed / total * 100) : 0
    
    return {
      status: errorRate < 5 ? 'healthy' : errorRate < 15 ? 'degraded' : 'unhealthy',
      errorRate: errorRate.toFixed(2) + '%',
      totalRequests: total,
      activeUsers: metrics.users.active.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  },

  // Database health check
  async checkDatabaseHealth() {
    const start = Date.now()
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1)
      
      const duration = Date.now() - start
      
      return {
        healthy: !error,
        responseTime: duration,
        error: error?.message || null
      }
    } catch (err) {
      return {
        healthy: false,
        responseTime: Date.now() - start,
        error: err.message
      }
    }
  },

  // Reset metrics (useful for testing)
  reset() {
    metrics.requests = {
      total: 0,
      successful: 0,
      failed: 0,
      byEndpoint: {}
    }
    metrics.errors = []
    metrics.users.active.clear()
    metrics.users.signups = 0
    metrics.users.logins = 0
  }
}

// Middleware helper to track requests automatically
export function withMonitoring(handler, endpoint) {
  return async (req, context) => {
    const start = Date.now()
    let success = true
    let userId = null
    
    try {
      // Try to get user ID from session
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      const authHeader = req.headers.get('authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data } = await supabaseClient.auth.getUser(token)
        userId = data?.user?.id
      }
      
      const response = await handler(req, context)
      
      // Check if response indicates error
      if (response.status >= 400) {
        success = false
      }
      
      return response
    } catch (error) {
      success = false
      await monitoring.trackError(error, { endpoint, userId })
      throw error
    } finally {
      const duration = Date.now() - start
      await monitoring.trackRequest(endpoint, userId, duration, success)
    }
  }
}

export default monitoring
