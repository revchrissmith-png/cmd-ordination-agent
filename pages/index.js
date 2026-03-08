import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function OrdinationAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const scrollRef = useRef(null);

  // Official Alliance Canada Palette
  const colors = {
    allianceBlue: '#0077C8', // Pantone 3005 C
    oceanBlue: '#006298',    // Pantone 7691 C
    deepSea: '#00426A',      // Pantone 2188 C
    cloudGray: '#EAEAEE',    // Cool Grey 1 C
    white: '#ffffff',
    charcoal: '#040404'      // Black 6 C
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    return () => subscription.unsubscribe();
  }, [messages]);

  const handleLogin = async () => {
    const email = prompt("Enter your district email to receive a login link:");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ 
      email, 
      options: { emailRedirectTo: window.location.origin + '/admin' } 
    });
    if (error) alert(error.message);
    else alert("Success! Check your email for your access link.");
  };

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
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Head>
        <title>CMD Ordination Study Agent</title>
      </Head>

      <header style={{ 
        backgroundColor: colors.deepSea, 
        color: colors.white, 
        padding: '1rem 2rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: `4px solid ${colors.allianceBlue}`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img 
            src="https://i.imgur.com/ZHqDQJC.png" 
            alt="Alliance Logo" 
            style={{ height: '40px', width: 'auto' }} 
          />
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            CMD ORDINATION STUDY AGENT
          </h1>
        </div>
        
        <button 
          onClick={user ? () => supabase.auth.signOut() : handleLogin}
          style={{ 
            backgroundColor: 'transparent', 
            color: colors.white, 
            border: `1px solid ${colors.white}`, 
            padding: '0.5rem 1rem', 
            fontSize: '0.75rem', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            borderRadius: '2px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          {user ? 'LOGOUT' : 'ADMIN LOGIN'}
        </button>
      </header>

      <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ 
          backgroundColor: colors.white, 
          borderRadius: '4px', 
          height: '70vh', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <div ref={scrollRef} style={{ 
            flex: 1, 
            padding: '2rem', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.2rem',
            backgroundColor: colors.white
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: colors.oceanBlue, marginTop: '5rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Welcome to the CMD Mentor</h2>
                <p style={{ opacity: 0.8 }}>How can I help you with your ordination
