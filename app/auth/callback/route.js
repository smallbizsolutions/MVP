import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Session exchange error:', exchangeError)
      return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`)
    }

    if (session) {
      // Get county from user metadata (set during signup)
      const county = session.user.user_metadata?.county || 'washtenaw'
      
      // FIX #3: Use upsert to avoid race condition between profile creation and update
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({ 
          id: session.user.id,
          email: session.user.email,
          county: county,
          is_subscribed: false,
          requests_used: 0,
          images_used: 0,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })

      if (profileError) {
        console.error('Profile upsert error:', profileError)
        // Don't fail the auth flow - profile might exist from trigger
      }

      // Check if user has subscription
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_subscribed')
        .eq('id', session.user.id)
        .single()

      let origin = process.env.NEXT_PUBLIC_BASE_URL 
      if (!origin) {
        origin = requestUrl.origin
      }
      origin = origin.replace(/\/$/, '')

      // Redirect based on subscription status
      if (profile?.is_subscribed) {
        return NextResponse.redirect(`${origin}/documents`)
      } else {
        return NextResponse.redirect(`${origin}/pricing`)
      }
    }
  }

  // If no code or session, redirect to home
  let origin = process.env.NEXT_PUBLIC_BASE_URL || requestUrl.origin
  origin = origin.replace(/\/$/, '')
  return NextResponse.redirect(`${origin}/`)
}
