import { createClient } from '@supabase/supabase-js';

// Check if service role key exists
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Missing SUPABASE_SERVICE_ROLE_KEY - usage limit features may not work properly');
}

const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export const PLANS = {
  free: {
    apiCalls: 50,
    documents: 10,
    conversations: 5
  },
  pro: {
    apiCalls: 1000,
    documents: -1, // unlimited
    conversations: -1
  },
  enterprise: {
    apiCalls: -1,
    documents: -1,
    conversations: -1
  }
};

export async function checkUsageLimits(userId) {
  if (!supabase) {
    console.warn('Usage limits check skipped - no service role key');
    // Return permissive defaults if service role not configured
    return {
      subscription_tier: 'free',
      api_calls_limit: 50,
      api_calls_used: 0,
      documents_limit: 10,
      documents_used: 0,
      conversations_limit: 5,
      conversations_used: 0,
      can_use_api: true,
      can_add_document: true,
      can_create_conversation: true
    };
  }

  try {
    const { data, error } = await supabase
      .rpc('check_usage_limits', { user_uuid: userId });

    if (error) {
      console.error('Error checking usage limits:', error);
      // Return permissive defaults on error to avoid blocking users
      return {
        subscription_tier: 'free',
        api_calls_limit: 50,
        api_calls_used: 0,
        documents_limit: 10,
        documents_used: 0,
        conversations_limit: 5,
        conversations_used: 0,
        can_use_api: true,
        can_add_document: true,
        can_create_conversation: true
      };
    }

    return data[0];
  } catch (error) {
    console.error('Exception checking usage limits:', error);
    // Return permissive defaults
    return {
      subscription_tier: 'free',
      api_calls_limit: 50,
      api_calls_used: 0,
      documents_limit: 10,
      documents_used: 0,
      conversations_limit: 5,
      conversations_used: 0,
      can_use_api: true,
      can_add_document: true,
      can_create_conversation: true
    };
  }
}

export async function incrementApiCall(userId) {
  if (!supabase) {
    console.warn('API call increment skipped - no service role key');
    return;
  }

  try {
    // Get current count first
    const { data: profile } = await supabase
      .from('profiles')
      .select('api_calls_this_month')
      .eq('id', userId)
      .single();

    if (profile) {
      const { error } = await supabase
        .from('profiles')
        .update({
          api_calls_this_month: profile.api_calls_this_month + 1
        })
        .eq('id', userId);

      if (error) {
        console.error('Error incrementing API call:', error);
      }
    }
  } catch (error) {
    console.error('Exception incrementing API call:', error);
  }
}

export async function logApiUsage(userId, businessId, endpoint, tokensUsed, responseTimeMs, statusCode) {
  if (!supabase) {
    return;
  }

  try {
    // Estimate cost (rough approximation for Claude)
    const costPer1kTokens = 0.003; // $3 per million tokens
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
    // Don't throw - logging shouldn't break the app
    console.error('Error logging API usage:', error);
  }
}
