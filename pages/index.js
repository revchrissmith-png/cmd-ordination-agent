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

  const colors = {
    allianceBlue: '#0077C8', // Pantone 3005 C [cite: 8]
    oceanBlue: '#006298',    // Pantone 7691 C [cite: 11]
    deepSea: '#00426A',      // Pantone 2188 C 
    cloudGray: '#EAEAEE',    // Cool Grey 1 C [cite: 26]
    white: '#ffffff',
    charcoal: '#040404'      // Black 6 C [cite: 18]
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchUser();
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleLogin = async () => {
    const email = prompt("Enter your @canadianmidwest.ca email:");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("Check your email for the login link!");
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
    <div style={{ backgroundColor: colors.cloudGray, minHeight: '100vh', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <Head><title>CMD Ordination Agent</title></Head>

      <header style={{ backgroundColor: colors.deepSea, color: colors.white, padding: '1.5rem', textAlign: 'center', borderBottom: `4px solid ${colors.allianceBlue}`, position: 'relative' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>ORDINATION STUDY AGENT</h1>
        <button 
          onClick={user ? () => supabase.auth.signOut() : handleLogin}
          style={{ position: 'absolute', right: '1rem', top: '1.5rem', backgroundColor: 'transparent', color: colors.white, border: `1px solid ${colors.white}`, padding: '0.3rem 0.6rem', fontSize: '0.7rem', cursor: 'pointer' }}
        >
          {user ? 'LOGOUT' : 'LOGIN'}
        </button>
      </header>

      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: colors.white, borderRadius: '2px', height: '60vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && <p style={{ textAlign: 'center', color: colors.oceanBlue, marginTop: '2rem' }}>Welcome to the CMD Ordination Agent.</p>}
            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.role === 'user' ? colors.allianceBlue : colors.cloudGray, color: msg.role === 'user' ? colors.white : colors.charcoal, padding: '0.8rem 1.2rem', borderRadius: '4px', maxWidth: '80%' }}>
                {msg.content}
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: `1px solid ${colors.cloudGray}`, display: 'flex', gap: '0.5rem' }}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." style={{ flex: 1, padding: '0.7rem', border: `1px solid ${colors.oceanBlue}`, borderRadius: '2px' }} />
            <button type="submit" disabled={loading} style={{ backgroundColor: colors.deepSea, color: colors.white, border: 'none', padding: '0 1.5rem', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? '...' : 'SEND'}</button>
          </form>
        </div>
      </main>
    </div>
  );
}
