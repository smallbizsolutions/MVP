// lib/logger.js
// FIX #19: Environment-based logging utility
// Use this instead of console.log in production code

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  
  error: (...args) => {
    // Always log errors, even in production
    console.error(...args)
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  }
}

// For client-side only
export const clientLogger = {
  log: (...args) => {
    if (typeof window !== 'undefined' && isDevelopment) {
      console.log(...args)
    }
  },
  
  error: (...args) => {
    if (typeof window !== 'undefined') {
      console.error(...args)
    }
  },
  
  warn: (...args) => {
    if (typeof window !== 'undefined' && isDevelopment) {
      console.warn(...args)
    }
  }
}
