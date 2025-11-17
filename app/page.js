'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Upload, X, FileText, LogOut, Edit2, Check, MessageSquare, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Auth from '../components/Auth';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('ask');
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) {
      await loadProfile(session.user.id);
    }
    setLoading(false);
  };

  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, businesses(name)')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data);
      setBusinessName(data.businesses?.name || '');
      await loadDocuments(data.business_id);
      await loadConversations(data.business_id);
    }
  };

  const loadDocuments = async (businessId) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (data) {
      setDocuments(data);
    }
  };

  const loadConversations = async (businessId) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (data) {
      setConversations(data);
    }
  };

  const loadMessages = async (conversationId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }
  };

  const updateBusinessName = async () => {
    if (!businessName.trim()) return;
    
    const { error } = await supabase
      .from('businesses')
      .update({ name: businessName })
      .eq('id', profile.business_id);
    
    if (!error) {
      setProfile({
        ...profile,
        businesses: { name: businessName }
      });
      setEditingBusinessName(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setDocuments([]);
    setMessages([]);
    setConversations([]);
    setCurrentConversation(null);
    setProfile(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      let content = '';
      
      // Handle different file types
      if (file.type === 'application/pdf') {
        // For PDF, we'll use a simple text extraction
        // In production, you'd want a proper PDF parser
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        content = text;
      } else {
        content = await file.text();
      }
      
      const { data, error } = await supabase
        .from('documents')
        .insert({
          business_id: profile.business_id,
          name: file.name,
          content: content,
          uploaded_by: user.id
        })
        .select()
        .single();
      
      if (data) {
        setDocuments([data, ...documents]);
      } else {
        console.error('Error uploading document:', error);
      }
    }
  };

  const handleDeleteDocument = async (docId) => {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', docId);
    
    if (!error) {
      setDocuments(documents.filter(doc => doc.id !== docId));
    }
  };

  const createNewConversation = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        business_id: profile.business_id,
        title: 'New conversation'
      })
      .select()
      .single();
    
    if (data) {
      setCurrentConversation(data);
      setMessages([]);
      setConversations([data, ...conversations]);
    }
  };

  const selectConversation = async (conv) => {
    setCurrentConversation(conv);
    await loadMessages(conv.id);
  };

  const deleteConversation = async (convId) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', convId);
    
    if (!error) {
      setConversations(conversations.filter(c => c.id !== convId));
      if (currentConversation?.id === convId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Create conversation if none exists
    let conversationId = currentConversation?.id;
    if (!conversationId) {
      const { data } = await supabase
        .from('conversations')
        .insert({
          business_id: profile.business_id,
          title: input.substring(0, 50)
        })
        .select()
        .single();
      
      if (data) {
        setCurrentConversation(data);
        setConversations([data, ...conversations]);
        conversationId = data.id;
      }
    }

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Save user message to database
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage.content
      });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'user-session'
        },
        body: JSON.stringify({
          messages: newMessages,
          documents: documents
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.choices[0].message.content
      };

      setMessages([...newMessages, assistantMessage]);

      // Save assistant message to database
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantMessage.content
        });

    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}`
      };
      setMessages([...newMessages, errorMessage]);
      
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: errorMessage.content
        });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f1419'
      }}>
        <p style={{ color: '#a0aec0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' }}>
          Loading...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#0f1419'
    }}>
      {/* Header */}
      <div style={{ 
        background: '#1a2332', 
        borderBottom: '1px solid #2d3748',
        padding: '12px 16px'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#f7fafc',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
            fontWeight: '500'
          }}>
            {profile?.businesses?.name || 'Loading...'}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setMode('ask')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: mode === 'ask' ? '#2d3748' : 'transparent',
                color: mode === 'ask' ? '#f7fafc' : '#a0aec0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
              }}
            >
              Ask
            </button>
            <button
              onClick={() => setMode('manage')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: mode === 'manage' ? '#2d3748' : 'transparent',
                color: mode === 'manage' ? '#f7fafc' : '#a0aec0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
              }}
            >
              Manage
            </button>
            <button
              onClick={() => setMode('settings')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: mode === 'settings' ? '#2d3748' : 'transparent',
                color: mode === 'settings' ? '#f7fafc' : '#a0aec0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
              }}
            >
              Settings
            </button>
            <button
              onClick={handleSignOut}
              style={{
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: '#a0aec0',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        padding: '16px',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', gap: '16px', height: '100%' }}>
          {/* Sidebar for conversations (only in ask mode on desktop) */}
          {mode === 'ask' && (
            <div style={{
              width: '280px',
              background: '#1a2332',
              borderRadius: '8px',
              border: '1px solid #2d3748',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflow: 'hidden'
            }}>
              <button
                onClick={createNewConversation}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#2d3748',
                  color: '#f7fafc',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center'
                }}
              >
                <MessageSquare size={16} />
                New Chat
              </button>
              
              <div style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: currentConversation?.id === conv.id ? '#0f1419' : 'transparent',
                      border: currentConversation?.id === conv.id ? '1px solid #2d3748' : '1px solid transparent'
                    }}
                    onClick={() => selectConversation(conv)}
                  >
                    <p style={{
                      fontSize: '13px',
                      color: '#f7fafc',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {conv.title}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#718096',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main content area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {mode === 'settings' ? (
              <div style={{ 
                background: '#1a2332',
                borderRadius: '8px',
                border: '1px solid #2d3748',
                padding: '24px',
                flex: 1,
                overflow: 'auto'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '24px',
                  color: '#f7fafc',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                }}>
                  Settings
                </h2>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: '#e2e8f0',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                  }}>
                    Business Name
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {editingBusinessName ? (
                      <>
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #2d3748',
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: '#0f1419',
                            color: '#f7fafc',
                            outline: 'none',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                          }}
                        />
                        <button
                          onClick={updateBusinessName}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: '#f7fafc',
                            color: '#0f1419',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                          }}
                        >
                          <Check size={16} />
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <p style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '14px',
                          color: '#f7fafc',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                        }}>
                          {businessName}
                        </p>
                        <button
                          onClick={() => setEditingBusinessName(true)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: '#2d3748',
                            color: '#f7fafc',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                          }}
                        >
                          <Edit2 size={16} />
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: '#e2e8f0',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                  }}>
                    Account Email
                  </label>
                  <p style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: '#a0aec0',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                  }}>
                    {user.email}
                  </p>
                </div>
              </div>
            ) : mode === 'manage' ? (
              <div style={{ 
                background: '#1a2332',
                borderRadius: '8px',
                border: '1px solid #2d3748',
                padding: '24px',
                flex: 1,
                overflow: 'auto'
              }}>
                <div>
                  <label style={{ 
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: '#e2e8f0',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                  }}>
                    Documents
                  </label>
                  <div style={{
                    border: '1px solid #4a5568',
                    borderRadius: '8px',
                    padding: '32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#0f1419'
                  }}>
                    <input
                      type="file"
                      multiple
                      accept=".txt,.pdf,.md"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                      <Upload style={{ 
                        width: '48px', 
                        height: '48px', 
                        color: '#718096',
                        margin: '0 auto 8px'
                      }} />
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#cbd5e0', 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' 
                      }}>
                        Upload documents
                      </p>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#718096', 
                        marginTop: '4px', 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' 
                      }}>
                        .txt, .pdf, .md files
                      </p>
                    </label>
                  </div>
                </div>

                {documents.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      marginBottom: '8px', 
                      color: '#e2e8f0',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                    }}>
                      Uploaded ({documents.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {documents.map((doc) => (
                        <div key={doc.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px',
                          background: '#0f1419',
                          borderRadius: '6px',
                          border: '1px solid #2d3748'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            <FileText style={{ width: '16px', height: '16px', color: '#cbd5e0', flexShrink: 0 }} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ 
                                fontSize: '14px', 
                                fontWeight: '500', 
                                color: '#f7fafc',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>{doc.name}</p>
                              <p style={{ 
                                fontSize: '12px', 
                                color: '#718096',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                              }}>
                                {new Date(doc.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#cbd5e0',
                              padding: '4px',
                              flexShrink: 0
                            }}
                          >
                            <X style={{ width: '16px', height: '16px' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#1a2332',
                borderRadius: '8px',
                border: '1px solid #2d3748',
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Messages */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  {messages.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center',
                      color: '#718096',
                      marginTop: '80px'
                    }}>
                      <p style={{ 
                        fontSize: '16px', 
                        marginBottom: '8px', 
                        color: '#a0aec0', 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' 
                      }}>
                        Ask a question
                      </p>
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#718096', 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif' 
                      }}>
                        Press the mic or type
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          maxWidth: '70%',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          background: msg.role === 'user' ? '#f7fafc' : '#0f1419',
                          color: msg.role === 'user' ? '#0f1419' : '#f7fafc',
                          border: msg.role === 'user' ? 'none' : '1px solid #2d3748',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                          fontSize: '15px',
                          lineHeight: '1.5'
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: '#0f1419',
                        border: '1px solid #2d3748'
                      }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#718096',
                            animation: 'bounce 1s infinite'
                          }}></div>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#718096',
                            animation: 'bounce 1s infinite 0.15s'
                          }}></div>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#718096',
                            animation: 'bounce 1s infinite 0.3s'
                          }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                  borderTop: '1px solid #2d3748',
                  padding: '16px',
                  display: 'flex',
                  gap: '8px',
                  background: '#0f1419',
                  borderBottomLeftRadius: '8px',
                  borderBottomRightRadius: '8px'
                }}>
                  <button
                    onClick={toggleListening}
                    disabled={isLoading}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      background: isListening ? '#f7fafc' : '#2d3748',
                      color: isListening ? '#0f1419' : '#a0aec0',
                      opacity: isLoading ? 0.5 : 1
                    }}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={isListening ? "Listening..." : "Ask a question..."}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #2d3748',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#1a2332',
                      color: '#f7fafc',
                      outline: 'none',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: (input.trim() && !isLoading) ? 'pointer' : 'not-allowed',
                      background: '#f7fafc',
                      color: '#0f1419',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: (input.trim() && !isLoading) ? 1 : 0.5,
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        input::placeholder {
          color: #718096;
        }
        @media (max-width: 768px) {
          /* Hide sidebar on mobile, could add a toggle button */
        }
      `}</style>
    </div>
  );
}
