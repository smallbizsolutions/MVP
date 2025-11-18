'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';

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
      
      // Handle API Errors
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  // --- INLINE STYLES (Works without Tailwind) ---
  const styles = {
    container: { height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#111827', color: 'white', fontFamily: 'sans-serif' },
    header: { padding: '20px', borderBottom: '1px solid #374151', backgroundColor: '#1f2937', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: 'bold' },
    chatBox: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' },
    inputArea: { padding: '20px', borderTop: '1px solid #374151', backgroundColor: '#1f2937', display: 'flex', gap: '10px' },
    input: { flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', fontSize: '16px', outline: 'none' },
    button: { padding: '15px 25px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', cursor: 'pointer', fontWeight: 'bold' },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#10b981', color: 'white', padding: '12px 18px', borderRadius: '12px 12px 0 12px', maxWidth: '80%', lineHeight: '1.5' },
    bubbleBot: { alignSelf: 'flex-start', backgroundColor: '#374151', color: '#e5e7eb', padding: '12px 18px', borderRadius: '12px 12px 12px 0', maxWidth: '80%', lineHeight: '1.5', border: '1px solid #4b5563' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <MessageSquare color="#10b981" /> 
        Compliance Assistant
      </div>

      <div style={styles.chatBox}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '50px' }}>
            <p>Welcome. I am ready to answer questions about the Food Code.</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot}>
            {msg.content}
          </div>
        ))}
        
        {loading && <div style={{ color: '#9ca3af', marginLeft: '10px' }}>Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask about food safety..."
          disabled={loading}
        />
        <button style={styles.button} onClick={handleSendMessage} disabled={loading}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
