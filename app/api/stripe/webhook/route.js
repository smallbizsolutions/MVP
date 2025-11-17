import { NextResponse } from 'next/server';
import { stripe, PLANS } from '../../../../lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
);

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session) {
  const userId = session.metadata.user_id;
  const businessId = session.metadata.business_id;
  const planType = session.metadata.plan_type;

  await supabase
    .from('profiles')
    .update({
      subscription_tier: planType.toLowerCase(),
      subscription_status: 'active',
      stripe_subscription_id: session.subscription,
      api_calls_this_month: 0,
      api_calls_reset_date: new Date().toISOString()
    })
    .eq('id', userId);

  console.log(`Subscription activated for user ${userId}: ${planType}`);
}

async function handleSubscriptionChange(subscription) {
  const customerId = subscription.customer;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }

  const status = subscription.status;
  const isActive = ['active', 'trialing'].includes(status);

  await supabase
    .from('profiles')
    .update({
      subscription_status: status,
      subscription_tier: isActive ? getPlanFromSubscription(subscription) : 'free'
    })
    .eq('id', profile.id);

  console.log(`Subscription updated for customer ${customerId}: ${status}`);
}

async function handlePaymentSucceeded(invoice) {
  const customerId = invoice.customer;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // Reset API call counter for new billing period
  await supabase
    .from('profiles')
    .update({
      api_calls_this_month: 0,
      api_calls_reset_date: new Date().toISOString()
    })
    .eq('id', profile.id);

  console.log(`Payment succeeded for customer ${customerId}`);
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_email')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // Update status to past_due
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due'
    })
    .eq('id', profile.id);

  console.log(`Payment failed for customer ${customerId}`);
  // TODO: Send email notification
}

function getPlanFromSubscription(subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  
  if (priceId === PLANS.PRO.priceId) return 'pro';
  if (priceId === PLANS.ENTERPRISE.priceId) return 'enterprise';
  return 'free';
}
