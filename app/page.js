'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Shield, FileText, Info, Menu } from 'lucide-react';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "System Error: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render Bold text from the bot (Simple Markdown Parser)
  const formatMessage = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // --- GOVERNMENT UI STYLES ---
  const styles = {
    container: { 
      height: '100vh', 
      display: 'flex', 
      backgroundColor: '#f3f4f6', // Light Gray Background
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    },
    sidebar: {
      width: '260px',
      backgroundColor: '#0f2545', // Government Navy Blue
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
      zIndex: 10
    },
    sidebarHeader: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '30px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      borderBottom: '1px solid #2a436b',
      paddingBottom: '15px'
    },
    navItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px',
      borderRadius: '6px',
      cursor: 'pointer',
      marginBottom: '5px',
      fontSize: '14px',
      color: '#e0e7ff'
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff'
    },
    header: {
      padding: '15px 30px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    },
    headerTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#111827',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    chatBox: {
      flex: 1,
      overflowY: 'auto',
      padding: '40px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      backgroundColor: '#f9fafb'
    },
    bubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: '#0f2545', // Navy
      color: 'white',
      padding: '15px 20px',
      borderRadius: '12px 12px 0 12px',
      maxWidth: '75%',
      lineHeight: '1.6',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
    },
    bubbleBot: {
      alignSelf: 'flex-start',
      backgroundColor: '#ffffff',
      color: '#374151', // Dark Gray Text
      padding: '20px',
      borderRadius: '12px 12px 12px 0',
      maxWidth: '80%',
      lineHeight: '1.6',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
      whiteSpace: 'pre-wrap' // CRITICAL: Preserves formatting/spacing
    },
    inputArea: {
      padding: '20px 40px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      gap: '15px',
      alignItems: 'center'
    },
    input: {
      flex: 1,
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #d1d5db',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      fontSize: '16px',
      outline: 'none',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
    },
    button: {
      padding: '16px 24px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#c7a006', // Gold Accent
      color: 'white',
      cursor: 'pointer',
      fontWeight: 'bold',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    disclaimer: {
      fontSize: '12px',
      color: '#9ca3af',
      textAlign: 'center',
      marginTop: '10px'
    }
  };

  return (
    <div style={styles.container}>
      {/* SIDEBAR (Hidden on very small screens usually, but simplified here) */}
      <div style={styles.sidebar} className="hidden md:flex">
        <div style={styles.sidebarHeader}>
          <Shield size={24} />
          <span>Compliance</span>
        </div>
        <div style={styles.navItem}><MessageSquare size={18} /> Chat Assistant</div>
        <div style={styles.navItem}><FileText size={18} /> Document Library</div>
        <div style={{ flex: 1 }}></div>
        <div style={styles.navItem}><Info size={18} /> Help & Support</div>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.mainContent}>
        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <span style={{ color: '#0f2545' }}>Washtenaw County</span> 
            <span style={{ color: '#6b7280', fontWeight: '400' }}>| Compliance Assistant</span>
          </div>
        </div>

        {/* CHAT AREA */}
        <div style={styles.chatBox}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '80px' }}>
              <Shield size={60} color="#e5e7eb" style={{ margin: '0 auto 20px' }} />
              <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937', marginBottom: '10px' }}>How can we help you?</h2>
              <p>Ask about food codes, inspections, or health regulations.</p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot}>
              {formatMessage(msg.content)}
            </div>
          ))}
          
          {loading && (
            <div style={{ alignSelf: 'flex-start', color: '#6b7280', fontStyle: 'italic', marginLeft: '20px' }}>
              Consulting regulations...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div style={styles.inputArea}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your question here..."
            disabled={loading}
          />
          <button style={styles.button} onClick={handleSendMessage} disabled={loading}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
