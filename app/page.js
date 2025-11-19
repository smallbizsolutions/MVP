'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageSquare, Send, Shield, FileText, Info, Menu, X, AlertTriangle, Camera, Trash2, Clock, Check, LogIn } from 'lucide-react';

// --- CONFIGURATION ---
// REPLACE THESE WITH YOUR REAL IDs FROM STRIPE DASHBOARD
const STRIPE_PRICE_IDS = {
  pro: 'price_1Qxxxxxxxxxxxxxx',       
  enterprise: 'price_1Qxxxxxxxxxxxxxx' 
};

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. LANDING PAGE COMPONENT (Public View)
// ==========================================
function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Login Handler (Magic Link)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    
    // Detects if we are on localhost or production automatically
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: { emailRedirectTo: redirectTo } 
    });
    
    setLoading(false);
    if (error) alert("Error: " + error.message);
    else setMagicLinkSent(true);
  };

  // Stripe Checkout Handler
  const handleCheckout = async (priceId) => {
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error('No checkout URL returned');
    } catch (err) {
      console.error(err);
      alert("Failed to start checkout. Check console.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', color: '#1f2937', lineHeight: 1.5, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Login Modal */}
      {showLoginModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', maxWidth: '400px', width: '100%', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#0f2545' }}>Log In / Sign Up</h2>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>Enter your email. We'll send you a secure link to sign in instantly.</p>
            {magicLinkSent ? (
              <div style={{ backgroundColor: '#ecfdf5', padding: '15px', borderRadius: '8px', color: '#065f46', textAlign: 'center' }}>
                <Check size={40} style={{ display: 'block', margin: '0 auto 10px' }} />
                <strong>Check your email!</strong><br/>We sent a login link to {email}
              </div>
            ) : (
              <form onSubmit={handleLogin}>
                <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '15px', fontSize: '16px' }} required />
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#0f2545', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>{loading ? 'Sending...' : 'Send Login Link'}</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Navigation Bar - THIS IS WHERE THE LOGIN BUTTON IS */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '20px', color: '#0f2545' }}>
          <Shield size={28} /> Protocol
        </div>
        <div>
          <button onClick={() => setShowLoginModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: '2px solid #e5e7eb', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: '600', color: '#0f2545' }}>
            <LogIn size={16} /> Member Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#f9fafb', flex: 1 }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '20px', color: '#0f2545' }}>Food Safety Intelligence <br/> <span style={{ color: '#5D4037' }}>Simplified.</span></h1>
        <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>AI-powered compliance for modern kitchens. Upload photos, ask questions, and stay audit-ready 24/7.</p>
        <button onClick={() => setShowLoginModal(true)} style={{ padding: '15px 30px', fontSize: '18px', fontWeight: 'bold', color: 'white', backgroundColor: '#5D4037', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Get Started Free</button>
      </div>

      {/* Pricing Section */}
      <div style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '40px' }}>Choose Your Plan</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {/* Pro Plan */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '30px', backgroundColor: 'white' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Pro</h3>
            <div style={{ fontSize: '36px', fontWeight: '800', marginBottom: '20px' }}>$29<span style={{ fontSize: '16px', fontWeight: 'normal', color: '#6b7280' }}>/mo</span></div>
            <button onClick={() => handleCheckout(STRIPE_PRICE_IDS.pro)} disabled={loading} style={{ width: '100%', padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#0f2545', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? 'Processing...' : 'Subscribe to Pro'}</button>
          </div>
          {/* Enterprise Plan */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '30px', backgroundColor: '#fff7ed' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Enterprise</h3>
            <div style={{ fontSize: '36px', fontWeight: '800', marginBottom: '20px' }}>$49<span style={{ fontSize: '16px', fontWeight: 'normal', color: '#6b7280' }}>/mo</span></div>
            <button onClick={() => handleCheckout(STRIPE_PRICE_IDS.enterprise)} disabled={loading} style={{ width: '100%', padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#5D4037', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? 'Processing...' : 'Subscribe to Enterprise'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. MAIN APP COMPONENT (Private View)
// ==========================================
export default function App() {
  const [session, setSession] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  
  // --- Chat App State ---
  const [activeTab, setActiveTab] = useState('chat'); 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAppLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check Trial Status
  useEffect(() => {
    if (!session) return;
    async function checkTrialStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('user_profiles').select('trial_ends_at').eq('id', user.id).single();
      if (profile?.trial_ends_at) {
        const daysLeft = Math.ceil((new Date(profile.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 7) setTrialDaysLeft(daysLeft);
      }
    }
    checkTrialStatus();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetch('/api/documents').then(res => res.json()).then(data => setDocuments(data.files || [])).catch(console.error);
  }, [session]);

  useEffect(() => {
    const accepted = localStorage.getItem('terms_accepted');
    if (accepted === 'true') setTermsAccepted(true);
    else setShowTermsModal(true);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleAcceptTerms = () => { localStorage.setItem('terms_accepted', 'true'); setTermsAccepted(true); setShowTermsModal(false); };
  const handleDeclineTerms = () => alert('You must accept the terms to use Protocol.');
  const handleSignOut = async () => { await supabase.auth.signOut(); setSession(null); };
  
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !image) || !termsAccepted) return;
    const userMessage = { role: 'user', content: input, image: image };
    setMessages(prev => [...prev, userMessage]);
    const payloadInput = input; const payloadImage = image;
    setInput(''); setImage(null); setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: payloadInput, image: payloadImage })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, confidence: data.confidence }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: " + error.message }]);
    } finally { setLoading(false); }
  };

  const formatMessage = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
      return part;
    });
  };

  const handleNavClick = (tab) => { setActiveTab(tab); setIsMobileMenuOpen(false); };

  if (appLoading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading Protocol...</div>;

  if (!session) return <LandingPage />;

  return (
    <>
      {showTermsModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <AlertTriangle size={28} color="#dc2626" />
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Protocol Terms of Use</h2>
            </div>
            <p style={{ marginBottom: '20px' }}>By using Protocol, you acknowledge that this is for informational purposes only and not legal advice.</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={handleDeclineTerms} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '2px solid #e5e7eb', backgroundColor: 'white' }}>Decline</button>
              <button onClick={handleAcceptTerms} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: 'none', backgroundColor: '#5D4037', color: 'white' }}>I Accept</button>
            </div>
          </div>
        </div>
      )}

      <div className="app-container">
        {isMobileMenuOpen && <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20 }} onClick={() => setIsMobileMenuOpen(false)} />}

        <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #2a436b', paddingBottom: '15px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={24} /> <span>Protocol</span>
            </div>
            <button className="mobile-only" onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'white' }}><X size={24} /></button>
          </div>
          
          <div className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => handleNavClick('chat')}>
            <MessageSquare size={18} /> Chat Assistant
          </div>
          <div className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => handleNavClick('documents')}>
            <FileText size={18} /> Document Library
          </div>

          <div style={{ flex: 1 }}></div>
          
          <div className={`nav-item`} onClick={handleSignOut} style={{ color: '#fca5a5' }}>
            <LogIn size={18} /> Sign Out
          </div>
        </div>

        <div className="main-content">
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button className="mobile-only" onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: '#0f2545' }}><Menu size={24} /></button>
              <div className="header-title">Protocol | Intelligence</div>
            </div>
          </div>

          {trialDaysLeft !== null && (
             <div style={{ backgroundColor: '#fff7ed', borderBottom: '1px solid #fdba74', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#c2410c', fontSize: '14px' }}>
               <Clock size={16} />
               <span>Trial expires in {trialDaysLeft} days.</span>
             </div>
          )}

          {activeTab === 'chat' ? (
            <>
              <div className="chat-box">
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '40px' }}>
                    <Shield size={60} color="#d1d5db" style={{ margin: '0 auto 20px' }} />
                    <h2>Protocol</h2>
                    <p>Ask questions or upload photos.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                    {msg.image && <img src={msg.image} alt="User" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '10px' }} />}
                    {formatMessage(msg.content)}
                    {msg.role === 'assistant' && msg.confidence && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280' }}>
                        Confidence: <strong>{msg.confidence}%</strong>
                      </div>
                    )}
                  </div>
                ))}
                {loading && <div className="loading-container">Analyzing...</div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="input-area">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
                {image && (
                  <div style={{ position: 'absolute', bottom: '70px', left: '20px', backgroundColor: '#e0e7ff', padding: '5px 10px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', color: '#0f2545', border: '1px solid #0f2545' }}>
                    <span>📸 Image attached</span>
                    <button onClick={() => setImage(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </div>
                )}
                <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', color: '#5D4037' }}><Camera size={24} /></button>
                <input className="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type message..." disabled={loading || !termsAccepted} />
                <button className="send-button" onClick={handleSendMessage} disabled={loading || !termsAccepted}><Send size={20} /></button>
              </div>
            </>
          ) : (
            <div className="scroll-content"><h2>Document Library</h2><p>Coming soon...</p></div>
          )}
        </div>

        <style jsx global>{`
          .app-container { height: 100dvh; display: flex; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; }
          .sidebar { width: 280px; min-width: 280px; background-color: #0f2545; color: white; display: flex; flex-direction: column; padding: 20px; z-index: 30; transition: transform 0.3s ease; }
          .nav-item { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 6px; cursor: pointer; margin-bottom: 5px; font-size: 14px; color: #a5b4fc; transition: all 0.2s; }
          .nav-item.active { color: white; background-color: rgba(255,255,255,0.1); }
          .main-content { flex: 1; display: flex; flex-direction: column; background-color: #ffffff; overflow: hidden; position: relative; }
          .header { padding: 15px 20px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justifyContent: space-between; height: 60px; flex-shrink: 0; }
          .header-title { font-size: 18px; font-weight: 600; }
          .chat-box { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; background-color: #f9fafb; }
          .bubble { padding: 15px 20px; max-width: 85%; line-height: 1.6; font-size: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-radius: 12px; }
          .bubble.user { align-self: flex-end; background-color: #0f2545; color: white; border-radius: 12px 12px 0 12px; }
          .bubble.bot { align-self: flex-start; background-color: #ffffff; color: #374151; border: 1px solid #e5e7eb; border-radius: 12px 12px 12px 0; white-space: pre-wrap; }
          .input-area { padding: 15px 20px; background-color: #ffffff; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; align-items: center; padding-bottom: max(15px, env(safe-area-inset-bottom)); position: relative; }
          .chat-input { flex: 1; padding: 14px; border-radius: 8px; border: 1px solid #d1d5db; background-color: #ffffff; color: #1f2937; font-size: 16px; outline: none; }
          .send-button { padding: 14px 20px; border-radius: 8px; border: none; background-color: #5D4037; color: white; cursor: pointer; display: flex; align-items: center; justifyContent: center; }
          .loading-container { padding: 15px; text-align: center; color: #6b7280; font-style: italic; }
          @media (max-width: 768px) {
            .mobile-only { display: block; }
            .sidebar { position: absolute; top: 0; left: 0; bottom: 0; transform: translateX(-100%); }
            .sidebar.open { transform: translateX(0); }
            .bubble { max-width: 90%; }
          }
        `}</style>
      </div>
    </>
  );
}
