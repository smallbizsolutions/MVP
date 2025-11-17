import { createClient } from '@supabase/supabase-js';

const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

// Simple: either you've paid or you haven't
export async function checkUserAccess(userId) {
  if (!supabase) {
    console.warn('Service role key not configured - allowing access');
    return { hasAccess: true, isPaid: false };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_tier')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking access:', error);
      return { hasAccess: true, isPaid: false }; // Allow access on error
    }

    // If they have an active subscription, they have access
    const hasAccess = data.subscription_status === 'active';
    
    return { 
      hasAccess, 
      isPaid: hasAccess,
      status: data.subscription_status 
    };
  } catch (error) {
    console.error('Exception checking access:', error);
    return { hasAccess: true, isPaid: false };
  }
}

// No usage tracking - they either have access or they don't
export async function logApiUsage(userId, businessId, endpoint, tokensUsed, responseTimeMs, statusCode) {
  if (!supabase) return;

  try {
    const costPer1kTokens = 0.003;
    const costUsd = (tokensUsed / 1000) * costPer1kTokens;

    await supabase
      .from('api_usage_log')
      .insert({
        user_id: userId,
        business_id: businessId,
        endpoint,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        response_time_ms: responseTimeMs,
        status_code: statusCode
      });
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
}
