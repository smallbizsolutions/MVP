import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, plan } = await req.json();

    if (!priceId || !plan) {
      return NextResponse.json({ error: 'Missing priceId or plan' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      metadata: { 
        userId: user.id,
        plan: plan // 'pro' or 'enterprise'
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Next Steps:

1. **Create Stripe Price IDs:**
   - Go to Stripe Dashboard → Products → Create Product
   - Create "Pro" plan ($29/month recurring)
   - Create "Enterprise" plan ($49/month recurring)
   - Copy the `price_xxxxx` IDs and replace `price_PRO_PLAN_ID` and `price_ENTERPRISE_PLAN_ID` in the pricing page

2. **Add these to Railway env vars:**
```
   NEXT_PUBLIC_BASE_URL=https://your-railway-domain.up.railway.app
   NODE_ENV=production
