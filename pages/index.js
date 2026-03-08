import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with safety checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const colors = {
    primaryBlue: '#2b388f',
    allianceRed: '#7f1214',
    allianceGray: '#939598',
    white: '#ffffff',
    bgLight: '#f4f4f4'
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Fixed: 'assistant' is now a proper string
      const assistantMessage = { role: 'assistant', content: data.reply };
      setMessages((prev) => [...prev, assistantMessage]);

      // Save to Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('messages').insert([
          { user_id: session.user.id, role: 'user', content: input },
          { user_id: session.user.id, role: 'assistant', content: data.reply }
        ]);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev, 
        { role: 'assistant', content: `The Mentor encountered an error: ${error.message}. Please check your connection and try again.` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.bgLight, minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <Head>
        <title>CMD Ordination Agent</title>
      </Head>

      <header style={{ backgroundColor: colors.primaryBlue, color: colors.white, padding: '2rem 1rem', textAlign: 'center', borderBottom: `5px solid ${colors.allianceRed}` }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Ordination Study Agent</h1>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', opacity: 0.9 }}>MIDWEST DISTRICT | THE ALLIANCE CANADA</p>
      </header>

      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', height: '60vh', display: 'flex', flexDirection: 'column' }}>
          
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: colors.allianceGray, marginTop: '3rem' }}>
                <h2 style={{ color: colors.primaryBlue, fontSize: '1.4rem' }}>Welcome, Ordinand</h2>
                <p>How can I help you with your ordination requirements today?</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
