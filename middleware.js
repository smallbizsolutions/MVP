import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Allow access to auth and pricing pages
  if (req.nextUrl.pathname.startsWith('/auth') || req.nextUrl.pathname.startsWith('/pricing')) {
    return res;
  }

  // Require login for all other pages
  if (!session) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  // Check trial status and subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan')
    .eq('user_id', session.user.id)
    .single();

  // If they have active subscription, allow access
  if (subscription && subscription.status === 'active') {
    return res;
  }

  // Check if trial has expired
  const { data: userData } = await supabase.auth.admin.getUserById(session.user.id);
  
  if (userData?.user?.user_metadata?.trial_ends_at) {
    const trialEnd = new Date(userData.user.user_metadata.trial_ends_at);
    const now = new Date();
    
    if (now > trialEnd) {
      // Trial expired, redirect to pricing
      return NextResponse.redirect(new URL('/pricing?trial_expired=true', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icon-192.png).*)'],
};
