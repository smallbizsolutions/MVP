import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role for admin queries
);

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
  const { data, error } = await supabase
    .rpc('check_usage_limits', { user_uuid: userId });

  if (error) {
    console.error('Error checking usage limits:', error);
    throw new Error('Failed to check usage limits');
  }

  return data[0];
}

export async function incrementApiCall(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({
      api_calls_this_month: supabase.raw('api_calls_this_month + 1')
    })
    .eq('id', userId);

  if (error) {
    console.error('Error incrementing API call:', error);
  }
}

export async function logApiUsage(userId, businessId, endpoint, tokensUsed, responseTimeMs, statusCode) {
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
}
