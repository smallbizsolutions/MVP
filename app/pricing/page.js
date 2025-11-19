'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Shield, Check, ArrowLeft } from 'lucide-react';

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async (priceId, plan) => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/auth');
      return;
    }

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, plan }),
    });

    const { url } = await res.json();
    if (url) {
      window.location.href = url;
    } else {
      setLoading(false);
      alert('Error creating checkout session. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f1419', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: '#a0aec0',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '30px',
            padding: '8px 0'
          }}
        >
          <ArrowLeft size={18} />
          <span>Back to App</span>
        </button>

        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <Shield size={48} color="#5D4037" style={{ margin: '0 auto 20px' }} />
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', marginBottom: '10px' }}>
            Choose Your Plan
          </h1>
          <p style={{ color: '#a0aec0', fontSize: '18px' }}>
            Start with a 7-day free trial, no credit card required
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* Free Trial */}
          <div style={{
            backgroundColor: '#1a2332',
            border: '2px solid #2d3748',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '10px' }}>
              Free Trial
            </h3>
            <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', marginBottom: '5px' }}>
              $0
            </p>
            <p style={{ color: '#a0aec0', marginBottom: '30px' }}>7 days</p>
            
            <ul style={{ textAlign: 'left', marginBottom: '30px', color: '#cbd5e0', listStyle: 'none', padding: 0 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Full app access for 7 days</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>AI-powered chat assistant</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Image analysis</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Document library access</span>
              </li>
            </ul>

            <button
              onClick={() => router.push('/auth')}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#2d3748',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Start Free Trial
            </button>
          </div>

          {/* Pro Plan */}
          <div style={{
            backgroundColor: '#1a2332',
            border: '2px solid #5D4037',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#5D4037',
              color: '#ffffff',
              padding: '5px 20px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              MOST POPULAR
            </div>

            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '10px' }}>
              Pro
            </h3>
            <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', marginBottom: '5px' }}>
              $29
            </p>
            <p style={{ color: '#a0aec0', marginBottom: '30px' }}>per month</p>
            
            <ul style={{ textAlign: 'left', marginBottom: '30px', color: '#cbd5e0', listStyle: 'none', padding: 0 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Unlimited messages</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Priority AI responses</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Advanced image analysis</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Email support</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Weekly compliance updates</span>
              </li>
            </ul>

            <button
              onClick={() => handleCheckout('price_PRO_PLAN_ID', 'pro')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#5D4037',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Loading...' : 'Subscribe to Pro'}
            </button>
          </div>

          {/* Enterprise Plan */}
          <div style={{
            backgroundColor: '#1a2332',
            border: '2px solid #2d3748',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '10px' }}>
              Enterprise
            </h3>
            <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', marginBottom: '5px' }}>
              $49
            </p>
            <p style={{ color: '#a0aec0', marginBottom: '30px' }}>per month</p>
            
            <ul style={{ textAlign: 'left', marginBottom: '30px', color: '#cbd5e0', listStyle: 'none', padding: 0 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Everything in Pro</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Multi-location support</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Custom compliance reports</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Phone & priority support</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Dedicated account manager</span>
              </li>
            </ul>

            <button
              onClick={() => handleCheckout('price_ENTERPRISE_PLAN_ID', 'enterprise')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: '#ffffff',
                color: '#0f1419',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Loading...' : 'Subscribe to Enterprise'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '50px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
          <p>All plans include access to Washtenaw County-specific regulations, FDA, and USDA guidelines.</p>
        </div>
      </div>
    </div>
  );
}
